# Durable Project Context Template (`.akit/project-context.md`)

Maintain this file under 150 lines (<2,500 tokens). Separate **Verified Facts** from **Assumptions**. Never include secret values, tokens, or PII.

---

```markdown
# Project Engineering Context (Managed by `akit-context`)
- **Last Verified Against Git Commit:** `[short-sha]` on `[YYYY-MM-DD]`
- **Primary Stack & Versions:** [e.g., Node 22, NestJS 11, PostgreSQL 16, React 19, Prisma 6]

---

## 1. Verified Commands & Environment Baselines
| Operation | Exact Command | Expected Baseline / Notes |
| :--- | :--- | :--- |
| **Install** | `pnpm install --frozen-lockfile` | Never use `npm` or `yarn` in this repo |
| **Unit Tests** | `pnpm test:unit` | Runs Vitest; must pass in <15s |
| **Integration Tests** | `pnpm test:e2e` | Requires local Docker Postgres on port 5432 |
| **Typecheck & Lint** | `pnpm check` | Strict TypeScript (`noImplicitAny: true`) |

---

## 2. Core Architectural Invariants & Module Boundaries
- **Entrypoints:** `[src/main.ts]`, `[src/app.module.ts]`
- **Layer Rule:** Controllers validate DTOs only $\rightarrow$ Services own business & transaction rules $\rightarrow$ Repositories own SQL/ORM queries.
- **Auth & Multi-Tenancy Boundary:** Every query on tenant-scoped tables MUST pass `organizationId` from the verified session context.
- **Environment Variable Names Only:** `DATABASE_URL`, `REDIS_URL`, `JWT_PUBLIC_KEY` (never log values).

---

## 3. Active Architectural Decisions (ADR / Debate Links)
| Date | Decision | Chosen Approach | Reference Artifact |
| :--- | :--- | :--- | :--- |
| `2026-10-28` | Realtime notification transport | Server-Sent Events (SSE) over HTTP/2 | `docs/adr/001-sse-notifications.md` |

---

## 4. Known Pitfalls & Ruled-Out Dead Ends
1. **[Pitfall Name]:** [Cause + how to avoid]
2. **[Rejected Library/Pattern]:** [Concrete reason it failed in this codebase]

---

## 5. Open Questions & Pending Verification Gaps
- [ ] [Unverified behavior or external API contract awaiting confirmation]
```
