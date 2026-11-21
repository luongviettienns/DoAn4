---
name: akit-architecture
description: Use when designing system architectures, defining module boundaries, evaluating microservice vs modular-monolith tradeoffs, or writing Architecture Decision Records (ADRs) for cross-cutting changes.
---
# AKit Architecture — Pragmatic System Design, Module Boundaries & ADRs

## Overview
`akit-architecture` guides structural system design by combining **structural codebase reality checks** (`oraios/serena`, `Egonex-AI/Understand-Anything`), **specialist architecture review** (`wshobson/agents`), **open-source prior-art grounding** (`akit-prior-art`), and **disciplined brainstorming gates** (`obra/superpowers`).

**Core principle:** Start with a well-bounded modular monolith before distributing state across microservices. Every irreversible architectural choice must compare at least two viable alternatives and be recorded in a concise Architecture Decision Record (ADR).

---

## Pre-Architecture Prior-Art Gate (`akit-prior-art`)
- For any unfamiliar architectural capability (multi-tenant isolation, event-driven outbox, realtime collaboration, distributed locking, plugin engines), run `akit-prior-art` first to inspect how 2–3 mature open-source projects structure their modules, data models, and failure recovery before inventing a custom architecture.

---

## Antigravity Native Tool Mapping
1. **Map Existing Structure First (`invoke_subagent` / `read_file`):**
   - Use `akit-codebase` (or delegate to `.agents/agents/akit-scout.md`) to map existing entrypoints, dependency directions, and database boundaries before proposing changes.
2. **Stress-Test Competing Designs (`akit-debate` / `akit-arena`):**
   - For 2–3 competing architectural options $\rightarrow$ run `akit-debate` (Triad Proposer vs. Challenger vs. Synthesizer).
   - For 4+ competing system strategies $\rightarrow$ run `akit-arena` tournament.
3. **Record Architecture Decision (`write_file`):** Write the approved decision to `docs/adr/NNN-<slug>.md` using `references/ADR-template.md`.

---

## Step-by-Step Architecture Workflow

### Step 1: Ground in Current System Constraints
1. Identify actual traffic/data scale (current vs. 12-month realistic projection), team size, deployment topology, and existing tech stack.
2. Distinguish **Hard Non-Functional Requirements** (e.g., strict audit trail, `<100ms` p95 read latency, zero data loss on crash) from speculative future wishes.

### Step 2: Define Module Boundaries & Dependency Direction
1. Partition the system into cohesive domain modules where each module owns:
   - One clear business capability and its private persistence tables/repositories.
   - A small, explicit public interface (service facade, API contract, or domain events).
2. Enforce **Acyclic Dependency Rules:**
   - `Transport (HTTP/CLI/WS) -> Application/Domain -> Persistence/Adapters`.
   - Module A must never reach directly into Module B's internal repository or private tables without an explicit contract.

### Step 3: Compare Alternatives & Operational Failure Modes
1. Compare at least **2 concrete alternatives** (including a "Minimal/Simpler Baseline" option) across:
   - Implementation & operational complexity
   - Consistency & transaction guarantees (ACID single-DB vs. eventual consistency / Saga / Outbox)
   - Failure modes (network partition, partial retry, poison queue message, cache stampede)
   - Migration and rollback cost
2. Draw a C4 Container/Component diagram or sequence diagram in Mermaid (always quote node labels containing parentheses or special characters!).

### Step 4: Write the ADR & Define Verification Gates (`references/ADR-template.md`)
1. Document the context, compared options, chosen decision, positive/negative consequences, and compliance checks in `references/ADR-template.md`.
2. Hand off to `akit-plan` to slice the architecture into small, independently verifiable vertical milestones.

---

## Red Flags & Rationalization Counter-Table

| Common Excuse / Rationalization | Engineering Reality & Mandatory Action |
| :--- | :--- |
| *"Let's split this 3-developer CRUD app into 8 microservices with Kafka and Kubernetes."* | Resume-driven development! Distributed systems multiply network failures, deployment overhead, and eventual-consistency bugs. Default to a **Modular Monolith** unless independent scaling/deployment requirements prove otherwise. |
| *"I'll introduce a custom event bus and generic repository abstraction layer first."* | Premature abstraction obscures control flow and slows down feature delivery (`akit-simplify`). Build concrete vertical slices first. |
| *"This architecture will easily handle 100,000 RPS (no calculation or benchmark)."* | Never make unsubstantiated scaling claims. State back-of-the-envelope I/O math or mark throughput claims as `[UNVERIFIED]`. |
| *"If the external webhook fails after our DB commit, we'll just ignore it."* | Dual-write inconsistency! Use a transactional outbox table or idempotent background job with retry + dead-letter handling. |

---

## Safety & Exit Gates
- Do not begin multi-file architectural refactoring without explicit user approval on the design and ADR (`obra/superpowers` brainstorming gate).
- Every architectural proposal must include an explicit rollback / escape-hatch strategy.

## Reference Materials & Attribution
- Architecture Decision Record (ADR) template & C4 checklist: `references/ADR-template.md`
- Inspired by `wshobson/agents`, `Egonex-AI/Understand-Anything`, `oraios/serena`, and `obra/superpowers`. Original AKit instructions.
