# Creative Motion Engineering: Emil Kowalski, GSAP, React Bits, Scroll World & Canvas UI

This reference codifies the 5 specialized **Motion, 3D Scroll, and WebGL UI Engineering** frameworks integrated into AKit:
1. **`emilkowalski/skills`**: Emil Kowalski's Design Engineering & Micro-interaction Physics (Vercel/Linear craft).
2. **`greensock/gsap-skills`**: Official GreenSock AI rules for `useGSAP`, `ScrollTrigger`, `SplitText`, `Flip`, and `contextSafe`.
3. **`DavidHDev/react-bits`**: 200+ animated React/Next.js primitives, text effects, and interactive backgrounds.
4. **`oso95/scroll-world`**: Cinematic 3D & video scroll-driven landing pages (`Scroll Position = Timestamp` & `The Seam Rule`).
5. **`DavidHDev/canvas-ui`**: Interactive WebGL shaders over real HTML DOM (preserving native clickability and text selection).
6. **`benjitaylor/skills` (`stageshow`)**: High-craft faux product UI illustrations, intentional crop/bleed framing (`Corner bleed`, `Pinned, bottom bleed`), 3–7 real strings restraint, and scripted `Stage`/`Act` cursor demo choreography (see `references/stageshow-faux-product-ui-and-cursor-demos.md`).

---

## 1. `emilkowalski/skills`: Laws of High-Craft UI Motion & Component Feel

Derived from Emil Kowalski's design engineering rules (*animations.dev*):

### Law 1: The Absolute `scale(0)` Ban
- **NEVER animate an entering UI element from `scale(0)`**. In the physical world, objects do not materialize from zero volume, and `scale(0) -> scale(1)` looks robotic and cheap.
- **Mandatory Replacement**: Always start enter animations from **`scale(0.93)` to `scale(0.97)`** paired with `opacity: 0 -> 1` and a subtle `translateY(4px -> 0)`.

### Law 2: Easing Direction & Snappy Duration (`< 300ms`)
- **NEVER use `ease-in` for elements entering the screen** (it starts sluggishly and slams into place).
- **Use custom `ease-out` curves or springs** for UI entrances and state changes:
  - Crisp UI Enter/Exit: `cubic-bezier(0.22, 1, 0.36, 1)` or `cubic-bezier(0.16, 1, 0.3, 1)` at **$150\text{ms}$–$220\text{ms}$**.
  - Interactive Drawer / Sheet / Modal: Damped spring (`stiffness: 380, damping: 32, mass: 0.8`) with zero nauseating overshoot on utility dialogs.
- **Exit animations must be faster than enter animations** ($120\text{ms}$–$150\text{ms}$ exit vs $180\text{ms}$–$220\text{ms}$ enter).

### Law 3: Interruptibility, `@starting-style` & Origin-Aware Popovers
- **Prefer CSS transitions over rigid `@keyframes`** for interactive states so rapid hover/unhover or toggle clicks reverse smoothly mid-flight without snapping.
- **Origin-Aware Scaling**: Always bind `transform-origin` to the trigger anchor (`var(--radix-popover-content-transform-origin)`) so menus expand *out of* the button that opened them.
- **Warm Tooltip Pattern**: First tooltip hover waits `300ms`; subsequent adjacent tooltip hovers open in `0ms` with instant spatial handoff.
- **Blur Masking Trick**: Add a subtle transient `filter: blur(2px -> 0px)` during rapid morphing between two differently sized states (e.g., morphing a "Copy" icon into a "Check" icon) to hide sub-pixel geometry jumps.
- **Critique Format**: Always present motion/polish reviews in a **`Before | After | Why`** markdown table.

---

## 2. `greensock/gsap-skills`: Official GSAP & ScrollTrigger Engineering Rules

When building complex timeline sequences, pinned scroll sections, or layout morphs with GSAP:

