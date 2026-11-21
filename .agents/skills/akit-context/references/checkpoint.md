# Milestone Checkpoint & Session Handoff Template (`akit-context`)

Use this concise template at the end of a milestone, before invoking `/compact`, or when handing off work between subagents. Keep each checkpoint under 35 lines.

---

## Checkpoint Format

```markdown
## Checkpoint — [YYYY-MM-DD HH:MM] — [Milestone / Slice Name]

### 1. Status Summary
- **Current Phase / Task:** [e.g., Phase 3 - Task 2: Auth Middleware Implementation]
- **Branch / Worktree:** `[git branch name]` (`clean` / `uncommitted changes`)
- **Overall Health:** [`GREEN - All tests passing` | `RED - Failing test reproduced` | `BLOCKED`]

### 2. Completed in This Slice
- Modified `[path/to/file1.ts]` (`L20-L85`): [1-sentence summary of change]
- Added `[path/to/test1.spec.ts]`: [What behavior is now covered]

### 3. Executed Verification Evidence
| Command Run | Exit Code | Result Summary |
| :--- | :--- | :--- |
| `npm run test -- auth.spec.ts` | `0` | 12/12 tests passed (0 warnings) |
| `npm run typecheck` | `0` | Clean |

### 4. Ruled-Out Approaches (Do Not Repeat)
- **Rejected Attempt:** [e.g., Using global Express middleware for tenant resolution]
- **Why It Failed:** [e.g., Runs before Passport JWT guard populates `req.user`, causing null tenant IDs]

### 5. Immediate Next Step (Resume Here)
1. [Exact next file and test to write]
2. [Blocking question or unverified dependency, if any]
```
