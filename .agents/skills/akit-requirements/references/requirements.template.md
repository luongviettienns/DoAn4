# Product Requirements & BA Specification Template (`akit-requirements`)

Use this template (informed by `datawhalechina/easy-vibe` and `obra/superpowers`) to turn loose feature requests into testable engineering specs.

---

```markdown
# Product Requirements Specification (PRD): [Feature / Product Name]

## 1. Problem Statement & Core Value
- **User Problem:** `[What pain point or workflow gap are we solving?]`
- **Target Outcome / Metric:** `[What observable action proves the feature succeeded?]`
- **Requirement Status:** `[Draft — Awaiting Approval | Approved]`

---

## 2. Actors & Role Permission Matrix (`RBAC / Tenant Scope`)

| Actor / Role | Create | Read (Own / Org) | Update | Delete / Cancel | Special Constraints |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `Anonymous Visitor` | No | Public catalog only | No | No | Rate-limited by IP |
| `Authenticated Member` | Yes (Own) | Own records only | Own (`DRAFT` only) | Cancel own (`PENDING`) | Scoped to `user.id` |
| `Org Admin` | Yes | All within `orgId` | All within `orgId` | Soft-delete within `orgId` | Cannot access other orgs |

---

## 3. Scope Boundaries (`MoSCoW` & Explicit Non-Goals)
- **Must Have (MVP Vertical Slice 1):**
  1. `[Core capability 1]`
  2. `[Core capability 2]`
- **Should Have (Slice 2):**
  1. `[Secondary enhancement]`
- **Explicit Non-Goals (Out of Scope — Do NOT Build Now):**
  1. `[Excluded feature 1]`
  2. `[Excluded feature 2]`

---

## 4. Confirmed Facts vs. Working Assumptions
- **Confirmed Constraints:** `[Verified from user input or existing repo]`
- **Working Assumptions (Flagged for Sign-Off):**
  - `[Assumption 1: e.g., Cancelled bookings release held inventory immediately]`
- **Open Blocking Questions:** `[Questions requiring user answer before coding]`

---

## 5. Testable Acceptance Criteria (`Given / When / Then`)

### Story 1: [Story Title]
1. **AC-1.1 (Happy Path):**
   - **GIVEN** `[Precondition & state]`
   - **WHEN** `[Actor performs action with valid input]`
   - **THEN** `[Exact persisted state, response code, and UI state]`
2. **AC-1.2 (Validation / Boundary Failure):**
   - **GIVEN** `[Precondition]`
   - **WHEN** `[Actor submits empty/negative/duplicate input]`
   - **THEN** `[Rejected with 400/409 error code; zero state mutation]`
3. **AC-1.3 (Authorization / Isolation Boundary):**
   - **GIVEN** `[Authenticated user from Tenant A]`
   - **WHEN** `[They request or mutate a resource owned by Tenant B]`
   - **THEN** `[Rejected with 403/404; audit log recorded]`
```
