# `benjitaylor/skills` (`stageshow`) — High-Craft Faux Product UI, Framing & Cursor Demo Choreography

This reference codifies the **Stageshow (`benjitaylor/skills`)** engineering system created by Benji Taylor (`npx skills add benjitaylor/skills --skill stageshow`) for building believable miniature product UIs, marketing hero illustrations, bento feature cards, and choreographed cursor walkthroughs in React and plain CSS.

**Core Principle:** *It reads as a real product, simplified to what the viewer needs, framed with intent, and every motion has a cause.* Authored product illustrations are NOT full application clones or live browser automations (`a.click()` draws the cursor pressing; `a.set()` changes the scene).

---

## 1. The 5 Fatal Failure Modes of Faux Product UI (And Their Remedies)

| Failure Mode | Visual Symptom | Mandatory Engineering Fix |
| :--- | :--- | :--- |
| **1. Too much** | Real text in every row, numbers everywhere, every pixel packed with metadata. The more dense text detail, the more AI-generated and noisy it looks. | Enforce a strict **3 to 7 real strings budget** (`craft.md`, Restraint). Keep real words **only** on what the story is about; use quiet `<Bar />` placeholder lines for surrounding context. |
| **2. Wireframe** | Two gray blobs and a generic button, built too small or stripped of everything that makes the software recognizable. | Keep what identifies the product: real window/phone chrome, optical icons, and the specific rows/controls that give the action a reason. Simplify the *words*, never the *structural context*. |
| **3. Boxed** | A whole window shrunk into a card with even margins on all four sides — looks like a pasted screenshot in a box, not a designed product shot. | **Crop 10% to 40% of the hero off stage.** The window or phone must fill **at least two-thirds ($\ge 67\%$) of the stage width** and bleed intentionally off an edge (`Corner bleed` or `Pinned, bottom bleed`). |
| **4. Flat** | Every object has the same visual weight inside identical bordered cards; the eye has nowhere to land. | Establish **one hero object and at most one or two satellites** (receipt, phone, detail card, terminal) straddling the hero's edge with distinct `--ss-shadow-satellite` elevation. |
| **5. Bland** | A generic gray window with a default cursor that ignores the brief's look, energy, and brand identity. | Map the product's real tokens (`looks.md`), chrome (`Window`, `Phone`, `Dynamic Island`), and style (`light`, `dark`, `blueprint`, `glass`, `orbs`) while keeping kit geometry intact. |

---

## 2. The 20 Framing & Composition Laws (`references/framing.md`)

Decide framing **before** building the screen; the crop determines type scale and eliminates unseen off-crop DOM work:

1. **One Hero + At Most 1–2 Satellites:** Satellites (a receipt, phone lock screen, terminal popup, or detail card) straddle the hero's edge **about half outside**, never floating apart or fully inside. If two satellites are used, they must be **two different kinds and sizes** (never two cards of the same width stacked on one edge — `framing: twin satellites`).
2. **Satellites Cover Chrome, Never Content:** Straddle satellites over a sidebar, header, or quiet margin — never over the primary trigger, settings, or payoff.
3. **Crop Only Filler (Rule 4):** The payoff, the action, what the cursor touches, and every real word stay **100% whole** inside the stage. Only placeholder `<Bar />` rows, trailing list items, or container backgrounds may bleed across the stage edge. Never slice a labeled button, chip, or drop shadow with the stage edge.
4. **Canonical Stage Dimensions & `compact` Redesign (`358px`):**
   - **Hero beside copy (`hero-demo`):** ~`720 x 340`
   - **Full-width hero (`linear`):** `900` to `1100` wide
   - **Feature card / Bento tile (`static-card`):** ~`400 x 300` (never under `320px` wide for an interactive demo)
   - **Mobile / Phone column (`compact` at `358` width):** Every demo that can sit in a phone column must ship a dedicated `compact` layout at **`358`** width — **a true redesign, not a CSS scale squeeze**.
5. **The Canonical Layout Recipes:**

| Layout Recipe | Hero Placement & Bleed | Satellite Placement | Primary Use Case |
| :--- | :--- | :--- | :--- |
| **Pinned, bottom bleed** | Inset `8%–12%` left, right, and top; bleeds `15%–35%` past the bottom edge; centered | Optional, straddling left or right side | Feature cards and bento tiles (`examples/static-card`) |
| **Corner bleed** | Inset `10%` top and left; bleeds `15%–35%` past right and bottom edges | Straddling the left or bottom edge | Marketing heroes beside copy (`examples/hero-demo`) |
| **Stage with gutters** | Inset `8%–20%` on each side over a colored/orb ground; runs off the bottom so ground frames 3 sides | Optional straddle in wider margin | Colored or glass stage presentations |
| **Opposite corners** | Copy anchored bottom-left; product hung from top-right corner | None (copy acts as counterweight) | Bento grid feature tiles (`examples/opposite-corners`) |
| **Device pair** | Desktop dashboard window + `Phone` lock screen telling one shared event | Phone straddles over quiet margin, never over focal figure | Cross-device sync stories (`examples/device-pair`) |

6. **The One-Gutter & Full-Gutter Law (Rules 10–11):** Measure the hero's inset gutter in the final visible crop; every other edge distance in the frame matches it. Either leave a **full gutter** or bleed **well past the edge** ($\ge 24\text{px}$) — stopping a few pixels short or grazing an edge by `< 24px` is a layout fault.
7. **No Plate Under Heroes on Plain Pages:** On a white or dark marketing page, the page itself is the ground — do not put an extra tinted plate behind the window or float a whole window with air on all four sides (`unframed` is used only when explicitly requested).
8. **Window Aspect Integrity & Zero Dead Corners (Rules 12 & 15):** A whole window keeps $\ge 1.25:1$ aspect ratio; a bled window keeps at least a square visible region. Eliminate dead empty corners at rest and across every beat of the loop.

