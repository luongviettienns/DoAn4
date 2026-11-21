# Production Observability & Incident Triage Runbook Template (`akit-observability`)

Use this template to specify structured logging, health checks, high-signal alerts, and incident recovery steps.

---

```markdown
# Operational Runbook: [Service / Subsystem Name]

## 1. Service Overview & Critical Dependencies
- **Primary Owner & Repo Path:** `[e.g., src/billing/]`
- **Critical Downstream Dependencies:** `[PostgreSQL primary, Redis queue, Stripe Webhook API]`
- **Health Endpoints:**
  - Liveness (`GET /health/live`): Returns `200 OK` if process loop is responsive (no DB check).
  - Readiness (`GET /health/ready`): Returns `200 OK` if Postgres (`SELECT 1`, `<1.5s` timeout) and Redis are reachable; otherwise `503 Service Unavailable`.

---

## 2. Structured Log & Redaction Contract
- **Required Correlation Fields:** `timestamp`, `level`, `requestId`, `tenantId`, `operation`, `durationMs`, `errorCode`
- **Redacted Paths (Never Logged):**
  - `req.headers.authorization`, `req.headers.cookie`, `req.headers['x-api-key']`
  - `*.password`, `*.passwordHash`, `*.secret`, `*.token`, `*.refreshToken`, `*.cvv`

---

## 3. Actionable SLO Alerts (Symptom-Driven)

| Alert Name | Trigger Condition | Severity | Immediate Diagnostic Query / Check |
| :--- | :--- | :--- | :--- |
| **High 5xx Error Rate** | `http_requests_5xx_ratio > 0.01` over `5m` | `P1 - Page` | Filter logs by `level="error"` and group by `errorCode` + `operation` |
| **Readiness Probe Failing** | `/health/ready` returning `503` for `> 2m` | `P1 - Page` | Check DB connection pool saturation (`pg_stat_activity`) and Redis reachability |
| **Dead-Letter Queue Growth** | `dlq_jobs_count > 10` | `P2 - Ticket` | Inspect failed job `errorCode` and `lastError` stack trace |

---

## 4. Incident Triage & Mitigation Playbook

### Step 1: Isolate Blast Radius (First 3 Minutes)
1. Identify affected `requestId` or `tenantId` from error telemetry.
2. Check recent deployments or migrations (`git log -n 5 --oneline`).

### Step 2: Safe Mitigation Options
- **If caused by recent code deploy:** Roll back application deployment (`akit-deliver`).
- **If caused by DB lock / slow query:** Identify blocking PID via `pg_stat_activity` (`akit-postgres`) and terminate only the runaway query (`SELECT pg_cancel_backend(pid)`).
- **If caused by external provider outage:** Enable circuit-breaker / queue-deferral flag so incoming requests are queued safely without data loss.

### Step 3: Post-Incident Verification
- [ ] Error rate returned to `< 0.1%` baseline.
- [ ] Dead-letter / deferred queue replayed idempotently.
- [ ] Root cause captured in `akit-debug` regression test.
```
