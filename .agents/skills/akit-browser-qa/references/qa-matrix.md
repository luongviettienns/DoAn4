# Real-Browser QA Matrix & Playwright Patterns (`akit-browser-qa`)

Reference guide informed by `microsoft/playwright-cli` and `anthropics/skills` (`webapp-testing`).

---

## 1. Viewport, Accessibility & State QA Matrix

| Check Category | Desktop (`1440x900`) | Mobile (`375x812`) | Pass Criteria |
| :--- | :--- | :--- | :--- |
| **Layout & Overflow** | Multi-column grid alignment | Single-column stack; hamburger/bottom nav | `scrollWidth <= innerWidth` (Zero unwanted horizontal scrollbar) |
| **Interactive Targets** | Hover + focus rings visible | Touch hit area `>= 44x44px`; input font `>= 16px` | No overlapping sticky bars or unclickable buttons |
| **Form States** | Inline error + disabled submit during inflight request | Virtual keyboard does not obscure error/submit button | `aria-invalid="true"` + `aria-describedby` linked on error |
| **Console & Network** | `0` uncaught `pageerror` or `console.error` | `0` failed asset/API requests (`>=400` unexpected) | Clean DevTools console & network waterfall |
| **Keyboard / Screen Reader** | `Tab` order matches visual order; `Escape` closes modal & restores focus | Semantic headings (`h1` $\rightarrow$ `h2`) and landmarks (`main`, `nav`) | Every interactive control reachable via keyboard alone |

---

## 2. Deterministic Playwright Verification Pattern

```typescript
import { test, expect } from '@playwright/test';

test('checkout flow handles validation error then succeeds at mobile viewport', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('pageerror', (err) => consoleErrors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/checkout');

  // 1. Verify no horizontal overflow on mobile
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth
  );
  expect(hasOverflow).toBe(false);

  // 2. Trigger validation error using accessible role locator
  await page.getByRole('button', { name: /complete order/i }).click();
  await expect(page.getByLabel(/shipping address/i)).toHaveAttribute('aria-invalid', 'true');

  // 3. Fill valid data and verify completion
  await page.getByLabel(/shipping address/i).fill('123 Nguyen Hue, District 1');
  await page.getByRole('button', { name: /complete order/i }).click();
  await expect(page.getByRole('heading', { name: /order confirmed/i })).toBeVisible();
  expect(consoleErrors).toEqual([]);
});
```

---

## 3. Browser QA Evidence Report Block

```markdown
### Browser QA Verification Report
- **Environment & URL:** `[http://localhost:3000 (Local Test Seed)]`
- **Tool Executed:** `[npx playwright test / Chrome DevTools]`
- **Viewports Tested:** `Desktop (1440x900)`, `Mobile (375x812)`
- **Console / Page Errors:** `0`
- **Journeys Verified:** `[Happy path, validation error, keyboard focus, mobile overflow]`
- **Untested / Blocked Flows:** `[None or explicit blocker]`
```
