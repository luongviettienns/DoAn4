# CINEX — CINEMATIC HOMEPAGE TRANSFORMATION · PROMPT v3 (SUPERCHARGED EDITION)

> **Upgraded Autonomous Execution Brief** — Synthesizing **Prompt v2** with **19 Installed Frontend & Engineering Skills**:
> `akit-design` · `akit-react` · `akit-performance` · `akit-browser-qa` · `frontend-design` · `magic-ui` · `motion-primitives` · `react-bits` · `stageshow` · `vercel-react-best-practices` · `vercel-composition-patterns` · `tailwind-4-docs` · `frontend-code-review` · `playwright-cli` · `e2e-testing` · `verification-before-completion` · `akit-git` · `akit-test` · `akit-review`

---

## 0. MISSION & BRAND THESIS

- **Project:** CineX — Hệ thống đặt vé xem phim trực tuyến (React 19 + TypeScript + Vite + Tailwind CSS + Node/Express/Prisma/MySQL).
- **Brand Thesis:** *"Khoảnh khắc đèn phòng chiếu vừa tắt và một câu chuyện phi thường chuẩn bị bắt đầu."* (Anticipation · Spectacle · Immersion · Effortless Booking).
- **Guiding Line:** Bộ phim là nhân vật chính. Giao diện là đạo diễn. Chuyển động là ngôn ngữ máy quay. Một tấm vé đặt thành công trong vài giây là kết quả cuối cùng.
- **Anti-Slop Mandate (`akit-design` & `pbakaus/impeccable`):** Zero tolerance for generic SaaS templates, purple-pink AI gradients, identical 3-column card walls, nested card-in-card-in-card syndrome, fake ratings/testimonials, or dead placeholder buttons.

---

## 1. SKILL-SUPERCHARGED ENHANCEMENTS OVER PROMPT v2

### 1.1 Dual `DESIGN.md` & Anti-Slop Governance (`akit-design` + `frontend-design`)
- Establish root `DESIGN.md` combining **Google Labs YAML token frontmatter** with **VoltAgent brand rationale**.
- Enforce the **61 Deterministic Anti-Slop Rules** (`impeccable`) and **57 Hallmark Criteria** (`nutlope/hallmark`):
  - **Light Model:** Single consistent overhead **Projector Beam** light source (`radial-gradient` & directional top-border highlight `rgba(255, 178, 62, 0.22)`).
  - **3 Distinct Surface Archetypes:**
    1. *Proscenium Frame (Poster/Backdrop Stage)* — crisp `1px` warm hairline, deep charcoal `#0B0A0C` ground, subtle static film grain.
    2. *Perforated Ticket Stub (Booking Dock, Promo Coupons, Active Showtimes)* — geometric side notches (`radial-gradient` mask or SVG notch), dashed tear-line divider, `tabular-nums` metadata.
    3. *Quiet Editorial Ledger (Cinema Experience & Film Details)* — exposed `1px` architectural hairlines (`rgba(243, 238, 230, 0.08)`), generous negative space, asymmetric 12-column grid.

### 1.2 High-Craft Motion Physics (`emilkowalski/skills` + `motion-primitives` + `react-bits` + `magic-ui`)
1. **Emil Kowalski's 3 Laws:**
   - **Ban `scale(0)`:** Entering elements start from `scale(0.95)`–`scale(0.97)` with `opacity: 0 -> 1` and `translateY(6px -> 0)`.
   - **Decisive Ease-Out:** Use `cubic-bezier(0.22, 1, 0.36, 1)` (`160ms–220ms` for UI feedback; `120ms–150ms` for exits; `600ms–900ms` for hero scene transitions). Never use `ease-in` on enter.
   - **Interruptibility:** Prefer CSS transitions and declarative state transitions over blocking keyframes.
2. **`motion-primitives` Adaptations:**
   - **Active Pill Indicator (`AnimatedBackground` pattern):** Smooth shared-indicator pill on status filter tabs (*Đang chiếu*, *Sắp chiếu*, *Tất cả*) and Quick Booking date selectors.
   - **Radial Projector Spotlight (`Spotlight` pattern):** Subtle cursor-tracking warm amber spotlight (`pointer-events: none`) on fine-pointer desktop cards.
   - **Ticket Border Glow (`BorderTrail` pattern):** Restrained amber border highlight on the active Booking Dock when a movie and showtime are ready.
3. **`react-bits` Adaptations:**
   - **Fine-Pointer 3D Poster Tilt (`TiltedCard` pattern):** Max `5deg` perspective tilt with specular highlight on `(hover: hover) and (pointer: fine)` only; zero tilt on touch or `prefers-reduced-motion: reduce`.
   - **Diacritic-Safe Vietnamese Title Reveal (`BlurText` / `SplitText` adaptation):** Custom vertical padding buffer (`py-1.5 -my-1.5`) so stacked Vietnamese diacritics (*"Đào, Phở và Piano"*, *"Lật Mặt 7: Một Điều Ước"*) are never clipped by `overflow: hidden`.
   - **The 1-Hero Restraint Rule:** Only the Hero section mounts the ambient projector-beam light canvas/effect; zero competing continuous animations below the fold.
