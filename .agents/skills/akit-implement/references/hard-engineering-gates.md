# The 6 Hard Engineering Gates & 100% Test Pass Verification Standard

This reference codifies the **6 Non-Negotiable Production Engineering Gates** plus the **100% Test Case Pass & Final Report Protocol** enforced across all AKit implementations (`akit-implement`, `akit-security`, `akit-data`, `akit-postgres`, `akit-review`, `akit-test`, `akit-deliver`).

---

## Gate 1: Strict Type Safety (`TypeScript strict` + `ESLint` + Zero Unapproved `any`)

### Mandatory Rules
1. **No Unapproved `any`:**
   - **Strictly forbidden:** `: any`, `as any`, `<any>`, `any[]`, `@ts-ignore`, `@ts-expect-error` (without description), or `eslint-disable @typescript-eslint/no-explicit-any`.
   - Use `unknown` with runtime type narrowing (Zod / TypeBox / custom type guards), discriminated unions, or explicit generics `<T extends Record<string, unknown>>`.
   - **Approved Exception Format:** In the rare case where a third-party untyped SDK requires an escape hatch, the exact line MUST include an inline approval comment after explicit user approval:
     ```ts
     const rawPayload: any = legacySdk.parse(buf); // APPROVED-ANY: legacy v1 SDK lacks typings, approved by user on 2026-11-04
     ```
