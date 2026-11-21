# Anthropic `doc-coauthoring` 3-Stage Workflow & Office Document Suite

Synthesized from `anthropics/skills` (`doc-coauthoring`, `docx`, `pdf`, `pptx`, `xlsx`). Use this workflow when writing RFCs, ADRs, PRDs, Technical Design Docs, or executive reports.

---

## Stage 1: Context Gathering (Close the Knowledge Gap)

Before drafting prose, bridge the gap between what the user knows and what the agent knows:

1. **Initial Meta-Questions**:
   - What is the document type (ADR, RFC, PRD, Postmortem, Architecture Spec, Runbook)?
   - Who is the primary audience (Staff Engineers, Product Managers, Security Auditors, New Hires)?
   - What is the desired impact when they finish reading (Approve design, execute migration, align on scope)?
2. **Context Dumping & Automated Discovery**:
   - Read existing codebase symbols, git history, and related docs first so you never ask the user questions the repo already answers.
   - Ask 5–10 targeted clarifying questions to uncover non-obvious constraints, rejected alternatives, SLAs, and edge cases.
   - **Exit Condition**: Proceed to Stage 2 only when edge cases and trade-offs can be explained without guessing.

---

## Stage 2: Section-by-Section Refinement & Structure

Never dump a massive 2,000-word generic wall of text in one shot for high-stakes specs:

1. **Scaffold the Skeleton**: Create the section outline with brief 1-sentence placeholders and confirm structure.
2. **Start with the Highest-Uncertainty Section**: Draft the core decision/architecture section first (leave *Executive Summary* or *TL;DR* for last after all decisions are locked).
3. **Brainstorm $\rightarrow$ Curate $\rightarrow$ Draft $\rightarrow$ Surgical Edit**:
   - Present 5–10 concrete points for complex sections, let the user select/trim, draft the section using active voice and Mermaid diagrams (`flowchart TD`, `sequenceDiagram`, `erDiagram`), and refine via surgical edits (`edit_file`).
4. **Quality Rules**:
   - Every architectural claim must link to concrete files (`[auth.ts](file:///.../auth.ts#L10-L45)`), metrics, or failure modes.
   - Explicitly document **Non-Goals** and **Rejected Alternatives** (and *why* they were rejected).

---

## Stage 3: `Reader Testing` with a Fresh Subagent (Zero-Context Verification)

Before declaring a technical document finished, test it against a reader with **no prior conversation context**:

1. **Generate 5–10 Reader Questions**:
   - What would a realistic engineer/reviewer ask when reading this doc cold? (e.g., *"How do we roll back if the schema migration fails halfway?"*, *"Who owns alerting on queue lag?"*).
2. **Invoke a Fresh Subagent (`research` or `self`) for `Reader Testing`**:
   - Pass *only* the document text and the reader questions to the subagent (no conversation backstory).
   - Have the subagent attempt to answer each question strictly from the document and report:
     - **Ambiguities**: Sentences with multiple interpretations.
     - **Assumed Knowledge**: Jargon or internal context used without definition.
     - **Contradictions**: Numbers, diagrams, or phases that disagree across sections.
3. **Fix & Re-Verify**: Patch every gap surfaced by `Reader Testing` before presenting the final document to the user.

---

## Domain Document Handoff Rules (`docx`, `pdf`, `pptx`, `xlsx`)

When the user requests deliverables beyond Markdown:
- **`xlsx` (Spreadsheets & Financial/Metric Models)**: Use live Excel formulas (`SUM`, `INDEX/MATCH`, `XLOOKUP`) rather than hardcoded calculated numbers; color-code inputs (blue) vs formulas (black) and verify zero formula errors (`#REF!`, `#DIV/0!`, `#VALUE!`).
- **`docx` (Formal Reports & Specs)**: Use proper Heading styles (`Heading 1`–`3`), explicit table borders/padding, page breaks before major sections, and native tracked changes/comments when reviewing existing `.docx` files.
- **`pdf` (Forms & Printable Reports)**: Verify page breaks never split tables or headings awkwardly by converting pages to images (`pdftoppm -png`) and visually inspecting every page.
- **`pptx` (Presentations)**: Enforce strong visual hierarchy, 1 core takeaway per slide, high-contrast typography, and visual inspection of rendered slide thumbnails.
