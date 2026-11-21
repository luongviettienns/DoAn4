# UI/UX Pro Max Intelligence & Ergonomics Reference (`akit-design`)

Derived from `nextlevelbuilder/ui-ux-pro-max-skill` and `VoltAgent/awesome-design-md`. Use this reference to select domain-appropriate aesthetics and verify UX completeness.

---

## 1. Domain-to-Aesthetic Pairing Matrix

| Product Domain | Recommended Visual Direction | Primary Palette Strategy | Typography Pairing | Key Layout Pattern |
| :--- | :--- | :--- | :--- | :--- |
| **Fintech / Analytics / SaaS** | Swiss Technical Grid | Deep Slate (`#0F172A`), Emerald/Teal Accent (`#0D9488`), Crisp Alabaster (`#F8FAFC`) | Geometric Sans + Monospace (`tabular-nums`) | Collapsible sidebar, sticky KPI strip, dense sortable data grid |
| **Healthcare / EdTech / Civic** | Calm Accessible Clarity | Warm Ivory (`#FAF9F6`), Deep Navy (`#1E3A8A`), Amber/Forest status cues | Humanist Sans (`Atkinson Hyperlegible` / `Lexend`) | High-contrast cards, step-by-step progress wizards, large form labels |
| **Developer Tools / AI Ops** | Dark-First Terminal Craft | Carbon (`#0B0F17`), Zinc borders (`#27272A`), Cyan/Amber status tokens | Grotesk + `JetBrains Mono` | Split-pane inspector, command palette (`Cmd+K`), keyboard shortcuts |
| **Commerce / Editorial Brand** | Tactile Editorial | Warm Stone (`#F5F5F4`), Espresso Ink (`#1C1917`), Terracotta (`#C2410C`) | High-contrast Serif Display + Clean Sans | Asymmetric hero, generous whitespace, sticky checkout summary |

---

## 2. The 6-State UX Completeness Checklist (Mandatory Per View)

| State | Visual & Behavioral Requirement | Common Failure to Avoid |
| :--- | :--- | :--- |
| **1. Loading (Skeleton)** | Match exact geometry of loaded content; reserve image/card height | Centered spinner that causes a 400px layout jump (`CLS`) when data arrives |
| **2. Empty (Zero-State)** | Explain *why* it is empty + 1 clear button to create/import first item | Blank white box or raw `"No data found"` text |
| **3. Ideal & Overflow Data** | Truncate with `text-overflow: ellipsis` or wrap cleanly; test 100-char names | Long email or title pushing action buttons off-screen |
| **4. Validation Error** | Highlight field border, display specific fix text below input, keep typed value | Clearing the entire form on submit error or showing only a generic toast |
| **5. Partial / Network Error** | Inline retry card for the failed widget while keeping the rest of the page usable | White-screen crash (`Uncaught Error`) when one secondary endpoint fails |
| **6. Interactive & Focus** | Distinct `hover`, `active`, `disabled` (`opacity-50 cursor-not-allowed`), and `:focus-visible` | Removing `outline: none` without providing a visible replacement focus ring |

---

## 3. Ergonomic & Responsive Guardrails
1. **Mobile Input Zoom Prevention:** All `<input>`, `<select>`, and `<textarea>` elements on mobile must use `font-size >= 16px` (`1rem`) so iOS Safari does not forcibly zoom the viewport on focus.
2. **Form Label Permanence:** Never use `placeholder` as the only field label; placeholders disappear as soon as the user types. Always render a persistent `<label htmlFor="...">`.
3. **Destructive Action Safety:** Buttons that delete data or revoke access must use `status-danger` styling and require confirmation or undo capability.
