# Frontend Anti-Slop, Design Systems & Taste Engineering Playbook

This reference synthesizes the 7 core Frontend Design & Aesthetic Governance frameworks integrated into AKit:
1. **`pbakaus/impeccable`**: 24 routed design commands & 61 deterministic anti-slop rules + `PRODUCT.md` / `DESIGN.md` context persistence.
2. **`nutlope/hallmark`**: Diverse theme catalog, anti-cliché macrostructures, and 57 pre-emit UI/UX quality gates.
3. **`Leonxlnx/taste-skill`**: Art direction, reference image extraction, typography/spacing rhythm, and live browser visual verification.
4. **`nextlevelbuilder/ui-ux-pro-max-skill`**: UI/UX Pro Max Intelligence (industry palettes, font pairings, cognitive load, responsive ergonomics).
5. **`VoltAgent/awesome-design-md`**: Curated brand-grade `DESIGN.md` templates (Linear, Vercel, Stripe, Raycast, Apple).
6. **`google-labs-code/design.md`**: Google Labs `DESIGN.md` hybrid specification (machine-readable YAML tokens + human-readable design rationale).
7. **`nexu-io/open-design`**: Local-first collaborative design workspace for interactive prototypes, multi-page websites, and presentation slides.

---

## 1. Dual `DESIGN.md` Standard (`google-labs-code/design.md` + `VoltAgent/awesome-design-md`)

Every frontend project must maintain a `DESIGN.md` at the repository root combining **Google Labs' YAML frontmatter token schema** with **VoltAgent's human-readable brand rationale**:

```markdown
---
design_system:
  brand_archetype: "High-Craft Technical Precision" # e.g., Linear / Vercel / Stripe / Editorial Swiss
  color_mode: "dark-first" # light-first | dark-first | adaptive
  tokens:
    colors:
      bg_canvas: "#09090B"
      bg_surface: "#121215"
      bg_elevated: "#18181C"
      text_primary: "#FAFAFA"
      text_secondary: "#A1A1AA"
      text_muted: "#71717A"
      accent_primary: "#10B981"
      border_subtle: "rgba(255, 255, 255, 0.08)"
    typography:
      font_display: "'Instrument Serif', 'Newsreader', Georgia, serif"
      font_sans: "'Geist', 'Plus Jakarta Sans', -apple-system, sans-serif"
      font_mono: "'Geist Mono', 'JetBrains Mono', monospace"
      scale_ratio: 1.25
    geometry:
      radius_sm: "6px"
      radius_md: "10px"
      radius_lg: "14px"
      grid_columns: 12
      base_unit_px: 4
---
# Product Design System & Visual Rationale (`DESIGN.md`)
- **Surface Hierarchy**: Elevation is expressed via +3% luminance steps and `1px` top-edge highlights (`border-white/10`), never muddy drop shadows.
- **Numeric Discipline**: All metrics, prices, timestamps, and tables enforce `font-variant-numeric: tabular-nums`.
```

---

## 2. `pbakaus/impeccable`: The 24 Routed Design Commands & 61 Anti-Slop Rules

When the user or agent invokes design refinement, `akit-design` emulates the **24 Impeccable design steering commands**:

| # | Command | Action & Architectural Transformation |
| --- | --- | --- |
| 1 | `init` | Generate persistent `PRODUCT.md` + `DESIGN.md` so design context never resets across prompts |
| 2 | `craft` | Build a complete component/view from scratch following `DESIGN.md` tokens and all 4 states |
| 3 | `shape` | Define information architecture, layout grid, and user flow before visual styling |
| 4 | `critique` | Deliver a structured design critique (`Before | After | Why`) on visual hierarchy and usability |
| 5 | `audit` | Run the 61 deterministic anti-slop & accessibility checks across all UI files |
| 6 | `polish` | Tighten micro-alignment, optical padding, border hairlines, and focus/hover states |
| 7 | `bolder` | Increase typographic contrast, scale drama, asymmetry, and signature visual character |
| 8 | `quieter` | Strip decorative noise, reduce competing accents, and increase calm negative space |
| 9 | `distill` | Remove redundant wrappers, secondary badges, and unnecessary chrome to expose core value |
| 10 | `clarify` | Rewrite microcopy, labels, empty states, and CTA verbs for immediate scannability |
| 11 | `adapt` | Refactor layout across `320px`, `375px`, `768px`, `1024px`, and `1440px` viewports |
| 12 | `harden` | Stress-test UI with 80-char names, 0 items, 10,000 items, slow 3G, and error states |
| 13 | `animate` | Add purposeful ease-out/spring micro-interactions and state transitions (`< 250ms`) |
| 14 | `colorize` | Replace raw hex/Tailwind defaults with semantic OKLCH/HSL tokens and WCAG AA contrast |
| 15 | `typograph` | Establish display/body/mono pairings, fluid `clamp()` sizing, `text-balance`, and `tabular-nums` |
| 16 | `spatialize` | Enforce strict $4\text{px}/8\text{px}$ rhythm, optical button balance, and asymmetric Bento/Swiss grids |
| 17 | `elevate` | Refine surface layering, glassmorphism (`backdrop-blur`), inner borders, and subtle light sources |
| 18 | `delight` | Add signature tactile details (keyboard shortcut hints, optimistic feedback, subtle sound/haptic hooks) |
| 19 | `onboard` | Design progressive first-run onboarding and contextual empty-state guidance |
| 20 | `empty` | Replace blank `"No data"` text with tailored illustrations, clear explanation, and primary CTA |
| 21 | `loading` | Build layout-matching shimmer skeletons that prevent Cumulative Layout Shift (`CLS = 0`) |
| 22 | `error` | Design inline field errors and recoverable failure banners with diagnostic retry actions |
| 23 | `dark` | Engineer true dark mode (`color-scheme: dark`, luminance surfaces, desaturated semantic badges) |
| 24 | `detect` | Programmatically scan TSX/CSS for the **61 AI-Slop Anti-Patterns** listed below |

