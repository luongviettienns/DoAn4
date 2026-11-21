---
name: akit-react
description: Use when building or refactoring React, Next.js, or component-based web frontends to enforce Server/Client component boundaries, eliminate async request waterfalls, prevent unnecessary useEffect hooks, and guarantee accessibility.
---
# AKit React — React & Next.js Architecture, Quality & Performance

## Overview
`akit-react` distills the production engineering rules from `vercel-labs/agent-skills` (`react-best-practices`, `web-design-guidelines`) and `nextlevelbuilder/ui-ux-pro-max-skill` into an actionable playbook for React 18/19 and Next.js App Router/SPA applications.

**Core principle:** Push data fetching to the server or parallel loader boundaries, derive state during render instead of synchronizing with `useEffect`, and keep interactive client islands small and accessible.

---

## Antigravity Native Tool Mapping
1. **Check Framework & Design System (`read_file`):** Inspect `package.json` (Next.js / Vite / TanStack Query / Tailwind versions) and `DESIGN.md` (`akit-design`) before creating components.
2. **Consult Official Version Docs (`akit-docs`):** For version-specific Next.js caching, Server Actions, or React 19 hooks (`useActionState`, `useOptimistic`), verify against installed versions first.
3. **Browser & Component Verification (`run_command`):** Run unit/component tests (`vitest` / `jest` + Testing Library) and real browser checks (`akit-browser-qa`).

---

## Step-by-Step React & Next.js Engineering Playbook

### Step 1: Design Server vs. Client Boundaries (`vercel-labs/agent-skills`)
1. Default to **Server Components** (in Next.js App Router) for data fetching, static layout shells, and heavy markdown/formatting libraries.
2. Add `'use client'` **only at the leaf interactive boundary** (forms, modals, stateful filters, event listeners). Never mark an entire page layout `'use client'` just for one toggle button.
3. Pass serializable props across the Server $\rightarrow$ Client boundary; use `children` composition so Server Components can render inside Client wrappers without becoming client-bundled.

### Step 2: Eliminate Request Waterfalls (`CRITICAL` Impact)
1. **Parallelize Independent Fetches:** Never `await fetchA()` followed sequentially by `await fetchB()` when `fetchB` does not depend on `fetchA`. Use `Promise.all([fetchA(), fetchB()])` or independent `<Suspense>` boundaries (`references/react-nextjs-best-practices.md`).
2. **Prevent Client Fetch Cascades:** Avoid nested components that each fire a `useEffect(() => fetch(...))` on mount after their parent finishes loading. Hoist data loading to the route loader / Server Component or prefetch in parallel.

### Step 3: State Management & Anti-`useEffect` Discipline
1. **Never use `useEffect` for Derived State:** If `fullName` or `filteredItems` can be computed from existing props/state, compute it directly during render (or `useMemo` if measurably expensive).
2. **Never use `useEffect` for User Events:** Handle form submissions, analytics events, and state transitions inside the event handler (`onSubmit`, `onClick`), not inside an effect watching a boolean flag.
3. **Lift URL-worthy State to Search Params:** Filters, pagination (`?page=2`), sort order, and active tabs belong in URL search parameters so links are shareable and survive page refreshes.

### Step 4: Bundle Hygiene, Semantic HTML & Accessibility
1. **Avoid Barrel-File Bundle Bloat:** Import heavy icon/chart modules directly or configure `optimizePackageImports`; lazy-load below-the-fold heavy editors/charts with `next/dynamic` or `React.lazy`.
2. **Semantic Elements First:** Use `<button type="button">` for actions and `<a href="...">` / `<Link>` for navigation — **never `<div onClick>`**.
3. **Complete UI States:** Implement all 6 UX states from `akit-design` (Skeleton, Empty, Populated/Overflow, Field Error, Network Retry, Keyboard Focus).

---

## Red Flags & Rationalization Counter-Table

| Common Excuse / Rationalization | Engineering Reality & Mandatory Action |
| :--- | :--- |
| *"I'll synchronize `filteredList` in a `useEffect` whenever `items` or `query` changes."* | Causes an extra wasted render pass and state desynchronization bugs. Compute `const filteredList = ...` directly during render. |
| *"I'll put `'use client'` at the top of `app/dashboard/page.tsx` for convenience."* | Pulls the entire page tree and its dependencies into the client JS bundle. Extract only the interactive widget into a child Client Component. |
| *"Three sequential `await` calls in the page loader are fine."* | Sequential awaits add $3\times$ network RTT latency to TTFB/LCP. Wrap independent calls in `Promise.all()` or stream with `<Suspense>`. |
| *"I'll use array index `key={i}` on a reorderable/filterable list."* | Index keys corrupt component state and input focus when items are inserted, deleted, or sorted. Always use a stable domain ID `key={item.id}`. |

---

## Safety & Exit Gates
- **Strict Type Safety Gate:** Forbid `any`, `as any`, `<any>`, `@ts-ignore`, `@ts-expect-error` without an explicit `// APPROVED-ANY: <reason & approver>` comment; enforce `tsconfig.json` `"strict": true` and ESLint (`@typescript-eslint/no-explicit-any`).
- Never expose server-only environment variables or database clients to `'use client'` modules (use `server-only` package guard where supported).
- Run `typecheck`, `lint`, component tests (100% pass rate), independent review (`akit-critic`), and `akit-browser-qa` before claiming UI implementation is complete; mark any unrun check as `CHƯA XÁC MINH`.

## Reference Materials & Attribution
- Concrete React/Next.js code patterns (waterfalls, `useEffect` replacements, RSC composition, a11y): `references/react-nextjs-best-practices.md`
- Complete 8-Priority Category & 70-Rule Vercel React/Next.js Optimization Catalog (`async-`, `bundle-`, `server-`, `client-`, `rerender-`, `rendering-`, `js-`, `advanced-`): `references/vercel-8-tier-rules-catalog.md`
- Inspired by `vercel-labs/agent-skills` (`vercel-react-best-practices`), `DavidHDev/react-bits`, `greensock/gsap-skills`, `benjitaylor/skills` (`stageshow`), and `nextlevelbuilder/ui-ux-pro-max-skill`. Original AKit instructions.
