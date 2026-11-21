# Reproducible Performance Benchmark Report Template (`akit-performance`)

Complete this report with real measured numbers before claiming any latency, throughput, or bundle-size improvement.

---

```markdown
# Performance Benchmark Report: [Operation / Endpoint / Page Name]

## 1. Workload & Environment Specification
- **Target Operation:** `[e.g., GET /api/v1/orders?limit=50 or /dashboard initial load]`
- **Environment:** `[OS, CPU, RAM, Node/Python version, PostgreSQL version]`
- **Dataset Scale:** `[e.g., 100,000 orders, 5,000 users, 10 concurrent workers]`
- **Benchmark Command:** `[Exact repeatable command, e.g., npx autocannon -c 10 -d 15 http://localhost:3000/api/v1/orders]`
- **Target SLA Budget:** `[e.g., p95 < 120ms, LCP < 2.0s, Client JS < 180KB gzip]`

---

## 2. Bottleneck Diagnosis (Before Optimization)
- **Observed Dominant Bottleneck:** `[e.g., N+1 query fetching order_items per order row (51 SQL queries per request)]`
- **Profiler / `EXPLAIN (ANALYZE, BUFFERS)` Evidence:**
  ```text
  [Paste exact EXPLAIN plan, flamegraph summary, or bundle analyzer output]
  ```

---

## 3. Before vs. After Measured Comparison

| Metric | Baseline (Before) | Optimized (After) | Delta (`Absolute` / `%`) | Target Met? |
| :--- | :--- | :--- | :--- | :--- |
| **p50 Latency** | `[e.g., 210 ms]` | `[e.g., 24 ms]` | `-186 ms (-88.5%)` | Yes |
| **p95 Latency** | `[e.g., 480 ms]` | `[e.g., 49 ms]` | `-431 ms (-89.8%)` | Yes |
| **p99 Latency** | `[e.g., 790 ms]` | `[e.g., 78 ms]` | `-712 ms (-90.1%)` | Yes |
| **DB Queries / Req** | `[51]` | `[2 (batched)]` | `-49 queries` | Yes |
| **Shared Buffers Read** | `[4,200 blocks]` | `[18 blocks]` | `-99.5% I/O` | Yes |

---

## 4. Core Web Vitals Checklist (For Frontend Changes)
- [ ] **LCP (Largest Contentful Paint < 2.5s):** Hero image/data fetched on server without client waterfall; `fetchpriority="high"` applied.
- [ ] **INP (Interaction to Next Paint < 200ms):** Heavy filtering/sorting debounced or moved off the main thread; no full-tree re-renders on keystroke.
- [ ] **CLS (Cumulative Layout Shift < 0.1):** Explicit dimensions/skeletons reserved for all async media, fonts, and dynamic banners.

---

## 5. Correctness & Rollback Verification
- **Functional Test Suite Command & Exit Code:** `[Command -> Exit 0]`
- **Tradeoffs / Cache Invalidation Risk:** `[None or explicit mitigation]`
- **Rollback Plan:** `[How to revert safely if regression occurs]`
```
