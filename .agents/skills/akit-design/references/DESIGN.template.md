# `DESIGN.md` — System Design Token & Visual Language Template (`akit-design`)

Copy and adapt this template to `DESIGN.md` at the repository root (inspired by `VoltAgent/awesome-design-md`).

---

```markdown
# DESIGN.md — Visual Language & Design System Specification

## 1. Aesthetic Direction & Product Persona
- **Domain & Audience:** `[e.g., B2B Financial Operations Dashboard for power users]`
- **Visual Persona:** `[e.g., High-Precision Swiss Editorial — dense, scannable, tactile hairlines, zero decorative clutter]`
- **Theme Polarity:** `[Light-first with high-contrast Dark Mode parity / Dark-native technical console]`

---

## 2. Color Tokens & Contrast Rules (WCAG AA/AAA)

| Semantic Token | CSS Variable | Light Value | Dark Value | Minimum Contrast & Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Canvas Background** | `--bg-canvas` | `#F8FAFC` | `#090D16` | Root page background |
| **Primary Surface** | `--bg-surface` | `#FFFFFF` | `#111827` | Cards, tables, panels |
| **Elevated Surface** | `--bg-elevated` | `#F1F5F9` | `#1E293B` | Hover states, modals, popovers |
| **Primary Text** | `--text-primary` | `#0F172A` | `#F8FAFC` | `>= 12:1` (AAA) — Headings, body copy |
| **Secondary Text** | `--text-secondary` | `#475569` | `#CBD5E1` | `>= 4.5:1` (AA) — Labels, metadata |
| **Border Hairline** | `--border-subtle` | `#E2E8F0` | `#1E293B` | `1px solid` structural dividers |
| **Primary Accent** | `--accent-primary` | `#0F766E` | `#14B8A6` | Primary CTAs, active indicators |
| **Danger / Error** | `--status-danger` | `#BE123C` | `#FB7185` | Destructive actions, validation errors |

---

## 3. Typography & Numeric Discipline
- **Heading Font (`--font-display`):** `[e.g., 'Plus Jakarta Sans', 'Instrument Serif', or 'Space Grotesk']` — tracking `-0.02em`, weight `600/700`.
- **Body Font (`--font-sans`):** `[e.g., 'DM Sans' or 'IBM Plex Sans']` — line-height `1.5`, max measure `65ch`.
- **Monospace / Data Font (`--font-mono`):** `[e.g., 'JetBrains Mono' or 'IBM Plex Mono']` — **mandatory `font-variant-numeric: tabular-nums`** on all prices, IDs, timestamps, and counters.

| Scale Token | Size / Line-Height | Weight | Usage |
| :--- | :--- | :--- | :--- |
| `text-xs` | `0.75rem / 1rem` (`12px`) | `500` | Badges, table column headers (`uppercase tracking-wider`) |
| `text-sm` | `0.875rem / 1.25rem` (`14px`) | `400` | Dense dashboard controls, table cells |
| `text-base` | `1rem / 1.5rem` (`16px`) | `400` | Primary body copy and form inputs (prevents iOS auto-zoom) |
| `text-xl` | `1.25rem / 1.75rem` (`20px`) | `600` | Section titles and card headers |
| `text-3xl` | `1.875rem / 2.25rem` (`30px`) | `700` | Page title |

---

## 4. Spatial Grid, Breakpoints & Interactive States
- **Spacing Unit:** `4px` base (`gap-1 = 4px`, `gap-2 = 8px`, `gap-4 = 16px`, `gap-6 = 24px`, `gap-8 = 32px`).
- **Touch & Click Targets:** Minimum `44x44px` hit area on mobile viewports (`<768px`).
- **Focus Ring:** `outline: 2px solid var(--accent-primary); outline-offset: 2px` on `:focus-visible`.
- **Motion:** `150ms cubic-bezier(0.22, 1, 0.36, 1)`; honor `@media (prefers-reduced-motion: reduce)`.
```
