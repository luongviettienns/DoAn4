---
name: akit-postgres
description: Use when designing PostgreSQL schemas, choosing index types (B-Tree, GIN, GiST, BRIN, partial, covering), analyzing EXPLAIN (ANALYZE, BUFFERS) plans, configuring Row Level Security (RLS), or preventing transaction deadlocks.
---
# AKit PostgreSQL — High-Performance Postgres, Indexing & RLS Playbook

## Overview
`akit-postgres` synthesizes production PostgreSQL engineering from `supabase/agent-skills` (`supabase-postgres-best-practices`) and `microsoft/postgres-skills`. It covers strict relational constraints, access-path index selection, `EXPLAIN (ANALYZE, BUFFERS)` plan interpretation, high-performance Row Level Security (RLS), connection pooling (`PgBouncer`), and lock-safe zero-downtime DDL migrations.

**Core principle:** Enforce data integrity at the database boundary first, index for actual query predicates and sort orders, and never deploy a slow query or RLS policy without inspecting its execution plan.

---

## Antigravity Native Tool Mapping
1. **Inspect Schema & Migrations (`read_file`):** Read `schema.prisma`, TypeORM/Drizzle/SQLAlchemy models, and raw `.sql` migration files before proposing DDL changes.
2. **Delegate Architecture & Security Review (`invoke_subagent`):**
   - For multi-table schema & index design $\rightarrow$ `.agents/agents/akit-architect.md`.
   - For Supabase / PostgreSQL RLS policy audits $\rightarrow$ `.agents/agents/akit-security.md`.
3. **Reference Playbook:** Consult `references/postgres-optimization-and-rls.md` for index selection, RLS `initPlan` caching, and `EXPLAIN` diagnostics.

---

## Step-by-Step PostgreSQL Engineering Workflow

### Step 1: Enforce Schema Types & Boundary Constraints
1. **Data Types:**
   - Always use `timestamptz` (`TIMESTAMP WITH TIME ZONE`), never `timestamp` without time zone.
   - Use `bigint` or `uuid` (prefer `uuidv7` for time-ordered B-Tree locality where supported) for primary keys.
   - Store money as integer minor units (`bigint` cents) or `numeric(19, 4)` — **never `real` / `double precision` (`float`)**.
   - Use `text` over arbitrary `varchar(255)` unless a strict domain length check (`CHECK (char_length(code) <= 32)`) is required.
2. **Database Constraints:** Define `PRIMARY KEY`, `FOREIGN KEY` (with explicit `ON DELETE` behavior), `NOT NULL`, `UNIQUE`, and `CHECK` constraints in the database — application validation alone can be bypassed by race conditions or scripts.

### Step 2: Design Access-Path Driven Indexes (`references/postgres-optimization-and-rls.md`)
1. **Foreign Keys Are NOT Automatically Indexed in Postgres:** Always create an explicit index on every foreign key column used in `JOIN`s or `ON DELETE CASCADE` checks!
2. **Composite Index Column Order:** Place equality columns (`WHERE tenant_id = $1 AND status = $2`) first, followed by the range or sort column (`ORDER BY created_at DESC`).
3. **Choose the Right Index Access Method:**
   - `B-Tree` (default): Equality and range queries (`=`, `<`, `<=`, `>`, `>=`, `BETWEEN`, `IN`).
   - `GIN`: `jsonb` containment (`@>`), array overlap (`&&`), and full-text search (`tsvector`).
   - `BRIN`: Massive append-only time-series/audit tables ordered physically by `created_at`.
   - **Partial Index (`WHERE ...`):** Index only active rows (e.g., `WHERE deleted_at IS NULL AND status = 'PENDING'`).
   - **Covering Index (`INCLUDE (...)`):** Enable `Index Only Scan` by including payload columns without bloating the B-Tree key.

