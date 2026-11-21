# Vercel React & Next.js Best Practices — Complete 8-Priority Rules Catalog

Derived from `vercel-labs/agent-skills` (`vercel-react-best-practices`), this catalog codifies the **8 priority categories** and **70+ concrete optimization rules** used by Vercel Engineering to review and refactor React and Next.js applications.

---

## Priority Overview (Fix in This Exact Order)

| Priority | Category | Impact | Rule Prefix | Rule Count |
| --- | --- | --- | --- | --- |
| **1** | Eliminating Waterfalls | `CRITICAL` | `async-` | 6 |
| **2** | Bundle Size Optimization | `CRITICAL` | `bundle-` | 6 |
| **3** | Server-Side Performance | `HIGH` | `server-` | 10 |
| **4** | Client-Side Data Fetching | `MEDIUM-HIGH` | `client-` | 4 |
| **5** | Re-render Optimization | `MEDIUM` | `rerender-` | 15 |
| **6** | Rendering Performance | `MEDIUM` | `rendering-` | 11 |
| **7** | JavaScript Performance | `LOW-MEDIUM` | `js-` | 14 |
| **8** | Advanced Patterns | `LOW` | `advanced-` | 4 |

---

## 1. Eliminating Waterfalls (`CRITICAL` — Prefix: `async-`)

Sequential `await` calls add full network round-trip latency at every step. Eliminate waterfalls before micro-optimizing anything else.

- **`async-cheap-condition-before-await`**: Evaluate synchronous/cheap conditions (`if (!hasAccess)`) *before* awaiting expensive async operations or flags.
- **`async-defer-await`**: Start promises immediately (`const userPromise = getUser(id)`), perform synchronous work or branching, and `await` only at the exact branch where the value is consumed.
- **`async-parallel`**: Use `Promise.all([getUser(id), getPosts(id), getMetrics(id)])` for all independent async operations.
- **`async-dependencies`**: For partial dependencies (where B depends on A, while C is independent), start A and C concurrently and chain B onto A (`const aPromise = getA(); const cPromise = getC(); const b = await getB(await aPromise);`).
- **`async-api-routes`**: In Next.js Route Handlers and Server Actions, kick off independent DB queries/external calls immediately at the top of the handler and `await` them together.
- **`async-suspense-boundaries`**: Wrap slow RSC subtrees in `<Suspense fallback={<Skeleton />}>` so the page shell and fast content stream immediately without blocking on the slowest query.

---

## 2. Bundle Size Optimization (`CRITICAL` — Prefix: `bundle-`)

Every unnecessary kilobyte shipped to the client delays Time to Interactive (TTI) and First Input Delay (INP).

- **`bundle-barrel-imports`**: Import directly from leaf module paths instead of barrel `index.ts` files when libraries do not cleanly tree-shake, or configure `optimizePackageImports` in `next.config.js` (`lucide-react`, `@radix-ui/*`, `date-fns`, `lodash-es`).
- **`bundle-analyzable-paths`**: Avoid dynamic string concatenation inside `import()` or `fs.readFile` that causes bundlers (Webpack/Turbopack) to bundle entire directories.
- **`bundle-dynamic-imports`**: Lazy-load heavy client components (rich-text editors, Monaco, charts, 3D canvases, PDF viewers) using `next/dynamic` (`{ ssr: false }` when client-only).
- **`bundle-defer-third-party`**: Load analytics, chat widgets, and tracking scripts after hydration using `next/script` with `strategy="afterInteractive"` or `"lazyOnload"`.
- **`bundle-conditional`**: Dynamically `import()` heavy polyfills or feature modules only inside the condition where the user or browser actually needs them.
- **`bundle-preload`**: Preload critical heavy chunks on user intent (`onMouseEnter` / `onFocus`) so the dynamic module is already warm in cache when clicked.

---

## 3. Server-Side Performance (`HIGH` — Prefix: `server-`)

Optimize React Server Components (RSC), Server Actions, and RSC-to-Client payload boundaries.

- **`server-auth-actions`**: Treat every `"use server"` Server Action like a public HTTP POST endpoint—verify authentication (`session`) and authorization (`role`/`ownership`) *inside* each action, and validate inputs with Zod.
- **`server-cache-react`**: Wrap shared data-fetching helpers in `React.cache()` so multiple Server Components in the same request tree deduplicate DB/API queries automatically.
- **`server-cache-lru`**: Use an LRU cache or `unstable_cache` / `"use cache"` for cross-request caching of expensive, non-user-specific computations.
- **`server-dedup-props`**: Never pass the same large object twice across RSC $\rightarrow$ Client Component props under different keys; serialize once.
- **`server-hoist-static-io`**: Hoist static file reads, schema compilations, and SDK initializations to module scope or build time rather than running them inside per-request handlers.
- **`server-no-shared-module-state`**: Never mutate module-scoped variables to store per-request user/auth state in SSR or serverless runtimes (causes cross-request data leaks).
- **`server-serialization`**: Minimize the RSC serialization boundary—pass only the specific primitive fields (`id`, `name`, `avatarUrl`) required by a `"use client"` component instead of an entire 50-field ORM model.
- **`server-parallel-fetching`**: Restructure deeply nested sequential Server Components into sibling components wrapped in `<Suspense>` so their fetches execute in parallel.
- **`server-parallel-nested-fetching`**: Kick off child data fetches in parent Server Components (passing promises or pre-warmed `React.cache` calls) before awaiting parent-only rendering needs.
- **`server-after-nonblocking`**: Use Next.js `after()` (from `next/server`) to schedule audit logging, analytics events, and webhook notifications *after* the response has already streamed to the user.

