---
name: akit-codebase
description: Use when onboarding to an unfamiliar repository, mapping module dependencies and symbol call graphs, or performing blast-radius impact analysis before modifying complex existing code.
---
# AKit Codebase — Semantic Symbol Navigation & Knowledge Graph Mapping

## Overview
`akit-codebase` combines **semantic symbol-level navigation** (`oraios/serena`: finding symbol definitions, referencing callers, and type hierarchies without reading entire 2,000-line files) with **architectural knowledge-graph mapping** (`Egonex-AI/Understand-Anything`: decomposing repositories into layered nodes, dependency edges, and guided domain tours).

**Core principle:** Navigate by symbols and dependency edges, not blind full-repo text dumps. Always separate **observed call paths** (`file:line`) from **inferred behavior**.

---

## Antigravity Native Tool Mapping
1. **Delegate Broad Exploration (`invoke_subagent`):**
   - When mapping a subsystem that spans >8 files, dispatch `.agents/agents/akit-scout.md` (or `research`) so raw search exploration stays out of the parent context window.
2. **Semantic & Fast Portable Search (`run_command` / `read_file`):**
   - If Serena MCP (`find_symbol`, `find_referencing_symbols`, `get_symbols_overview`) is configured in `mcp_config.json`, use it to jump directly to symbol definitions and callers.
   - Otherwise, use targeted `rg` (ripgrep) symbol queries (`rg -n "class OrderService|function calculateTax"`) and read only the exact line ranges (`read_file` with `StartLine` / `EndLine`).
3. **Knowledge Graph Output (`write_file`):** Record the structural map using `references/codebase-knowledge-graph.template.md`.

---

## Step-by-Step Codebase Investigation Workflow

### Step 1: Anchor at the Repository Root & Manifests
1. Read `README.md`, `AGENTS.md` / `GEMINI.md`, and package/build manifests (`package.json`, `pyproject.toml`, `tsconfig.json`, `docker-compose.yml`).
2. Identify:
   - **Runtime & Framework:** How the app boots (`main.ts`, `app.py`, `next.config.js`).
   - **Test & Verification Commands:** How unit and integration tests are executed.
   - **Workspace / Monorepo Boundaries:** Packages, shared libraries, and build order.

### Step 2: Trace the Vertical Slice Spine (`oraios/serena` Pattern)
For the target feature or bug, trace the exact symbol chain across 5 architectural layers:
1. **Entrypoint Layer:** HTTP route, GraphQL resolver, CLI command, queue consumer, or UI page component.
2. **Validation & Auth Guard Layer:** Middleware, pipes, DTO validators, RBAC/RLS guards.
3. **Domain / Service Layer:** Core business rules, state transitions, transaction orchestration.
4. **Persistence Layer:** ORM entities, SQL repositories, migrations, cache keys.
5. **Side-Effect / Integration Layer:** Outbound HTTP clients, webhooks, events, background jobs.

### Step 3: Build the Blast-Radius & Knowledge Graph (`Understand-Anything` Pattern)
1. Identify **Upstream Callers** (every module that calls the symbol you plan to change) and **Downstream Dependencies** (every table, queue, or external API it touches).
2. Render a concise Mermaid dependency graph and symbol impact table using `references/codebase-knowledge-graph.template.md`.
3. Locate existing unit/integration tests covering those symbols so you know your baseline test command before editing code.

---

## Red Flags & Rationalization Counter-Table

| Common Excuse / Rationalization | Engineering Reality & Mandatory Action |
| :--- | :--- |
| *"I'll read 25 entire source files from line 1 to 1,000 to understand the module."* | Exhausts context budget and buries key invariants. Search for symbol definitions/callers first, then read targeted line ranges (`StartLine`..`EndLine`). |
| *"I'll assume `UserService.delete()` does a hard SQL DELETE based on its name."* | Names lie (it might do a soft-delete, trigger a Stripe webhook, or fail on FK constraints). Always read the implementation body. |
| *"Serena MCP isn't installed, so I'll pretend I ran semantic symbol tools."* | **Never fabricate tool calls.** If Serena MCP is absent, use `rg` / `git grep` + `read_file` and state the actual commands used. |
| *"Let me scan `.env` and credential files while mapping the repo."* | Never read or echo secret values (`.env`, `.pem`, `.key`). Inspect `.env.example` or config schema files instead. |

---

## Safety & Exit Gates
- Do not modify files or install packages during codebase reconnaissance.
- Never upload private repository source code to external web services.
- Every symbol and dependency claim in your output must include an exact `file:line` citation or be marked `[UNVERIFIED]`.

## Reference Materials & Attribution
- Architectural knowledge-graph, symbol table, and blast-radius template: `references/codebase-knowledge-graph.template.md`
- Inspired by `oraios/serena` (symbol-aware semantic navigation) and `Egonex-AI/Understand-Anything` (codebase knowledge graphs & guided tours). Original AKit instructions.