---

## 3. Still-Frame Craft, Fidelity & Kit Primitives (`craft.md` & `kit.md`)

### Fidelity Modes & The 3–7 String Budget
- **`minimal`**: All content represented as clean `<Bar />` skeleton lines.
- **`standard` (Default)**: **3 to 7 real text strings** where they carry narrative meaning (the selected customer, the active action button, the rolling total); quiet `<Bar />` placeholders everywhere else.
- **`realistic`**: Real content throughout — reserved for large hero scale, named product studies, or stills whose subject is a list/page.

### Kit Architecture (`Stage`, Frames, Motion & Small Parts)
Never hand-draw browser chrome, iPhone status bars, home indicators, or chat bubbles with raw `<div>` guesswork — use real geometry primitives:
- **`Stage`**: Manages design size, `compact` (`358`) breakpoint, scene state (`initial`), playback (`play="loop" | "once" | "hover"`), `poster` frame for `prefers-reduced-motion`, `theme` (`light`, `dark`, `blueprint`, `glass`), `palette` (`accent`, `mono`), `fidelity`, `ground="orbs"`, and `cursor={{ at, kind, style, ripple }}`.
- **Frames**: `Window`, `Phone` (with `LockScreen`, `Notification`, `Dynamic Island`), `Keyboard`, `Thread` with `Bubble`, `Stamp`, `Receipt`.
- **Motion Primitives**: `Collapse`, `Roll` (for tabular numeric counters), `Swap`, `Count`, `Connector` (1px leader lines ending in a dot), `Fly`, `Follow`, `States`, `Stream` (for AI streaming responses without sparkles/purple), `Popover`, `Scroll`, `Camera`, `Expand`.
- **Small Parts**: `Bar`, `Text`, `Row`, `Avatar`, `Pin`, `Icon`, `Menu`, `Field`, `Segmented`, `Toggle`, `Tabs`, `Badge`, `Chip`, `BrandMark`, `Code`, `Chart`.
- **Anti-Slop Icon & Brand Rules**: Never use stock AI sparkles, purple neon gradients, or a single letter inside a colored square as a fake logo. Use optically sized `<BrandMark />` or real product iconography.

---

## 4. Cursor Choreography & Story Engineering (`motion.md`)

1. **Story Shape (3–5 Beats, 10–16 Seconds):**
   - Structure every animated demo around **3 to 5 distinct beats and a clear payoff** lasting `10s–16s`.
   - Every cursor movement must have a visible human intention. Data never rewinds in view without a visible cause.
2. **Dynamic Target Measurement (`data-target`, `data-cursor`, `rect()`):**
   - Mark interactive elements with `data-target="apply-btn"` and `data-cursor="pointer" | "ibeam" | "grab" | "open" | "resize-ew"`.
   - Measure target coordinates dynamically via `rect(name)` inside `(state, rect, layout) => JSX` and `Act` scripts — **never hard-code pixel coordinates** that break between `wide` and `compact` (`358`) layouts.
   - Choose the right cursor style: `real` (macOS), `large` (1.5x for close-ups), `circle` (iPad pointer), `touch` (phone finger tap/drag dots — **never** a desktop macOS arrow on a phone!), or `arrow`.
3. **Animate Relationships, Not Isolated Swaps:**
   - Keep appearing/disappearing elements mounted and toggle state so exits animate smoothly.
   - When a new row inserts, it pushes rows below it (`Collapse`); when a table cell edits, the summary total rolls (`Roll`) a beat later; when dragging text, bind selection highlight to `caret(name, at)` inside `onMove` so selection tracks directly under the I-beam.
4. **Set `poster` First (`prefers-reduced-motion` & Thumbnails):**
   - Always define the `poster` state first. It must show the **completed payoff beat** with the result clearly on screen — never a frame caught mid-transition or an empty pre-action state.

---

## 5. Rehearsal, Filming Gate (`film.mjs`) & `REHEARSAL.md` Handoff

Static code review cannot catch sub-pixel layout jumps, clipped shadows, overlapping keycaps, or loop-seam pops. Before completing any Stageshow component:

1. **Run Static Type & CSS Clash Checks:**
   ```bash
   npm run typecheck
   npm run check:css
   ```
2. **Execute Automated Playwright Filming Gates (`scripts/film.mjs`):**
   ```bash
   # 1. Verify full loop contact sheet & automated layout/framing gates at wide width
   node scripts/film.mjs '<your URL>' --select '.your-demo' --gate

   # 2. Verify phone / compact column width (390 / 358)
   node scripts/film.mjs '<your URL>' --select '.your-demo' --width 390 --gate

   # 3. Verify all discrete scene states & reduced-motion poster
   node scripts/film.mjs '<your URL>' --select '.your-demo' --states --gate
   ```
3. **Inspect the Contact Sheet & Write `REHEARSAL.md`:**
   - Step through every press, menu open, morph, and the **loop seam** (where the end transitions back to frame 1). Fix faults in strict priority order: **Framing $\rightarrow$ Hierarchy $\rightarrow$ Motion $\rightarrow$ Polish**.
   - Place a `REHEARSAL.md` alongside the component documenting: (a) the gold example used as the structural baseline (`hero-demo`, `static-card`, `bento`, `ai-chat`, `table-edit`, etc.), (b) what tokens/chrome/copy were customized, and (c) the `film.mjs --gate` verification results.
