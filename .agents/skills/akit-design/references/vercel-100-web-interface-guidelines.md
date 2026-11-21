# Vercel 100+ Web Interface Guidelines & Anthropic Web Artifacts Playbook

Synthesized from `vercel-labs/agent-skills` (`web-design-guidelines`), `anthropics/skills` (`frontend-design` + `web-artifacts-builder`), `VoltAgent/awesome-design-md`, and `nextlevelbuilder/ui-ux-pro-max-skill`.

---

## Part 1: Vercel 100+ Web Interface Guidelines Audit Checklist

When creating or reviewing any frontend UI, run through these 10 mandatory domains and report violations using `file:line` notation.

### 1. Accessibility & Semantic DOM (12 Rules)
- [ ] Icon-only buttons (`<button><TrashIcon /></button>`) **must** have an explicit `aria-label` (e.g., `aria-label="Delete project"`).
- [ ] Decorative icons inside labeled buttons must have `aria-hidden="true"`.
- [ ] Every form control (`<input>`, `<select>`, `<textarea>`) has an associated `<label htmlFor="...">` or `aria-labelledby`.
- [ ] Interactive elements use native `<button>` or `<a href="...">`—never `<div onClick>` or `<span onClick>` without `role`, `tabIndex={0}`, and `onKeyDown` (`Enter`/`Space`).
- [ ] Actions that mutate state or open modals use `<button type="button">`; route navigations use `<a href>` / `<Link>` (so Cmd/Ctrl+Click and "Open in new tab" work).
- [ ] Async status changes, toast alerts, and validation summaries announce via `aria-live="polite"` or `role="status"`.
- [ ] Heading hierarchy (`<h1>` $\rightarrow$ `<h2>` $\rightarrow$ `<h3>`) is strictly sequential without skipping levels.
- [ ] Modals/dialogs trap focus while open, close on `Escape`, and restore focus to the trigger element on close.
- [ ] Color is never the sole indicator of status (pair red/green status dots with icons or text labels).
- [ ] Contrast ratio meets WCAG AA ($4.5:1$ normal text, $3:1$ large text and UI boundaries).
- [ ] Skip-to-content link is present for keyboard users on multi-section pages.
- [ ] Tables use `<th scope="col">` / `<th scope="row">` and `<caption>` (or `aria-label`).

