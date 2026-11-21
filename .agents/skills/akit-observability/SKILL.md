---
name: akit-observability
description: Use when instrumenting backend services or web apps with structured JSON logging, request correlation IDs, Sentry-style error context, readiness/liveness health checks, or incident triage runbooks.
---
# AKit Observability — Structured Telemetry, Error Context & Runbooks

## Overview
`akit-observability` equips applications for production diagnosability, combining **error context and telemetry discipline** from `getsentry/skills` with operational readiness patterns from `shanraisshan/claude-code-best-practice` and `affaan-m/everything-claude-code`. When a production request fails at 3 AM, engineers should be able to reconstruct the exact causal path in 60 seconds using a single `requestId` / `traceId` without exposing a single secret or PII field.

**Core principle:** Every error and log entry must carry structured correlation context (`requestId`, `tenantId`, `operation`, `durationMs`, `errorCode`) and zero secrets/PII.

---

## Antigravity Native Tool Mapping
1. **Inspect Existing Logger & Error Filter (`read_file`):** Check how the repository initializes its logger (`pino`, `winston`, `structlog`, `logging`) and global exception filter before adding log statements.
2. **Generate Incident & Service Runbook (`write_file`):** Create or update operational runbooks using `references/runbook.template.md`.
3. **Verify Health & Log Redaction (`run_command`):** Write unit/integration tests verifying that health endpoints report dependency status accurately and log redaction strips `Authorization`, `password`, and `token` fields.

---

## Step-by-Step Observability Workflow

### Step 1: Instrument the Four Golden Signals & User Journeys
Focus telemetry on critical user-facing flows (auth, checkout, data mutation, background jobs) across:
1. **Latency:** Request and job duration (`p50`, `p95`, `p99`), separating successful requests from fast-failing `4xx`/`5xx` responses!
2. **Traffic:** Requests per second / queue enqueue rate by route and tenant tier.
3. **Errors:** Rate of unhandled exceptions (`5xx`), domain rejections (`4xx`), and dead-letter queue failures by `errorCode`.
4. **Saturation:** Database connection pool utilization, queue lag depth, CPU/memory pressure.

### Step 2: Enforce Structured Logging & Correlation Propagation
1. Generate or propagate an incoming `x-request-id` / W3C `traceparent` header at the edge middleware and bind it to async context (`AsyncLocalStorage` in Node.js; `contextvars` in Python).
2. Emit structured JSON logs containing:
   - `timestamp` (ISO-8601 UTC), `level`, `requestId`, `service`, `operation`, `actorId` / `tenantId` (opaque IDs only), `durationMs`, and `errorCode`.
3. **Mandatory Log Redaction (`akit-security`):** Configure automatic serializer redaction for `req.headers.authorization`, `req.headers.cookie`, `password`, `token`, `secret`, `creditCard`, `ssn`, and raw email/phone PII.

### Step 3: Enrich Error Telemetry (`getsentry/skills` Discipline)
1. **Never Swallow or Flatten Exceptions:** When catching and re-throwing an error across layers, preserve the original cause (`new DomainError('Failed to charge invoice', { cause: err, context: { invoiceId } })`).
2. Attach safe diagnostic breadcrumbs/tags (`tenantId`, `invoiceId`, `providerStatus`) so error trackers (Sentry / OpenTelemetry) group root causes accurately without dumping raw request bodies.

### Step 4: Implement Liveness vs. Readiness Health Checks & Runbooks
1. **Liveness (`GET /health/live`):** Lightweight check confirming the process event loop is responsive (does NOT query external DBs, avoiding cascading restart storms when a DB blips!).
2. **Readiness (`GET /health/ready`):** Verifies critical dependencies (`SELECT 1` on PostgreSQL + Redis ping with a strict `2s` timeout) to control load-balancer traffic routing.
3. Document alert thresholds and step-by-step recovery commands in `references/runbook.template.md`.

---

## Red Flags & Rationalization Counter-Table

| Common Excuse / Rationalization | Engineering Reality & Mandatory Action |
| :--- | :--- |
| *"I'll log `logger.error('Failed:', req.body, req.headers)` to make debugging easy."* | **Severe security & compliance violation!** Dumps plaintext passwords, bearer tokens, and PII into log aggregators. Log only safe resource IDs and configure field redaction. |
| *"Our `/health` liveness probe runs 5 heavy database and third-party API checks."* | If a third-party API slows down, Kubernetes restarts all your healthy pods simultaneously! Separate `/health/live` (process only) from `/health/ready` (dependencies). |
| *"We'll alert on every single `WARN` log or CPU spike."* | Alert fatigue causes engineers to mute notifications. Tie paging alerts strictly to user-visible SLO symptoms (e.g., `5xx rate > 1% for 5m`, `queue lag > 10m`). |

---

## Safety & Exit Gates
- Audit all new log statements and error payloads to confirm zero secrets, tokens, or PII can be emitted.
- Never claim external APM/Sentry dashboards or alerts are active in production unless verified by the user.

## Reference Materials & Attribution
- Service observability checklist, structured log schema, and incident triage runbook template: `references/runbook.template.md`
- Inspired by `getsentry/skills`, `shanraisshan/claude-code-best-practice`, and `affaan-m/everything-claude-code`. Original AKit instructions.
