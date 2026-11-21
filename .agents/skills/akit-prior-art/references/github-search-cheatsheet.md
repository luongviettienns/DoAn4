# GitHub Prior-Art Search Cheatsheet (`akit-prior-art`)

Use these targeted search queries via GitHub CLI (`gh`), `search_web` (`domain: "github.com"`), or browser search to locate high-signal open-source implementations quickly.

---

## 1. Repository Discovery Queries (`gh search repos`)

```powershell
# Find production TypeScript/Node repositories solving seat/inventory reservation
gh search repos "seat reservation" --language TypeScript --stars ">100" --sort stars --limit 15

# Find MIT/Apache-2.0 repositories implementing OAuth refresh token rotation
gh search repos "refresh token rotation" --license mit --license apache-2.0 --limit 15

# Find NestJS + PostgreSQL multi-tenant RBAC / RLS implementations
gh search repos --topic nestjs --topic multi-tenancy --sort updated --limit 15

# Find Python transactional outbox or background worker patterns
gh search repos "transactional outbox" --language Python --stars ">50" --limit 15
```

---

## 2. Exact Mechanism Code Search (`gh search code`)

When you know the SQL, API, or concurrency primitive and want to see how mature projects wrap it in production:

```powershell
# Postgres row-level locking without blocking queue workers
gh search code "FOR UPDATE SKIP LOCKED" --language TypeScript --limit 20

# Postgres deadlocks: sorting IDs before locking
gh search code "FOR UPDATE" "sort" --language TypeScript --limit 20

# Webhook HMAC signature verification with timingSafeEqual
gh search code "timingSafeEqual" "x-hub-signature" --language TypeScript --limit 20

# React / Next.js optimistic UI rollback with TanStack Query
gh search code "onMutate" "cancelQueries" "setQueryData" --language TypeScript --limit 20
```

---

## 3. Repository Health & License Inspection (`gh repo view`)

Before recommending any repository for `ADOPT` or `ADAPT`, verify its license and maintenance facts:

```powershell
gh repo view OWNER/REPO --json nameWithOwner,licenseInfo,pushedAt,stargazerCount,isArchived,defaultBranchRef
```

---

## 4. Mining Production Pitfalls from Closed Issues & PRs

READMEs show the happy path; **Issues and Pull Requests show what broke in production**:
- Search inside a candidate repo's issues for:
  - `is:issue "race condition" OR "deadlock" OR "duplicate"`
  - `is:issue "memory leak" OR "timeout" OR "N+1"`
  - `is:issue "security" OR "bypass" OR "injection"`
- Convert every real bug found in their issue tracker into a test case in our `akit-test` plan!

---

## 5. Safe Inspection Rules
1. Read files remotely via `gh api`, web view, or a shallow clone (`git clone --depth 1 --no-checkout`) into an isolated temporary directory outside the project repo.
2. **Never execute** untrusted `Makefile`, `postinstall`, `setup.py`, or shell scripts from candidate repositories without explicit user review and approval.
