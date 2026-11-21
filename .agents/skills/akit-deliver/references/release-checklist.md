# Production Release Readiness, Rollback & Handoff Template (`akit-deliver`)

Complete this checklist with real verification evidence before shipping a release or handing off a project.

---

```markdown
# Release & Handoff Package: `[Version / Feature Name]`

## 1. Pre-Release Verification Evidence (`obra/superpowers` Gate)

| Check | Exact Command Executed | Exit Code | Observed Result |
| :--- | :--- | :--- | :--- |
| **Unit & Integration Tests** | `[e.g., pnpm test]` | `0` | `[142 passed, 0 failed]` |
| **Typecheck & Linter** | `[e.g., pnpm typecheck && pnpm lint]` | `0` | `[0 errors, 0 warnings]` |
| **Production Build** | `[e.g., pnpm build]` | `0` | `[Compiled cleanly]` |
| **Browser E2E (`akit-browser-qa`)** | `[e.g., npx playwright test]` | `0` | `[Desktop & Mobile passed]` |
| **Git Hygiene (`akit-git`)** | `git status --short && git diff --check` | `0` | `[Clean working tree; no secrets]` |

---

## 2. Environment Variables & Configuration Contract (Names Only — Zero Secrets!)

| Variable Name | Scope (`Server` / `Client`) | Required? | Safe Example Format | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Server-only | Required | `postgresql://user:pass@host:5432/db` | Primary PostgreSQL connection |
| `JWT_PUBLIC_KEY` | Server-only | Required | `-----BEGIN PUBLIC KEY-----...` | Asymmetric JWT verification |
| `FEATURE_NEW_CHECKOUT` | Server & Client | Optional (default `false`) | `true` \| `false` | Kill-switch feature flag |

---

## 3. Zero-Downtime Deployment Sequence
1. **Pre-Deploy Backup Check:** Confirm automated DB snapshot completed within the last 15 minutes.
2. **Migration Step:** Run `[migration command]` (Verified Expand-only / backward-compatible with current live app version).
3. **Application Rollout:** Deploy version `[commit-sha / tag]` and verify `GET /health/ready` returns `200 OK`.
4. **Post-Deploy Smoke Test:** Execute read-only synthetic check on `[critical user journey]`.

---

## 4. Independent Rollback Plan (Tested Escape Hatch)
- **Immediate Kill Switch (Fastest — `< 30s`):** Set `FEATURE_NEW_CHECKOUT=false` and reload config.
- **Application Rollback (`< 2m`):** Redeploy previous release tag `[vX.Y.Z]` (compatible with expanded DB schema).
- **Database Rollback (If needed):** `[Exact reversible down-migration SQL or point-in-time recovery note]`.

---

## 5. First-30-Minutes Monitoring & Known Limitations
- **Metrics / Logs to Watch (`akit-observability`):** Watch `5xx` error rate, `/health/ready`, and `p95` latency on `[target endpoint]`.
- **Known Limitations / Deferred Items:** `[Explicitly list any non-goals or manual steps remaining]`.
```
