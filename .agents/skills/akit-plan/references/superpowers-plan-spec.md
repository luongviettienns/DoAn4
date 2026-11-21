# Superpowers Plan Specification, Interfaces & Pre-Flight Conflict Scan (`obra/superpowers`)

## 1. Mandatory Plan Document Header (`writing-plans`)
Every implementation plan must open with a self-contained header so an engineer or fresh subagent with zero prior session context can execute it without guessing:

```markdown
# [Feature Name] Implementation Plan

> **Execution Mode:** Use `akit-implement` in Subagent-Driven Development (SDD) mode (recommended) or Inline Execution mode (`executing-plans`). Steps use checkbox (`- [ ]`) syntax.

**Goal:** [One sentence describing what this builds]
**Architecture:** [2–3 sentences about approach and boundaries]
**Tech Stack:** [Key frameworks/libraries]
**Spec:** [Path to `docs/requirements.md` or spec artifact — the binding authority]
**Prior-Art Decision (`akit-prior-art`):** [GitHub OSS repos compared & Adopt/Adapt/Build choice]

## Global Constraints
- [Exact version floors, dependency rules, naming conventions, and security invariants copied verbatim from the spec]
```

---

## 2. Bite-Sized Task Structure & Explicit `Interfaces` Block
Because each implementer subagent sees only its own task brief, every task must declare exact file paths and an **`Interfaces` (`Consumes` / `Produces`)** block:

```markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/new_file.ts`
- Modify: `exact/path/to/existing.ts:45-90`
- Test: `tests/exact/path/to/new_file.test.ts`

**Interfaces:**
- **Consumes:** `ReservationLock` from `src/locks/reservation.ts` (`acquireLock(seatId: string, ttlMs: number): Promise<LockToken>`)
- **Produces:** `createHold(userId: string, seatId: string): Promise<HoldReceipt>`

- [ ] **Step 1: Write the failing test (RED)** — include the complete test code block.
- [ ] **Step 2: Run test to verify it fails** — exact command + expected failure reason.
- [ ] **Step 3: Write minimal implementation (GREEN)** — complete implementation code or exact contract.
- [ ] **Step 4: Run test to verify it passes** — exact command + `PASS (Exit 0)`.
- [ ] **Step 5: Simplify & Commit** — run `akit-simplify` check and commit (`feat: ...`).
```

---

## 3. Strict "No Placeholders" Gate
The following patterns are **plan defects** and must be eliminated during self-review before presenting the plan:
- `"TBD"`, `"TODO"`, `"implement later"`, `"fill in details"`
- `"Add appropriate error handling"` or `"handle edge cases"` without naming the exact error types and status codes
- `"Write tests for the above"` without providing the concrete test assertions
- `"Similar to Task N"` (each task brief must be self-contained for isolated subagents)
- Method or property names that drift across tasks (e.g., `clearLayers()` in Task 2 vs. `clearFullLayers()` in Task 5).

---

## 4. Pre-flight Conflict Scan Table (Before Dispatching Task 1)
Before executing Task 1 in `executing-plans` or `subagent-driven-development`, scan the entire plan and write a **Pre-flight Conflict Scan Table** to the SDD ledger (`.superpowers/sdd/<plan>/progress.md`):

| Task Pair / Task ID | Shared File or Interface (`Produces` $\rightarrow$ `Consumes`) | Consistency & Rubric Check | Ruling (If Conflict Found) |
| :--- | :--- | :--- | :--- |
| `Task 1 -> Task 3` | `src/auth/token.ts` (`verifyJwt`) | Signatures & return types match across both tasks | Clean |
| `Task 2 (Internal)` | `tests/orders.spec.ts` vs `src/orders.ts` | Test asserts `409 Conflict` on duplicate key; code throws `ConflictError` | Clean |