### Mandatory React / Next.js Rules (`@gsap/react`)
1. **Always use `useGSAP()` — NEVER bare `useEffect()`**:
   ```tsx
   "use client";
   import { useRef } from "react";
   import gsap from "gsap";
   import { ScrollTrigger } from "gsap/ScrollTrigger";
   import { useGSAP } from "@gsap/react";

   gsap.registerPlugin( useGSAP, ScrollTrigger );

   export function FeaturePinSection() {
     const containerRef = useRef<HTMLDivElement>(null);

     useGSAP(() => {
       const tl = gsap.timeline({
         scrollTrigger: {
           trigger: containerRef.current,
           start: "top top",
           end: "+=200%",
           pin: true,
           scrub: 0.6,
         },
       });
       tl.from(".step-card", { y: 32, opacity: 0, scale: 0.96, stagger: 0.15, ease: "power3.out" });
     }, { scope: containerRef }); // Mandatory selector scoping!

     return <section ref={containerRef}>...</section>;
   }
   ```
2. **Mandatory Selector Scoping (`{ scope: containerRef }`)**: Never run global `gsap.to(".card", ...)` queries that leak across other mounted components.
3. **Wrap Event Handlers in `contextSafe`**: Any GSAP tween created inside an `onClick` or `onMouseEnter` callback must be wrapped with `const onClick = contextSafe(() => { gsap.to(...); })` so it is automatically cleaned up when the component unmounts.
4. **SSR & Reduced-Motion Guards**: Register plugins safely on the client and use `gsap.matchMedia()` to provide non-scrubbed/accessible fallbacks when `(prefers-reduced-motion: reduce)` is active.

---

## 3. `DavidHDev/react-bits` & `DavidHDev/canvas-ui`: Animated Primitives & WebGL-Over-DOM

### `DavidHDev/react-bits` (200+ Animated React Primitives)
- Use modular, copy-paste/CLI-ready animated primitives for high-impact focal points:
  - **Typography Effects**: `SplitText`, `BlurText`, `DecryptedText`, `ShinyText`, `VariableProximity`, `GradientText`.
  - **Interactive Surfaces & Cursors**: `SpotlightCard`, `TiltedCard`, `Magnet`, `StarBorder`, `ClickSpark`, `AnimatedList`.
  - **Background Atmospheres**: `Aurora`, `Beams`, `Particles`, `Squares`, `Waves`, `Iridescence`.
- **Restraint Rule**: Limit heavy background shaders/particles to **1 focal hero/CTA region per page** so GPU frame budget stays locked at $60\text{fps}$–$120\text{fps}$ and text legibility is never compromised.

### `DavidHDev/canvas-ui` (WebGL Shaders Over Interactive HTML DOM)
- **Core Architecture (HTML-in-Canvas)**: Traditional WebGL canvases swallow pointer events or replace DOM text with inaccessible bitmap textures. `DavidHDev/canvas-ui` layers GPU-accelerated WebGL shaders (liquid distortion, chromatic glass refraction, wave displacement, particle reveals) while **keeping the underlying HTML `<p>`, `<h1>`, `<a>`, and `<button>` elements 100% selectable, clickable, and screen-reader accessible**:
  1. Set the WebGL `<canvas>` overlay or underlay to `pointer-events: none` (forwarding normalized mouse/scroll uniforms via `window` passive listeners).
  2. Synchronize DOM element bounding boxes (`getBoundingClientRect()` + `ResizeObserver` + scroll offset) to WebGL plane coordinates.
  3. Degrade gracefully to clean CSS styling on low-power devices or `prefers-reduced-motion: reduce`.

---

## 4. `oso95/scroll-world`: Cinematic 3D & Video Scroll-Through Landing Pages

When the user asks for an Apple-style 3D landing page or cinematic camera fly-through driven by scroll:

1. **Core Engine (`Scroll Position = Timestamp`)**:
   - Bind normalized scroll progress ($t \in [0, 1]$) directly to either a **Three.js / React Three Fiber camera spline (`CatmullRomCurve3`)** or a **high-keyframe-density video/canvas frame scrubber** (`Stills -> Dives -> Connectors`).
2. **The Seam Rule (The Absolute Law of Scroll Worlds)**:
   - Consecutive scene transitions (`Scene A End Frame` $\rightarrow$ `Connector Clip` $\rightarrow$ `Scene B Start Frame`) **must match frame-identically at the seam**. Never allow a hard visual cut, camera jump, or aspect-ratio pop while the user is scrubbing.
3. **Story-Beat Pipeline Before Code**:
   - Define the 4–6 narrative story beats, camera keyframes, HTML overlay callout timings (entering at `scale(0.95) -> 1`, fading out cleanly before the camera accelerates), and mobile fallback strategy before generating scene code.
