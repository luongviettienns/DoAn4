# Cross-Platform Tool & Subagent Mapping (`Antigravity` $\leftrightarrow$ `Claude Code` $\leftrightarrow$ `Codex`)

Shared skills may use Antigravity action names. Translate the intended action to a tool actually available on the host. These examples do not grant tools or permissions. If a tool is unavailable, use a suitable local equivalent or report the missing check.

---

## 1. Core Tool Equivalence Matrix

| Engineering Action | Google Antigravity (`agy`) | Anthropic Claude Code (`claude`) | OpenAI Codex (`codex`) |
| :--- | :--- | :--- | :--- |
| **Read File Contents** | `read_file` (or step `view_file` in custom subagents) | `Read` | Shell `Get-Content -LiteralPath` on PowerShell or `cat` on Unix |
| **Search Pattern / Regex** | `read_file` / `run_command` (`rg`) (or `grep_search` in subagents) | `Grep` | `rg` / `grep` |
| **Find Files by Glob** | `run_command` (`fd` / `Get-ChildItem`) (or `find_by_name` / `list_dir` in subagents) | `Glob` | `fd` / `find` |
| **Edit Existing File** | `edit_file` | `Edit` / `MultiEdit` | `apply_patch` / edit tool |
| **Create / Overwrite File** | `write_file` | `Write` | file write tool |
| **Execute Shell / Tests** | `run_command` | `Bash` | shell exec tool |
| **Ask Structured User Questions** | `ask_question` | `AskUserQuestion` | Use the available question tool or ask in chat when a material choice cannot be inferred |
| **Plan a larger task** | `write_file` (`implementation_plan.md` artifact, `RequestFeedback: true`) | `EnterPlanMode` / `ExitPlanMode` | Use the current mode's planning tools or a brief plan in chat |
| **Task / Checklist Tracking** | `write_file` (`task.md` artifact) + `PROJECT_PROGRESS.md` | `TodoWrite` + `PROJECT_PROGRESS.md` | `PROJECT_PROGRESS.md` + SDD ledger |
| **Dispatch Specialist Subagent** | `invoke_subagent` (pre-mounted `akit-*` or `define_subagent(..., EnableWriteTools=False)` $\rightarrow$ `invoke_subagent`, or `TypeName: "research"`) | `Task` tool (or `@agent-akit-*` targeting `.claude/agents/akit-*.md`) | Ask Codex to delegate to an installed role, or use the session's `spawn_agent` schema if exposed and authorized |
| **Web / GitHub OSS Search** | `search_web` (`domain: "github.com"`) | `WebSearch` / `WebFetch` / `Bash` (`gh search`) | `gh search` / web tool |

---

## 2. Subagent Installation & Dispatch Locations by Target

Codex custom agent files describe roles. They inherit the parent session's sandbox and approval policy. Use a separate `codex exec --sandbox read-only -c 'approval_policy="never"'` session when review requires enforced write isolation. Supply the exact diff and requirements; if delegation is unavailable, record independent review as unverified.

| Specialist Subagent | Antigravity (`.agents/agents/*.md`) | Claude Code (`.claude/agents/*.md`) | Codex (`.codex/agents/*.toml`) |
| :--- | :--- | :--- | :--- |
| **Codebase & Dependency Scout** | `.agents/agents/akit-scout.md` | `.claude/agents/akit-scout.md` | `.codex/agents/akit-scout.toml` |
| **Independent Adversarial Critic** | `.agents/agents/akit-critic.md` | `.claude/agents/akit-critic.md` | `.codex/agents/akit-critic.toml` |
| **Arena & Debate Judge** | `.agents/agents/akit-judge.md` | `.claude/agents/akit-judge.md` | `.codex/agents/akit-judge.toml` |
| **Triad Debate Proposer / Challenger** | `.agents/agents/akit-debater.md` | `.claude/agents/akit-debater.md` | `.codex/agents/akit-debater.toml` |
| **Systems, API & DB Architect** | `.agents/agents/akit-architect.md` | `.claude/agents/akit-architect.md` | `.codex/agents/akit-architect.toml` |
| **Differential Security Auditor** | `.agents/agents/akit-security.md` | `.claude/agents/akit-security.md` | `.codex/agents/akit-security.toml` |

