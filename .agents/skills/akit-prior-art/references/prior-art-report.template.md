# Prior-Art Comparison & Adopt/Adapt/Build Report Template (`akit-prior-art`)

Save completed reports to `docs/prior-art/<feature-slug>.md` or include inline in the design spec before implementation.

---

```markdown
# Prior-Art Investigation Report: [Feature / Capability Name]

## 1. Capability & Constraint Summary
- **Capability Statement:** [One sentence describing what we need to build]
- **Target Stack & Environment:** [e.g., NestJS 11, PostgreSQL 16, Redis 7, TypeScript 5.7]
- **License Policy:** [e.g., Permissive only (MIT / Apache-2.0 / BSD) for dependencies]
- **Internal Repo Check (`akit-codebase`):** [Does our repo or lockfile already contain a solution? Cite files Checked]

---

## 2. Shortlisted Open-Source Candidates (2–3 Repositories)

| Candidate (`Owner/Repo @ Tag/SHA`) | License (Verified) | Maintenance & Tests | Core Mechanism / Schema Pattern | Strengths | Weaknesses / Pitfalls |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `owner/repo-a @ v2.4.0` | `MIT` | Active; full integration suite | `[e.g., Postgres SELECT FOR UPDATE SKIP LOCKED + TTL expiry column]` | Zero external broker needed | Requires index on `(status, expires_at)` |
| `owner/repo-b @ main` | `Apache-2.0` | Active; unit + e2e | `[e.g., Redis Lua atomic script + outbox table]` | Sub-millisecond lock contention | Dual-write risk if Redis restarts without AOF |

---

## 3. Deep-Dive File & Edge-Case Evidence
### Candidate 1: `owner/repo-a`
- **Files Inspected:**
  - `src/reservations/reservation.service.ts` (locking & transaction boundary)
  - `prisma/migrations/.../migration.sql` (unique partial index)
  - `test/reservation.concurrency.spec.ts` (parallel booking race test)
- **Key Edge Cases Discovered:**
  1. **Abandoned Hold Expiry:** What happens when a user closes the browser mid-checkout? (Solved via `expires_at > NOW()` predicate rather than background cron alone).
  2. **Idempotent Retry:** Duplicate `POST /reserve` with the same `idempotency_key` returns existing hold instead of throwing `409 Conflict`.
  3. **Deadlock Prevention:** Sorting requested seat IDs ascending before acquiring row locks prevents AB-BA deadlocks!

---

## 4. Final Decision: [`ADOPT` | `ADAPT` | `BUILD`]
- **Chosen Verdict:** `[ADAPT architectural pattern / ADOPT package X / BUILD custom]`
- **Justification:** `[2-3 sentences comparing maintenance cost, dependency weight, and stack alignment]`
- **License Compliance Note:** `[Confirmed MIT/Apache-2.0 / Reimplemented clean-room from high-level concept]`

---

## 5. Edge Cases Promoted to `akit-test` Acceptance Suite
- [ ] **Test 1 (Concurrency Race):** 10 parallel requests attempting to lock the same resource $\rightarrow$ exactly 1 succeeds, 9 receive `409 Conflict`.
- [ ] **Test 2 (Deadlock Order):** Request A locks `[seat-2, seat-1]` while Request B locks `[seat-1, seat-2]` $\rightarrow$ deterministic ascending lock order prevents deadlock.
- [ ] **Test 3 (TTL Expiry Recovery):** Expired hold (`expires_at < NOW()`) allows immediate re-booking without manual cleanup.
```
