---
name: motion-primitives
description: "UI kit of smooth, accessible animation primitives made with Motion (Framer Motion) and Tailwind CSS. Use when adding micro-interactions, layout transitions, animated backgrounds, text reveals, morphing dialogs, border trails, or interactive cards."
---

# Motion Primitives (`ibelick/motion-primitives`)

Motion Primitives is an open-source collection of beautiful, accessible, copy-paste animation components for React/Next.js built on **Motion** (`motion/react` or `framer-motion`) and **Tailwind CSS**.

- **Repository:** `https://github.com/ibelick/motion-primitives`
- **Official Docs:** `https://motion-primitives.com`
- **Core dependencies:** `motion/react` (or `framer-motion`), `clsx`, `tailwind-merge`, `lucide-react`.

---

## 1. When to Use

Trigger this skill whenever you need:
- **Interactive surfaces & micro-interactions:** Sliding tab indicators (`AnimatedBackground`), 3D card tilts (`Tilt`), dynamic magnification dock (`Dock`), magnetic cursor spotlights (`Spotlight`).
- **Layout & state transitions:** Height-adaptive tab panels (`TransitionPanel`), morphing thumbnail-to-modal dialogs (`MorphingDialog`), dynamic toolbars (`ToolbarDynamic`, `ToolbarExpandable`).
- **Text & typography animations:** Rolling 3D character flips (`TextRoll`), cyberpunk scramble text (`TextScramble`), shimmer metallic effects (`TextShimmer`), stagger character reveals (`TextEffect`), text tickers (`TextLoop`).
- **Ambient & scroll motion:** Animated counter numbers (`AnimatedNumber`), glowing border rings (`BorderTrail`), infinite marquee sliders (`InfiniteSlider`), layered blur overlays (`ProgressiveBlur`), scroll meters (`ScrollProgress`).

---

## 2. Prerequisites & Setup

Ensure the project has `motion` (or `framer-motion`) and standard `cn` helper installed:

```bash
npm install motion/react clsx tailwind-merge
# or if using framer-motion:
# npm install framer-motion
```

Standard helper in `@/lib/utils.ts` (or `src/utils.ts`):
```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 3. Component Catalog & Quick Reference

| Component | File Path | Core Use Case & Props |
|---|---|---|
| **`AnimatedBackground`** | `components/core/animated-background.tsx` | Active pill indicator for navbars, segmented controls, or tabs with `layoutId`. Accepts `defaultValue`, `onValueChange`, `transition`, `enableHover`. |
| **`AnimatedGroup`** | `components/core/animated-group.tsx` | Staggered entrance for lists, card grids, with presets: `fade`, `slide`, `scale`, `blur`, `bounce`. |
| **`AnimatedNumber`** | `components/core/animated-number.tsx` | Smooth spring-animated counter for prices, stats, tickets. Accepts `value: number`, `springOptions`. |
| **`BorderTrail`** | `components/core/border-trail.tsx` | Animated glowing beam tracing around a container border. Accepts `size`, `transition`, `onAnimationComplete`. |
| **`MorphingDialog`** | `components/core/morphing-dialog.tsx` | Smooth Apple-style card-to-fullscreen modal expansion using shared layout animation (`MorphingDialogTrigger`, `MorphingDialogContent`). |
| **`Dock`** | `components/core/dock.tsx` | macOS dynamic dock magnification using spring physics and mouse distance calculation (`DockIcon`, `DockItem`). |
| **`GlowEffect`** | `components/core/glow-effect.tsx` | Animated conic-gradient or radial color glow under buttons, cards, or hero elements with configurable spread and blur. |
| **`InView`** | `components/core/in-view.tsx` | Viewport enter/exit trigger for scroll animations. Accepts `variants`, `transition`, `viewOptions`. |
| **`InfiniteSlider`** | `components/core/infinite-slider.tsx` | Seamless continuous horizontal or vertical scrolling marquee for partner logos, reviews, or movie posters. |
| **`ProgressiveBlur`** | `components/core/progressive-blur.tsx` | Multi-stop layered backdrop blur for sticky headers, gradient card bottoms, and hero fading. |
| **`ScrollProgress`** | `components/core/scroll-progress.tsx` | Fixed reading/scroll indicator bar tracking page or container scroll offset. |
| **`Spotlight`** | `components/core/spotlight.tsx` | Mouse-following radial glow highlight for dark mode cards or hero containers. |
| **`TextEffect`** | `components/core/text-effect.tsx` | Letter-by-letter or word-by-word staggered reveal (`per="char" \| "word"`). |
| **`TextLoop`** | `components/core/text-loop.tsx` | Rotating vertical text carousel for rotating headlines or features. |
| **`TextRoll`** | `components/core/text-roll.tsx` | 3D rolling character flip on hover or enter. |
| **`TextScramble`** | `components/core/text-scramble.tsx` | Hacker/cyberpunk text decoding effect cycling random glyphs until settling on the target text. |
| **`TextShimmer`** | `components/core/text-shimmer.tsx` | Animated gradient shimmer sweep across typography. |
| **`Tilt`** | `components/core/tilt.tsx` | 3D perspective tilt reacting to mouse position with spring damping and specular highlight. |
| **`ToolbarDynamic`** | `components/core/toolbar-dynamic.tsx` | Dynamic expanding toolbar with morphing layout boundaries. |
| **`TransitionPanel`** | `components/core/transition-panel.tsx` | Height-animating tab container preventing jarring layout jumps when content length changes. |

---

## 4. Implementation Guidelines & Best Practices

1. **Accessibility & Reduced Motion:**
   - Always honor `prefers-reduced-motion`:
     ```tsx
     import { useReducedMotion } from "motion/react";
     const shouldReduceMotion = useReducedMotion();
     ```
   - In reduced motion mode, drop continuous movement and spring translations to simple instantaneous opacity transitions.
2. **Spring Tuning:**
   - Prefer stiff, well-damped springs for utility UI: `stiffness: 350, damping: 30, mass: 0.8`.
   - Avoid excessive bounciness or nauseating overshoots on interactive modals and dropdowns.
3. **GPU Acceleration:**
   - Only animate `transform` (`x`, `y`, `scale`, `rotate`) and `opacity`.
   - Avoid animating layout geometry (`width`, `height`, `top`, `left`) directly unless utilizing Motion's `layout` or `layoutId` which performs performant FLIP under the hood.
4. **Dark Mode Integration:**
   - Pair `Spotlight`, `GlowEffect`, and `BorderTrail` with subtle dark borders (`border-white/10`) and dark background fills (`bg-zinc-900/50`) for a premium glow aesthetic.
