# Semgrep SAST Triage & High-Risk Sink Playbook (`akit-security`)

Use this reference (informed by `semgrep/skills` and `trailofbits/skills`) to scan for dangerous sinks, triage static findings without false-positive noise, and write custom project guardrails.

---

## 1. High-Signal Sink Discovery Queries (Portable `rg` & `semgrep`)

Even when `semgrep` is not installed, use `rg` (ripgrep) to audit dangerous sinks across the repository:

```powershell
# 1. Raw SQL / ORM escape hatches (SQL Injection surface)
rg -n "\$queryRawUnsafe|\$executeRawUnsafe|sequelize\.query\(|cursor\.execute\(.*f[\"']|raw\("

# 2. OS Shell / Subprocess execution (Command Injection surface)
rg -n "child_process|exec\(|execSync\(|spawn\(.*shell:\s*true|subprocess\.(run|Popen|call).*shell\s*=\s*True|os\.system\("

# 3. Dangerous HTML / Script / Deserialization sinks (XSS & RCE surface)
rg -n "dangerouslySetInnerHTML|v-html|innerHTML\s*=|eval\(|new Function\(|pickle\.loads|yaml\.load\("

# 4. Weak Crypto / Timing-Unsafe Comparisons / Hardcoded Secrets
rg -n "Math\.random\(\)|createHash\(['\"]md5|createHash\(['\"]sha1|===.*signature|PRIVATE KEY"
```

---

## 2. Running Semgrep Locally (When Installed)

```powershell
# Run Semgrep with community security rulesets on changed files only
semgrep scan --config p/default --config p/owasp-top-ten --error

# Test a custom project Semgrep rule against a test file
semgrep scan --test --config .akit/semgrep-rules/
```

---

## 3. Authoring a Custom Semgrep Guardrail Rule (`semgrep/skills` Pattern)

When you fix a recurring project-specific bug (e.g., calling `prisma.invoice.findUnique({ where: { id } })` without tenant scoping), codify a custom YAML rule:

```yaml
rules:
  - id: akit-require-tenant-scope-on-invoice
    languages: [typescript, javascript]
    severity: ERROR
    message: >-
      Direct invoice lookup by `id` alone risks cross-tenant IDOR.
      Use `findFirst({ where: { id, organizationId } })` instead.
    pattern: $PRISMA.invoice.findUnique({ where: { id: $ID } })
    fix: $PRISMA.invoice.findFirst({ where: { id: $ID, organizationId } })
```

---

## 4. False-Positive Triage Protocol (`trailofbits/skills`)
For every static finding, answer these 3 questions before reporting it:
1. **Source Control:** Can an external user or untrusted actor actually control the variable reaching this sink? (If it is a hardcoded compile-time constant, mark `False Positive - Constant Input`).
2. **Boundary Validation:** Is there an upstream validator (e.g., strict UUID regex, `z.enum()`, parameterized prepared statement) that neutralizes the payload before reaching the sink?
3. **Impact:** If triggered, what is the worst-case impact (RCE, cross-tenant data read, DoS, or harmless 400 error)?
