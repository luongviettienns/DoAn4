---
name: akit-design
description: Use when designing web or mobile UI/UX, establishing or updating a DESIGN.md design system, choosing typography/color tokens, or auditing interfaces against generic AI visual clichés and accessibility flaws.
---
# AKit Design — DESIGN.md Systems & UI/UX Pro Max Intelligence

## Overview
`akit-design` synthesizes the **Markdown Design System (`DESIGN.md`)** specification from `VoltAgent/awesome-design-md`, the **UI/UX Intelligence** taxonomy (style pairings, typography, color contrast, responsive ergonomics) from `nextlevelbuilder/ui-ux-pro-max-skill`, and the **Intentional Frontend Design** philosophy from `anthropics/skills`.

**Core principle:** Every interface must commit to an intentional aesthetic direction backed by reusable tokens in `DESIGN.md` and complete interactive states — never ship generic AI purple-gradient templates or screenshot-only happy paths.

---

## Anti-AI-Slop & Aesthetic Direction Gate
Before writing CSS, Tailwind config, or UI components, lock in a deliberate aesthetic persona (`references/ui-ux-intelligence.md`):
- **Editorial / Swiss Grid:** High-contrast serif + grotesk pairing, exposed hairlines (`1px`), generous negative space, crisp data hierarchy.
- **Industrial / Technical Precision:** Monospace numeric alignment (`tabular-nums`), dense slate/zinc surfaces, subtle semantic status badges, keyboard-first ergonomics.
- **Warm Craft / Organic Studio:** Paper/stone neutral backgrounds, warm clay/terracotta accents, tactile card elevation, calm motion.
- **Forbidden Clichés:** Unmotivated purple-to-cyan neon gradients, 3 identical centered feature cards with generic spark icons, inconsistent border radii, or low-contrast gray text on gray surfaces.

---

## Antigravity Native Tool Mapping
1. **Inspect Existing Design Tokens (`read_file`):** Check `DESIGN.md`, `tailwind.config.*`, `globals.css`, or Figma token exports before defining new variables.
2. **Generate `DESIGN.md` Specification (`write_file`):** Create or update `DESIGN.md` using `references/DESIGN.template.md` so all subsequent agents (`akit-react`, `akit-browser-qa`) share one source of truth.
3. **Visual & Accessibility Verification:** Pair with `akit-browser-qa` (or `image-generator` subagent when visual assets are requested) to validate responsive viewports (`375px`, `768px`, `1440px`) and WCAG contrast.

---

## Step-by-Step UI/UX Design Workflow

### Step 1: Domain & User Task Discovery
1. Identify primary user personas, top 3 high-frequency workflows, device targets (mobile-first vs. desktop-dense), and brand constraints.
2. Inspect existing `DESIGN.md` or CSS variables; never overwrite an established design system without explicit user approval.

### Step 2: Author or Update `DESIGN.md` (`references/DESIGN.template.md`)
Define explicit, token-driven rules for:
1. **Color Palette & Semantic Surfaces:**
   - Background layers (`bg-canvas`, `bg-surface`, `bg-elevated`, `bg-overlay`).
   - Text hierarchy (`text-primary` >= 7:1 contrast, `text-secondary` >= 4.5:1 contrast, `text-muted`).
   - Semantic intent tokens (`accent-primary`, `status-success`, `status-warning`, `status-danger`).
2. **Typography Scale & Pairing:**
   - Display/Heading font + Body font + Monospace font (`font-variant-numeric: tabular-nums` for all tables, prices, and metrics).
   - Modular scale (`xs: 12px` through `4xl: 36px`) with explicit line-heights and `max-w-prose` (`60ch–70ch`) reading widths.
3. **Spacing, Radius & Elevation Grid:**
   - Strict `4px` / `8px` spatial rhythm; consistent border radius tokens (`sm`, `md`, `lg`); restrained shadows/borders.

### Step 3: Map Complete UX State Matrix (`references/ui-ux-intelligence.md`)
Every screen and interactive component MUST specify 6 states before implementation:
1. **Loading / Skeleton:** Layout-stable placeholders (`CLS = 0`).
2. **Empty / Zero-Data:** Helpful explanation + primary call-to-action to create the first item.
3. **Populated (Ideal & Extreme):** Single-line vs. 3-line wrapped titles, `0` vs. `999,999,999` numbers, missing avatars.
4. **Validation & Field Error:** Inline field-level guidance (`aria-invalid`, `aria-describedby`), preserving user input.
5. **Network / Partial Failure:** Retryable banner or fallback without crashing the whole page.
6. **Keyboard Focus & Disabled:** Visible `:focus-visible` ring (`2px` offset) and accessible touch targets (`>= 44x44px` on mobile).

### Step 4: Enforce Anti-Slop, High-Craft Motion, GSAP & WebGL/3D Rules
1. **Run Impeccable (24 Commands & 61 Rules) + Hallmark (57 Criteria) + Taste Audit:**
   - Consult `references/impeccable-hallmark-taste-anti-slop.md` to eliminate AI visual clichés (nested card-in-card syndrome, generic `Hero -> 3-Col` templates, purple-to-cyan gradients, filler copy) and align `DESIGN.md` with `google-labs-code/design.md` (YAML tokens + prose) and `VoltAgent/awesome-design-md`.
