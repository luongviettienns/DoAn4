# Multi-Agent File Ownership Matrix (`akit-git`)

Use this template whenever 2 or more agents (or sequential vertical slices) work on the same repository concurrently.

---

## 1. Core Ownership Rules
1. **Single Writer Per File:** At any point in time, a file may have at most **one** write-enabled owner.
2. **Contract-First Locking:** Shared schemas (`schema.prisma`, SQL migrations, `openapi.yaml`, shared DTOs) must be finalized and committed by the **Architect / Integration Owner** *before* parallel workers start.
3. **Escalation on Boundary Crossing:** If Worker A discovers it needs a change in Worker B's directory, Worker A must **stop and request the change via the Integration Owner** rather than editing Worker B's files directly.

---

## 2. File Ownership Assignment Table

```markdown
# File Ownership Contract — [Feature / Milestone Name]

- **Base Branch:** `[main / develop]`
- **Integration Owner:** `[Parent Agent]`
- **Locked Shared Contracts (Read-Only for Workers):**
  - `packages/contracts/src/orders.dto.ts`
  - `prisma/schema.prisma`

| Agent / Worker ID | Assigned Branch / Worktree | Exclusive Write Scope (Allowed Glob Paths) | Read-Only Dependencies | Required Verification Command |
| :--- | :--- | :--- | :--- | :--- |
| **Worker 1 (Backend)** | `.worktrees/orders-api` (`feat/orders-api`) | `apps/api/src/orders/**`, `apps/api/test/orders/**` | `packages/contracts/**` | `pnpm --filter api test orders` |
| **Worker 2 (Frontend)** | `.worktrees/orders-ui` (`feat/orders-ui`) | `apps/web/src/features/orders/**` | `packages/contracts/**` | `pnpm --filter web test orders` |
| **Integration Owner** | `feat/orders-integration` | `apps/api/src/app.module.ts`, `apps/web/src/routes.tsx` | All worker branches | `pnpm test && pnpm typecheck` |
```

---

## 3. Sequential Integration Checklist
- [ ] Verify Worker 1 worktree has zero uncommitted files (`git status --short`) and passes its scoped tests.
- [ ] Merge Worker 1 branch into the integration branch (`git merge --no-ff feat/orders-api`).
- [ ] Re-run integration test suite before merging Worker 2.
- [ ] Merge Worker 2 branch (`git merge --no-ff feat/orders-ui`) and wire shared route/module registrations.
- [ ] Run full end-to-end verification (`akit-test`).
