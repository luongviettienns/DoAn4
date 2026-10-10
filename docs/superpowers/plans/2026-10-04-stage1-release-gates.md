# Stage 1 release gates

**Goal:** Run the implemented customer journey in CI and document its real HTTP contract.

**Architecture:** Keep the existing real-browser smoke test, run it after the guarded MySQL test runner, and use a pinned repository Playwright dependency. Keep planned OpenAPI operations identifiable while updating the implemented Stage 1 paths from source. No application feature or deployment is required for this change.

**Constraints:** Preserve the working tree. Only the isolated `_test` database may receive test writes. Run DB reset and E2E sequentially. Use the local gateway target and independently signed callbacks; external VNPay sandbox remains a staging acceptance task.

- [x] Pin Playwright and expose a portable `npm run test:e2e` command.
- [x] Configure Chromium and Linux dependencies in CI, run E2E after coverage, and publish success/failure artifacts. GitHub execution remains unverified.
- [x] Synchronize 14 Stage 1 operations and 35 DTO schemas, preserving 117 design operations and 170 prior schemas.
- [x] Refresh testing/readiness documentation without claiming GitHub or external sandbox execution.
- [x] Verify npm ci, build/lint, 550 tests with coverage, OpenAPI/Swagger validation and real browser E2E. Verify deliberate startup failure artifacts and service cleanup; add RED → GREEN regression tests for the clean-CI DB guard and safe diagnostics.
