# Systematic Debugging Triage Worksheet & Failure Patterns (`akit-debug`)

Use this reference to structure root-cause investigations and avoid random code edits.

---

## 1. Root-Cause Triage Worksheet

```markdown
# Bug Triage Record: [Short Symptom Title]

## 1. Exact Symptom & Reproduction
- **Observed Error / Stack Trace:** `[Exact error message + file:line]`
- **Expected vs. Actual Behavior:**
  - Expected: `[...]`
  - Actual: `[...]`
- **Deterministic Reproduction Command:** `[e.g., pytest tests/test_orders.py -k test_refund_idempotency]`
- **Reproduction Status:** [`Reproduced locally` | `Intermittent (N/M runs)` | `Blocked - missing env`]

## 2. Backward Data-Flow Trace
1. **Crash / Symptom Site:** `[file_C.ts:L140]` received `amount = NaN`
2. **Immediate Caller:** `[file_B.ts:L88]` computed `price * discount` where `discount` was `"15%"` (string)
3. **Root Origin:** `[file_A.ts:L32]` parsed query param without numeric coercion/DTO validation

## 3. Falsifiable Hypotheses
| # | Hypothesis | Discriminating Check / Probe | Result (`Confirmed` / `Falsified`) |
|---|---|---|---|
| H1 | `[Specific causal statement]` | `[Exact log/test check]` | `[Result]` |
| H2 | `[Alternative causal statement]` | `[Exact log/test check]` | `[Result]` |

## 4. Fix & Regression Proof
- **Root Cause Fix Location:** `[file:line]`
- **Regression Test Added:** `[test file + test name]`
- **RED -> GREEN Output:** `[Failed before fix with X -> Passed after fix]`
```

---

## 2. Common Failure Classes & Diagnostic Playbook

| Failure Class | Typical Symptoms | Root-Cause Investigation Technique |
| :--- | :--- | :--- |
| **Async Race / Flake** | Passes alone, fails in parallel suite; intermittent `null` or stale state | Check shared module-level state, unawaited promises, missing DB transaction locks (`SELECT ... FOR UPDATE`), or hardcoded `sleep()`. |
| **Test Pollution** | Test B fails only when run after Test A | Run `Test A -> Test B` in isolation; inspect uncleaned DB tables, global singletons, environment variables (`process.env`), or mock restores (`afterEach`). |
| **Boundary / Encoding Drift** | Works in dev, fails on non-ASCII, timezone shift, or empty array | Test `[]`, `""`, `0`, `null`, UTC vs. local timezone offsets, and Unicode characters. |
| **ORM / N+1 / Stale Cache** | Correct in unit tests, stale or times out in integration | Enable SQL query logging; inspect transaction isolation level and cache invalidation keys. |
| **Version / Dependency Mismatch** | Obscure method missing or signature error | Invoke `akit-docs` to check exact installed version in lockfile (`package-lock.json` / `poetry.lock`). |