---

## 4. Client-Side Data Fetching (`MEDIUM-HIGH` — Prefix: `client-`)

- **`client-swr-dedup`**: Use SWR or TanStack Query for client-side fetches instead of raw `useEffect` + `fetch`, ensuring automatic request deduplication, caching, and focus revalidation.
- **`client-event-listeners`**: Deduplicate global `window` event listeners (`resize`, `scroll`, `keydown`) across multiple mounted component instances using shared hooks or `useSyncExternalStore`.
- **`client-passive-event-listeners`**: Always pass `{ passive: true }` to `touchstart`, `touchmove`, and `wheel` listeners so the browser compositor thread never blocks scrolling.
- **`client-localstorage-schema`**: Version and validate `localStorage` / `sessionStorage` payloads with a minimal schema and `try/catch` (handles incognito quota errors and stale schema migrations).

---

## 5. Re-render Optimization (`MEDIUM` — Prefix: `rerender-`)

- **`rerender-defer-reads`**: Do not subscribe a parent component to rapidly changing state (search text, scroll offset, timer) if only a child or an event handler reads it.
- **`rerender-memo`**: Extract expensive subtrees and wrap with `React.memo` (or verify React Compiler auto-memoization) when parent state changes frequently.
- **`rerender-memo-with-default-value`**: Hoist default non-primitive prop values (`const EMPTY_ITEMS: Item[] = []`) outside the component signature so `items = EMPTY_ITEMS` does not create a fresh array reference on every render.
- **`rerender-dependencies`**: Pass primitive dependencies (`user.id`, `user.role`) instead of whole object references (`user`) to `useEffect`, `useMemo`, and `useCallback`.
- **`rerender-derived-state`**: Subscribe to derived booleans (`const isMobile = useMediaQuery('(max-width: 768px)')`) rather than raw continuous values (`windowWidth`).
- **`rerender-derived-state-no-effect`**: Compute derived values directly during render (`const fullName = `${first} ${last}``)—**never** use `useEffect(() => setFullName(...), [first, last])`.
- **`rerender-functional-setstate`**: Use functional state updates (`setCount(c => c + 1)`) inside callbacks so callbacks remain stable without depending on state variables.
- **`rerender-lazy-state-init`**: Pass an initializer function `useState(() => computeInitialState())` rather than `useState(computeInitialState())` so expensive initialization runs only on mount.
- **`rerender-simple-expression-in-memo`**: Do not wrap cheap primitive expressions (`a + b`, `items.length === 0`) in `useMemo`; the hook overhead exceeds the expression cost.
- **`rerender-split-combined-hooks`**: Split "god contexts" or combined hooks into separate state and dispatch contexts so consumers that only dispatch actions do not re-render on state changes.
- **`rerender-move-effect-to-event`**: Move action-triggered side effects (analytics POST, toast notification, router navigation on submit) into the event handler (`onSubmit`, `onClick`) instead of triggering them via `useEffect` watching state flags.
- **`rerender-transitions`**: Wrap non-urgent state updates (filtering large tables, switching tabs) in `startTransition(() => setFilter(next))` to keep typing/clicking responsive.
- **`rerender-use-deferred-value`**: Use `useDeferredValue(query)` when rendering expensive filtered lists driven by controlled input.
- **`rerender-use-ref-transient-values`**: Store high-frequency transient values (mouse coordinates, drag deltas, animation frame IDs, interval handles) in `useRef` instead of `useState`.
- **`rerender-no-inline-components`**: Never define a component function inside another component's body (`function Child() {}` inside `Parent()`), as React unmounts and remounts the entire DOM subtree on every render.

---

## 6. Rendering Performance (`MEDIUM` — Prefix: `rendering-`)

