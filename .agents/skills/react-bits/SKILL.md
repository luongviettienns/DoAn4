---
name: react-bits
description: "Over 200+ animated React primitives, interactive WebGL backgrounds, creative typography effects, and micro-interactions from David Haz's React Bits. Use when creating high-craft hero sections, text animations, ambient canvas backgrounds, spotlight cards, or magnetic cursors."
---

# React Bits (`DavidHDev/react-bits`)

React Bits is an open-source library of 200+ animated, customizable React components, text animations, interactive backgrounds, and micro-interactions.

- **Repository:** `https://github.com/DavidHDev/react-bits`
- **Official Docs:** `https://reactbits.dev`
- **Core technologies:** React, Tailwind CSS, Framer Motion / Motion, Three.js / WebGL / OGL, GSAP.

---

## 1. When to Use

Trigger this skill when you want to create:
- **Expressive Typography:** Staggered letter reveals (`SplitText`), focus blurring (`BlurText`), interactive proximity stretching (`VariableProximity`), cyberpunk text decrypting (`DecryptedText`), rolling wave text (`WaveText`), interactive true-focus highlighting (`TrueFocus`).
- **Interactive Focal Cards & Components:** Glass spotlight cards (`SpotlightCard`), 3D tilt depth cards (`TiltedCard`), interactive cards stack (`Stack`), fluid physics dock (`Dock`), rolling 3D gallery (`RollingGallery`), elastic spring slider (`ElasticSlider`), stagger list (`AnimatedList`).
- **Ambient GPU Backgrounds & Shaders:** Moving northern lights (`Aurora`), warp light trails (`Hyperspeed`), volumetric light beams (`Beams`), interactive fluid particles (`Particles`), dynamic waves (`Waves`), chromatic iridescent fluid (`Iridescence`), geometric grid motion (`GridMotion`), interactive canvas physics (`Ballpit`, `Antigravity`).
- **Micro-Interactions & Cursors:** Magnetic pull on buttons (`Magnet`), fluid mouse trail (`SplashCursor`), particle burst on click (`ClickSpark`), glowing animated borders (`StarBorder`), ambient film grain (`Noise`).

---

## 2. Component Directory & Reference Index

### Text Animations (`src/content/TextAnimations/`)
- **`SplitText`**: Breaks sentences into words or individual characters, animating them with customizable spring delays, translateY, and opacity stagger.
- **`BlurText`**: Words or letters animate from a heavy Gaussian blur (`blur(10px)`) into crisp focus with subtle scale easing.
- **`DecryptedText`**: Matrix/cyberpunk decoding animation that scrambles characters with random letters before revealing the final text on scroll or hover.
- **`VariableProximity`**: Variable font weight and width react dynamically to cursor distance.
- **`ShinyText`**: Sweeps a continuous metallic light reflection across dark text.
- **`TrueFocus`**: A dynamic bounding box with blur mask tracks hovered words or phrases across a sentence.
- **`CountUp`**: Smooth spring-based counter with customizable easing and formatters.

### Interactive Components (`src/content/Components/`)
- **`SpotlightCard`**: Dark mode card with a radial spotlight following cursor position (`pointer-events: none` radial gradient layer).
- **`TiltedCard`**: Reacts to mouse coordinates with 3D matrix transform perspective, depth elevation, and optional specular shine overlay.
- **`Stack`**: Swipeable or click-to-cycle stack of cards with smooth spring reordering.
- **`ElasticSlider`**: Touch/mouse draggable slider with bouncy rubber-band elasticity at bounds.
- **`RollingGallery`**: 3D cylinder carousel displaying items with depth blur and perspective wrap.
- **`AnimatedList`**: Staggered auto-scrolling or hover-activated container for notification feeds and activities.

### Ambient Backgrounds (`src/content/Backgrounds/`)
- **`Aurora`**: Smooth GPU-accelerated gradient meshes drifting like the northern lights.
- **`Hyperspeed`**: Sci-fi warp speed road / stars perspective tunnel with customizable trail colors and speeds.
- **`Beams`**: Volumetric light rays piercing through a dark background.
- **`Particles`**: Canvas or WebGL particle mesh with interactive cursor repulsion or mouse attraction.
- **`Iridescence`**: Liquid chromatic color ripples calculated via GLSL fragment shaders.
- **`Squares`**: Minimalist grid of outline squares that light up in proximity to the cursor.
- **`Waves`**: 3D sine-wave ocean wireframe or ribbon simulation.

### Cursor & Micro-Interactions (`src/content/Animations/`)
- **`Magnet`**: UI buttons or icons pull toward the cursor when hovered within a radius, snapping back via damped spring on exit.
- **`ClickSpark`**: Emits micro particles radiating from the mouse click coordinate.
- **`StarBorder`**: Animated gradient border rotating continuously around rounded cards or CTA buttons.
- **`SplashCursor`**: Interactive fluid simulation emitting colorful smoke following mouse movement.

---

## 3. Engineering & Performance Rules

1. **The 1-Hero Restraint Rule:**
   - **Never mount more than one heavy WebGL shader / canvas background per viewport.** Heavy shaders (`Aurora`, `Hyperspeed`, `Iridescence`, `SplashCursor`) consume GPU cycles. Limit them to the hero section or a focused CTA banner.
2. **Accessible DOM Fallback (The Canvas-UI Rule):**
   - WebGL canvas elements must always have `pointer-events: none` if layered over interactive HTML elements.
   - All text, navigation links, and CTA buttons must remain standard HTML DOM nodes (`<button>`, `<a>`, `<h1>`) so keyboard navigation, screen readers, and text selection are 100% preserved.
3. **Reduced Motion Compliance:**
   - Detect `window.matchMedia("(prefers-reduced-motion: reduce)")`.
   - When active, disable continuous particle animation, fluid velocity updates, and 3D camera sweeps. Degrade gracefully to static CSS gradients.
4. **Clean Unmounting & Resource Disposing:**
   - For Three.js / WebGL / Canvas primitives, always cancel `requestAnimationFrame`, detach window resize / mousemove listeners, and call `.dispose()` on geometries, materials, and textures in the `useEffect` cleanup return.
