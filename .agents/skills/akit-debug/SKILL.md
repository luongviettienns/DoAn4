---
name: akit-debug
description: Use when encountering any bug, test failure, runtime exception, race condition, or regression to find the root cause systematically before attempting any code fix.
---
# AKit Debug — 4-Phase Systematic Root-Cause Debugging (`obra/superpowers`)

## Overview
`akit-debug` enforces the **4-Phase Systematic Debugging** discipline, **Backward Root-Cause Tracing**, **4-Layer Defense-in-Depth Validation**, and **Condition-Based Waiting** from `obra/superpowers` (`systematic-debugging`) combined with error telemetry and triage practices from `getsentry/skills`. Random "shotgun debugging" (guessing a fix, editing code, and hoping tests pass) masks symptoms and introduces new regressions.

**The Iron Law:** `NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.` Never alter production code to fix a bug until you have reproduced the failure (or traced the exact causal path) and confirmed why it happens.

---

## Antigravity Native Tool Mapping

In Codex, reproduce and trace with the available shell, search and read tools. If delegated exploration is unavailable, trace the relevant callers directly.

1. **Reproduce & Capture Diagnostics (`run_command`):** Execute the smallest failing test or reproduction command and capture full `stdout`/`stderr` stack traces.
2. **Trace Call Graph & Recent Diffs (`read_file` / `run_command`):**
   - Run `git log -n 5 --oneline` and `git diff` to see what changed recently.
   - In Antigravity, use `.agents/agents/akit-scout.md` via `invoke_subagent` for broad exploration when authorized.
3. **Structured Triage & Defense-in-Depth:** Follow `references/triage.md` and `references/defense-in-depth-and-waiting.md` to trace backward to the original trigger, apply 4-layer validation, and eliminate flaky sleeps.

---

## The 4-Phase Debugging Protocol

### Phase 1: Root Cause Investigation (Observe Before Touching)
1. **Read Error Messages Word-for-Word:** Inspect the exact exception type, error code, line number, and full stack trace — never skim the bottom line alone.
2. **Reproduce Consistently:**
   - Find the smallest deterministic command or test that triggers the failure.
   - For multi-component boundaries (CI $\rightarrow$ build $\rightarrow$ API $\rightarrow$ DB), log data entering and exiting each boundary once to pinpoint which layer breaks.
3. **Backward Root-Cause Tracing (`references/defense-in-depth-and-waiting.md`):**
   - Start at the symptom (where the crash or invalid value surfaces) and trace backward up the call chain until you find the **original trigger** where valid state became invalid state.

### Phase 2: Pattern & Differential Analysis
1. **Find a Working Counterpart:** Locate a similar endpoint, component, or test in the same codebase that works correctly.
2. **Diff Working vs. Broken:** Compare inputs, middleware order, types, environment variables, and database state line by line.
3. **Check Recent Changes:** Inspect recent commits, lockfile updates, and schema migrations that touched the causal path.

### Phase 3: Hypothesis & Single-Variable Testing
1. Formulate **1–3 specific, falsifiable hypotheses** (`references/triage.md`):
   - *"Hypothesis 1: The crash occurs because `user.organizationId` is `undefined` when authenticated via API key instead of JWT."*
2. Design **one discriminating observation** (a log line, assertion, or minimal probe) per hypothesis.
3. Test **one variable at a time**. If Hypothesis 1 is falsified, revert any diagnostic probe completely before testing Hypothesis 2.

### Phase 4: Failing Regression Test $\rightarrow$ Root Fix + 4-Layer Defense-in-Depth (`akit-implement`)
1. Write an automated regression test that reproduces the exact bug and **watch it fail (RED)**.
2. Apply one narrow, reversible fix at the **root-cause source** (not a symptom workaround at the crash site).
3. Add **4-Layer Defense-in-Depth Validation** (`references/defense-in-depth-and-waiting.md`: Entry Point $\rightarrow$ Business Logic $\rightarrow$ Environment Guard $\rightarrow$ Debug Telemetry) so the bug becomes structurally impossible.
4. For async/timing bugs, replace arbitrary `setTimeout`/`sleep` delays with **Condition-Based Waiting (`waitFor`)**.
5. Watch the regression test pass (**GREEN**) and run the full related test suite.

---

## The "3+ Failed Fixes = Question Architecture" Hard Stop Rule (`obra/superpowers`)
- If **< 3 attempted fixes fail**, stop, revert the failed patch, and return to Phase 1 with the new evidence.
- If **3+ attempted fixes fail** (or each fix reveals a new coupled problem elsewhere), **STOP attempting fixes immediately**. This is an architectural defect, not a failed hypothesis — escalate to the user and invoke `akit-architecture` / `akit-debate`.

---

## Red Flags & Rationalization Counter-Table

| Common Excuse / Rationalization | Engineering Reality & Mandatory Action |
| :--- | :--- |
| *"Let me just add `?.` optional chaining / `try-catch` where it crashes."* | Symptom masking! Swallowing `null` or exceptions at the crash site corrupts downstream data. Trace backward (`references/defense-in-depth-and-waiting.md`) to where the invalid value originated. |
| *"I'm 90% sure I know the fix, so I'll edit the code before running the failing test."* | Without watching the reproduction fail first, you cannot prove your fix actually solved the reported bug. |
| *"Fix #1 didn't work, so I'll leave Fix #1 in place and stack Fix #2 on top."* | Stacking failed patches creates Franken-code. **Always `git checkout` / revert a failed fix** before testing the next hypothesis. |
| *"The test is flaky, let me increase `setTimeout` from 100ms to 2000ms."* | Arbitrary sleeps hide race conditions. Replace sleeps with condition-based polling (`waitFor` in `references/defense-in-depth-and-waiting.md`). |

---

## Safety & Exit Gates
- Never delete, skip (`.skip` / `@unittest.skip`), or weaken existing test assertions to make a failing build green.
- Never mutate production databases or expose sensitive user payloads in debug logs.
- Remove all temporary `console.error` / `print` diagnostic probes before claiming the fix is complete.

## Reference Materials & Attribution
- Structured root-cause triage worksheet & bug-class lookup: `references/triage.md`
- Backward root-cause tracing, 4-layer Defense-in-Depth validation, and Condition-Based Waiting (`waitFor`): `references/defense-in-depth-and-waiting.md`
- Inspired by `obra/superpowers` (`systematic-debugging`) and `getsentry/skills`. Original AKit instructions.
