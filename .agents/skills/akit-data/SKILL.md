---
name: akit-data
description: Use when modeling relational domain entities, designing ERD schemas, planning Expand-Migrate-Contract zero-downtime schema migrations, or defining transaction isolation and data integrity invariants.
---
# AKit Data — Relational Modeling, Transactions & Safe Schema Evolution

## Overview
`akit-data` governs database-agnostic relational data modeling, entity relationships, transactional consistency, and zero-downtime **Expand-Migrate-Contract** schema evolution. When the underlying database is PostgreSQL, pair `akit-data` with `akit-postgres` for engine-specific indexing, RLS, and `EXPLAIN` tuning.

**Core principle:** Model domain invariants and state transitions in the schema, not just UI form screens, and never ship a breaking schema change in a single irreversible deployment step.

---

## Antigravity Native Tool Mapping
1. **Inspect Existing Entities & Migrations (`read_file`):** Read current ORM models (`schema.prisma`, `models.py`, `*.entity.ts`) and recent migrations to understand naming (`snake_case` vs. `camelCase`), soft-delete conventions, and audit columns.
2. **Delegate Schema Review (`invoke_subagent`):** Dispatch `.agents/agents/akit-architect.md` to review ERD cardinality, normalization, and migration rollback safety.
3. **Migration Plan Template:** Document schema changes and rollout steps using `references/data-modeling-and-migrations.md`.

---

## Step-by-Step Data Modeling & Migration Workflow

### Step 1: Model Domain Entities, Cardinality & State Machines
1. Derive entities, ownership boundaries (`tenant_id`), and relationships (`1:1`, `1:N`, `M:N` via explicit join tables with timestamps/metadata) from business invariants.
2. Separate **Mutable Current State** (e.g., `wallets.balance_cents`) from **Immutable Append-Only Ledger/History** (e.g., `wallet_ledger_entries` where rows are never updated or deleted).
3. Define explicit lifecycle timestamps (`created_at`, `updated_at`, `deleted_at` or `archived_at`) and idempotency keys (`idempotency_key UNIQUE`).

### Step 2: Enforce Multi-Layer Data Integrity & Business Invariants (Create / Update / Delete)
1. **Application Boundary (Business Invariants Gate):**
   - Validate DTO types (`Strict Type Safety`, zero unapproved `any`), **relational ownership** (related foreign records like `walletId` / `categoryId` exist, are active, and belong to the same `userId`/`tenantId`), **valid lifecycle state transitions** (e.g., locked/closed records cannot be mutated), and **domain/accounting invariants** (atomic balance recalculation on create/update/delete).
2. **Database Boundary (4-Point Safe Database Operations Pre-Flight):**
   - Before any sensitive write (`CREATE`, `UPDATE`, `DELETE`, migration), verify all 4 pillars: **Foreign Key** (with explicit index), **Cascade Policy** (`ON DELETE RESTRICT / SET NULL / CASCADE` so deleting a parent never silently wipes historical ledgers), **Atomic Transaction** (`$transaction` / `BEGIN...COMMIT`), and **Concurrency Control** (atomic conditional update / `SELECT ... FOR UPDATE` / optimistic `version` check).

### Step 3: Define Transaction Boundaries & Concurrency Control
1. Identify operations that mutate multiple tables and wrap them in a single atomic database transaction.
2. Choose explicit concurrency control for contended records (`references/data-modeling-and-migrations.md`):
   - **Optimistic Locking:** `UPDATE ... SET version = version + 1 WHERE id = $1 AND version = $2` (best for low-contention user edits).
   - **Pessimistic Row Locking:** `SELECT ... FOR UPDATE` or atomic `UPDATE ... WHERE balance >= $1 RETURNING *` (best for high-contention inventory/balances).

### Step 4: Execute Expand-Migrate-Contract for Breaking Schema Changes
Never rename or drop a column/table while live application instances still query the old name:
1. **Phase 1 (Expand):** Add the new nullable column/table; deploy app code that dual-writes to both old and new columns while reading from old.
2. **Phase 2 (Migrate / Backfill):** Backfill historical rows in small batched transactions (`LIMIT 1000`); switch reads to the new column and add `NOT NULL` constraint.
3. **Phase 3 (Contract):** Remove old-column writes from app code; drop the obsolete column in a subsequent release.

---

## Red Flags & Rationalization Counter-Table

| Common Excuse / Rationalization | Engineering Reality & Mandatory Action |
| :--- | :--- |
| *"I'll rename `user.full_name` to `user.display_name` in one migration and deploy."* | During rolling deployment, old app containers immediately crash with `column "full_name" does not exist`. Use Expand-Migrate-Contract. |
| *"We validate uniqueness in the service with `findOne()` before `create()`, so we don't need a DB `UNIQUE` constraint."* | Classic check-then-act race condition! Two concurrent requests both see `null` from `findOne()` and insert duplicate rows. Always add a DB `UNIQUE` constraint. |
| *"I'll run a backfill `UPDATE` across 10 million rows in a single migration transaction."* | Locks all 10M rows, bloats WAL/vacuum, and takes down production. Backfill in small idempotent batches (`LIMIT 1000`). |
| *"We'll store a comma-separated list of IDs `"1,4,9"` in a text column instead of a join table."* | Violates 1st Normal Form, prevents foreign-key integrity, and makes indexed queries impossible. Use a join table or typed array/jsonb with GIN index. |

---

## Safety & Exit Gates
- Never execute destructive migrations (`DROP`, `TRUNCATE`, irreversible data transforms) on shared or production databases without explicit user approval and verified backup restoration instructions.
- Verify both `up` (apply) and `down` (rollback) migration paths in a disposable test database (`akit-test`).

## Reference Materials & Attribution
- ERD modeling checklist, concurrency locking patterns, and Expand-Migrate-Contract runbook: `references/data-modeling-and-migrations.md`
- Inspired by `supabase/agent-skills`, `microsoft/postgres-skills`, and `obra/superpowers`. Original AKit instructions.
