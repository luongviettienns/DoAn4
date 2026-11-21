---
name: akit-browser-qa
description: Use when verifying web UI flows, responsive layouts, form validation, authentication journeys, or accessibility in a real headless or interactive browser using Playwright or Antigravity browser tools.
---
# AKit Browser QA — Real-Browser E2E & Accessibility Verification

## Overview
`akit-browser-qa` combines deterministic browser automation practices from `microsoft/playwright-cli` and `anthropics/skills` (`webapp-testing`) with the visual and ergonomic checklists of `nextlevelbuilder/ui-ux-pro-max-skill`. Unit tests with JSDOM cannot catch broken CSS layouts, overlapping mobile sticky headers, CORS/CSP failures, hydration mismatches, or keyboard focus traps.

**Core principle:** Never claim a web UI works based solely on static code inspection or JSDOM mocks when a real browser check is requested or available.

---

## Antigravity Native Tool Mapping
1. **Check Available Browser Tooling (`run_command`):**
   - Check if Playwright (`npx playwright test`), dev servers (`npm run dev`), or Antigravity's `/browser` / Chrome DevTools integration is available in the workspace.
   - **Honesty Gate:** If no browser runtime or local server can be started in the environment, explicitly report `[BROWSER QA BLOCKED - Environment lacks browser binary/server]` and provide the exact Playwright script for the user to run. Never pretend you opened a browser or took a screenshot!
2. **Execute QA Matrix (`references/qa-matrix.md`):** Test across Desktop (`1440x900`) and Mobile (`375x812`) viewports, capturing console errors, failed network requests, and accessibility tree snapshots.

---

## Step-by-Step Real-Browser QA Workflow (`microsoft/playwright-cli`)

### Step 1: Boot Local Server & Verify Clean Console Baseline
1. Start or connect to the local application server using a non-production test account/seed database.
2. Attach listeners for `page.on('pageerror')`, `page.on('console', msg => msg.type() === 'error')`, and failed `4xx/5xx` network responses. Any uncaught hydration error or console exception is a test failure!

### Step 2: Use Resilient User-Facing Locators (Never Brittle CSS/XPath)
Follow `microsoft/playwright-cli` locator priority (`references/qa-matrix.md`):
1. `page.getByRole('button', { name: /save changes/i })` (Verifies both functionality and accessibility tree!)
2. `page.getByLabel('Email address')` (Verifies `<label>` association!)
3. `page.getByPlaceholder(...)` or `page.getByText(...)`
4. `page.getByTestId(...)` (Only when semantic role/label is non-unique)
- **Forbidden:** Brittle selectors like `div.flex > div:nth-child(3) > button.bg-blue-500`.

### Step 3: Exercise the 4 Mandatory User Journeys
1. **Happy Path & Persistence:** Fill form, submit, verify optimistic/loading state, reload page, and confirm data persisted.
2. **Validation & Error Recovery:** Submit empty/invalid inputs, verify `aria-invalid` and inline error text appear, fix input, and resubmit successfully.
3. **Responsive Viewport Audit (`1440x900` vs `375x812`):** Verify zero horizontal overflow (`document.documentElement.scrollWidth <= window.innerWidth`), readable `>=16px` inputs, and non-overlapping navigation on mobile.
4. **Keyboard-Only & Focus Navigation:** Tab through interactive controls (`Tab`, `Shift+Tab`, `Enter`, `Escape` on modals) and verify a visible `:focus-visible` indicator at every step.

### Step 4: Use Web-First Auto-Retrying Assertions
- Use `await expect(locator).toBeVisible()` and `await expect(page).toHaveURL(...)` — **never** `await page.waitForTimeout(3000)` paired with non-retrying `expect(await locator.isVisible()).toBe(true)`.

---

## Red Flags & Rationalization Counter-Table

| Common Excuse / Rationalization | Engineering Reality & Mandatory Action |
| :--- | :--- |
| *"The component compiled with `tsc`, so the UI works."* | TypeScript does not catch `z-index` overlays blocking clicks, broken responsive overflow, or runtime React hydration errors. |
| *"I'll add `waitForTimeout(5000)` to make the Playwright test pass."* | Hardcoded sleeps make E2E suites slow and flaky. Wait for deterministic network/DOM conditions (`expect(locator).toBeVisible()`). |
| *"I'll claim 'Verified in browser at mobile and desktop sizes' without actually running a browser tool."* | **Fabricated evidence violation.** Only claim browser verification when you actually executed the browser command in this session and observed the output. |
| *"I'll use production credentials or live Stripe cards for the E2E run."* | Never run automated browser tests against production accounts or real payment gateways. Use local/staging test fixtures only. |

---

## Safety & Exit Gates
- Redact any session tokens, cookies, or personal data from saved screenshots, HAR files, and Playwright trace zips.
- Report exact executed commands, viewport dimensions, console/network error counts, and any journeys that could not be automated.

## Reference Materials & Attribution
- Viewport QA matrix, Playwright resilient locator patterns, and horizontal-overflow check snippet: `references/qa-matrix.md`
- Anthropic `webapp-testing` lifecycle playbook (`with_server.py`, `networkidle` reconnaissance-then-action, console/pageerror listeners): `references/anthropic-webapp-testing-playbook.md`
- Inspired by `microsoft/playwright-cli`, `anthropics/skills` (`webapp-testing`), and `benjitaylor/skills` (`stageshow` `film.mjs --gate` contact-sheet rehearsal). Original AKit instructions.
