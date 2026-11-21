# Curated Seed Catalog of Reference Repositories (`akit-prior-art`)

Use these well-known open-source repositories as starting reference points when comparing architectures. Always verify current license, commit activity, and stack fit when inspecting them (`unverified` until opened in session).

---

## 1. Application Architecture & Full-Stack Blueprints

| Domain / Stack | Repository (`github.com/...`) | What to Study & Compare | License Note |
| :--- | :--- | :--- | :--- |
| **Multi-Stack Spec Comparison** | `realworld-apps/realworld` | Identical Medium-clone API & UI spec implemented across 100+ frontend/backend frameworks; great for idiomatic routing, auth, and test layout. | Check individual implementation repo |
| **FastAPI + React + PostgreSQL** | `fastapi/full-stack-fastapi-template` | Official FastAPI blueprint: SQLModel, Alembic migrations, JWT auth, Docker Compose, Playwright E2E, GitHub Actions CI. | MIT (Verify README) |
| **NestJS + PostgreSQL / TypeORM** | `brocoders/nestjs-boilerplate` | Modular NestJS layout: Relational/Document persistence, Passport JWT + refresh rotation, mailer, i18n, serialization groups, E2E tests. | MIT (Verify canonical repo) |
| **Next.js + Enterprise SaaS** | `blazity/next-enterprise` | Next.js App Router setup, strict TypeScript, Tailwind, Playwright, bundle analysis, and observability hooks. | MIT (Verify README) |

---

## 2. Specialized Capability Reference Repositories

| Capability | Repository (`github.com/...`) | Key Engineering Ideas Worth Studying | Reuse Guidance |
| :--- | :--- | :--- | :--- |
| **Auth / OAuth / 2FA / Orgs** | `better-auth/better-auth` | Clean TypeScript schema for sessions, OAuth account linking, CSRF, rate-limiting, and multi-tenant organizations. | MIT; prefer **Adopt** as dependency or **Adapt** schema |
| **Background Queues & Retries** | `taskforcesh/bullmq` | Atomic Redis Lua state transitions, delayed jobs, parent-child flow dependencies, dead-letter handling. | MIT; **Adopt** for Node/Redis queues |
| **Booking / Scheduling Logic** | `calcom/cal.com` | Timezone normalization, slot availability calculation, double-booking prevention, webhook idempotency. | AGPLv3 / Commercial — **Ideas & Architecture ONLY (Copy NO code)** |
| **E-Commerce & Inventory** | `medusajs/medusa` | Modular commerce domain: cart/checkout state machine, inventory reservation holds, idempotent payment capture. | MIT (Verify package licenses) |
| **Realtime Collaboration** | `yjs/yjs` | Conflict-free Replicated Data Types (CRDT), awareness protocols, offline sync reconciliation. | MIT |

---

## 3. Agent Engineering & DevOps Reference Catalogs

| Area | Repository (`github.com/...`) | Why Consult It |
| :--- | :--- | :--- |
| **Mobile / React Native / Expo** | `expo/skills` | Official Expo agent skills for native navigation, EAS builds, and mobile UI conventions. |
| **CI/CD & Infrastructure** | `full-stack-skills/devops-skills`, `prapanch/agent-coda` | Deployment safety gates, Docker multi-stage hardening, rollback runbooks (inspect before trusting). |
| **Security & Static Analysis** | `trailofbits/skills`, `semgrep/skills` | Differential security review heuristics and custom SAST rule patterns. |