2. **Apply High-Craft Motion, GSAP, 3D Scroll & WebGL Over DOM (`references/motion-gsap-webgl-scroll-world.md`):**
   - **Emil Kowalski's Laws (`emilkowalski/skills`):** Never animate entering UI from `scale(0)` (start from `scale(0.93)`–`scale(0.97)`), never use `ease-in` on enter (use `ease-out` / damped springs `< 250ms`), and prefer interruptible CSS transitions.
   - **GSAP (`greensock/gsap-skills`):** Always use `useGSAP()` with `{ scope: containerRef }` and `contextSafe()` event callbacks — never bare `useEffect`.
   - **Interactive WebGL (`DavidHDev/canvas-ui`) & Animated Primitives (`DavidHDev/react-bits`):** Keep underlying HTML DOM text selectable and links clickable (`pointer-events: none` on canvas overlay).
   - **3D Scroll Worlds (`oso95/scroll-world`):** Enforce `Scroll Position = Timestamp` and **The Seam Rule** (frame-identical transitions between Stills, Dives, and Connectors).
   - **Faux Product UI & Cursor Demo Choreography (`benjitaylor/skills` `stageshow`):** Consult `references/stageshow-faux-product-ui-and-cursor-demos.md` when building marketing product shots, bento feature illustrations, or animated cursor walkthroughs (`Stage`, `Act`, `Window`, `Phone`). Enforce the **3 to 7 real strings budget** (`<Bar />` for secondary context), crop `10%–40%` of the hero off-stage (`Corner bleed` or `Pinned, bottom bleed`, never a shrunk screenshot boxed with even margins), ship a dedicated `compact` redesign at `358` width, measure targets dynamically via `data-target` / `data-cursor` / `rect()`, set `poster` first for `prefers-reduced-motion`, and verify with `film.mjs --gate` + `REHEARSAL.md`.
3. **Audit Against Vercel's 100+ Web Interface Guidelines:**
   - Run the 10-domain checklist in `references/vercel-100-web-interface-guidelines.md` (`focus-visible`, `prefers-reduced-motion`, `tabular-nums`, `inputmode`, `aria-label`, `shadcn/ui` composition).

---

## Red Flags & Rationalization Counter-Table

| Common Excuse / Rationalization | Engineering Reality & Mandatory Action |
| :--- | :--- |
| *"I'll hardcode hex colors (`#6366f1`) directly inside 15 component files."* | Hardcoded hex values cause visual drift and break dark/light theming. Define semantic tokens in `DESIGN.md` and CSS variables first. |
| *"The happy-path screenshot looks great, so the UI is done."* | A page without empty states, loading skeletons, error handling, and mobile responsiveness fails in real usage. Complete the 6-state matrix. |
| *"Light gray text (`#9ca3af` on `#f3f4f6`) looks sleek and minimal."* | Fails WCAG AA contrast (< 4.5:1) and is unreadable on non-Retina screens. Verify contrast ratios (`references/ui-ux-intelligence.md`). |
| *"I'll animate the modal from `scale(0)` with `transition: all 0.5s ease-in`."* | Violates `emilkowalski/skills` and `vercel-labs/agent-skills`. Start from `scale(0.95)`, use `ease-out` (`< 220ms`), and list explicit CSS properties. |
| *"I'll use `Inter` + purple gradients for every single project."* | Generic AI template fatigue. Choose an intentional industry-aligned palette and macrostructure from `references/impeccable-hallmark-taste-anti-slop.md`. |
| *"For the hero product illustration, I'll shrink a full dashboard with 40 real text strings into a card with even margins and hardcode cursor `(x, y)` coordinates."* | Violates `benjitaylor/skills` (`stageshow`). Use 3–7 real strings (`<Bar />` elsewhere), crop `10%–40%` off-stage (`Corner bleed` / `Pinned, bottom bleed`), measure targets with `data-target` & `rect()`, and ship a `compact` (`358`) redesign (`references/stageshow-faux-product-ui-and-cursor-demos.md`). |

---

## Safety & Exit Gates
- Never copy proprietary brand logos, licensed commercial fonts, or copyrighted illustrations without authorization.
- Require `DESIGN.md` token alignment and WCAG AA contrast checks before handing off to `akit-react` or `akit-browser-qa`.

## Reference Materials & Attribution
- Complete `DESIGN.md` specification template: `references/DESIGN.template.md`
- UI/UX Pro Max intelligence matrix (palettes, typography, UX state checklist): `references/ui-ux-intelligence.md`
- Vercel 100+ Web Interface Guidelines & Anthropic `web-artifacts-builder` (`shadcn/ui` + Tailwind): `references/vercel-100-web-interface-guidelines.md`
- Impeccable (24 commands, 61 rules), Hallmark (57 criteria), Taste Skill, Google `DESIGN.md`, Open Design: `references/impeccable-hallmark-taste-anti-slop.md`
- Emil Kowalski Motion Laws, GSAP (`useGSAP`, `ScrollTrigger`), React Bits (200+ components), Scroll World (`The Seam Rule`), Canvas UI (WebGL over DOM): `references/motion-gsap-webgl-scroll-world.md`
- Stageshow Faux Product UI, 20 Framing Laws, 3–7 String Restraint, `Stage`/`Act` Cursor Choreography & `film.mjs` Rehearsal (`benjitaylor/skills`): `references/stageshow-faux-product-ui-and-cursor-demos.md`
- Inspired by `nextlevelbuilder/ui-ux-pro-max-skill`, `VoltAgent/awesome-design-md`, `google-labs-code/design.md`, `nexu-io/open-design`, `Leonxlnx/taste-skill`, `pbakaus/impeccable`, `nutlope/hallmark`, `emilkowalski/skills`, `DavidHDev/react-bits`, `greensock/gsap-skills`, `oso95/scroll-world`, `DavidHDev/canvas-ui`, `benjitaylor/skills` (`stageshow`), `vercel-labs/agent-skills`, and `anthropics/skills`. Original AKit instructions.