### Step 3: Optimize Row Level Security (RLS) (`supabase/agent-skills`)
When RLS is used (e.g., Supabase or native Postgres multi-tenancy):
1. **Wrap Context Functions in `(SELECT ...)`:** Write `USING ((SELECT auth.uid()) = user_id)` instead of `USING (auth.uid() = user_id)`. Wrapping in a scalar subquery forces PostgreSQL to evaluate the function **once per query (`initPlan`)** instead of re-evaluating it on every single row!
2. **Index Every RLS Policy Column:** Every column referenced inside a `CREATE POLICY` `USING` or `WITH CHECK` clause must be indexed.

### Step 4: Safe Database Operations Pre-Flight (`Foreign Key`, `Cascade`, `Transaction`, `Concurrency`)
Before executing or approving any sensitive PostgreSQL write or migration, verify all 4 mandatory gates:
1. **Foreign Key & Cascade Audit:** Every relation must declare an explicit `FOREIGN KEY` with an indexed FK column and deliberate `ON DELETE RESTRICT / SET NULL / CASCADE` policy (never allow accidental cascade deletion of financial/audit history).
2. **Prevent Deadlocks & Concurrency Races:** When locking multiple rows in a transaction, sort target IDs in deterministic ascending order before `SELECT ... FOR UPDATE`, or use atomic conditional updates (`UPDATE ... SET balance = balance - $1 WHERE id = $2 AND balance >= $1 RETURNING *`).
3. **Atomic Transactions & Zero Network I/O Inside Locks:** Wrap multi-table mutations in `BEGIN ... COMMIT` (`prisma.$transaction`), and never call Stripe, SendGrid, or webhooks inside an open DB transaction.
4. **Lock-Safe Migrations:** Use `CREATE INDEX CONCURRENTLY` (outside a transaction block), set `lock_timeout = '2s'`, and add `NOT NULL` constraints via `CHECK (...) NOT VALID` followed by `VALIDATE CONSTRAINT`.

---

## Red Flags & Rationalization Counter-Table

| Common Excuse / Rationalization | Engineering Reality & Mandatory Action |
| :--- | :--- |
| *"Foreign keys automatically create an index in PostgreSQL like MySQL InnoDB."* | **False in PostgreSQL!** Unindexed foreign keys cause full-table sequential scans on joins and table locks on parent deletes. Always index FK columns explicitly. |
| *"I'll use `OFFSET 50000 LIMIT 20` for deep pagination."* | Postgres must fetch and discard 50,020 rows on every request. Use keyset/cursor pagination (`WHERE (created_at, id) < ($1, $2) ORDER BY created_at DESC, id DESC LIMIT 20`). |
| *"I'll run `CREATE INDEX` directly in a standard migration on a 50M-row table."* | Standard `CREATE INDEX` acquires a `SHARE` lock that blocks all `INSERT`/`UPDATE`/`DELETE` writes. Use `CREATE INDEX CONCURRENTLY`. |
| *"RLS policy `USING (auth.uid() = owner_id)` is fast enough."* | Calls `auth.uid()` per row scanned. Wrap as `USING ((SELECT auth.uid()) = owner_id)` (`supabase/agent-skills`). |

---

## Safety & Exit Gates
- Never run `EXPLAIN ANALYZE` on mutating statements (`UPDATE`/`DELETE`/`INSERT`) against shared databases without wrapping in `BEGIN; EXPLAIN (ANALYZE, BUFFERS) ...; ROLLBACK;`.
- Never execute destructive DDL (`DROP TABLE`, `DROP COLUMN`, `TRUNCATE`) without explicit user approval and verified backup/expand-migrate-contract plan.

## Reference Materials & Attribution
- Index matrix, `EXPLAIN (ANALYZE, BUFFERS)` decoder, RLS optimization patterns, and lock-safe DDL SQL recipes: `references/postgres-optimization-and-rls.md`
- Inspired by `supabase/agent-skills` and `microsoft/postgres-skills`. Original AKit instructions.
