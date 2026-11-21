---
name: akit-contract
description: Use when defining or modifying REST, GraphQL, RPC, or event contracts, shared DTO schemas, pagination shapes, or error payloads between backend and frontend modules or parallel subagents.
---
# AKit Contract — Interface-First API, DTO & Error Specifications

## Overview
`akit-contract` enforces **Contract-First Engineering** across module and service boundaries, drawing from `wshobson/agents`, `shanraisshan/claude-code-best-practice`, and `getsentry/skills`. When backend and frontend code (or parallel subagents) are written without a locked request/response and error contract, integration fails on mismatched field names, missing null checks, inconsistent pagination, and leaked internal database fields.

**Core principle:** Lock the interface contract (types, validation rules, auth scopes, and error shapes) *before* writing parallel implementation code.

---

## Antigravity Native Tool Mapping
1. **Inspect Existing API & Schema Conventions (`read_file`):** Check existing OpenAPI specs (`openapi.yaml`), Zod/TypeBox schemas, NestJS DTOs, or FastAPI Pydantic models to match envelope, casing (`camelCase` vs. `snake_case`), and error format.
2. **Draft & Lock Contract Artifact (`write_file`):** Write or update the contract specification using `references/api-contract.template.md` before dispatching parallel frontend/backend work (`akit-git`).
3. **Delegate Contract Review (`invoke_subagent`):** Dispatch `.agents/agents/akit-architect.md` or `.agents/agents/akit-critic.md` to verify backward compatibility and security boundary rules.

---

## Step-by-Step API Contract Workflow

### Step 1: Identify Consumers, Auth Scopes & Idempotency
1. Specify who calls the endpoint/event (browser SPA, mobile app versioned client, external partner webhook, internal worker).
2. Define exact authentication and authorization requirements (e.g., `Bearer JWT` + `role in ['admin', 'editor']` + tenant ownership `orgId`).
3. For state-mutating `POST` / `PATCH` operations (payments, order creation, invitations), specify the `Idempotency-Key` behavior and duplicate-request status code.

### Step 2: Specify Exact Request & Response Schemas (`references/api-contract.template.md`)
1. **Strict Type Safety & Input DTO Validation (Trust Boundary):**
   - Forbid `any`, `as any`, `@ts-ignore` without `// APPROVED-ANY: <reason>`; require TypeScript `"strict": true` and ESLint.
   - Specify exact types, string length bounds (`min`/`max`), numeric ranges, allowed enums, and optional vs. nullable semantics (`field?: string` vs. `field: string | null`).
   - **Reject Unknown Fields:** Configure strict allowlist validation (`whitelist: true, forbidNonWhitelisted: true` in NestJS; `extra='forbid'` in Pydantic) to block mass-assignment attacks (`akit-security`).
2. **Output DTO Serialization & Multi-Tenant Business Invariants:**
   - Never return raw ORM database entities directly from a controller. Map to an explicit Response DTO that excludes `passwordHash`, internal flags, and cross-tenant metadata.
   - Document required **Business Invariants** (relational ownership checks on foreign keys, valid state transitions) and **Cross-Account Isolation Test** expectations (`403`/`404` when User A accesses User B's personal data).
3. **Pagination, Filtering & Sorting Contract:**
   - Standardize list responses (`items` / `data`, `nextCursor` or `page`/`pageSize`/`total`, and hard `maxLimit <= 100`).

### Step 3: Define Deterministic Error Shapes
Document every expected `4xx` / `5xx` failure using a consistent machine-readable error envelope (`RFC 7807 Problem Details` or repo standard):
- `code`: Stable machine error code (`"INSUFFICIENT_FUNDS"`, `"VALIDATION_ERROR"`, `"RESOURCE_NOT_FOUND"`).
- `message`: Safe user-facing summary.
- `details` / `fields`: Field-level validation failures so UI forms (`akit-react`) can highlight exact inputs.
- `requestId`: Correlation ID (`akit-observability`) for log triage.

### Step 4: Write Contract & Compatibility Tests (`akit-test`)
1. Write automated tests that validate:
   - Valid request $\rightarrow$ matches exact response DTO schema.
   - Missing/invalid field $\rightarrow$ returns `400`/`422` with expected field error code.
   - Unauthorized/cross-tenant request $\rightarrow$ returns `401`/`403`/`404`.
2. For breaking changes on existing endpoints, version the route (`/v2/...`) or use additive optional fields first.

---

## Red Flags & Rationalization Counter-Table

| Common Excuse / Rationalization | Engineering Reality & Mandatory Action |
| :--- | :--- |
| *"I'll return `return await prisma.user.findUnique(...)` directly from the controller."* | Leaks internal database columns (`passwordHash`, `twoFactorSecret`, `internalNotes`) whenever the DB schema grows. Always map through an explicit Response DTO. |
| *"Frontend and backend agents can start coding in parallel and figure out the JSON shape later."* | Guarantees integration mismatches and wasted rework. Lock `references/api-contract.template.md` or shared Zod/OpenAPI types first. |
| *"Removing an unused field or changing a status string from `'PENDING'` to `'pending'` is a minor cleanup."* | **Breaking change** for mobile clients and external consumers. Keep existing enum values and deprecate additively. |
| *"Errors can just return `{ message: err.message }` with HTTP 500."* | Hides domain errors (`409`, `422`) and risks leaking SQL/internal stack traces to clients. Use typed domain exceptions mapped to explicit status codes. |

---

## Safety & Exit Gates
- Never expose stack traces, raw SQL error strings, or internal filesystem paths in error response payloads.
- Verify that both producer (backend) and consumer (frontend/client) compile and pass contract tests against the identical schema definition.

## Reference Materials & Attribution
- Complete API contract, DTO validation, and error envelope template: `references/api-contract.template.md`
- Inspired by `wshobson/agents`, `getsentry/skills`, and `shanraisshan/claude-code-best-practice`. Original AKit instructions.
