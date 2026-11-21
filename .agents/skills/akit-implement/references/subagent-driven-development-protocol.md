# Subagent-Driven Development (SDD) & Parallel Dispatch Protocol (`obra/superpowers`)

## 1. SDD Workspace & Persistent Progress Ledger
Conversation memory does not survive context compaction. When executing a multi-task plan (`akit-plan`), maintain a persistent **SDD Ledger** at `.superpowers/sdd/<plan-slug>/progress.md` (and synchronize high-level milestones with `PROJECT_PROGRESS.md`):
- **First Line Identity:** `# SDD ledger — plan: <path/to/plan.md>`
- **Task Completion Entry:** `Task <N>: complete (commits <base7>..<head7>, review clean)`
- **Fix Round Entry:** `Task <N>: fix round <R>/5 (<X> addressed, <Y> open — <finding one-liners>; commits <a7>..<b7>)`
- **Deferred Minor Entry:** `Task <N>: minor (deferred): <one-liner>`
- **Ruling Entry (Rulings, Not Stalls):**
  `Ruling: <what you decided> — <why> — <what it costs if wrong>`
  *(Only pause execution for 4 things: irreversible/destructive operations, security-sensitive actions, external side effects like pushing/publishing, or a plan so broken every path is a guess. All other ambiguities are decided against the spec and recorded as `Ruling:` entries).*

---

## 2. The Implementer Dispatch & 4-Status Report Contract

### Handing Off Context via Files (Never Paste History)
- Record `BASE_SHA` (`git rev-parse HEAD`) before dispatching Task `N`.
- Write the task's requirements to `.superpowers/sdd/<plan-slug>/task-N-brief.md` and instruct the implementer subagent (`invoke_subagent`) to write its full report (including **TDD RED & GREEN command outputs**) to `.superpowers/sdd/<plan-slug>/task-N-report.md`.
- **No-Subagents Rule for Implementers:** An implementer subagent must never spawn its own subagents or reviewers. Review is dispatched solely by the controller after the implementer returns.

### Handling the 4 Implementer Statuses
Every implementer subagent must return one of four statuses:
1. **`DONE`:** Generate the diff review package (`BASE_SHA..HEAD_SHA` — never `HEAD~1`, which drops earlier commits in a multi-commit task) and dispatch the Task Reviewer (`.agents/agents/akit-critic.md`).
2. **`DONE_WITH_CONCERNS`:** Read the concerns first. If they affect correctness or scope, resolve them before review; if observational, note in the ledger and proceed to review.
3. **`NEEDS_CONTEXT`:** Supply the missing interface/file context and re-dispatch.
4. **`BLOCKED`:** Never force the same model to retry unchanged. Either supply missing context, escalate to a higher-capability model (`Model: "pro"`), split the task, or record a plan correction `Ruling:` in the ledger.

---

## 3. The 5-Round Fix Loop & Circuit Breaker
When the Task Reviewer reports `Spec ❌` or any `Critical` / `Important` finding:
- **Minor findings** never enter the fix loop; record them in `progress.md` as `minor (deferred)` for the final whole-branch review.
- **Rounds 1–3:** Resume/message the original implementer (`send_message`) with the verbatim open findings.
- **Rounds 4–5 (Capability Escalation):** Dispatch a fresh implementer on a more capable model with the brief path, report path, and framing: *"A prior implementer attempted this task N times; read the report file for what was tried."*
- **Scoped Re-Review:** After each fix round, verify the fix diff (`FIX_BASE..HEAD`) so the reviewer checks `ADDRESSED` vs. `NOT ADDRESSED` and new breakage in the fix diff only.
- **Round 5 Breaker:** If findings remain open after Round 5, stop dispatching and adjudicate each finding in `progress.md` (`parked — Ruling:` for contestable/non-load-bearing items, or a concrete unblocking `Ruling:` for load-bearing items). Surface all `Ruling:` lines in the final completion summary under **"Rulings I made"**.

---

## 4. Dispatching Parallel Agents (`dispatching-parallel-agents`)
Only dispatch multiple write-capable subagents in parallel when:
1. There are **2+ genuinely independent problem domains** (e.g., 3 separate failing test suites in unrelated subsystems).
2. There is **zero shared state and zero overlapping file ownership** (`akit-git`).
3. If tasks share files or sequential interfaces (`Consumes` / `Produces`), execute them sequentially via the SDD loop or isolate them in separate worktrees (`Workspace: "branch"`).
