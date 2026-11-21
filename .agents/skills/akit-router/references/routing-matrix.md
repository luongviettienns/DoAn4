# AKit Routing Matrix & Complexity Classification (`akit-router`)

Use this reference to choose the smallest workflow. Skill and agent names below are suggestions; choose only those installed and supported by the session. Apply the project's actual checks and permissions.

---

## 0. Risk Mode Classification (`FAST` / `STANDARD` / `CRITICAL`)

| Risk Mode | Trigger Criteria | Required Gates & Verification | Do Not Use / Skip |
| :--- | :--- | :--- | :--- |
| **`FAST`** | Small bugfix, 1-line typo, or 1–2 file non-sensitive edit | Relevant `typecheck`, `lint`, and unit `test` (`total_tests > 0` for code changes; `NOT_APPLICABLE` for docs-only) | Skip `akit-debate`, `akit-arena`, `akit-prior-art`, and multi-subagent ceremonies |
| **`STANDARD`** | Substantial feature, UI component, or non-auth endpoint | Acceptance criteria, targeted regression checks, review where relevant | Use Arena only when a structured comparison is requested or justified |
| **`CRITICAL`** | Auth, payments, DB migration, tenant data, secrets, production | Security review, applicable boundary tests, evidence tied to the diff; require authorization for destructive or production actions | Record unavailable checks as unverified |

---

## 1. Complexity Sizing Rubric (`S` / `M` / `L` / `Architectural`)

| Size | Characteristics | Planning Scope | Skill Loading | Delegation (when authorized and available) |
| :--- | :--- | :--- | :--- | :--- |
| **S (Bounded)** | Clear fix in an existing flow | Work directly | Only if a skill adds value | Usually none |
| **M (Feature Slice)** | Multi-file change with a clear goal | Brief design and checks | Load the relevant domain skill | Use exploration or review when useful |
| **L (Cross-Cutting)** | New subsystem or shared contract | Plan by slice; ask about material decisions that remain open | Load by phase | Delegate bounded work where helpful |
| **Architectural** | Major migration or competing designs | Record decision criteria and tradeoffs | Load by decision | Use a scoped comparison when warranted |

---

## 2. Task-to-Skill Routing Table

| User Request Scenario | Primary Skills (Load First) | Verification & Quality Skills (Load Before Completion) | Recommended Subagent |
| :--- | :--- | :--- | :--- |
| **Unfamiliar feature / new technical capability** | `akit-prior-art` $\rightarrow$ `akit-plan` | `akit-implement` $\rightarrow$ `akit-test` | `akit-scout` |
| **Reproducible bug, test failure, or regression** | `akit-debug` $\rightarrow$ `akit-codebase` | `akit-implement` $\rightarrow$ `akit-test` | `akit-scout` |
| **Compare 2–3 technical options or libraries** | `akit-debate` $\rightarrow$ `akit-architecture` | `akit-docs` | `akit-debater`, `akit-judge` |
| **Major architecture bake-off (4+ strategies)** | `akit-arena` $\rightarrow$ `akit-architecture` | `akit-security` $\rightarrow$ `akit-plan` | `akit-debater`, `akit-critic`, `akit-judge` |
| **New UI page, dashboard, or redesign** | `akit-design` $\rightarrow$ `akit-react` | `akit-browser-qa` $\rightarrow$ `akit-performance` | `akit-critic` |
| **Backend API endpoint + Frontend integration** | `akit-contract` $\rightarrow$ `akit-implement` | `akit-simplify` $\rightarrow$ `akit-test` | `akit-architect` |
| **PostgreSQL schema, slow query, or RLS policy** | `akit-postgres` $\rightarrow$ `akit-data` | `akit-performance` $\rightarrow$ `akit-security` | `akit-architect`, `akit-security` |
| **Auth, RBAC, secrets, webhooks, or SAST triage** | `akit-security` $\rightarrow$ `akit-implement` | `akit-review` $\rightarrow$ `akit-test` | `akit-security` |
| **Post-feature cleanup / over-engineered PR** | `akit-simplify` $\rightarrow$ `akit-review` | `akit-test` | `akit-critic` |
| **Unfamiliar large codebase onboarding** | `akit-codebase` $\rightarrow$ `akit-context` | `akit-docs` | `akit-scout` |
| **Idea-to-MVP product build (Vibe Coding)** | `akit-requirements` $\rightarrow$ `akit-design` $\rightarrow$ `akit-plan` | `akit-implement` $\rightarrow$ `akit-deliver` | `akit-architect` |
| **Create or upgrade an Agent Skill** | `akit-skillforge` $\rightarrow$ `akit-prompt` | `akit-eval` | `akit-critic` |
| **Multi-agent parallel branch execution** | `akit-git` $\rightarrow$ `akit-context` | `akit-review` $\rightarrow$ `akit-test` | `akit-scout` |

---

## 3. Token & Context Budget Discipline (`affaan-m/everything-claude-code`)
1. **Progressive Disclosure:** Load `SKILL.md` first; read `references/<file>` only when executing the specific step that needs the template or deep checklist.
2. **Focus Exploration:** Search for symbols and read only the relevant paths. Delegate broad investigation when authorized and available.
3. **Checkpoint Long Work:** Use `akit-context` if installed and the task needs a handoff or compaction checkpoint.
