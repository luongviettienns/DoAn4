# API & Event Contract Specification Template (`akit-contract`)

Fill in this contract before implementing endpoints or dispatching parallel backend/frontend subagents.

---

```markdown
# Interface Contract: `[Endpoint or Event Name]`

## 1. Operation Metadata & Security Scope
- **Method & Path / Topic:** `[e.g., POST /api/v1/organizations/:orgId/invitations]`
- **Authentication:** `[Bearer JWT Required]`
- **Authorization Rule:** `[Actor must be a member of :orgId with role in ('OWNER', 'ADMIN')]`
- **Idempotency / Rate Limit:** `[Optional Idempotency-Key header (24h TTL); max 20 req/min per org]`
- **Backward Compatibility:** `[Additive / Non-breaking | New Versioned Endpoint]`

---

## 2. Request Schema (Input Trust Boundary)
- **Strict Validation Policy:** Reject unknown fields (`forbidNonWhitelisted` / `extra='forbid'`).

| Field | Location | Type | Required / Nullable | Validation Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `orgId` | `path` | `uuid` | Required | Valid UUID v4/v7 | Target organization ID |
| `email` | `body` | `string` | Required | Lowercase trimmed email, `max 254 chars` | Invitee email address |
| `role` | `body` | `enum` | Required | `'ADMIN' \| 'MEMBER' \| 'VIEWER'` | Assigned role (never `'OWNER'` via invite) |
| `expiresInDays` | `body` | `integer` | Optional (default `7`) | `1 <= val <= 30` | Invitation validity window |

---

## 3. Response Schema (`201 Created` / `200 OK`)
- **Serialization Rule:** Explicit Response DTO only — never return raw ORM entity (exclude `tokenHash`).

```json
{
  "data": {
    "id": "0192d4a0-7c1b-7000-8000-000000000001",
    "organizationId": "0192d49f-1111-7000-8000-000000000000",
    "email": "engineer@example.com",
    "role": "MEMBER",
    "status": "PENDING",
    "expiresAt": "2026-11-04T10:30:00.000Z",
    "createdAt": "2026-10-28T10:30:00.000Z"
  },
  "meta": {
    "requestId": "req_9f8e7d6c5b"
  }
}
```

---

## 4. Deterministic Error Envelope & Status Matrix

| HTTP Status | Machine `error.code` | Trigger Condition | Client UI Recovery Action |
| :--- | :--- | :--- | :--- |
| `400 / 422` | `VALIDATION_FAILED` | Invalid email format or disallowed role | Highlight field via `error.fields` map |
| `401` | `UNAUTHENTICATED` | Missing or expired JWT | Redirect/refresh session |
| `403` | `FORBIDDEN_ROLE` | Caller is `MEMBER` or from another org | Show permission banner |
| `409` | `INVITATION_ALREADY_ACTIVE` | Pending invite already exists for `(orgId, email)` | Offer "Resend invitation" button |
| `429` | `RATE_LIMIT_EXCEEDED` | Exceeded 20 invites/min | Respect `Retry-After` header |
```
