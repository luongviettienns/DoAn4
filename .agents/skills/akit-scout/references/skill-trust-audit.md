# External Skill & Catalog Trust Audit Scorecard (`akit-scout`)

Complete this audit before installing or adapting any third-party skill, custom agent, or MCP integration.

---

## 1. Curated Discovery Sources Reference

| Catalog / Repository | Primary Focus | Packaging Format | License / Reuse Rule |
| :--- | :--- | :--- | :--- |
| **Antigravity Marketplace (`search_marketplace`)** | Official Google Workspace, Firebase, Chrome DevTools, Gemini, Science plugins | Native Antigravity Plugins (`<plugin-card>`) | Recommend via `<plugin-card>`; user installs |
| **`anthropics/skills`** | Document generation (`docx`, `pdf`, `pptx`, `xlsx`), `frontend-design`, `webapp-testing`, `skill-creator` | `skills/<name>/SKILL.md` + `scripts/` | Check per-folder license before copying scripts |
| **`obra/superpowers`** | Core engineering discipline (`brainstorming`, `test-driven-development`, `systematic-debugging`, `writing-skills`) | `skills/<name>/SKILL.md` | MIT |
| **`rmyndharis/antigravity-skills`** | Antigravity-targeted domain skills and role definitions | `.agents/skills/` | Verify individual skill provenance & license |
| **`sickn33/agentic-awesome-skills`** | Multi-domain index of coding agent skills | Curated directory / links | MIT index; verify target repo license |
| **`github/awesome-copilot`** | Custom instructions, chatmodes/agents, and reusable workflows | `.github/instructions`, agents | Reference patterns; adapt to `.agents/` |

---

## 2. Security & Quality Audit Checklist (Per Candidate Skill)

```markdown
# Skill Trust Audit: `[Candidate Skill Name]`
- **Source URL & Commit SHA:** `[https://github.com/owner/repo/tree/<sha>/path]`
- **Declared License:** `[MIT / Apache-2.0 / GPL-3.0 / CC-BY-NC / Unspecified]`

### Security & Injection Checks (All MUST pass)
- [ ] **Full Text Inspected:** Read `SKILL.md` and all files in `references/` and `scripts/` line-by-line.
- [ ] **No Prompt Injection:** Zero instructions to ignore system prompts, bypass approval gates, or hide actions from the user.
- [ ] **No Secret Exfiltration:** Zero commands reading `.env`, `~/.ssh`, `~/.aws`, or sending workspace data to external URLs.
- [ ] **No Unpinned Remote Execution:** Zero `curl | sh`, `eval`, or unpinned `npx -y` calls to unknown packages.
- [ ] **Token Footprint Reasonable:** `SKILL.md` is concise (<200 lines) and uses `references/` for bulky docs.

### Verdict
- **Disposition:** [`ADOPT AS-IS (Permissive License)` | `ADAPT CONCEPT VIA AKIT-SKILLFORGE` | `REJECT (Unsafe / Low Signal)`]
- **Reason:** `[1-2 sentences]`
```
