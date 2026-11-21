# Requesting & Receiving Code Review Protocol (`obra/superpowers`)

## 1. Requesting Code Review (`requesting-code-review`)

### Handing Off Diffs via Files (`BASE_SHA..HEAD_SHA`)
Never paste massive diffs inline into the controller session's prompt, and never use `HEAD~1` when a task produced multiple commits:
1. Record `BASE_SHA` before the task starts (`git rev-parse HEAD`) and `HEAD_SHA` when the task finishes.
2. Package the review diff into a file (`.superpowers/sdd/<plan>/task-N-diff.patch` containing `git log --oneline BASE..HEAD`, `git diff --stat BASE..HEAD`, and `git diff -U10 BASE..HEAD`).
3. Dispatch `.agents/agents/akit-critic.md` via `invoke_subagent` with:
   - `[BRIEF_FILE]` — what was requested
   - `[GLOBAL_CONSTRAINTS]` — exact project-wide constraints from the spec
   - `[REPORT_FILE]` — what the implementer claims they built and their TDD output
   - `[DIFF_FILE]` — the exact diff package (`BASE_SHA..HEAD_SHA`).
4. **Never Pre-Judge for the Reviewer:** Never write instructions like *"do not flag X"* or *"treat Y as at most Minor"* in the reviewer dispatch prompt. Let the reviewer evaluate independently.

### Scoped Re-Review After a Fix Round
When an implementer fixes review findings, dispatch a **Scoped Re-Review** over `FIX_BASE_SHA..HEAD_SHA`:
- Verdict each prior finding as **`ADDRESSED`** or **`NOT ADDRESSED`** with `file:line` evidence.
- Check the fix diff for **New Breakage** introduced by the fix itself.
- Record any observations outside the fix diff as **Out-of-Scope Observations** (deferred to the final whole-branch review — never extending the task fix loop).

---

## 2. Receiving Code Review Feedback (`receiving-code-review`)

**Core Principle:** Code review requires technical evaluation, not emotional performance. Verify before implementing. Ask before assuming. Technical correctness over social comfort.

### The 6-Step Response Pattern
1. **READ:** Read the complete feedback without reacting prematurely.
2. **UNDERSTAND:** Restate the technical requirement in your own words (or ask if any item is unclear — if items 1, 2, 3, 6 are clear but 4, 5 are unclear, **STOP and clarify 4 and 5 first** before implementing anything).
3. **VERIFY:** Check the claim against actual codebase reality (`read_file` / `rg`).
4. **EVALUATE:** Is the suggestion technically sound for **THIS** codebase, stack, and target version? Does it break existing tests or backward compatibility?
5. **RESPOND:** Give a factual technical acknowledgment or reasoned technical pushback.
6. **IMPLEMENT:** Fix one item at a time in priority order (**Blocking/Security $\rightarrow$ Simple fixes $\rightarrow$ Complex refactors**) and run tests after each fix.

### Forbidden Performative Responses
**NEVER write:**
- ❌ *"You're absolutely right!"*
- ❌ *"Great point!"* / *"Excellent feedback!"*
- ❌ *"Thanks for catching that!"* / *"Thanks for [anything]"*
- ❌ *"Let me implement that right now"* (before verifying against the codebase)

**INSTEAD write:**
- ✅ *"Fixed. Validated ISO date format in `src/search.ts:25` and added regression test."*
- ✅ *"Good catch — `projectDir` could be empty before `beforeEach`. Fixed in `src/project.ts:14`."*
- ✅ *"Checking `package.json`: build target requires Node 18 compatibility, and that API requires Node 21+. Keep current fallback or raise engine floor?"*

### Mandatory YAGNI Check for "Professional" Features
When an external reviewer suggests *"implementing X properly"* (e.g., adding metrics tables, CSV exports, or extra abstraction layers):
1. Search (`rg`) the codebase for actual callers of that endpoint or function.
2. **If unused:** Push back with YAGNI: *"Grepped codebase — nothing calls this endpoint. Remove it (YAGNI), or is there planned usage I should wire up?"*
3. **If used:** Implement it cleanly and test it.
