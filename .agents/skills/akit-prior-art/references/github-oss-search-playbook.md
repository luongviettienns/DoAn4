# GitHub Open-Source Prior-Art Search & Idea Comparison Playbook (`akit-prior-art`)

## 1. The Mandatory "No-From-Scratch" Rule
> **QUY TẮC BẮT BUỘC:** *"Đối với những chức năng chưa quen thuộc, đừng viết từ con số 0, hãy tìm kiếm các dự án mã nguồn mở trên GitHub để so sánh ý tưởng trước khi bắt tay vào làm."*

Whenever an agent is asked to implement a feature, algorithm, state machine, or integration that does not already have an established, battle-tested template inside the current repository, **writing from zero is strictly forbidden**. Even a 5-minute comparison of 2–3 mature GitHub open-source repositories surfaces hidden race conditions, schema constraints, and security invariants that an isolated LLM would miss.

---

## 2. Step-by-Step GitHub Discovery & Comparison Protocol

### Step 1: Formulate High-Signal GitHub Search Queries
Use Antigravity's `search_web` tool (setting `domain: "github.com"`) or `run_command` with `gh search` to locate production-grade repositories and specific implementation files:

| Target Information | `search_web` Query (`domain: "github.com"`) | `gh` CLI Equivalent (`run_command`) |
| :--- | :--- | :--- |
| **Mature Repositories** | `"seat reservation" OR "inventory locking" language:typescript stars:>500` | `gh search repos "seat reservation" --language=typescript --stars=">500" --limit 5` |
| **Exact Code Patterns** | `"FOR UPDATE SKIP LOCKED" reservation prisma OR drizzle` | `gh search code "FOR UPDATE SKIP LOCKED" --language=typescript --limit 10` |
| **State Machine / Edge Cases** | `"webhook" "idempotency" "retry" test language:python` | `gh search code "idempotency_key" "webhook" --extension=py --limit 10` |

### Step 2: Inspect 3 Layers of Each Candidate Repo (Never Stop at the README)
For each of the 2–3 shortlisted repositories, examine:
1. **Schema / Data Model Layer:** How are tables, unique indexes, state enums, and TTL/expiration timestamps structured?
2. **Core Execution & Concurrency Layer:** How does the code guard against double-submission, partial failure, network timeout, or concurrent mutations?
3. **Test Suite Layer (`tests/`, `__tests__/`, `*.spec.*`):** What edge-case tests did the maintainers write after real-world production bugs?

### Step 3: Build the Mandatory Idea Comparison Matrix
Before writing any production code or finalizing `implementation_plan.md`, output a concise **GitHub OSS Comparison Matrix**:

| Dimension | Candidate A (`owner/repo-a`) | Candidate B (`owner/repo-b`) | Candidate C (`owner/repo-c`) | Our Synthesis & Decision |
| :--- | :--- | :--- | :--- | :--- |
| **License** | `MIT` (Permissive) | `Apache-2.0` (Permissive) | `AGPL-3.0` (Copyleft — Do not copy code) | Safe to **Adapt** pattern from A & B |
| **Core Mechanism** | Redis distributed lock + Postgres status column | Postgres transactional outbox + `SELECT ... FOR UPDATE SKIP LOCKED` | In-memory queue (non-durable) | Choose Candidate B's single-DB lock to avoid Redis operational overhead |
| **Edge Cases Handled** | Lock expiry on worker crash | Clock skew, idempotent retry, dead-letter state | None | Carry Candidate B's 3 edge cases into our `akit-test` suite |
| **Verdict** | `Reference` | **`ADAPT` (Selected)** | `Reject` | Reimplement Candidate B's pattern cleanly in our stack |

---

## 3. Decision Rubric: `Adopt` vs. `Adapt` vs. `Build`
1. **`ADOPT` (Install as Dependency):** Use when the problem is undifferentiated plumbing (e.g., `zod`, `better-auth`, `tenacity`, `bullmq`), the package has a permissive license (`MIT`/`Apache-2.0`/`BSD`/`ISC`), and fits existing dependencies.
2. **`ADAPT` (Learn the Architecture, Write Native Code):** Use when adding a heavy dependency is undesirable, but the open-source project's schema design, state transitions, and edge-case tests directly solve our problem.
3. **`BUILD` (Custom Design):** Use only when existing OSS projects violate hard project constraints; still port the discovered edge-case test scenarios into `akit-test`.
