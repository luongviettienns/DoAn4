---
name: akit-skillforge
description: Use when creating a new Agent Skill, upgrading an existing SKILL.md, or optimizing skill descriptions for progressive discovery in Google Antigravity and OpenAI Codex.
---
# AKit SkillForge — TDD for Agent Skills & Progressive Disclosure

## Overview
`akit-skillforge` applies **Test-Driven Development to process documentation**, combining the skill authoring methodology of `obra/superpowers` (`writing-skills`) with the **Skill Creator** architecture and evaluation patterns from `anthropics/skills`, `rmyndharis/antigravity-skills`, and `github/awesome-copilot`.

**Core principle:** A skill is a tested engineering runbook, not an essay. If you have not observed how an agent fails or rationalizes shortcuts without the skill, you do not know whether the skill teaches the right behavior.

---

## Skill Discovery Optimization (SDO) Rules (`obra/superpowers`)

Future agents decide whether to load a skill based **exclusively** on its YAML frontmatter `name` and `description`.
1. **Frontmatter Contract:**
   - `name`: Lowercase letters, numbers, and hyphens only (`akit-<domain>`).
   - `description`: Start with **`Use when...`** and describe **ONLY the triggering conditions, symptoms, and problem contexts** in third person.
2. **The SDO Trap (Never Summarize Workflow in Description):**
   - **Why:** If `description` summarizes the workflow (e.g., *"Use for debugging — reproduce, locate, hypothesize, fix"*), agents treat the 1-line description as a shortcut and skip reading `SKILL.md`!
   - **Fix:** State *when* to activate (`"Use when encountering any bug, test failure, runtime exception..."`), forcing the agent to read `SKILL.md` for *how* to execute.

---

## Antigravity Native Customization Architecture (`agy-customizations`)
Understand where your customization belongs before authoring:
- **Rules (`GEMINI.md` / `AGENTS.md`):** Always-on repository invariants and coding style constraints (<24 KB per file).
- **Skills (`.agents/skills/<name>/SKILL.md`):** On-demand multi-step workflows, domain playbooks, and verification checklists loaded via **Progressive Disclosure**.
- **Specialist Subagents (`.agents/agents/<name>.md`):** Isolated read-only or task-scoped personas invoked via `invoke_subagent`.
- **Hooks & MCP (`hooks.json`, `mcp_config.json`):** Automated lifecycle scripts and external tool integrations.

---

## Step-by-Step Skill Engineering Workflow (`RED -> GREEN -> REFACTOR`)

### Step 1: RED — Baseline Failure & Pressure Analysis
1. Identify how agents naturally fail on the target task without the skill:
   - **Discipline Failure:** Knows the rule (e.g., TDD, security check) but skips it under time/token pressure.
   - **Shaping Failure:** Produces bloated, unstructured, or incomplete output.
   - **Reference Gap:** Hallucinates outdated APIs, SQL syntax, or tool flags.
2. Document the exact rationalizations agents use to skip the step.

### Step 2: GREEN — Structure the Skill with Progressive Disclosure
1. Keep `SKILL.md` focused and high-signal (**90–160 lines**):
   - **Overview & Core Principle:** 2–3 sentences stating the non-negotiable rule.
   - **When to Use / Decision Matrix:** Clear boundaries vs. neighboring skills.
   - **Antigravity Native Tool Mapping:** Exact tools (`read_file`, `edit_file`, `run_command`, `invoke_subagent`) and CLI commands.
   - **Step-by-Step Playbook:** Concrete, verifiable actions in execution order.
   - **Red Flags & Rationalization Table:** Explicit counters for every excuse identified in RED.
   - **Safety & Exit Gates:** Hard stops and completion evidence requirements.
2. Offload heavy templates, 100+ line reference tables, and reusable scripts into `references/<file>.md` or `scripts/` (`references/skill-authoring-checklist.md`).

### Step 3: REFACTOR — Add Activation Cases & Doctor Verification
1. Add at least **3 positive triggering prompts** and **2 negative (non-triggering) prompts** to `evals/activation_cases.jsonl`.
2. Run `python -m akit.doctor --project .` and unit tests (`python -m unittest discover -s tests -v`) to verify frontmatter, hashes, and reference links.
3. Proceed to `akit-eval` to measure activation precision/recall and behavioral outcomes.

---

## Red Flags & Rationalization Counter-Table

| Common Excuse / Rationalization | Engineering Reality & Mandatory Action |
| :--- | :--- |
| *"I'll write a 20-line generic checklist without concrete commands or templates."* | Generic platitudes ("write clean code, test well") do not change agent behavior. Include concrete commands, schemas, and red-flag counters. |
| *"I'll put a 500-line API manual directly inside `SKILL.md`."* | Violates Progressive Disclosure and burns context tokens. Put the core workflow in `SKILL.md` and link to `references/<manual>.md`. |
| *"I'll use `@skills/...` syntax to cross-reference another skill."* | `@` file references force-load files immediately in some runtimes. Reference skills by name (`Use akit-security`) and local relative paths (`references/...`). |
| *"The skill looks clear to me, so we don't need activation test cases."* | Untested skills fail to trigger or collide with neighboring skills. Always add cases to `evals/activation_cases.jsonl`. |

---

## Safety & Exit Gates
- Never copy proprietary or restrictively licensed (`GPL`/`CC-BY-NC`) text verbatim from upstream repositories; study the concept and write original AKit procedures (`docs/SOURCES.md`).
- Verify every `references/<file>` link inside `SKILL.md` resolves to an existing file on disk (`akit.doctor`).

## Reference Materials & Attribution
- Complete SkillForge authoring rubric, SDO examples, and deployment checklist: `references/skill-authoring-checklist.md`
- Inspired by `obra/superpowers` (`writing-skills`), `anthropics/skills` (`skill-creator`), `rmyndharis/antigravity-skills`, and `github/awesome-copilot`. Original AKit instructions.
