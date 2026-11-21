# TDD & Cohesive Implementation Checklist (`akit-implement`)

Use this reference before, during, and after writing production code.

---

## 1. Pre-Coding Checklist
- [ ] **Scope Approved:** Did the user approve the design or execution contract (`akit-router` / `akit-plan`)?
- [ ] **Prior-Art Checked:** If this capability is unfamiliar, was `akit-prior-art` completed first?
- [ ] **Conventions Inspected:** Have you read at least 1 existing controller/service/test file in the same module to match error classes, logging, and naming conventions?
- [ ] **Worktree / Branch Clean:** Checked `git status --short` (`akit-git`) to ensure no uncommitted user work will be clobbered?

---

## 2. Layer Responsibility Matrix

| Layer | Owns (Must Do) | Forbidden (Never Do) |
| :--- | :--- | :--- |
| **Controller / Route / Resolver** | Parse request params/body, validate DTO schema, extract authenticated actor, map domain errors to HTTP status codes | Raw SQL/ORM queries, complex business loops, direct third-party SDK calls |
| **Domain / Application Service** | Enforce business invariants, check resource-level authorization (BOLA/RBAC), coordinate transaction boundaries | Reading raw `req`/`res` objects, returning ORM database entities with password hashes |
| **Repository / Data Access** | Execute parameterized queries, map rows to domain models, handle pagination & index-friendly predicates | Business permission rules, sending emails/webhooks inside open DB transactions |
| **UI Component (`akit-react`)** | Render state, handle accessibility/focus, dispatch user intents | Embedding raw API secrets, giant 600-line monolithic components |

---

## 3. Honest Test Quality Rules (`obra/superpowers`)
1. **Test Behavior, Not Mocks:** Never write a test that only asserts `expect(mockService.doWork).toHaveBeenCalled()` while mocking out the actual unit under test.
2. **One Logical Behavior Per Test:** If a test name contains `"and handles X and validates Y and retries Z"`, split it into focused tests.
3. **Boundary & Negative Cases Mandatory:**
   - Empty / null / malformed payload
   - Unauthorized actor (User A accessing User B's resource)
   - Duplicate / idempotent retry (submitting the same request twice)
   - Downstream dependency failure / timeout

---

## 4. Implementation Completion Evidence Block
Always end your implementation report with this exact verification block:

```markdown
### Implementation Verification Summary
- **Changed Files:** `[list of modified/created files]`
- **RED -> GREEN Cycle Verified:** `[Yes / Blocked - state test name]`
- **Commands Executed:**
  1. `[test command]` -> Exit `0` (`X passed, 0 failed`)
  2. `[typecheck/lint command]` -> Exit `0`
- **Unverified / Residual Risks:** `[None or explicit environment limitation]`
```