2. **Compiler & Linter Enforcement:**
   - `tsconfig.json` MUST enable `"strict": true` (`noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `noImplicitThis`, `alwaysStrict`) and ideally `"noUncheckedIndexedAccess": true`.
   - `ESLint` MUST be configured and executed (`npx eslint . --max-warnings=0`) with `@typescript-eslint/no-explicit-any: "error"`.

---

## Gate 2: Multi-tenant Security (Mandatory Cross-Account Access Tests)

### Mandatory Rules
1. **Query-Level Owner / Tenant Scoping:**
   - Every API endpoint or service method that reads, creates, updates, or deletes personal or tenant-scoped data (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) MUST bind `userId` / `organizationId` / `tenantId` **directly from the verified authentication token/session** (`req.user.id`), NEVER from client-supplied body/query parameters.
   - Database queries MUST include the tenant filter in the `WHERE` predicate (`WHERE id = $1 AND user_id = $2`) or enforce PostgreSQL Row Level Security (`USING ((SELECT auth.uid()) = user_id)`).
2. **Mandatory Cross-Account Isolation Tests:**
   - **No personal-data API is complete without an automated cross-account test.**
   - For every Read / Update / Delete / Create-with-Relation endpoint, write an automated test with **User A** and **User B**:
     - User A requests `GET /api/resources/:userBResourceId` $\rightarrow$ returns `403 Forbidden` or `404 Not Found` (zero data leaked).
     - User A requests `PATCH / PUT /api/resources/:userBResourceId` $\rightarrow$ returns `403`/`404` AND querying the database as User B confirms the record was **not modified**.
     - User A requests `DELETE /api/resources/:userBResourceId` $\rightarrow$ returns `403`/`404` AND querying the database confirms User B's record **still exists**.

---

## Gate 3: Business Invariants (Create / Update / Delete Domain Integrity)

### Mandatory Rules
Every state-mutating operation (`Create`, `Update`, `Delete`) MUST enforce three invariant layers inside the domain/application service before persisting:
1. **Relational Ownership & Existence (`Quan hệ dữ liệu`):**
   - When linking foreign keys (e.g., creating/moving a transaction into a `walletId` or `categoryId`), verify that the target `wallet` and `category` exist, are not soft-deleted/archived, **and belong to the same `userId`/`tenantId`**.
2. **Valid Lifecycle State Transitions (`Trạng thái hợp lệ`):**
   - Explicitly validate the current entity state against the allowed state machine before applying edits or deletions (e.g., a `CLOSED` / `LOCKED` / `RECONCILED` transaction or period cannot be edited or deleted without an explicit reversal workflow).
3. **Domain & Accounting Constraints (`Ràng buộc nghiệp vụ`):**
   - Validate positive/non-zero monetary amounts, currency match between transaction and wallet, budget ceiling rules, date range validity, and atomic recalculation of derived balances (`Update` must reverse old amount/wallet impact and apply new amount/wallet impact atomically; `Delete` must restore/revert the balance impact atomically).

---

## Gate 4: Safe Database Operations (4-Point Pre-Flight Before Sensitive Writes)

### Mandatory 4-Point Pre-Flight Checklist
Before executing or shipping any sensitive write (`CREATE`, `UPDATE`, `DELETE`, balance mutation, bulk import, or schema migration), verify all four dimensions:
1. **Foreign Key (`Khóa ngoại`):**
   - Are `FOREIGN KEY` constraints declared in the DB schema (`schema.prisma` / SQL DDL) and are all FK columns explicitly indexed?
2. **Cascade & Orphan Policy (`ON DELETE`):**
   - Is `ON DELETE RESTRICT` / `SET NULL` / `CASCADE` intentionally chosen?
   - **Rule of thumb:** Use `RESTRICT` (or soft-delete `deleted_at`) for financial ledgers, wallets, categories, and users so deleting a category or wallet never silently wipes historical transactions!
3. **Atomic Transaction (`Giao dịch nguyên tử`):**
   - Any operation that touches $\ge 2$ tables or mutates a record + updates a balance/summary MUST run inside a single atomic transaction (`prisma.$transaction(...)` / `BEGIN ... COMMIT`).
4. **Concurrency Control (`Chống xung đột đồng thời`):**
   - Prevent lost updates and double-spends using atomic conditional SQL (`UPDATE wallets SET balance = balance - $1 WHERE id = $2 AND user_id = $3 AND balance >= $1 RETURNING *`), pessimistic row locking (`SELECT ... FOR UPDATE` ordered by ascending ID to prevent deadlocks), or optimistic concurrency (`WHERE id = $1 AND version = $2`).

---

## Gate 5: Independent Review (Self-Review Is Never Sufficient)

### Mandatory Rules
1. **Author Bias Prohibition:**
   - The agent that wrote the implementation code **MUST NOT** treat its own inline self-check as a completed review for any non-trivial or sensitive change (API endpoints, auth/multi-tenant logic, business invariants, database writes, schema migrations).
2. **Independent Reviewer Dispatch:**
   - Dispatch an independent read-only reviewer subagent (`invoke_subagent` with `.agents/agents/akit-critic.md` and/or `.agents/agents/akit-security.md`) providing the exact `BASE_SHA..HEAD_SHA` diff and spec requirements.
   - All `CRITICAL` and `HIGH` / `Important` findings from the independent reviewer must be resolved and re-verified before claiming completion.

---

## Gate 6: Evidence-based Completion & 100% Test Case Pass Gate

### Mandatory Rules
1. **Four Required Verification Pillars:**
   - Never report a task as `DONE` or completed until you have executed and inspected real outputs in the current session for:
     1. **`typecheck`**: e.g., `npx tsc --noEmit` / `pyright` / `mypy` (`exit_code == 0`)
     2. **`lint`**: e.g., `npx eslint . --max-warnings=0` / `ruff check .` (`exit_code == 0`)
     3. **`test` (100% Pass Gate)**: e.g., `npm test` / `pytest` / `python -m unittest` — **100% of test cases MUST pass (`0 failures, 0 errors`, zero `.skip` workarounds)**.
     4. **`review`**: Independent subagent review (`akit-critic` / `akit-security`) verdict (`APPROVED` / `PASS`).
2. **Honest Disclosure of Unverified Checks (`CHƯA XÁC MINH`):**
   - If any pillar cannot be executed (e.g., database container not running, binary missing, sandbox limitation), you MUST explicitly state **`CHƯA XÁC MINH (UNVERIFIED)`** with the exact reason — never imply or assume it passed.
   - **Fail-Closed CLI Enforcement (`akit/eval.py`):**
     - `db_safety_checked`, `invariants_checked`, and `cross_tenant_evidence` NEVER default to `True`. Missing evidence on an applicable code diff produces `UNVERIFIED` and causes `python -m akit.eval --mode gates` to exit with code `1` (`0=PASS`, `1=FAIL/UNVERIFIED`, `2=invalid input`).
     - Test suites with `total_tests == 0` fail with `NO_TESTS` even if `exit_code == 0`.
     - Cross-tenant security requires executed integration test evidence (`test_id`, `status: "passed"`, `db_unchanged: true`), never regex-only matches on `403`/`404` in comments or test names.
     - Independent review evidence validates `head_sha` and `diff_sha256` so post-review diff edits automatically invalidate the review.
     - Documentation-only diffs (e.g. `README.md`) mark non-applicable gates as `NOT_APPLICABLE` (`⚪ N/A`) with an explicit reason rather than faking `PASS`.
3. **Mandatory Final Verification Report Table:**
   - Append the standardized **Báo cáo Xác minh & Cổng Kỹ thuật (Engineering Gates & Verification Report)** table (generated via `python -m akit.eval --mode gates --report-md` or following the exact template) at the very end of your completion response.
