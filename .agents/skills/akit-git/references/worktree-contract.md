# Git Worktree Isolation & Merge Contract (`akit-git`)

Follow this runbook when isolating feature branches or parallel subagent workspaces using `git worktree`.

---

## 1. Worktree Directory Selection & Ignore Verification

Before creating a project-local worktree inside `.worktrees/`:

```powershell
# 1. Verify whether .worktrees/ is ignored by Git
git check-ignore -q .worktrees
# If exit code != 0, add `.worktrees/` to .gitignore before creating any worktree!
```

---

## 2. Worktree Lifecycle Commands

### Create Isolated Worktree
```powershell
# Create a new branch inside an isolated worktree directory
git worktree add .worktrees/<task-name> -b feat/<task-name>

# Verify worktree list
git worktree list
```

### Verify Baseline Inside Worktree
```powershell
cd .worktrees/<task-name>
# Run project test suite to confirm clean baseline BEFORE making edits
npm test  # or pytest / python -m unittest / cargo test
```

### Pre-Merge Hygiene Check
```powershell
# Check for whitespace issues or leftover merge conflict markers
git diff --check

# Inspect exact files changed against base branch
git diff --stat main...HEAD
```

### Safe Cleanup After Approved Merge
```powershell
# Only run AFTER changes are merged and verified on target branch
git worktree remove .worktrees/<task-name>
git branch -d feat/<task-name>
```

---

## 3. Conflict Resolution Protocol
1. **Never use blanket `-X ours` or `-X theirs`** on source code files.
2. Inspect `git diff` on every conflicted file to understand the intent of both branches.
3. Combine non-conflicting imports/registrations manually, then run the full test suite and typechecker to prove both behaviors survive the merge.
