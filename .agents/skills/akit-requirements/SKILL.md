---
name: akit-requirements
description: Use when turning loose product ideas, client requests, or vibe-coding prompts into structured Business Analysis (BA) specifications, actor/permission matrices, user stories, and Given/When/Then acceptance criteria before coding.
---
# AKit Requirements — Structured Vibe Coding & Brainstorming (`obra/superpowers`)

## Overview
`akit-requirements` bridges the gap between rapid **Vibe Coding** ideation (`datawhalechina/easy-vibe`) and disciplined software engineering (`obra/superpowers` `brainstorming`). Most failed AI-built features stem from jumping straight from a 1-sentence prompt (*"Build me a course booking system"*) into code without clarifying actors, role permissions, edge cases, failure recovery, non-goals, and existing open-source prior art.

**Core principle:** Separate **Confirmed Requirements** from **Assumptions** and **Non-Goals**, compare unfamiliar features against GitHub open-source prior art (`akit-prior-art`), and obtain explicit user approval on the specification before writing production code.

---

## Mandatory Unfamiliar Feature Gate (`akit-prior-art`)
- **Mandatory Rule:** *"Đối với những chức năng chưa quen thuộc, đừng viết từ con số 0, hãy tìm kiếm các dự án mã nguồn mở trên GitHub để so sánh ý tưởng trước khi bắt tay vào làm."*
- During requirement discovery, if the requested capability is unfamiliar or new to the repository, invoke `akit-prior-art` to inspect 2–3 mature GitHub open-source projects so your proposed product flows and edge cases reflect proven real-world designs.

---

## Antigravity Native Tool Mapping & Auto `/grill-me` Emulation
1. **Auto `/grill-me` Interactive Clarification (`ask_question`):**
   - Do not wait for the user to type `/grill-me` manually. Whenever requirements are ambiguous, automatically invoke the native `ask_question` tool with 1–3 focused, high-impact multiple-choice questions (`(Recommended)` option first) to resolve product ambiguities rather than guessing silently.
   - Recommend the `/grill-me` slash command if the user wants an extended interactive design interview.
2. **Generate BA / PRD Specification (`write_file`):**
   - Save the structured specification to `docs/requirements.md` (or present as a reviewable artifact) using `references/requirements.template.md`.
3. **Transition Gate:** Once the user approves the requirements, hand off to `akit-design` (for UI/UX tokens & prototypes) and `akit-plan` (for vertical slice milestones).

---

## Step-by-Step Requirements Engineering Workflow (`datawhalechina/easy-vibe` + `obra/superpowers`)

### Step 1: Decompose Actors, Roles & Trust Boundaries
1. Classify scope (`Spike` / `Bounded` / `Architectural`) and list every actor that interacts with the feature (Anonymous Visitor, Logged-in Customer, Organization Admin, Background Worker, External Webhook).
2. Define an explicit **Role & Permission Matrix**: which actor can `Create`, `Read`, `Update`, `Delete`, or `Approve` each resource (`akit-security`).

### Step 2: Partition Scope into MoSCoW Buckets (`Must` / `Should` / `Could` / `Won't`)
1. **Must Have (MVP Core Slice):** The smallest end-to-end journey that delivers real user value.
2. **Should Have (Fast Follow):** Important enhancements added once the MVP slice passes verification.
3. **Won't Have (Explicit Non-Goals):** Features intentionally excluded from this cycle to prevent scope creep (YAGNI).

### Step 3: Map Happy Path, Boundary & Failure Flows (Backed by `akit-prior-art`)
For every core user story, specify:
1. **Main Success Flow:** Step-by-step user action $\rightarrow$ system validation $\rightarrow$ state persistence $\rightarrow$ UI feedback.
2. **Negative & Boundary Cases:** Duplicate submission, expired session, insufficient balance/inventory, concurrent edit, invalid file type/size, or downstream API timeout.

### Step 4: Write Testable `Given / When / Then` Acceptance Criteria (`references/requirements.template.md`)
Every requirement must be phrased so `akit-test` and `akit-implement` can turn it directly into an automated test:
- *`GIVEN` an authenticated Member of Organization A,*
- *`WHEN` they attempt to view an Invoice belonging to Organization B,*
- *`THEN` the API returns HTTP `404 Not Found` and logs zero sensitive invoice fields.*

---

## Red Flags & Rationalization Counter-Table

| Common Excuse / Rationalization | Engineering Reality & Mandatory Action |
| :--- | :--- |
| *"The user said 'Build a marketplace', so I'll immediately scaffold 40 files including chat, crypto payments, and auctions."* | Classic un-scoped failure (`obra/superpowers`). Flag oversized multi-subsystem requests immediately, decompose into independent sub-projects, and scope the MVP core slice first. |
| *"I'll silently assume how refunds and cancellations work without marking it as an assumption."* | Silent assumptions cause expensive rewrites. Explicitly list every assumption in `references/requirements.template.md` and ask the user via `ask_question`. |
| *"Acceptance criteria can just say 'System should be fast and secure'."* | Untestable platitudes. Write concrete, measurable criteria (`p95 < 200ms`, `Cross-tenant requests return 403/404`). |

---

## Safety & Exit Gates
- **Hard Approval Gate:** Do not transition to `akit-implement` until the user has approved the scoped requirements and acceptance criteria.
- Ensure privacy, authentication, and authorization rules are specified upfront as `Must Have` requirements, never deferred as "later polish".

## Reference Materials & Attribution
- Complete BA / PRD specification template with Actor Matrix & Given/When/Then criteria: `references/requirements.template.md`
- Inspired by `datawhalechina/easy-vibe` (idea-to-product workflow) and `obra/superpowers` (`brainstorming`). Original AKit instructions.
