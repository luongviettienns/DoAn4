---
name: akit-test
description: Use when designing test strategies, writing unit, integration, or end-to-end test suites, eliminating flaky tests, or verifying code changes with real command execution evidence before claiming completion.
---
# AKit Test — Risk-Based Verification & Anti-Flake Engineering

## Overview
`akit-test` combines the **Test-First & Verification-Before-Completion** laws from `obra/superpowers` (`test-driven-development`, `verification-before-completion`) with risk-based test stratification from `getsentry/skills` and `shanraisshan/claude-code-best-practice`.

**The Iron Law of Verification:** `NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE.` Never state that tests pass, code works, or a bug is fixed unless you have executed the verification command in the current turn and inspected its exit code and output.

---

## Antigravity Native Tool Mapping
1. **Execute Tests & Capture Evidence (`run_command`):**
   - Run targeted tests during iteration, followed by the full module/repository test suite before completion.
   - Use `python .akit/runtime/akit_cli.py checks --project . --out .akit/evidence.json -- <test-command>` to persist timestamped command, `exit_code`, and `stdout`/`stderr` evidence.
2. **Design Risk-Based Test Matrix:** Consult `references/test-strategy-matrix.md` to select the right mix of Unit, Integration, Contract, and E2E tests.

---

## Step-by-Step Testing & Verification Workflow

### Step 1: Map Acceptance Criteria to the Testing Trophy (`references/test-strategy-matrix.md`)
1. **Static Analysis Layer:** Strict typechecking (`tsc --noEmit`, `pyright`, `mypy`) and linting catch signature mismatches at zero runtime cost.
2. **Unit Tests (Fast, Pure Domain Logic):** Test complex calculations, state machines, parsers, and validators with zero I/O or network dependencies.
3. **Integration Tests (Highest ROI for Backend/Data):** Test Controller $\rightarrow$ Service $\rightarrow$ Real Disposable Test Database (PostgreSQL/SQLite) to verify SQL constraints, transactions, migrations, and auth guards together.
4. **End-to-End Tests (`akit-browser-qa`):** Reserve for critical user journeys (login, checkout, core workflow).

### Step 2: Cover the 5 Mandatory Risk Categories
For every non-trivial feature, include explicit test cases for:
1. **Happy Path:** Valid input produces expected output and persisted state.
2. **Boundary & Malformed Input:** `null`, `""`, `0`, negative numbers, oversized arrays, Unicode/special chars, invalid enums.
3. **Authorization & Tenant Isolation (`akit-security`):** Unauthenticated (`401`) and cross-tenant/unauthorized (`403`/`404`) requests fail without mutating state.
4. **Idempotency & Concurrency:** Duplicate requests or concurrent workers do not create duplicate records or corrupt balances.
5. **Failure & Rollback:** When a downstream step throws, database transactions roll back cleanly without leaving orphan rows.

### Step 3: Eliminate Test Flakiness (Condition-Based Waiting)
1. Never use arbitrary `sleep(1000)` / `setTimeout` to wait for async work. Poll on observable state transitions, promise resolutions, or deterministic fake timers.
2. Isolate every test's state: roll back database transactions (`BEGIN ... ROLLBACK`) or truncate tables between tests so test execution order (`--random` / parallel workers) never changes outcomes.

### Step 4: Execute the 4-Pillar Gate Function (`Evidence-Based Completion & 100% Test Pass`)
Before reporting task completion to the user:
1. **IDENTIFY & RUN** all 4 mandatory verification gates freshly via `run_command`:
   - `typecheck` (`tsc --noEmit` / `pyright` / `mypy` — strict mode, zero unapproved `any`)
   - `lint` (`eslint` / `ruff` — exit code `0`)
   - `test` (**100% Test Case Pass Gate**: every unit, integration, cross-tenant, and business-invariant test case must pass with `0 failed`, `0 errors`, and zero `.skip` workarounds; if any test fails, enter `akit-debug` and fix until 100% pass)
   - `review` (independent reviewer subagent `akit-critic` / `akit-security` verdict)
2. **DISCLOSE UNVERIFIED GATES HONESTLY:** If any command cannot be run in the current environment, report **`CHƯA XÁC MINH (UNVERIFIED)`** with the exact blocker — never claim completion without disclosing unverified checks.
3. **APPEND FINAL REPORT:** Include the structured **Engineering Gates & Verification Report** table (`python -m akit.eval --mode gates --report-md`) at the end of the final response.

---

## Red Flags & Rationalization Counter-Table

| Common Excuse / Rationalization | Engineering Reality & Mandatory Action |
| :--- | :--- |
| *"I mocked the repository, service, and validator, and my test passed!"* | If you mock out the system under test, you are only testing that your mock returns what you told it to return. Test real domain/DB integration wherever possible. |
| *"The tests passed 10 minutes ago before my last small edit, so they still pass."* | "Small edits" break imports and assertions constantly. Re-run the test suite after your final edit. |
| *"One unrelated test is failing, so I'll comment it out or add `.skip`."* | **Strictly forbidden.** Never disable failing tests to manufacture a green suite. Investigate with `akit-debug`. |
| *"I can't run the DB integration tests locally, so I'll just say 'All tests passed'."* | Lying about test execution destroys trust. Report `Unit tests: 14 passed (exit 0); DB integration tests: BLOCKED (local Postgres not running)`. |

---

## Safety & Exit Gates
- **Hard Stop:** Never point test suites at production or shared staging databases that contain live user data; verify `NODE_ENV=test` / disposable test DB URL before running destructive test migrations.
- Always include the exact executed command and exit code in your final response.

## Reference Materials & Attribution
- Testing Trophy allocation matrix, boundary test catalog, and anti-flake patterns: `references/test-strategy-matrix.md`
- Inspired by `obra/superpowers` (`test-driven-development`, `verification-before-completion`) and `getsentry/skills`. Original AKit instructions.