### Summary of the 61 Deterministic Anti-Slop Rules (`pbakaus/impeccable`)
- **Color & Gradient Tells (Rules 1–12)**: Ban unmotivated `from-purple-500 to-blue-500` / `from-indigo-500 via-purple-500 to-pink-500` gradients, pure `#000000` drop shadows on dark backgrounds, >3 competing accent colors in one viewport, or low-contrast `text-gray-400` on `bg-gray-100`.
- **Typography Tells (Rules 13–24)**: Ban unstyled browser default fonts, missing `tracking-tight` on headings $\ge 24\text{px}$, centered multi-paragraph body text, missing `tabular-nums` on numbers, or >2 font families without clear role separation.
- **Layout & Card Nesting Tells (Rules 25–38)**: Ban **Card-in-Card-in-Card syndrome** (3+ nested bordered/shadowed boxes), uniform 3-column icon-title-paragraph feature grids on every section, missing `min-w-0` on flex children, and cramped container padding (`p-2` on desktop sections).
- **Copywriting & AI Cliché Tells (Rules 39–49)**: Ban generic AI filler copy (*"Supercharge your workflow"*, *"Unleash the power of AI"*, *"Seamless integration"*, *"Next-generation platform"*), generic `"Submit"` / `"Click Here"` buttons, and fake `"John Doe"` / `"Lorem ipsum"` data.
- **Interactive & A11y Tells (Rules 50–61)**: Ban `<div onClick>`, `outline-none` without `focus-visible:ring`, `transition-all`, missing `aria-label` on icon buttons, and missing `Loading`/`Empty`/`Error` states.

---

## 3. `nutlope/hallmark`: Macrostructure Diversity & 57 Quality Criteria

AI models default to a single repetitive macrostructure (`Centered Hero -> 3 Feature Cards -> Testimonials -> Pricing -> Footer`). `nutlope/hallmark` forces structural diversity and verifies **57 pre-emit criteria**:

### Mandatory Alternative Macrostructures (Pick by Product Goal)
1. **Interactive Workbench Hero (SaaS / DevTools)**: Live interactive product canvas or command palette above the fold; zero marketing fluff before the user touches the tool.
2. **Editorial Split-Screen Narrative (Brand / Studio / Fintech)**: Sticky left typographic thesis + scrolling right architectural ledger or live data visualization.
3. **Asymmetric Bento Ledger (Analytics / AI Platform)**: 12-column CSS Grid with varied spans (`col-span-7` primary live telemetry + `col-span-5` stacked micro-demos) and exposed `1px` hairlines.
4. **High-Density Command Terminal (Pro Tools / Trading / Ops)**: Keyboard-first split panes, `⌘K` omnibar, dense tabular views, and real-time status tickers.

### Hallmark's 57 Pre-Emit Quality Gates (Grouped Summary)
- **Gates 1–15 (Visual Identity & Theme Coherence)**: Distinct curated theme selected; display + body + mono fonts loaded; background/surface/border tokens consistent across 100% of sections.
- **Gates 16–30 (Spatial & Structural Integrity)**: No orphaned grid cells (e.g., 4 cards in a 3-column grid leaving 2 empty slots); consistent section rhythm; optical icon alignment; zero horizontal overflow at `375px` and `1440px`.
- **Gates 31–45 (Realism & Domain Data)**: All metrics, charts, code snippets, and activity feeds contain domain-authentic data; zero broken image URLs; avatars have deterministic fallbacks.
- **Gates 46–57 (Browser & Interaction Verification)**: Verified in headless browser (`akit-browser-qa`); zero console errors; hover/focus/active states styled; dark/light contrast verified.

---

## 4. `Leonxlnx/taste-skill` & `nextlevelbuilder/ui-ux-pro-max-skill`: Art Direction & Reference Image Protocol

1. **Reference-First Art Direction (`Leonxlnx/taste-skill`)**:
   - Before coding a new UI, anchor the aesthetic to **concrete visual references** (either user-provided screenshots inspected via `read_file` or named canonical references from `VoltAgent/awesome-design-md`).
   - Extract 4 concrete parameters from the reference: **Luminance Ratio**, **Border/Divider Treatment**, **Typographic Contrast Scale**, and **Negative Space Density**.
2. **UI/UX Pro Max Domain Intelligence (`nextlevelbuilder/ui-ux-pro-max-skill`)**:
   - Match industry domain to ergonomic expectations: *Healthcare/Fintech* requires high trust, clear audit trails, and WCAG AAA-ready contrast; *Creative/Media* allows expressive motion and kinetic typography; *Developer/Enterprise* prioritizes information density, `tabular-nums`, and keyboard shortcuts.
3. **Local Prototype, Website & Slide Workspace (`nexu-io/open-design`)**:
   - When building multi-screen prototypes, landing pages, or presentation decks (`slides`), organize screens as modular, previewable frames sharing a single root `DESIGN.md` token source so prototypes, web apps, and pitch slides stay 100% visually unified.