---

## 3. Claude Code Specific Best Practices (`anthropics/skills` & `shanraisshan/claude-code-best-practice`)

1. **Read-Only Subagent Isolation:**
   - All 6 subagents in `.claude/agents/*.md` declare `tools: Read, Grep, Glob` and `disallowedTools: Write, Edit, Bash`.
   - When dispatching `akit-critic` or `akit-security` via Claude Code's `Task` tool for Gate 5 (`Independent Review`), pass the exact `BASE_SHA..HEAD_SHA` diff range and specification contract so the subagent audits with zero main-thread context bias.
2. **Project Memory & Modular Rules (`CLAUDE.md` & `.claude/rules/akit.md`):**
   - Claude Code automatically loads `CLAUDE.md` and `.claude/rules/akit.md` at session startup.
   - All 30 skills installed in `.claude/skills/<name>/SKILL.md` are also directly invokable as `/akit-*` slash commands in Claude Code.
3. **Deterministic Safety Hooks (`.claude/settings.json`):**
   - Copy `examples/claude_settings.hooks.json` into `.claude/settings.json` to block accidental edits to `.env`/private keys (`PreToolUse` exit code `2`), check whitespace/conflict markers after edits (`PostToolUse` `git diff --check`), and run `akit_cli.py doctor` on `Stop`.
4. **Headless Arena & Debate Worker (`examples/claude_cli_worker.py`):**
   - Run automated multi-agent tournaments or Triad Debates using your local `claude` CLI in strict read-only mode:
     ```bash
     python .akit/runtime/akit_cli.py arena run \
       --session .akit/runs/arch-choice \
       --worker "python .akit/runtime/examples/claude_cli_worker.py" \
       --max-calls 14
     ```

---

## 4. Google Antigravity Specific Best Practices (`agy` & Antigravity 2.0)

1. **Read-Only Subagent Isolation & Dynamic Mid-Session Registration:**
   - All 6 subagents in `.agents/agents/*.md` declare `subagent: true`, `mainAgent: false`, `commandExecutionPolicy: off`, allow only read/search tools (`view_file`, `grep_search`, `list_dir`, `find_by_name`, `search_web`, `read_url_content`, `send_message`), and disallow all write/exec tools (`write_to_file`, `replace_file_content`, `multi_replace_file_content`, `write_file`, `edit_file`, `run_command`).
   - If a role is not yet listed in `<subagents>` (`Available subagents`) because AKit was installed mid-session, read `.agents/agents/akit-<role>.md`, call `define_subagent(Name="akit-<role>", Description="...", SystemPrompt="...", EnableWriteTools=False, EnableSubagentTools=False, EnableMCPTools=False)` to enforce platform-level read-only isolation, and then call `invoke_subagent(TypeName="akit-<role>", ...)`.
   - Never poll `manage_subagents` or `manage_task` in a loop; rely on Antigravity's reactive wakeup (`<messaging>`).
2. **Non-Duplicative Workspace Rules (`.agents/rules/akit.md` + `GEMINI.md`):**
   - Antigravity deduplicates rules by resolved file path (`docs/rules.md`). AKit writes the full engineering contract into `.agents/rules/akit.md` (`trigger: always_on`) and a concise, profile-aware skill index into `GEMINI.md` so `<user_rules>` never loads duplicate rule text.
3. **JSON-Stdout Lifecycle Hooks (`.agents/hooks.json`) & Native Plugin Bundle:**
   - Antigravity hooks read `toolCall.args` from `stdin` and act on JSON `stdout` (`{"decision": "deny"|"allow"|"continue", "reason": "..."}`).
   - Use `python packaging/antigravity-plugin/build_antigravity_plugin.py --out ~/.gemini/config/plugins/akit` to package AKit as a single toggleable Native Antigravity Plugin (`docs/ANTIGRAVITY_GUIDE.md`).
