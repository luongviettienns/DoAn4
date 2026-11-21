---
name: akit-plan
description: Use when breaking approved requirements or architectural specs into ordered, bite-sized vertical slices with explicit file paths, Consumes/Produces interfaces, Pre-flight Conflict Scans, and TDD verification commands before implementation.
---
# AKit Plan — Bite-Sized Vertical Slice Planning (`obra/superpowers`)

## Overview
`akit-plan` synthesizes the **Implementation Planning** and **Plan Execution** disciplines from `obra/superpowers` (`writing-plans`, `executing-plans`, `subagent-driven-development`) with the iterative **MVP Vertical Slice** delivery methodology of `datawhalechina/easy-vibe` and `shanraisshan/claude-code-best-practice`.

**Core principle:** Plan in vertical, end-to-end testable slices (2–5 minutes per task step) where every task specifies exact file paths, explicit `Consumes` / `Produces` interfaces, concrete failing test code, implementation steps, and a **Pre-flight Conflict Scan** (`references/superpowers-plan-spec.md`) with zero placeholders.

---

## Pre-Planning Mandatory Unfamiliar Slice Gate (`akit-prior-art`)
- **Mandatory Rule:** *"Đối với những chức năng chưa quen thuộc, đừng viết từ con số 0, hãy tìm kiếm các dự án mã nguồn mở trên GitHub để so sánh ý tưởng trước khi bắt tay vào làm."*
- Inspect every slice in your proposed plan. If any slice requires an unfamiliar technical capability (e.g., WebAuthn, seat locking, webhook signature queues, PDF rendering), execute **`akit-prior-art` as Milestone 0** before locking the implementation tasks: search GitHub for 2–3 mature open-source projects, compare their designs and licenses, and record the **Adopt / Adapt / Build** decision in the Plan Document Header.

---

## Antigravity Native Tool Mapping & Auto `/plan` Workflow

In Codex, use the current mode's planning tools or a concise plan in chat. Save a project plan when the task calls for a lasting document. The Antigravity artifact and Proceed control below apply only in Antigravity. Use installed domain skills as needed; missing optional skills do not block planning.

1. **Auto-Execute `/plan` Artifact (`write_file`):**
   - Automatically create the reviewable plan artifact at `<appDataDir>/brain/<conversation-id>/implementation_plan.md` with `RequestFeedback: true` (renders the **Proceed** button in the Antigravity UI) or save to `docs/plan.md` using `references/vertical-slice-plan.template.md` and `references/superpowers-plan-spec.md`.
   - Synchronize phase and task checkboxes with `PROJECT_PROGRESS.md`.
2. **Pre-Flight Conflict Scan & Execution Handoff:**
   - Run the Pre-flight Conflict Scan (`references/superpowers-plan-spec.md`) across all tasks sharing files or `Consumes`/`Produces` interfaces before starting Task 1.
   - Hand off execution to `akit-implement` in **Subagent-Driven Development (SDD)** mode or **Inline Execution** mode.

---

## Step-by-Step Planning Workflow

### Step 1: Sequence Foundations & Contracts Before Dependents
Order milestones to eliminate blocking dependencies:
1. **Milestone 0 (Mandatory if unfamiliar):** `akit-prior-art` GitHub OSS comparison + `akit-debate` / `akit-arena` architectural decision.
2. **Milestone 1 (Contract & Schema Lock):** Database migration (`akit-data` / `akit-postgres`) + shared API DTO/OpenAPI contract (`akit-contract`) + `DESIGN.md` tokens (`akit-design`).
3. **Milestone 2..N (Vertical Feature Slices):** Each slice cuts through Backend $\rightarrow$ Frontend $\rightarrow$ Automated Test for one complete user story (rather than building 100% of the backend for 20 features before testing any UI!).
4. **Final Milestone (Quality, Simplification & Delivery):** `akit-simplify` + `akit-security` + `akit-browser-qa` + `akit-deliver`.

### Step 2: Decompose Each Slice into Atomic TDD Steps (`obra/superpowers`)
For every task (`references/superpowers-plan-spec.md` and `references/vertical-slice-plan.template.md`), specify:
- **Global Constraints & Header:** Goal, Architecture, Tech Stack, Spec path, and Prior-Art decision.
- **Exact File Paths:** Files to create, modify, or test (`src/orders/orders.service.ts`, `test/orders/orders.spec.ts`).
- **Interfaces (`Consumes` / `Produces`):** Exact function signatures and types consumed from earlier tasks and produced for later tasks.
- **Step 1–5 (RED $\rightarrow$ Verify RED $\rightarrow$ GREEN $\rightarrow$ Verify GREEN $\rightarrow$ Commit):** Concrete test code and exact commands (`Exit 0`).

### Step 3: Self-Review & Pre-Flight Conflict Scan (`references/superpowers-plan-spec.md`)
1. **Spec Coverage Check:** Verify every requirement in the spec maps to a concrete task.
2. **No-Placeholders Scan:** Eliminate all `TODO`, `TBD`, `"similar to Task N"`, or `"write tests for the above"` placeholders.
3. **Pre-Flight Conflict Scan Table:** Verify signature consistency across every pair of tasks sharing a file or interface.

---

## Red Flags & Rationalization Counter-Table

| Common Excuse / Rationalization | Engineering Reality & Mandatory Action |
| :--- | :--- |
| *"Task 1: Build the entire backend. Task 2: Build the entire frontend. Task 3: Write tests."* | Horizontal waterfall planning! Bugs stay hidden until Task 3, and tests are bolted on after code. Plan in **Vertical Slices** where every task includes its own RED$\rightarrow$GREEN test. |
| *"The plan says 'Update relevant files and add appropriate tests' or 'Similar to Task 2'."* | Vague placeholders and cross-task shorthand cause isolated subagents to fail (`references/superpowers-plan-spec.md`). Include exact paths, signatures, and test code. |
| *"I'll skip checking GitHub prior art and design the custom queue from zero in the plan."* | Violates the mandatory rule (*"Đừng viết từ con số 0"*). Run `akit-prior-art` before locking unfamiliar task designs. |

---

## Safety & Exit Gates
- Do not start executing a multi-module plan until the user has reviewed and approved the plan artifact (except when explicitly instructed to run end-to-end).
- Update the plan checkboxes (`- [x]`) and `PROJECT_PROGRESS.md` as each slice is verified with real command evidence.

## Reference Materials & Attribution
- Vertical slice implementation plan template with TDD task blocks: `references/vertical-slice-plan.template.md`
- Superpowers plan header, `Consumes`/`Produces` interfaces, No-Placeholders gate, and Pre-flight Conflict Scan: `references/superpowers-plan-spec.md`
- Inspired by `obra/superpowers` (`writing-plans`, `executing-plans`, `subagent-driven-development`), `datawhalechina/easy-vibe`, and `shanraisshan/claude-code-best-practice`. Original AKit instructions.
