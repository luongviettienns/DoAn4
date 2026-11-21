# `vercel-labs/skills` (`find-skills`) & Awesome Skill Catalogs Playbook

This reference integrates the official `find-skills` workflow from `vercel-labs/skills` and the top curated community skill directories (`ComposioHQ/awesome-claude-skills`, `travisvn/awesome-claude-skills`, `BehiSecc/awesome-claude-skills`, `kaichen/agent-skillset`, and `helloianneo/awesome-claude-code-skills`).

---

## 1. The `vercel-labs/skills` (`find-skills`) CLI Workflow

When a user asks *"how do I do X"*, *"find a skill for X"*, or when the agent encounters a specialized domain (e.g., Stripe billing, Cloudflare Workers, Terraform, Remotion video, Three.js, Prisma, Expo) not yet covered by installed skills:

### Core `npx skills` Commands
1. **Search for skills interactively or by keyword**:
   ```bash
   npx skills find <query>
   # Examples:
   npx skills find react performance
   npx skills find playwright testing
   npx skills find postgres optimization
   ```
2. **Install a skill from any GitHub repository**:
   ```bash
   npx skills add <owner/repo@skill> -g -y
   # Or install all skills in a repository:
   npx skills add vercel-labs/agent-skills
   npx skills add anthropics/skills
   npx skills add obra/superpowers
   npx skills add benjitaylor/skills --skill stageshow
   ```
3. **List and audit installed skills**:
   ```bash
   npx skills list
   npx skills check
   ```
4. **Update installed skills to their latest versions**:
   ```bash
   npx skills update
   ```

### Search Query Strategy
- Prefer **2–3 specific technical keywords** (`"nextjs app-router"`, `"postgres RLS"`, `"playwright e2e"`) over vague single words (`"web"`, `"code"`).
- Always check the Antigravity built-in Marketplace (`search_marketplace` tool) first, then run `npx skills find <query>`, and cross-reference the Awesome Skill Catalogs below.

---

## 2. The 5 Canonical Awesome Skill Catalogs & Directories

When `npx skills find` returns multiple candidates or when browsing for high-trust domain skills, consult these 5 canonical ecosystems:

| Catalog / Repository | Primary Strength & Classification System | Best Used For |
| --- | --- | --- |
| **`ComposioHQ/awesome-claude-skills`** | Categorized directory across Development, SaaS Integrations (GitHub, Linear, Notion, Slack, Jira), Data Analysis, DevOps, and Business Automation | Multi-app automation, SaaS workflows, API orchestration |
| **`travisvn/awesome-claude-skills`** | Curated engineering & productivity skills with focus on TDD, Git worktrees, code review, and official Anthropic/community packs | Core software engineering workflows, git hygiene, testing |
| **`BehiSecc/awesome-claude-skills`** | Security-conscious categorization across Web, Cloud, Security/Pentesting, DevOps, Data Science, and Prompt Engineering | AppSec, DevSecOps, static analysis, infrastructure auditing |
| **`kaichen/agent-skillset`** | Deep architectural analysis of high-impact skill packs (`vercel-labs/agent-skills` 100+ UI & 45+ React rules, `anthropics/skills`, `obra/superpowers`) | Benchmarking skill quality, progressive disclosure patterns |
| **`helloianneo/awesome-claude-code-skills`** | Wiki-structured directory mapping meta-skills (`find-skills`), slash commands, subagents, hooks, and workflow orchestration | Agent meta-skills, CLI automation, IDE customization |

---

## 3. Mandatory 4-Step Vetting Protocol Before Installing External Skills

Never blindly execute or install an unverified third-party skill. Before running `npx skills add <owner/repo>`, perform this 4-step audit:

1. **Source & Provenance Check**:
   - Tier 1 (Trusted Official): `anthropics/skills`, `vercel-labs/agent-skills`, `vercel-labs/skills`, `obra/superpowers`, `supabase/agent-skills`, `microsoft/postgres-skills`, `trailofbits/skills`, `getsentry/skills`, `semgrep/skills`.
   - Tier 2 (Community Curated): Listed in `ComposioHQ/awesome-claude-skills`, `travisvn/awesome-claude-skills`, or `BehiSecc/awesome-claude-skills` with active maintenance.
2. **`SKILL.md` Frontmatter & Trigger Inspection**:
   - Verify the `description` is specific (`Use when...`) and does not hijack unrelated prompts with overly broad triggers (`Use for all tasks`).
3. **Script & Hook Safety Audit (`akit-security`)**:
   - Inspect any bundled `scripts/*.py` or `scripts/*.sh` for network exfiltration (`curl`, `wget` to unknown hosts), credential reading (`~/.ssh`, `.env` uploads), or destructive shell commands (`rm -rf`).
4. **Post-Install Doctor Verification**:
   - After installing or adapting a skill into AKit, run `akit-doctor` to verify token budgets and reference link integrity.
