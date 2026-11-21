---
name: akit-simplify
description: Use after tests pass on a new feature, bugfix, or pull request to reduce cognitive complexity, flatten nested conditionals, remove premature abstractions, and eliminate dead code without altering behavior.
---
# AKit Simplify — Zero-Behavior-Change Code Simplification

## Overview
`akit-simplify` implements the **Code Simplification & Surgical Hygiene** workflow inspired by `getsentry/skills`, `multica-ai/andrej-karpathy-skills` (**Law 2: Simplicity First** & **Law 3: Surgical Changes**), and `obra/superpowers` (`REFACTOR` phase). AI-generated code often accumulates defensive bloat: 5-level nested `if/else` pyramids, single-use wrapper classes, redundant boolean flags, unnecessary intermediate variables, and dead fallback branches. `akit-simplify` systematically strips away accidental complexity **only after tests are green**, verifying after every transformation that external behavior is 100% preserved (`akit-eval --mode karpathy`).

**Core principle:** Simplicity is the ultimate maintainability defense (*"Would a senior engineer say this is overcomplicated? If 200 lines could be 50, rewrite it."* — Karpathy Law 2). Never simplify without a passing test baseline, and never change observable behavior while simplifying.

---

## When to Use
- Immediately after reaching the **GREEN** state in `akit-implement` (the `REFACTOR` step of TDD).
- Before requesting or finalizing a Pull Request review (`akit-review`).
- When touching a legacy function whose cyclomatic/cognitive complexity makes it error-prone to modify.
- **When NOT to Use:** While tests are failing (`RED`), or across unrelated files outside the current task's blast radius.

---

## Antigravity Native Tool Mapping
1. **Verify Green Baseline First (`run_command`):** Run the scoped test suite and typechecker before making a single simplification edit.
2. **Inspect Recently Modified Lines (`run_command` / `read_file`):** Run `git diff` to focus simplification strictly on code touched in the current branch/task.
3. **Apply Surgical Transformations (`edit_file`):** Apply heuristics from `references/simplification-heuristics.md` one function at a time and re-run tests immediately.

---

## Step-by-Step Simplification Playbook

### Step 1: Lock the Behavior Baseline
1. Run unit/integration tests and typecheck (`tsc --noEmit` / `pytest` / `unittest`).
2. If any test is failing or missing for the target function, **STOP** and invoke `akit-implement` / `akit-test` first.

### Step 2: Hunt and Eliminate the 6 Complexity Smells (`references/simplification-heuristics.md`)
Scan the diff for:
1. **Nested Arrowheads (`if -> if -> if -> else`):** Replace with early-return **Guard Clauses** at the top of the function.
2. **Speculative / Single-Implementation Abstractions:** Collapse `AbstractUserNotificationFactoryStrategy` + `DefaultUserNotificationStrategy` when only one concrete implementation exists (YAGNI).
3. **Pass-Through Middlemen & Trivial Wrappers:** Inline helper functions or service methods that do nothing except forward arguments unchanged to another function.
4. **Boolean Parameter Traps (`processOrder(order, true, false)`):** Split into two explicitly named functions or pass a typed options object.
5. **Redundant State & Temporal Coupling:** Replace mutable `let result = null; if (...) { result = ... }` blocks with direct `const` expressions or small pure helper functions.
6. **Dead Code & Commented-Out Blocks:** Delete unused imports, unreachable branches, and commented-out code (Git history preserves old code).

### Step 3: Verify Zero Behavior Change
1. Re-run the exact test suite and typecheck after each transformation.
2. Inspect `git diff` to confirm public API contracts, HTTP error codes, database queries, and log formats remain identical.

---

## Red Flags & Rationalization Counter-Table

| Common Excuse / Rationalization | Engineering Reality & Mandatory Action |
| :--- | :--- |
| *"I'll compress this 15-line loop into a clever nested ternary one-liner."* | **Clever != Simple.** Nested ternaries and cryptic reduce chains *increase* cognitive load. Optimize for human readability, not fewest lines. |
| *"While simplifying `orders.service.ts`, I'll also reformat 30 untouched files."* | Scope creep pollutes PR diffs (`akit-git`). Restrict `akit-simplify` to files and functions modified in the current task unless explicitly asked for a broader cleanup. |
| *"We might need this generic `BaseRepositoryAdapter` interface in 6 months."* | Premature abstraction is debt with immediate interest. Delete unused indirection now; introduce interfaces when the second concrete implementation actually arrives. |
| *"It's just a pure refactoring, so I don't need to re-run the test suite."* | Refactorings break edge cases constantly. Always run the test suite after simplifying. |

---

## Safety & Exit Gates
- Never alter public DTO fields, database column names, API status codes, or security authorization checks during a simplification pass.
- If a simplification causes any test failure, revert it immediately (`git checkout -- <file>`) and re-evaluate.

## Reference Materials & Attribution
- Before/After code simplification patterns and cognitive complexity checklist: `references/simplification-heuristics.md`
- Inspired by `getsentry/skills` (code simplification & quality practices) and `obra/superpowers`. Original AKit instructions.
