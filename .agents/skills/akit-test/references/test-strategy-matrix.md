# Risk-Based Test Strategy Matrix & Anti-Flake Playbook (`akit-test`)

Use this reference to design high-signal test suites that catch real bugs without brittle mocks or timing flakes.

---

## 1. The Testing Trophy Allocation Matrix

| Test Layer | Target Scope | What to Mock vs. Keep Real | Speed Target | When to Prioritize |
| :--- | :--- | :--- | :--- | :--- |
| **Static Types & Lint** | Entire repo (`tsc`, `pyright`, `eslint`, `ruff`) | N/A | `< 5s` | Every edit |
| **Unit Tests** | Pure functions, domain calculators, state machines, parsers | Zero mocks needed (pure inputs $\rightarrow$ outputs) | `< 10ms / test` | Complex branching & edge-case math |
| **Integration Tests** | API Route $\rightarrow$ Service $\rightarrow$ Real Test DB / Redis | Keep DB/ORM **real**; mock only external 3rd-party HTTP APIs (Stripe, SendGrid) | `< 200ms / test` | CRUD, RBAC/RLS authz, SQL constraints, transactions |
| **Contract Tests (`akit-contract`)** | OpenAPI / Zod / JSON Schema validation between Backend & Frontend | Validate actual serializer output against shared schema | `< 20ms / test` | Multi-service or parallel FE/BE builds |
| **Browser E2E (`akit-browser-qa`)** | Critical user flows in real Chromium/WebKit | Full local stack with seeded test data | `< 15s / flow` | Auth, checkout, complex interactive UI |

---

## 2. Boundary & Negative Case Generator Checklist

Whenever writing tests for a function or endpoint, check which of these inputs apply:

| Data Type | Mandatory Boundary & Negative Test Inputs |
| :--- | :--- |
| **Strings / Text** | `""` (empty), `"   "` (whitespace only), 10,000-char string, Unicode/Emoji/RTL (`"Nguyễn 🚀"`), SQL/HTML special chars (`"' OR 1=1--"`, `"<script>"`) |
| **Numbers / Money** | `0`, `-1`, `Number.MAX_SAFE_INTEGER`, floating-point precision (`0.1 + 0.2` $\rightarrow$ always use integer cents!), `NaN` |
| **Collections / Arrays** | `[]` (empty), `[singleItem]`, duplicate items, unsorted items, page limit exceeded (`limit=10000`) |
| **Dates & Timezones** | Leap year (`2024-02-29`), month boundary (`2026-01-31T23:59:59Z`), DST transitions, expired timestamp vs. future timestamp |
| **Identity & Authz** | Anonymous request (`401`), valid user from wrong tenant (`403`/`404`), expired/revoked token, missing role permission |

---

## 3. Anti-Flake Rules (Condition-Based Waiting over `sleep`)

### ❌ BAD: Arbitrary Sleep (Flaky on slow CI, slow on fast dev machine)
```typescript
await triggerBackgroundExport(jobId);
await new Promise((r) => setTimeout(r, 2000));
const job = await getJob(jobId);
expect(job.status).toBe('COMPLETED');
```

### ✅ GOOD: Deterministic Polling Helper with Explicit Timeout
```typescript
await triggerBackgroundExport(jobId);
await expect.poll(() => getJob(jobId).then((j) => j.status), {
  timeout: 5000,
  intervals: [50, 100, 250],
}).toBe('COMPLETED');
```