4. **`magic-ui` & `stageshow` Adaptations:**
   - **Asymmetric Bento Proscenium (`bento-grid` + `stageshow`):** In `CinemaExperienceSection`, replace generic stock photo cards with an interactive **Architectural Auditorium & Seat Tier Stage** (comparing real database seat types: *Ghế Thường Standard*, *Ghế VIP*, *Ghế Đôi Sweetbox*, and real rooms *Phòng Chiếu IMAX / Standard* from `seed.ts`) with interactive acoustic/sightline visualization and **3-to-7 real strings restraint**.

### 1.3 React 19 & Core Web Vitals Engineering (`akit-react` + `vercel-react-best-practices` + `akit-performance`)
1. **Zero Request Waterfalls (`async-parallel` & `client-swr-dedup`):**
   - Single `useHomeCatalog` data hook firing parallel requests (`Promise.all`) with `AbortController` cleanup, request-id stale response rejection, and non-personal `sessionStorage` stale-while-revalidate (SWR) cache so repeat visits paint the hero poster in `0ms` without waiting for network RTT.
2. **Derived State During Render (`rerender-derived-state-no-effect`):**
   - Compute filtered movies, available cinemas for the selected movie, available dates (`Asia/Ho_Chi_Minh`), and format-grouped showtimes via pure render derivation (`useMemo`), eliminating cascading `useEffect` state sync bugs.
3. **Vercel 100+ Web Interface Guidelines Compliance:**
   - `font-variant-numeric: tabular-nums` on every price, duration, countdown, date, and showtime chip.
   - `min-w-0` on all flex/grid text containers; explicit `aspect-[2/3]` on posters and `aspect-[16/9]` on backdrops (`CLS = 0`).
   - Touch targets `>= 44x44px` on mobile; `:focus-visible` `2px` high-contrast amber ring (`#FFB23E` on `#0B0A0C` = `11.4:1` contrast).
   - Full WAI-ARIA APG Carousel semantics (`aria-roledescription="carousel"`, `aria-live="off"` when auto-advancing, `"polite"` when paused, explicit Pause/Play button, auto-pause on hover/focus/touch, disabled under `prefers-reduced-motion`).

---

## 2. EXECUTION PHASES & GATES

- **Phase 0 — Preflight (`[GATE 0]`):** Branch `feat/cinematic-homepage`, record Node/npm versions, run baseline `build`/`lint`/`test`, capture `before/` screenshots across all 6 viewports (`375x812`, `768x1024`, `1024x768`, `1440x900`, `1920x1080`, `812x375`), write `docs/homepage-redesign/00-baseline.md`.
- **Phase 1 — Evidence-Based Audit (`[GATE 1]`):** Audit every frontend component and backend endpoint with exact `file:line` citations, nullability contracts, booking state ownership, and dead-CTA inventory in `docs/homepage-redesign/01-audit.md`.
- **Phase 2 & 3 — Capability Matrix & Art Direction (`[GATE 2 & 3]`):** Write `docs/homepage-redesign/02-art-direction.md` and root `DESIGN.md`.
- **Phase 4 — Experience Architecture & Motion Spec (`[GATE 4]`):** Write `docs/homepage-redesign/03-architecture.md` and `docs/homepage-redesign/04-motion-spec.md`.
- **Phase 5 — Vertical Slice Implementation (`S0`–`S9`):**
  - `S0`: Tokens, Vietnamese typography rules, reduced-motion hook & motion primitives.
  - `S1`: Race-safe `useHomeCatalog` & `useBookingDock` hooks + section error boundaries.
  - `S2`: `Header.tsx` (adaptive glass-charcoal header, role-based navigation, mobile focus-trapped sheet menu, quick film search jump).
  - `S3`: `HeroSection.tsx` (art-directed static LCP shell, projector-beam atmosphere, WAI-ARIA carousel, Trailer Facade modal, direct Movie → Booking Dock handoff, coming-soon awareness).
  - `S4`: `Discovery.tsx` (Booking Dock + Poster Gallery with fine-pointer 3D tilt, race-safe search/status/genre filtering, pagination, film detail drawer/expansion).
  - `S5`: `BookingDock.tsx` (Ticket-stub perforated quick booking bar: Movie → Cinema → Date in `Asia/Ho_Chi_Minh` → Showtime chip → opens authoritative `SeatMapModal`).
  - `S6`: `CinemaExperienceSection.tsx` (Interactive Proscenium & Seat-Tier Stage backed by real database room/seat types, zero unverified claims).
  - `S7`: `PromoSection.tsx` (Real API `/promotions/public` & `/concessions/combos` integration with perforated coupon geometry and honest booking-flow guidance).
  - `S8`: `ClosingCta.tsx` & `Footer.tsx` (Role/auth-aware closing scene + verified semantic footer).
  - `S9`: Unit & integration tests for all new hooks and homepage flows.
- **Phase 6 — Verification, Visual QA & Independent Review (`[EVIDENCE]`):**
  - Capture matching `after/` screenshots across all 6 viewports + interactive states + `prefers-reduced-motion: reduce`.
  - Run automated accessibility checks, keyboard-only booking walkthrough, `320px` reflow check, full Vitest suites (Frontend + Backend), and production build chunk analysis.
  - Dispatch independent `akit-critic` subagent review and resolve all findings.
  - Deliver `05-qa-report.md`, `06-limitations.md`, `DECISIONS.md`, `README.md`, and update `PROJECT_PROGRESS.md`.