### 2. Focus States & Keyboard Navigation (8 Rules)
- [ ] Every interactive element displays a high-contrast focus ring using `:focus-visible` (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2`).
- [ ] **Never** apply `outline: none` or `outline-none` without an immediate `:focus-visible` ring replacement.
- [ ] Use `:focus-within` on composite input groups (search bar with prefix icon and clear button) so the entire container highlights cleanly.
- [ ] Tab order follows visual reading order (avoid positive `tabIndex > 0`).
- [ ] Dropdowns, comboboxes, and tabs support arrow-key navigation (`ArrowUp`, `ArrowDown`, `Home`, `End`).
- [ ] Disabled or hidden elements are removed from the tab order (`disabled` or `inert`).
- [ ] Destructive confirmation dialogs default focus to the safe "Cancel" button or require explicit keyboard confirmation.
- [ ] Keyboard shortcuts do not hijack standard browser/OS shortcuts (`Cmd/Ctrl+C`, `Cmd/Ctrl+F`, `Cmd/Ctrl+R`).

### 3. Forms, Inputs & Validation (14 Rules)
- [ ] Set explicit `type` and `inputmode` (`type="email"`, `inputmode="numeric"`, `type="tel"`, `type="url"`, `type="search"`) for optimal mobile virtual keyboards.
- [ ] Set accurate `autocomplete` attributes (`autocomplete="email"`, `"current-password"`, `"new-password"`, `"one-time-code"`, `"cc-number"`, `"name"`).
- [ ] Disable spellcheck/autocorrect on usernames, emails, codes, and API keys (`spellCheck={false} autoCapitalize="none" autoCorrect="off"`).
- [ ] **Never** block paste (`onPaste={e => e.preventDefault()}`) on password, OTP, or confirmation fields.
- [ ] Clicking a `<label>` or checkbox description text toggles/focuses the control—zero dead space between box and text.
- [ ] Placeholders show example format (`e.g., jane@acme.com`), never replace the visible `<label>`.
- [ ] Submit buttons remain enabled until submission starts, then disable or guard against double-submit while displaying an inline spinner + preserving button width.
- [ ] Inline validation errors appear adjacent to the offending field (`aria-invalid="true"` + `aria-describedby="field-error"`) and explain how to fix the error.
- [ ] Do not show red validation errors while the user is still typing their first value (validate on blur or submit, then clear eagerly on correction).
- [ ] Support `Enter` to submit single-line forms and `Cmd/Ctrl+Enter` to submit multi-line `<textarea>` forms.
- [ ] Trim leading/trailing whitespace automatically on email, URL, and identifier fields before validation.
- [ ] Preserve user-entered form values across validation failures or network retries.
- [ ] Number inputs specify `min`, `max`, and `step`, and handle empty string vs `0` gracefully.
- [ ] File upload dropzones support both click-to-browse and drag-and-drop with clear file-type/size limits.

### 4. Animation, Motion & Micro-interactions (9 Rules)
- [ ] Honor `prefers-reduced-motion: reduce` globally—disable parallax, auto-playing motion, and large spatial transitions (`motion-reduce:transition-none motion-reduce:animate-none`).
- [ ] Animate **only** compositor-friendly properties (`transform`, `opacity`).
- [ ] **Never** use `transition: all` (`transition-all`)—explicitly list `transition-[color,background-color,border-color,opacity,transform]`.
- [ ] Keep UI feedback transitions crisp ($120\text{ms}$–$220\text{ms}$ with `cubic-bezier(0.22, 1, 0.36, 1)` ease-out); exit animations should be faster than entry animations.
- [ ] Set correct `transform-origin` on popovers, menus, and tooltips (e.g., `origin-top-right` when anchored to a top-right trigger).
- [ ] Skeleton shimmer animations are subtle and match the exact geometry of the loaded content.
- [ ] Avoid layout shift during hover states (never change `font-weight` or border thickness on hover without reserving space).
- [ ] Provide immediate active press feedback (`active:scale-[0.98]`) on primary interactive buttons.
- [ ] Unmount or pause off-screen animations and canvas loops (`IntersectionObserver` / `document.hidden`).

### 5. Typography & Numeric Formatting (11 Rules)
- [ ] Apply `font-variant-numeric: tabular-nums` (`tabular-nums`) to all tables, counters, prices, timers, and metric cards so digits align vertically and never jitter when updating.
- [ ] Apply `text-wrap: balance` (`text-balance`) to headings and hero titles ($\le 6$ lines).
- [ ] Apply `text-wrap: pretty` (`text-pretty`) to body paragraphs to prevent orphaned words on the last line.
- [ ] Constrain long-form reading measure to $60\text{ch}$–$75\text{ch}$ (`max-w-prose`).
- [ ] Use proper typographic characters: real ellipsis `…` (not `...`), curly quotes `“ ”`, en/em dashes `–`/`—`, and non-breaking spaces (`100\u00A0MB`) between values and units.
- [ ] Use `Intl.NumberFormat`, `Intl.DateTimeFormat`, and `Intl.RelativeTimeFormat` instead of hardcoded US date/currency string concatenation.
- [ ] Ensure mobile `<input>` font size is at least `16px` (`text-base` on mobile, `md:text-sm` on desktop) to prevent iOS Safari auto-zoom on focus.
- [ ] Set explicit line-height scales: tight (`1.1`–`1.25`) for large display headings, relaxed (`1.5`–`1.65`) for body copy.
- [ ] Apply negative letter-spacing (`tracking-tight`) to large headings ($\ge 24\text{px}$) and slight positive tracking (`tracking-wider`) to uppercase micro-labels.
- [ ] Avoid pure `#000000` text on `#FFFFFF` or pure `#FFFFFF` text on `#000000` when softer high-contrast ink tokens (`#09090B` / `#FAFAFA`) improve readability.
- [ ] Ensure `font-display: swap` or `optional` is configured on web fonts to prevent invisible text (FOIT).

### 6. Content Handling, Overflow & Empty States (10 Rules)
- [ ] Flex children that contain variable-length text **must** have `min-w-0` so `truncate` (`text-overflow: ellipsis`) works instead of blowing out the flex container.
- [ ] Grid children use `min-w-0` and `break-words` (`overflow-wrap: anywhere`) for long URLs, hashes, or user-generated strings.
- [ ] Multi-line cards use `line-clamp-2` or `line-clamp-3` with a tooltip or detail view for full text.
- [ ] Design all **4 mandatory UI states** for every data-driven view: `Loading` (skeleton matching layout), `Empty` (clear explanation + primary CTA to create first item), `Error` (actionable retry + diagnostic message), and `Populated` (both 1 item and 1,000+ items).
- [ ] Test layouts with extreme names (e.g., 60-character German words, 3-character initials, missing avatars).
- [ ] Reserve scrollbar gutter (`scrollbar-gutter: stable`) on scrollable containers to prevent horizontal jump when content overflows.
- [ ] Do not nest multiple vertical scrollbars inside the same viewport unless building a dedicated IDE/split-pane workspace.
- [ ] Sticky headers and action bars maintain a subtle backdrop blur or border separation when scrolled.
- [ ] Tables with many columns scroll horizontally inside a bordered container with sticky first/action columns on mobile.
- [ ] Confirmation modals clearly state the concrete resource name being deleted/modified.

### 7. Images, Media & CLS Prevention (8 Rules)
- [ ] Every `<img>` / Next.js `<Image>` specifies explicit `width` and `height` (or `aspect-*` container) to eliminate Cumulative Layout Shift (CLS = $0$).
- [ ] Below-the-fold images use `loading="lazy"` and `decoding="async"`.
- [ ] Above-the-fold LCP hero images use `priority` / `fetchpriority="high"` and **never** use `loading="lazy"`.
- [ ] User avatars include a deterministic fallback (initials or subtle geometric placeholder) when image URLs 404.
- [ ] Dark-mode screenshots and illustrations swap or adapt border contrast (`ring-1 ring-white/10`) so dark images do not vanish into dark backgrounds.
- [ ] SVGs use `currentColor` for strokes/fills so they inherit button/text color states automatically.
- [ ] Video/audio elements never autoplay with sound; background decorative videos use `muted playsInline loop`.
- [ ] Responsive images provide appropriate `sizes` attributes so mobile devices do not download 4K desktop assets.

### 8. Touch, Mobile & Safe Areas (8 Rules)
- [ ] Minimum touch target size is $44 \times 44\text{px}$ on mobile (use negative margin + padding `-m-2 p-2` on small icons if visual size is $20\text{px}$).
- [ ] Apply `touch-action: manipulation` on interactive buttons to eliminate $300\text{ms}$ tap delay and accidental double-tap zoom.
- [ ] Respect mobile notch and home-indicator safe areas (`pb-[env(safe-area-inset-bottom)]`) on fixed bottom bars and sheets.
- [ ] Use `100dvh` (`min-h-dvh`) instead of `100vh` (`min-h-screen`) on mobile full-height layouts so mobile browser address bars do not clip bottom actions.
- [ ] Apply `overscroll-behavior: contain` (`overscroll-contain`) on modals, drawers, and sidebars so scrolling to the end does not scroll the background page.
- [ ] Never rely on `:hover`-only menus or action buttons—ensure touch devices have a direct tap path.
- [ ] Keep primary mobile actions reachable in the bottom thumb zone or sticky footer.
- [ ] Test responsive breakpoints at `320px`, `375px`, `768px`, `1024px`, and `1440px`.

### 9. Navigation, URL State & Deep Linking (8 Rules)
- [ ] Sync filters, search queries, pagination, active tabs, and sort order to URL query parameters (`?q=...&tab=...&page=2`) so views are bookmarkable and shareable.
- [ ] Browser Back/Forward buttons navigate cleanly through filter/modal states without trapping the user.
- [ ] Active navigation links expose `aria-current="page"` and clear visual differentiation.
- [ ] Destructive actions require confirmation or provide an immediate "Undo" toast window ($5\text{s}$–$8\text{s}$).
- [ ] Optimistic UI updates roll back cleanly and display an error toast if the server mutation fails.
- [ ] External links opening in a new tab include `rel="noopener noreferrer"` and a subtle external-link indicator.
- [ ] Breadcrumbs are provided for hierarchical views deeper than 2 levels.
- [ ] Unsaved form changes warn the user (`beforeunload` or route guard) before navigating away.

### 10. Dark Mode & Theming Integrity (6 Rules)
- [ ] Set `color-scheme: dark` (or `color-scheme: light dark`) on `<html>` so native scrollbars, date pickers, and form controls match the active theme.
- [ ] Use semantic CSS custom properties (`--bg-surface`, `--text-primary`, `--border-subtle`) rather than scattering raw `dark:bg-slate-900` overrides with inconsistent hues.
- [ ] In dark mode, communicate elevation via subtle surface lightness increments and `1px` top/inner borders (`border-white/10`) rather than heavy black drop shadows.
- [ ] Desaturate neon status colors slightly in dark mode to prevent optical halation/vibration against dark backgrounds.
- [ ] Set `<meta name="theme-color" content="...">` dynamically to match the active light/dark background.
- [ ] Persist explicit user theme choice (`light` | `dark` | `system`) without initial hydration flash.

---

## Part 2: Anthropic `web-artifacts-builder` & `frontend-design` Architecture

From `anthropics/skills` (`web-artifacts-builder` and `frontend-design`):

1. **Anti-AI-Slop Mandate (`frontend-design`)**:
   - **Never** ship generic purple-to-blue gradients on white cards, random decorative blobs, or default `Inter`/`Roboto` typography without an intentional aesthetic direction.
   - Commit to a specific aesthetic archetype before writing CSS: *Editorial Swiss Grid*, *High-Craft Technical Dark UI (Linear/Vercel style)*, *Warm Tactile Studio*, *Brutalist Monospace*, or *Data-Dense Financial Terminal*.
2. **Multi-Component React + Tailwind + `shadcn/ui` Architecture (`web-artifacts-builder`)**:
   - Build complex interactive artifacts using modular React 18/19 components, Tailwind CSS utility tokens, `shadcn/ui` primitives (Radix UI accessibility under the hood), and `lucide-react` icons.
   - Keep state management explicit (custom hooks + URL/local state) and compose rich subcomponents (`DataTable`, `CommandPalette`, `Sheet`, `Tabs`, `Tooltip`, `ResizablePanelGroup`) rather than dumping monolithic JSX into a single component.
   - If a standalone single-file HTML artifact is required for sharing or previewing, bundle all scripts, styles, and assets cleanly into a self-contained artifact only as the final packaging step.