- **`rendering-animate-svg-wrapper`**: Animate a wrapper `<div>` or `<g>` with CSS `transform` and `opacity` (GPU-accelerated) instead of animating layout attributes directly on complex `<svg>` elements.
- **`rendering-content-visibility`**: Apply `content-visibility: auto; contain-intrinsic-size: 0 500px;` to long off-screen list items or below-the-fold sections to skip layout/paint work until scrolled near.
- **`rendering-hoist-jsx`**: Hoist static JSX elements (icons, decorative SVGs, empty state illustrations) to module-level constants when React Compiler is not enabled.
- **`rendering-svg-precision`**: Reduce SVG path coordinate precision to 1–2 decimal places (via SVGO) to shrink DOM/HTML payload size.
- **`rendering-hydration-no-flicker`**: Prevent theme/locale flicker on initial load by injecting a tiny synchronous inline `<script>` in `<head>` that sets `document.documentElement.dataset.theme` before first paint.
- **`rendering-hydration-suppress-warning`**: Use `suppressHydrationWarning` sparingly and only on leaf elements with intentionally client-dependent text (such as localized relative timestamps).
- **`rendering-activity`**: Use React `<Activity>` (or CSS visibility preservation) to keep expensive tab/drawer state alive when toggling visibility frequently.
- **`rendering-conditional-render`**: Never write `{count && <Badge count={count} />}` when `count` is `0` (renders literal `"0"` in DOM); always coerce to boolean `{count > 0 && <Badge count={count} />}` or ternary `{count > 0 ? <Badge count={count} /> : null}`.
- **`rendering-usetransition-loading`**: Prefer `useTransition` (`const [isPending, startTransition] = useTransition()`) over manual `useState(false)` loading flags for async transitions.
- **`rendering-resource-hints`**: Add `<link rel="preconnect">` and `dns-prefetch` for critical third-party asset origins (CDN, fonts, auth provider).
- **`rendering-script-defer-async`**: Ensure non-critical third-party `<script>` tags always carry `defer` or `async` so HTML parsing never blocks.

---

## 7. JavaScript Performance (`LOW-MEDIUM` — Prefix: `js-`)

- **`js-batch-dom-css`**: Batch style changes via CSS classes or `cssText` rather than interleaving DOM reads (`offsetHeight`, `getBoundingClientRect`) and writes (which causes forced synchronous layout thrashing).
- **`js-index-maps`**: Build a `Map(items.map(i => [i.id, i]))` once ($O(N)$) instead of calling `items.find(i => i.id === targetId)` inside a loop ($O(N \times M)$).
- **`js-cache-property-access`**: Cache deeply nested property accesses or DOM queries outside tight loops.
- **`js-cache-function-results`**: Memoize expensive pure functions (`Intl.DateTimeFormat`, `Intl.NumberFormat`, markdown parsers) at module level rather than instantiating formatters inside `.map()`.
- **`js-cache-storage`**: Cache `localStorage.getItem()` reads in memory and invalidate on `storage` events to avoid synchronous main-thread I/O during renders.
- **`js-combine-iterations`**: Combine chained `.filter().map().filter()` passes over large arrays into a single `.reduce()` or `for...of` loop to avoid allocating intermediate arrays.
- **`js-length-check-first`**: Check `arrA.length === arrB.length` before running element-by-element array equality comparisons.
- **`js-early-exit`**: Return early from functions before executing expensive object allocations or transformations.
- **`js-hoist-regexp`**: Hoist static regular expressions (`const EMAIL_RE = /^...$/`) to module scope instead of recreating `new RegExp(...)` on every call.
- **`js-min-max-loop`**: Use a single `for...of` loop to compute `min`/`max` on large arrays instead of `Math.max(...largeArray)` (which risks call stack overflow above ~65k elements).
- **`js-set-map-lookups`**: Convert membership lists to `new Set(allowedIds)` for $O(1)$ `.has(id)` lookups instead of `allowedIds.includes(id)` ($O(N)$).
- **`js-tosorted-immutable`**: Use ES2023 `.toSorted()`, `.toReversed()`, and `.toSpliced()` instead of mutating state arrays with `.sort()` or `.reverse()`.
- **`js-flatmap-filter`**: Use `.flatMap()` when filtering and transforming in one pass.
- **`js-request-idle-callback`**: Schedule low-priority client telemetry or prefetch bookkeeping inside `requestIdleCallback` (with fallback).

---

## 8. Advanced Patterns (`LOW` — Prefix: `advanced-`)

- **`advanced-effect-event-deps`**: Use `useEffectEvent` (or latest-ref pattern) so effects do not re-subscribe to WebSockets/intervals when non-reactive callback props change.
- **`advanced-event-handler-refs`**: Store callback handlers in a ref when attaching imperative third-party SDK listeners that only bind once on mount.
- **`advanced-init-once`**: Guard app-wide singleton initialization with a module-level boolean (`let initialized = false`) rather than relying on `useEffect(..., [])` (which runs twice in React Strict Mode).
- **`advanced-use-latest`**: Use a `useLatest(value)` ref hook when async timers or closures need to read the latest state without resetting the timer.
