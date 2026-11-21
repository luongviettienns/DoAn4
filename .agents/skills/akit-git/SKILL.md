---
name: akit-git
description: Use when isolating feature work in Git branches or worktrees, coordinating parallel subagents editing a repository, or finishing a development branch with verified merges and conflict-free diffs.
---
# AKit Git — Worktree Isolation, File Ownership & Branch Finishing (`obra/superpowers`)

## Overview
`akit-git` combines the **Git Worktree Isolation** (`using-git-worktrees`) and **Branch Finishing** (`finishing-a-development-branch`) workflows from `obra/superpowers` with multi-agent file-ownership contracts from `wshobson/agents` and `shanraisshan/claude-code-best-practice`. When multiple agents or tasks operate on the same repository, uncoordinated edits corrupt working trees and cause silent overwrites.

**Core principle:** Detect existing isolation first, never overwrite uncommitted user work, never let two write-enabled agents edit the same file concurrently, and finish branches via verified test gates (`references/finishing-branch-protocol.md`).

---

## Antigravity Native Tool Mapping
1. **Non-Destructive Status & Isolation Inspection (`run_command`):**
   - Run `git status --short`, `git branch --show-current`, `git rev-parse --git-dir`, `git rev-parse --git-common-dir`, and the submodule guard `git rev-parse --show-superproject-working-tree` (`references/finishing-branch-protocol.md`).
2. **Subagent Workspace Isolation (`invoke_subagent`):**
   - Prefer Antigravity's native `Workspace: "branch"` or `Workspace: "share"` when dispatching write-capable subagents (`self`), or assign strict disjoint file ownership via `references/ownership.md` and `references/worktree-contract.md`.
   - Read-only subagents (`akit-scout`, `akit-critic`, `akit-judge`, `akit-debater`, `akit-architect`, `akit-security`) safely share `Workspace: "inherit"`.

---

## Step-by-Step Git & Worktree Workflow

### Step 1: Pre-Flight Working Tree, Isolation Check & Proactive Git Flow Recommendation
1. Run `git status --short`, `git branch --show-current`, and check whether `GIT_DIR != GIT_COMMON` (guarded by `git rev-parse --show-superproject-working-tree` so submodules are not mistaken for worktrees — see `references/finishing-branch-protocol.md`).
2. **Proactive Professional Git Flow Recommendation (`references/professional-git-flow.md`):**
   - If the user is starting a feature, bugfix, or release directly on `main`/`master` (or has not chosen a branching model), **proactively recommend Professional Git Flow and ask the user** (via `ask_question` or concise prompt) whether they want to follow it:
     - Branching structure: `main` (production), `develop` (integration), `feature/<slug>`, `bugfix/<slug>`, `release/vX.Y.Z`, `hotfix/<slug>`.
     - Commit standard: **Conventional Commits** (`feat(scope):`, `fix(scope):`, `refactor(scope):`, `test(scope):`, `docs(scope):`).
     - Pre-merge quality gate: 100% test pass rate + `typecheck` + `lint` + independent review before merging/PR.
3. **If uncommitted user changes exist:**
   - Do **NOT** run `git checkout -- .`, `git restore .`, `git reset --hard`, or `git clean -fd`.
   - Respect user modifications; if they overlap with your task files, ask the user whether to stash, commit, or create a separate worktree.

### Step 2: Setup Worktree Isolation (Native First, `.worktrees/` Fallback)
When executing multi-step plans or parallel agent tasks (`references/worktree-contract.md` and `references/finishing-branch-protocol.md`):
1. Use native workspace isolation (`Workspace: "branch"`) when available.
2. For manual git worktrees, use `.worktrees/<branch-slug>` after verifying `git check-ignore -q .worktrees` (if not ignored, add `.worktrees/` to `.gitignore` first!).
3. Run baseline tests inside the new worktree to confirm a clean starting state before writing code.

### Step 3: Enforce Multi-Agent File Ownership (`references/ownership.md`)
When decomposing work across multiple agents:
1. Define **Shared Read-Only Contracts** first (e.g., `openapi.yaml`, `schema.prisma`, shared TypeScript types) and lock them before parallel work starts.
2. Assign each write-enabled agent an **Exclusive Write Scope** (disjoint directories/files).
3. Designate a single **Integration Owner** (the parent agent) responsible for sequential merging and running integration tests.

### Step 4: Atomic Hygiene & Pre-Commit Verification
1. Check `git diff --check` to catch whitespace errors and leftover conflict markers (`<<<<<<<`).
2. Scan staged diffs for accidental secrets (`.env`, API keys, private URLs), debug logs, or build artifacts (`node_modules/`, `dist/`, `__pycache__/`).
3. Run the relevant test suite (`akit-test`) before creating any commit.

### Step 5: Finishing a Development Branch (`finishing-a-development-branch`)
Follow `references/finishing-branch-protocol.md`:
1. Run the full test suite and confirm green output.
2. Confirm the base branch and present the exact **3-Option Integration Menu** (`1. Merge back to <base-branch> locally`, `2. Push and create a Pull Request`, `3. Keep the branch as-is`).
3. If merging locally (Option 1), re-run the test suite on the merged tree before cleaning up `.worktrees/`. Never pass `--force` to `git worktree remove` without asking, and require the exact typed word **`discard`** before deleting unmerged work.

---

## Red Flags & Rationalization Counter-Table

| Common Excuse / Rationalization | Engineering Reality & Mandatory Action |
| :--- | :--- |
| *"There are untracked/modified files I didn't create; I'll run `git reset --hard` or `git worktree remove --force`."* | **Catastrophic data loss!** Never discard uncommitted work or force-remove a dirty worktree. List the files and ask the user (`references/finishing-branch-protocol.md`). |
| *"Two subagents can edit `src/app.module.ts` at the same time; Git will figure it out."* | Concurrent writes to the same file in a shared workspace clobber each other. Only the Integration Owner edits shared wiring files. |
| *"I'll create `.worktrees/` without checking `git check-ignore`."* | An unignored `.worktrees/` folder commits the entire nested worktree into the repository. Verify `.gitignore` first. |
| *"The user said 'yeah, get rid of this branch' — I'll run `git branch -D` immediately."* | Destructive discard requires listing the commits at stake and waiting for the exact confirmation word `discard` (`references/finishing-branch-protocol.md`). |

---

## Safety & Exit Gates
- **Hard Prohibition:** Never execute `git reset --hard`, `git clean -fd`, `git push --force`, `git branch -D`, or `git commit --amend` on published commits without explicit user consent.
- Never auto-commit or auto-push unless the user explicitly instructed you to commit/push.
- Report the active branch name, `git diff --stat` summary, and verification test exit codes on completion.

## Reference Materials & Attribution
- Multi-agent file ownership matrix: `references/ownership.md`
- Git worktree lifecycle & merge contract: `references/worktree-contract.md`
- Worktree/submodule detection, 3-option branch completion menu, and safe cleanup rules: `references/finishing-branch-protocol.md`
- Professional Git Flow branching (`main`, `develop`, `feature/*`, `bugfix/*`, `release/*`, `hotfix/*`), Conventional Commits & proactive user recommendation protocol: `references/professional-git-flow.md`
- Inspired by `obra/superpowers` (`using-git-worktrees`, `finishing-a-development-branch`) and `wshobson/agents`. Original AKit instructions.
