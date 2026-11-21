# Two-Stage Code Review Checklist & Report Template (`akit-review`)

Use this checklist and report structure (informed by `getsentry/skills` and `obra/superpowers`) when reviewing PR diffs or subagent implementations.

---

## 1. Stage 1 & Stage 2 Audit Matrix

### Stage 1: Spec & Scope Compliance
- [ ] **All Acceptance Criteria Met:** Every requested behavior and edge case is implemented.
- [ ] **Zero Unrelated Diff Noise:** No drive-by formatting of untouched files or unrequested features.
- [ ] **Backward Compatibility:** Existing API consumers and DB rows continue to work without breaking changes.

### Stage 2: Technical Defect Hunt (`getsentry/skills` Focus)
- [ ] **Authorization & Tenant Isolation:** Every read/update/delete verifies actor ownership (`organizationId` / `userId`), not just a valid login token.
- [ ] **Concurrency & Idempotency:** Retrying a failed POST/webhook or sending 2 parallel requests cannot double-charge or corrupt state.
- [ ] **Database Efficiency:** Zero queries inside loops (`N+1`); all list endpoints enforce a maximum `limit`; transactions are short and never wrap external HTTP calls.
- [ ] **Error Context & Observability:** Exceptions preserve cause chains (`new Error('...', { cause: err })`), include structured correlation IDs, and never leak stack traces or secrets to end users.
- [ ] **Test Coverage Honesty:** Tests assert on real outputs and include negative/boundary inputs; zero mocked-out units under test.

---

## 2. Severity Classification Rubric

| Severity | Definition | Merge Gate Action |
| :--- | :--- | :--- |
| **`CRITICAL`** | Exploitable security flaw (SQLi, BOLA, auth bypass, secret leak), data loss/corruption, or crash on main flow | **Hard Block** — Must fix + add regression test |
| **`HIGH`** | Missing spec requirement, race condition, N+1 query on hot path, broken error handling, or missing test for core flow | **Block** — Must fix before merge |
| **`MEDIUM`** | Edge-case defect, suboptimal error message, high cognitive complexity (`akit-simplify`), or missing boundary test | **Fix in PR** or document explicit follow-up |
| **`LOW / NIT`** | Naming clarity, minor duplication, documentation polish | **Non-Blocking** — Author discretion |

---

## 3. Structured Review Output Template

```markdown
# Code Review Report: [Branch / PR / Task Name]

## 1. Stage 1 Verdict: Spec Compliance -> [`PASS` | `FAIL`]
- **Fulfilled Criteria:** `[Summary]`
- **Missing / Out-of-Scope Items:** `[None or exact list]`

## 2. Stage 2 Findings (Ordered by Severity)
| # | Severity | Category | Location (`File:Lines`) | Reproducible Counterexample / Defect | Recommended Fix |
|---|---|---|---|---|---|
| 1 | `HIGH` | Concurrency | `src/wallet.ts#L44-L58` | Two parallel withdrawals read the same balance before `UPDATE`, allowing negative balance | Use atomic `UPDATE wallets SET balance = balance - $1 WHERE id = $2 AND balance >= $1` |

## 3. Verification Evidence & Final Verdict
- **Tests Executed:** `[Command -> Exit Code]`
- **Final Review Decision:** [`APPROVED` | `CHANGES REQUESTED`]
```
