# Differential Threat Modeling Template (`akit-security`)

Complete this threat model (informed by `trailofbits/skills`) before implementing or approving changes to authentication, authorization, payments, file uploads, webhooks, or multi-tenant data access.

---

```markdown
# Threat Model & Differential Security Review: [Feature / Subsystem]

## 1. Assets, Actors & Trust Boundaries
- **Protected Assets:** `[e.g., Tenant financial ledgers, OAuth refresh tokens, PII]`
- **Actors & Privilege Levels:**
  1. `Unauthenticated Internet User` (Untrusted)
  2. `Authenticated Tenant Member (role: member)` (Semi-trusted; may attempt horizontal BOLA/IDOR)
  3. `Tenant Admin (role: admin)` (Trusted within own `organizationId` only)
  4. `External Webhook Sender (e.g., Stripe)` (Untrusted until HMAC signature + timestamp verified)
- **Trust Boundaries Crossed:** `[Public Internet -> API Gateway -> Application Service -> PostgreSQL RLS]`

---

## 2. Attack Surface & Source-to-Sink Trace

| Entrypoint (`Route / Handler`) | Attacker-Controlled Input | Sensitive Sink Reached | Required Security Invariant | Verified in Code (`File:Line`) |
| :--- | :--- | :--- | :--- | :--- |
| `POST /v1/webhooks/stripe` | Raw body + `stripe-signature` header | `BillingService.markPaid` | Verify HMAC with raw body + reject replay `> 300s` + idempotent event ID | `webhook.controller.ts#L28-L45` |
| `GET /v1/invoices/:id` | `:id` UUID path param | `InvoicesRepo.findById` | Query MUST include `WHERE id = $1 AND org_id = $2` | `invoices.repo.ts#L62` |

---

## 3. Vulnerability & Invariant Audit Findings

| ID | Severity (`CRITICAL`/`HIGH`/`MEDIUM`/`LOW`) | Category (CWE / OWASP) | Location (`File:Line`) | Preconditions & Concrete Exploit Scenario | Remediation & Regression Test |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `SEC-01` | `CRITICAL` | BOLA / IDOR (`CWE-639`) | `src/docs.service.ts#L88` | Any logged-in user can pass another tenant's `docId` to `DELETE /docs/:id` because `deleteById(id)` omits `orgId` | Scope `DELETE` by `(id, orgId)` + add cross-tenant 404 test |

---

## 4. Verification & Residual Risk Sign-Off
- **Automated Security Tests Executed:** `[Command -> Exit Code]`
- **SAST / Dependency Audit Executed:** `[e.g., semgrep / npm audit -> Result or Not Installed]`
- **Unverified / Residual Risks:** `[Explicitly list any environment or runtime check not yet executed]`
```
