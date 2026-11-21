# Proactive Skill Selection & Slash-Command Auto-Orchestration (`akit-router`)

## 1. Proactive Skill Evaluation & Optimal Strategy Proposal
Whenever a user command arrives, the agent must **never** jump straight into ad-hoc file edits. Instead, execute this 3-step intake in under 10 seconds:
1. **Scan Request Intent & Complexity:** Classify the request into `Defect`, `Bounded (S)`, `Feature (M)`, or `Architectural (L)` and check whether it involves an unfamiliar domain capability.
2. **Evaluate the 30-Skill Catalog:** Consult `references/routing-matrix.md` to pick the **optimal 2–4 skill combination** and determine whether a specialist subagent (`akit-scout`, `akit-debater`, `akit-critic`, `akit-security`, `akit-architect`) improves quality or saves main-session context.
3. **Present the Optimal Execution Plan ("Phương án Tối ưu"):** State a concise 3–4 bullet Execution Contract at the top of your response:
   - **Active Skills & Mode:** e.g., `akit-prior-art` $\rightarrow$ `akit-plan` $\rightarrow$ `akit-implement` (SDD mode) $\rightarrow$ `akit-review`.
   - **Auto-Triggered Slash Workflow:** Which slash workflow behavior is being executed automatically via native tools.
   - **Verification Gate:** The exact command that will prove completion.

---

## 2. Auto Slash-Workflow Orchestration Matrix (Antigravity Native Emulation)

In Google Antigravity, slash commands (`/plan`, `/grill-me`, `/boost`, `/teamwork`, `/goal`, `/browser`, `/compact`, `/schedule`, `/learn`) are UI-level triggers. Because an agent cannot synthetically type `/...` into the user's chat input box, **`akit-router` automatically executes the equivalent native tool workflow on the user's behalf** as soon as the task context calls for it, and recommends the UI shortcut only when client-side UI state is needed:

| Slash Command | When Context Matches | Automatic Native Action Executed by Agent (No User Typing Needed) | UI Recommendation (When Needed) |
| :--- | :--- | :--- | :--- |
| **`/grill-me`** | Requirements are ambiguous, underspecified, or have multiple product interpretations. | Auto-activate `akit-requirements` + immediately invoke the **`ask_question`** tool with 1–3 structured multiple-choice questions (`(Recommended)` option first). | Mention `/grill-me` if the user wants a multi-round deep interview mode. |
| **`/plan`** | Multi-file feature (`Size M/L`), schema migration, or architectural refactor. | Auto-activate `akit-plan` + use **`write_file`** to create the `<appDataDir>/brain/<id>/implementation_plan.md` Artifact with `RequestFeedback: true` (renders the interactive **Proceed** button) + run the Pre-flight Conflict Scan. | Mention `/plan` if the user wants to switch the IDE into dedicated plan-review mode. |
| **`/boost`** | High-stakes architectural decision, thorny performance bottleneck, or subtle race condition. | Auto-activate `akit-prior-art` + `akit-debate` (dispatch `.agents/agents/akit-debater.md` and `akit-judge.md` via **`invoke_subagent`**) + enforce 2-stage `akit-review`. | Mention `/boost` for maximum multi-perspective reasoning depth. |
| **`/teamwork`** | 2+ independent modules, wide codebase discovery, or multi-task plan execution. | Auto-activate **Subagent-Driven Development (SDD)** (`akit-implement`) or parallel discovery: call **`invoke_subagent`** (`akit-scout`, `akit-critic`, `akit-security`, or isolated `self` workers with `Workspace: "branch"`). | Mention `/teamwork` when coordinating a large multi-agent build. |
| **`/goal`** | Long-running, multi-step objective where the user wants autonomous end-to-end execution until all checks pass. | Auto-activate **Continuous SDD Execution** (`obra/superpowers`): create `.superpowers/sdd/<plan>/progress.md` ledger, execute all tasks without stalling on minor questions (record `Ruling:` entries), and run `akit-deliver` end-to-end. | Recommend `/goal` if the user wants overnight/unattended IDE goal enforcement. |
| **`/browser`** | Task requires verifying web UI rendering, DOM interactions, or scraping live documentation. | Auto-activate `akit-browser-qa` (run Playwright CLI via **`run_command`** or use installed Chrome DevTools MCP tools) and `search_web`. | Recommend `/browser` if interactive visual browser control is needed. |
| **`/schedule`** | User asks for a recurring check, cron job, or delayed reminder. | Immediately invoke the native **`schedule`** tool (`CronExpression` or `DurationSeconds`) to register the background timer/cron task. | Recommend `/schedule` to manage standing schedules in the UI. |
| **`/compact`** | Conversation exceeds ~30 turns, context window is >70% full, or switching milestones. | Auto-activate `akit-context`: write a structured **Session Handoff Checkpoint** to `.akit/context-checkpoint.md` (`write_file`) so zero state is lost. | Prompt the user to click/type `/compact` to free the active context window after the checkpoint is saved. |
| **`/learn`** | User corrects an agent mistake or establishes a recurring repo-specific convention. | Auto-activate `akit-skillforge` or offer to persist the rule into `GEMINI.md` / `AGENTS.md` / `.agents/skills/` via **`edit_file`**. | Mention `/learn` to persist behavioral memory across future sessions. |

---

## 3. Mandatory Unfamiliar-Feature Gate ("Đừng viết từ con số 0")

> **Quy tắc Bắt buộc:** *"Đối với những chức năng chưa quen thuộc, đừng viết từ con số 0, hãy tìm kiếm các dự án mã nguồn mở trên GitHub để so sánh ý tưởng trước khi bắt tay vào làm."*

Before routing to `akit-plan` or `akit-implement`, check:
1. **Is this capability already implemented in the current repository?**
   - If YES $\rightarrow$ Use `akit-codebase` to mirror the existing internal pattern.
2. **Is this a non-trivial or unfamiliar capability not yet in the repository?** (e.g., OAuth/PKCE, seat/inventory locking, webhook queues, realtime sync, custom parsers, rate limiting, multi-tenant RLS, PDF/XLSX pipelines)
   - If YES $\rightarrow$ **Hard Gate:** Route to `akit-prior-art` **FIRST**. Search GitHub for 2–3 mature open-source projects, compare their architectures, data models, edge cases, and licenses, and present an **Adopt / Adapt / Build** comparison table before writing production code.
