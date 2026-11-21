---
name: akit-deliver
description: Use when preparing a feature or application for production release, client handoff, CI/CD pipeline verification, environment variable auditing, or zero-downtime deployment and rollback planning.
---
# AKit Deliver — Production Release Readiness, Rollback & Handoff

## Overview
`akit-deliver` governs the final mile of software engineering — turning verified code into a safely deployable release with complete operational handoff (`datawhalechina/easy-vibe`, `shanraisshan/claude-code-best-practice`, and `obra/superpowers` `verification-before-completion`).

**Core principle:** A feature is not ready to ship until its build, tests, environment variable contract, database migration order, observability health checks, and tested rollback plan are documented and verified.

---

## Antigravity Native Tool Mapping
1. **Run Final Verification Suite (`run_command`):**
   - Execute the full build, lint, typecheck, and test suite via `python .akit/runtime/akit_cli.py checks --out .akit/release-evidence.json -- <command>`.
2. **Audit Git & Secret Hygiene (`run_command`):**
   - Run `git status --short` and `git diff --stat` to confirm zero untracked temporary files, debug logs, or secrets are staged.
3. **Generate Release & Handoff Package (`write_file`):**
   - Produce the release record and rollback runbook using `references/release-checklist.md`.

---

## Step-by-Step Release & Delivery Workflow

### Step 1: Pre-Release 6 Hard Engineering Gates & 100% Test Pass Audit
Confirm all 6 Hard Engineering Gates have passed with fresh command evidence (`python -m akit.eval --mode gates --report-md`):
1. **Strict Type Safety & Linting:** `tsc --noEmit` (`"strict": true`, zero unapproved `any` without `APPROVED-ANY:`) and `eslint` return Exit `0`.
2. **100% Test Case Pass & Multi-Tenant Security (`akit-test`, `akit-security`):** **100% of test cases pass** (`0 failures, 0 errors`), including automated **cross-account access tests** (User A $\rightarrow$ User B's personal data returns `403`/`404`) and **business invariant tests** (relational ownership, valid state transitions, balance rules).
3. **Safe Database Operations & Independent Review (`akit-data`, `akit-postgres`, `akit-review`):** Foreign key, cascade, atomic transaction, and concurrency checks verified; independent reviewer subagent (`akit-critic` / `akit-security`) returned `APPROVED` (`0 CRITICAL/HIGH` findings).
4. **Honest Evidence & Final Verification Report Table:** Any gate that could not be executed in the current environment MUST be explicitly labeled **`CHƯA XÁC MINH (UNVERIFIED)`**; always append the **Engineering Gates & Verification Report** table at the end of the completion message.

### Step 2: Verify Deployment & Migration Ordering (`akit-data`, `akit-postgres`)
1. Document the exact sequence of deployment operations so zero requests fail during rollout:
   - *Step A:* Verify database backup / snapshot exists.
   - *Step B:* Run backward-compatible **Expand** migration (`CREATE INDEX CONCURRENTLY`, nullable columns).
   - *Step C:* Deploy new application containers and verify `/health/ready` returns `200 OK`.
   - *Step D:* Run batched background backfill (if applicable).

### Step 3: Document Separate App & Database Rollback Plans (`references/release-checklist.md`)
Never assume *"we will just fix forward if production breaks"*:
1. **Application Rollback:** Exact command or CI/CD action to revert to the previous container image or commit SHA within 2 minutes.
2. **Database Rollback:** Because rolling back app code against an incompatible schema change causes an outage, verify that the current database schema remains 100% compatible with the *previous* application version!

### Step 4: Prepare Client / Team Handoff Documentation
1. Summarize **What Shipped** (user-facing changelog), **Configuration Changes** (new env var names, feature flags), **Operational Monitoring** (`akit-observability` alerts/dashboards to watch for the first 30 minutes), and **Known Limitations**.

---

## Red Flags & Rationalization Counter-Table

| Common Excuse / Rationalization | Engineering Reality & Mandatory Action |
| :--- | :--- |
| *"Tests passed, so `npm run build` / production bundling will definitely succeed."* | Dev servers (`vite` / `next dev`) tolerate type errors, missing SSR imports, and broken dynamic chunks that fail `next build` / `tsc -b`. Always run the production build command before claiming readiness. |
| *"I'll put the staging API key inside `.env.example` so the team can test quickly."* | `.env.example` is committed to Git! Never put real staging or production keys in tracked files. Use clearly fake placeholders like `STRIPE_SECRET_KEY=sk_test_REPLACE_ME`. |
| *"I'll run the production deployment command automatically right now."* | **Hard Gate Violation.** Never execute live production deployments, DNS changes, or production database migrations without explicit human confirmation. |

---

## Safety & Exit Gates
- Require explicit human approval before executing any `git push`, `vercel --prod`, `docker push`, `terraform apply`, or production migration command.
- Always disclose any unverified environments or manual smoke tests that the operator must complete post-deploy.

## Reference Materials & Attribution
- Production release readiness checklist, deployment sequence, and rollback runbook template: `references/release-checklist.md`
- Inspired by `datawhalechina/easy-vibe`, `shanraisshan/claude-code-best-practice`, and `obra/superpowers` (`verification-before-completion`). Original AKit instructions.
