# AKit SkillForge Authoring Rubric & Deployment Checklist (`akit-skillforge`)

Use this checklist when creating or upgrading any skill in `.agents/skills/` or `AKit/skills/`.

---

## 1. Skill Discovery Optimization (SDO) Frontmatter Audit

| Check | Bad Example (Fails SDO) | Good Example (Passes SDO) |
| :--- | :--- | :--- |
| **Starts with `Use when...`** | `description: Postgres optimization skill` | `description: Use when designing PostgreSQL schemas, tuning slow queries with EXPLAIN, or writing Row Level Security (RLS) policies.` |
| **No Workflow Shortcut** | `description: Use for debugging - 1) reproduce 2) hypothesize 3) fix` | `description: Use when encountering any bug, test failure, runtime exception, or regression before attempting code fixes.` |
| **Concrete Symptoms & Keywords** | `description: Helps with frontend performance` | `description: Use when investigating slow page loads, React re-render waterfalls, bundle bloat, or Core Web Vitals (LCP, INP, CLS).` |
| **Length & Voice** | First-person (`I can help you...`) or >500 chars | Third-person, concise (<350 chars), hyphenated lowercase `name` |

---

## 2. Match the Guidance Form to the Failure Type (`obra/superpowers`)

| Baseline Agent Failure Mode | Effective Guidance Form in `SKILL.md` | Ineffective Form (Backfires) |
| :--- | :--- | :--- |
| **Skips a rule under pressure** (e.g., skips tests, edits without root cause) | **Hard Gate + Rationalization Counter-Table + Red Flags** | Soft advice (*"Prefer writing tests first when possible"*) |
| **Wrong output shape** (e.g., vague review, missing verification block) | **Positive Output Contract / Template** in `references/` showing exact sections in order | Long list of *"Don't do X, don't forget Y"* |
| **Hallucinates APIs / SQL / Configs** | **Concrete Reference Matrix &Runnable Example** in `references/` | Abstract prose reminders |

---

## 3. Mandatory Anatomy of an AKit v0.4.0 Skill

Every skill directory `skills/akit-<name>/` MUST satisfy:
- [ ] `SKILL.md` starts with exact YAML frontmatter (`name: akit-<name>`, `description: Use when ...`).
- [ ] `SKILL.md` contains **80 to 160 lines** (>3,000 characters) of concrete operational guidance.
- [ ] Sections included in `SKILL.md`:
  1. `## Overview` (with **Core principle**)
  2. `## When to Use` (or Decision Table / Flowchart)
  3. `## Antigravity Native Tool Mapping`
  4. `## Step-by-Step Workflow / Playbook`
  5. `## Red Flags & Rationalization Counter-Table`
  6. `## Safety & Exit Gates`
  7. `## Reference Materials & Attribution`
- [ ] `references/` directory contains at least one detailed `.md` file (>= 25 lines) explicitly linked from `SKILL.md`.
- [ ] `python -m akit.doctor --project <installed-path>` and `python -m unittest discover -s tests -v` pass with zero errors.
