# Git Worktree Detection & Finishing a Development Branch (`obra/superpowers`)

## 1. Step 0: Detect Existing Isolation & Submodule Guard (`using-git-worktrees`)
Before creating any worktree, check whether the session is already inside a linked worktree or a git submodule:

```powershell
# PowerShell / Cross-Platform Detection
$gitDir = (Resolve-Path (git rev-parse --git-dir)).Path
$gitCommon = (Resolve-Path (git rev-parse --git-common-dir)).Path
$superProject = git rev-parse --show-superproject-working-tree 2>$null
$branch = git branch --show-current
```

- **Submodule Guard:** If `git rev-parse --show-superproject-working-tree` returns a path, you are inside a git submodule (where `GIT_DIR != GIT_COMMON` is also true) — treat it as a normal repo checkout, NOT an already-isolated worktree.
- **If `$gitDir -ne $gitCommon` (and not a submodule):** You are already in a linked worktree. Do NOT create another nested worktree.
- **Native Isolation First:** On Google Antigravity, when dispatching write-capable subagents via `invoke_subagent`, prefer `Workspace: "branch"` or `Workspace: "share"` over manual `git worktree add` so the harness manages cleanup automatically.
- **Manual Worktree Safety Check:** When using `.worktrees/<branch>`, verify `.worktrees` is ignored via `git check-ignore -q .worktrees` before running `git worktree add`, then run the project's baseline test suite to confirm a clean starting state.

---

## 2. Finishing a Development Branch (`finishing-a-development-branch`)

**Core Principle:** Verify tests $\rightarrow$ Detect environment $\rightarrow$ Confirm base branch $\rightarrow$ Present options $\rightarrow$ Execute choice $\rightarrow$ Clean up safely.

### Step 1: Verify Full Test Suite First
Run the repository's complete test suite (`pytest` / `python -m unittest` / `npm test` / `cargo test`). If any test fails, stop and report the failures — never present the integration menu on a red tree.

### Step 2: Confirm Base Branch
Confirm the fork base branch (e.g., `main`). If uncertain, ask: *"This branch split from `<base-branch>` — is that correct?"*

### Step 3: Present the Exact Integration Menu
- **For a normal repo or named-branch worktree (3 options):**
  ```text
  Implementation complete. What would you like to do?

  1. Merge back to <base-branch> locally
  2. Push and create a Pull Request
  3. Keep the branch as-is (I'll handle it later)

  Which option?
  ```
- **For a detached HEAD worktree (2 options):**
  ```text
  Implementation complete. You're on a detached HEAD (externally managed workspace).

  1. Push as new branch and create a Pull Request
  2. Keep as-is (I'll handle it later)

  Which option?
  ```

### Step 4: Safe Execution & Cleanup Rules
- **Option 1 (Merge Locally):** Switch to the main repo root, checkout `<base-branch>`, merge `<feature-branch>`, and **re-run the full test suite on the merged result** before removing the `.worktrees/` directory or running `git branch -d`.
- **Option 2 (Push & PR):** Keep the worktree intact so PR review feedback can be addressed there.
- **Option 3 (Keep As-Is):** Preserve branch and worktree untouched.
- **Explicit Discard Protection:** Never offer "discard" in the default menu. If the user explicitly asks to throw the work away, show the branch, commit list, and worktree path, and require the exact typed confirmation word **`discard`** before running `git branch -D`.
- **Refused Worktree Removal:** If `git worktree remove` refuses because of untracked/modified files, **never pass `--force` on your own initiative**. List the uncommitted files (`git status --porcelain -uall`) and ask the user whether to commit, move, or delete them.
