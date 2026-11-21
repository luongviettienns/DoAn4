# PostgreSQL Indexing, `EXPLAIN` Diagnostics & RLS Reference (`akit-postgres`)

Reference playbook informed by `supabase/agent-skills` and `microsoft/postgres-skills`.

---

## 1. PostgreSQL Index Selection Matrix

| Query Pattern | Optimal Index Type | SQL Example |
| :--- | :--- | :--- |
| `WHERE tenant_id = $1 AND status = $2 ORDER BY created_at DESC` | **Composite B-Tree** (Equality $\rightarrow$ Sort) | `CREATE INDEX CONCURRENTLY idx_orders_tenant_status_created ON orders (tenant_id, status, created_at DESC);` |
| `WHERE status = 'PENDING' AND deleted_at IS NULL` (5% of rows) | **Partial B-Tree Index** | `CREATE INDEX CONCURRENTLY idx_orders_pending ON orders (created_at) WHERE status = 'PENDING' AND deleted_at IS NULL;` |
| Dashboard query selecting only `(id, total_cents)` by `tenant_id` | **Covering Index (`INCLUDE`)** | `CREATE INDEX CONCURRENTLY idx_orders_tenant_cover ON orders (tenant_id, created_at DESC) INCLUDE (id, total_cents);` |
| `WHERE metadata @> '{"plan": "pro"}'` on `jsonb` | **GIN (`jsonb_path_ops`)** | `CREATE INDEX CONCURRENTLY idx_users_meta_gin ON users USING gin (metadata jsonb_path_ops);` |
| `WHERE email ILIKE '%@example.com%'` substring search | **GIN + `pg_trgm`** | `CREATE INDEX CONCURRENTLY idx_users_email_trgm ON users USING gin (email gin_trgm_ops);` |
| 100M-row append-only audit log queried by timestamp range | **BRIN Index** (Tiny footprint) | `CREATE INDEX CONCURRENTLY idx_audit_created_brin ON audit_logs USING brin (created_at);` |

---

## 2. Reading `EXPLAIN (ANALYZE, BUFFERS)` Output

Run inside a safe transaction in non-production environments:
```sql
BEGIN;
EXPLAIN (ANALYZE, BUFFERS, SETTINGS)
SELECT id, total_cents FROM orders WHERE tenant_id = 'org_123' ORDER BY created_at DESC LIMIT 20;
ROLLBACK;
```

| Plan Indicator | What It Means | Action Required |
| :--- | :--- | :--- |
| `Seq Scan on orders (Rows Removed by Filter: 98400)` | Scanning entire table and discarding 98k rows | Add composite/partial index matching `Filter` predicate |
| `Index Only Scan ... Heap Fetches: 14500` | Visibility map is stale; touching table heap anyway | Ensure `AUTOVACUUM` is running or run `VACUUM orders;` |
| `Sort Method: external merge Disk: 48200kB` | Sort spilled from `work_mem` to temporary disk files | Add index matching `ORDER BY` or increase session `work_mem` |
| `Buffers: shared hit=12 read=8400` | Reading 8,400 blocks from disk/OS page cache instead of RAM | Reduce scanned rows via tighter index or covering index |

---

## 3. High-Performance Row Level Security (RLS) (`supabase/agent-skills`)

```sql
-- ❌ SLOW: Evaluates auth.uid() and current_setting() on EVERY row scanned
CREATE POLICY orders_tenant_isolation_slow ON orders
  FOR ALL TO authenticated
  USING (tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')::uuid);

-- ✅ FAST: Scalar subquery `(SELECT ...)` caches result once per query via initPlan
CREATE POLICY orders_tenant_isolation_fast ON orders
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')::uuid));
```

---

## 4. Zero-Downtime Constraint Migration Pattern
Never add a table-locking `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY` or `NOT NULL` in one blocking step on large tables:

```sql
-- Step 1: Fast metadata-only creation (does not scan existing rows under ACCESS EXCLUSIVE lock)
SET lock_timeout = '2s';
ALTER TABLE orders
  ADD CONSTRAINT ck_orders_total_non_negative CHECK (total_cents >= 0) NOT VALID;

-- Step 2: Validate existing rows using SHARE UPDATE EXCLUSIVE lock (allows concurrent reads & writes!)
ALTER TABLE orders
  VALIDATE CONSTRAINT ck_orders_total_non_negative;
```
