---
name: akit-performance
description: Use when diagnosing slow page loads, Core Web Vitals regressions (LCP, INP, CLS), high API p95/p99 latency, memory bloat, or database query bottlenecks using reproducible before-and-after benchmarks.
---
# AKit Performance — Measure First, Profile Bottlenecks, Verify Gains

## Overview
`akit-performance` enforces empirical performance engineering across frontend (`vercel-labs/agent-skills`), backend APIs, and PostgreSQL (`supabase/agent-skills`, `microsoft/postgres-skills`). Premature optimization without a baseline measurement adds complexity while missing the real bottleneck.

**Core principle:** Never claim a performance improvement without a reproducible before/after measurement under an identical workload.

---

## End-to-End Latency Breakdown Matrix

| Layer | Key Metrics | Primary Diagnostic Tool | Common High-Impact Bottlenecks |
| :--- | :--- | :--- | :--- |
| **Frontend / Browser** | `LCP` (<2.5s), `INP` (<200ms), `CLS` (<0.1), JS Bundle Size | Lighthouse, Chrome DevTools Performance, `next build` analyzer | Sequential fetch waterfalls, unoptimized hero images, giant client JS bundles, long main-thread tasks |
| **API / Application** | `p50`, `p95`, `p99` latency, RPS, CPU/Heap saturation | Benchmark script (`hyperfine`, `autocannon`, `k6`, `pytest-benchmark`), flamegraphs | N+1 service calls, synchronous crypto/serialization on event loop, unbounded in-memory arrays |
| **Database (`akit-postgres`)** | Query execution time, `Buffers: shared hit/read`, lock wait time | `EXPLAIN (ANALYZE, BUFFERS)`, `pg_stat_statements` | Sequential table scans (`Seq Scan`), missing composite/partial indexes, RLS per-row function evaluation |

---

## Antigravity Native Tool Mapping
1. **Capture Baseline Evidence (`run_command`):**
   - Run the reproducible benchmark or profiler command BEFORE editing any code and record results via `python .akit/runtime/akit_cli.py checks --out .akit/perf-baseline.json -- <cmd>`.
2. **Record Structured Comparison (`write_file`):**
   - Document workload parameters, dataset scale, and before/after p50/p95 numbers using `references/benchmark.template.md`.
3. **Cross-Skill Specialization:**
   - For React/Next.js rendering & waterfall bottlenecks $\rightarrow$ combine with `akit-react`.
   - For PostgreSQL query plans and index tuning $\rightarrow$ combine with `akit-postgres`.

---

## Step-by-Step Performance Engineering Workflow

### Step 1: Define the Target SLA & Capture the Baseline
1. State the exact operation, realistic dataset size (e.g., 50,000 rows, not 3 test rows!), concurrency level, and target budget (e.g., `p95 < 150ms`).
2. Execute the baseline measurement at least 3 times (after warm-up) and record `p50`, `p95`, `p99`, and resource usage in `references/benchmark.template.md`.

### Step 2: Isolate the Dominant Bottleneck (Amdahl's Law)
1. Break total request time into: **Network Waterfall** + **App Compute/Serialization** + **DB Query Time** + **Client Render**.
2. Focus 100% of optimization effort on the segment consuming the largest share of latency. Do not micro-optimize a 0.2ms loop when a sequential DB waterfall takes 480ms.

### Step 3: Apply One Targeted Optimization at a Time
- **Network / Async IO:** Replace sequential `await` loops with `Promise.all` / batch queries (`WHERE id = ANY($1)`).
- **Database Queries:** Add targeted composite/covering indexes, paginate unbounded queries (cursor pagination over `OFFSET 50000`), and cache per-request auth context in RLS (`(select auth.uid())`).
- **Frontend Bundle & Render:** Move static/data components to Server Components, dynamic-import heavy charts/editors, memoize expensive list item subtrees, and set explicit image dimensions (`fetchpriority="high"` on LCP image).

### Step 4: Re-Measure Under Identical Conditions & Verify Correctness
1. Run the exact same benchmark script and dataset used in Step 1.
2. Run the full functional test suite (`akit-test`) to prove the optimization did not break correctness, authorization, or cache consistency.
3. If the change improved latency by `< 5%` while increasing code complexity, **revert it** (`akit-simplify`).

---

## Red Flags & Rationalization Counter-Table

| Common Excuse / Rationalization | Engineering Reality & Mandatory Action |
| :--- | :--- |
| *"This should be ~3x faster now (no benchmark run)."* | **Fabricated metric.** Never state a percentage speedup unless you measured both baseline and post-change under identical conditions. |
| *"EXPLAIN ANALYZE ran in 0.4ms on my local table with 5 rows."* | Postgres chooses `Seq Scan` on tiny tables regardless of indexes. Benchmark with realistic row counts or inspect index usage explicitly. |
| *"Let's add a Redis cache layer in front of this slow query first."* | Caching an unindexed $O(N)$ query hides the root cause and introduces cache-invalidation bugs. Fix the query and index (`akit-postgres`) before adding distributed caches. |
| *"I changed 4 things at once and latency dropped."* | You don't know which change helped and which added dead weight. Isolate variables. |

---

## Safety & Exit Gates
- Never run `EXPLAIN ANALYZE` on mutating queries (`UPDATE` / `DELETE` / `INSERT`) in production or shared environments without wrapping in `BEGIN; ... ROLLBACK;` — `EXPLAIN ANALYZE` actually executes the query!
- Never run high-concurrency load tests against production or third-party endpoints without explicit authorization.

## Reference Materials & Attribution
- Reproducible benchmark report template & Core Web Vitals checklist: `references/benchmark.template.md`
- Inspired by `vercel-labs/agent-skills`, `supabase/agent-skills`, and `microsoft/postgres-skills`. Original AKit instructions.
