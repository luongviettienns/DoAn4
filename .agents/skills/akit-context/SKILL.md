---
name: akit-context
description: Use when working across long multi-step sessions, handing off state between subagents, or compacting conversation history so architectural decisions, verified facts, and test baselines are never lost.
---
# AKit Context — Durable Decision Memory & Token Optimization

## Overview
`akit-context` implements structured session memory, context window compaction, and handoff discipline inspired by `affaan-m/everything-claude-code` and `shanraisshan/claude-code-best-practice`. Long coding sessions degrade when raw chat logs, failed experiments, and unverified guesses accumulate in context. `akit-context` separates **verified repository facts** from **working assumptions** and persists concise, secret-free checkpoints on disk.

**Core principle:** Persist verified decisions and reproducible command evidence — never dump raw chat transcripts or unverified guesses into project memory.

---

## When to Use
- Before triggering `/compact` or ending a coding session on a multi-milestone task.
- When delegating sequential phases across multiple subagents (`akit-scout` $\rightarrow$ `akit-architect` $\rightarrow$ `akit-implement`).
- After resolving a non-obvious bug (`akit-debug`) or completing an architectural decision (`akit-debate` / `akit-arena`) whose constraints future sessions must respect.
- When maintaining `PROJECT_PROGRESS.md` or `.akit/project-context.md`.

---

## Antigravity Native Tool Mapping
1. **Progress & Checkpoint Files (`write_file` / `edit_file`):**
   - Update `PROJECT_PROGRESS.md` (when present at workspace root) at every phase transition or completed task.
   - Maintain `.akit/project-context.md` using `references/project-context.template.md` and milestone snapshots using `references/checkpoint.md`.
2. **Conversation Compaction:** Recommend the `/compact` slash command to the user **only after** writing the current milestone checkpoint to disk.
3. **Git Reality Check (`run_command`):** When resuming from `.akit/project-context.md`, always run `git status --short` and `git log -n 3 --oneline` first — working-tree reality overrides stale notes.

---

## Step-by-Step Context Management Workflow

### Step 1: Audit Existing Context Sources
1. Read `AGENTS.md`, `GEMINI.md`, `PROJECT_PROGRESS.md`, and `.akit/project-context.md` (if present).
2. Verify whether recorded commands, branch names, and file paths still match the current Git working tree.

### Step 2: Partition Information into Four Strict Buckets
When updating `.akit/project-context.md` (`references/project-context.template.md`), classify every item:
1. **Verified Facts (Immutable until code changes):** Exact build/test commands with observed exit codes, confirmed entrypoint paths, active DB migration version, and locked architectural constraints.
2. **Active Decisions & Rationale:** Links to ADRs, `akit-debate` contracts, or `akit-prior-art` choices explaining *why* an approach was selected.
3. **Ruled-Out Dead Ends:** Failed hypotheses or incompatible libraries already tested (prevents future agents from repeating the same failed experiment!).
4. **Open Questions & Next Slice:** Exact unverified items and the single next actionable task.

### Step 3: Write Milestone Checkpoints (`references/checkpoint.md`)
After completing each vertical slice or debugging cycle, record a <30-line delta:
- Completed slice & changed files (`git diff --stat`).
- Verification commands executed and exact exit codes.
- Remaining blockers or deferred edge cases.

### Step 4: Prune & Compact Stale Context
1. Replace verbose command outputs with 1-line summaries + links to `.akit/evidence.json` (`akit.checks`).
2. Delete resolved temporary notes and obsolete assumptions so `.akit/project-context.md` stays under **150 lines** (<2,500 tokens).

---

## Red Flags & Rationalization Counter-Table

| Common Excuse / Rationalization | Engineering Reality & Mandatory Action |
| :--- | :--- |
| *"I'll paste the entire 500-line terminal log into `.akit/project-context.md`."* | Bloated context files burn tokens on every future turn. Record only the exact command, exit code, and 3-line root observation. |
| *"The context file says tests pass, so I don't need to re-run them after pulling changes."* | Context files are historical snapshots, not live guarantees. Always validate against current `git status` and fresh test runs. |
| *"I'll save the test API key / JWT token in `.akit/project-context.md` for convenience."* | **Security violation.** Never write secrets, `.env` values, tokens, or PII into context files or checkpoints. Reference env var names only. |
| *"I'll remember why we rejected Library X without writing it down."* | Next session (or after `/compact`), a fresh agent will try Library X again. Always log **Ruled-Out Dead Ends** with the concrete failure reason. |

---

## Safety & Exit Gates
- Never store API keys, passwords, session cookies, customer PII, or proprietary credentials in `.akit/project-context.md` or `PROJECT_PROGRESS.md`.
- Never overwrite user-authored documentation (`README.md`, `AGENTS.md`) when saving agent checkpoints.
- Verify that `.akit/project-context.md` and `PROJECT_PROGRESS.md` accurately reflect the current Git working tree before ending a turn.

## Reference Materials & Attribution
- Project context template: `references/project-context.template.md`
- Milestone handoff & checkpoint template: `references/checkpoint.md`
- Inspired by `affaan-m/everything-claude-code` and `shanraisshan/claude-code-best-practice`. Original AKit instructions.
