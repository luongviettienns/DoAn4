---
name: akit-security
description: Use when threat-modeling new features, auditing authentication/authorization (RBAC, BOLA, RLS), reviewing diffs for injection or cryptographic flaws, or running and triaging static security scans (Semgrep, dependency audits).
---
# AKit Security — Differential Security Review & SAST Triage

## Overview
`akit-security` integrates the **Differential Security Auditing** and vulnerability-hunting methodology from `trailofbits/skills` with **Static Analysis & Custom Pattern Triage** from `semgrep/skills` and database access-control discipline from `supabase/agent-skills`.

**Core principle:** Authentication (`who you are`) is not Authorization (`what you are allowed to touch`). Every security finding must be backed by a concrete trust-boundary trace and reproducible exploit scenario — static scanner output alone is never proof of safety or vulnerability.

---

## Antigravity Native Tool Mapping

In Codex, use local read and shell tools. If delegation is authorized and available, pass the exact diff to the security role; it inherits session permissions. Use a separate read-only session when write isolation is required.

1. **Delegate Specialized Security Audit (`invoke_subagent`):**
   - In Antigravity, use `.agents/agents/akit-security.md` when authorized for an independent audit of auth, payment, webhook, file-upload, or tenant boundaries.
2. **Run Authorized Local Scanners (`run_command`):**
   - If `semgrep`, `npm audit`, `pip-audit`, or `cargo audit` is installed locally, run it in read-only mode (`references/semgrep-and-audit-playbook.md`) and record actual CLI output via `akit.checks`.
   - Never claim a scanner ran if the binary is not installed!
3. **Threat Modeling Artifact:** Document assets, actors, trust boundaries, and mitigations using `references/threat-model.md`.

---

## Step-by-Step Security Audit & Hardening Workflow

### Step 1: Map Trust Boundaries & Attacker-Controlled Inputs (`references/threat-model.md`)
1. Identify every **Entrypoint** where untrusted data enters the system: HTTP body/query/headers, webhook payloads, uploaded files/filenames, OAuth callbacks, database rows populated by external users, and LLM prompt inputs.
2. Trace data flow from the untrusted source to sensitive **Sinks** (SQL queries, OS shell execution, file paths, HTML rendering, outbound `fetch` URLs, deserializers, and privilege checks).

### Step 2: Execute Differential Invariant Analysis (`trailofbits/skills`)
When reviewing a feature or diff, check what security invariants the surrounding system relies on and how the change could violate them:
1. **Multi-tenant Security & Broken Object Level Authorization (BOLA / IDOR — Mandatory Hard Gate):**
   - Does `GET/POST/PUT/PATCH/DELETE /resources/:id` filter by the authenticated user's `organizationId` / `userId` inside the DB query (`WHERE id = $1 AND user_id = $2`), or can User A pass User B's UUID?
   - **Mandatory Cross-Account Test Gate:** Every API reading, updating, or deleting personal/tenant data MUST have an automated cross-account access test (User A attempting to read/update/delete User B's record returns `403`/`404` and leaves User B's DB state intact).
2. **Broken Function Level Authorization:** Are admin/internal endpoints protected by explicit role guards at the router/controller level?
3. **Injection & SSRF Sinks:**
   - SQL / ORM raw queries (`$queryRawUnsafe`, string-concatenated SQL).
   - Command execution (`child_process.exec`, `subprocess.run(..., shell=True)`).
   - Server-Side Request Forgery (fetching user-supplied URLs without allowlisting or blocking `169.254.169.254` / `127.0.0.1` / private CIDRs).
   - Path Traversal (joining user filenames without `path.resolve` containment check).
4. **State & Race Vulnerabilities (TOCTOU):** Coupon redemption, balance transfers, and token rotation must execute atomically inside a locked transaction or single conditional `UPDATE ... RETURNING`.
5. **Secrets, Auth Tokens & Cryptography:** Password hashing (`Argon2id` / `bcrypt`), constant-time webhook HMAC verification (`crypto.timingSafeEqual`), `HttpOnly; Secure; SameSite` cookies, and zero secrets in logs or client bundles.

### Step 3: Static Pattern Scanning & Triage (`semgrep/skills`)
1. Run targeted `semgrep` or ripgrep security patterns (`references/semgrep-and-audit-playbook.md`) to locate dangerous sinks across the repository.
2. **Triage Every Finding Manually:** Inspect the surrounding code to verify whether input is actually attacker-controlled or already sanitized upstream. Filter out false positives and write a custom Semgrep rule or unit test to prevent the vulnerable pattern from recurring.

### Step 4: Remediation & Exploit-Regression Test
1. Fix confirmed vulnerabilities at the boundary or sink.
2. Write an automated security regression test (e.g., attempting cross-tenant access returns `403/404`; forged webhook signature returns `401`) and verify it passes (`akit-test`).

---

## Red Flags & Rationalization Counter-Table

| Common Excuse / Rationalization | Engineering Reality & Mandatory Action |
| :--- | :--- |
| *"The route has `@UseGuards(JwtAuthGuard)`, so authorization is handled."* | `JwtAuthGuard` only proves the user is logged in (Authentication). Without checking `resource.ownerId === user.id` (Authorization), any logged-in user can modify anyone else's data (IDOR). |
| *"Semgrep / `npm audit` reported 0 issues, so the application is 100% secure."* | SAST tools miss business-logic flaws, missing authorization checks, and multi-step race conditions. Always perform manual threat modeling (`references/threat-model.md`). |
| *"This endpoint is only called by our frontend UI, so users won't send invalid fields."* | Attackers call APIs directly with `curl` / Burp Suite. Enforce strict allowlist DTO validation (`forbidNonWhitelisted`) and strip mass-assigned fields like `role: 'admin'`. |
| *"I'll report 20 theoretical low-severity scanner warnings without checking if they are reachable."* | Dumping unverified scanner noise violates `trailofbits/skills` discipline. Verify reachability and preconditions first. |

---

## Safety & Exit Gates
- Never run active exploit payloads against production systems or third-party infrastructure.
- Never print live `.env` secrets, private keys, or customer PII in terminal output or security reports.
- Distinguish **Confirmed Exploitable Findings** (`file:line` + attack path) from **Defense-in-Depth Hardening Recommendations**.

## Reference Materials & Attribution
- STRIDE / Differential Threat Model template: `references/threat-model.md`
- Semgrep custom rule authoring, SAST triage & high-risk sink cheatsheet: `references/semgrep-and-audit-playbook.md`
- Inspired by `trailofbits/skills`, `semgrep/skills`, and `supabase/agent-skills`. Original AKit instructions.
