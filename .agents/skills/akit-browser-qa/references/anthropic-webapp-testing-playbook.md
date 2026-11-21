# Anthropic `webapp-testing` Playbook (`with_server.py` & Reconnaissance-Then-Action)

Synthesized from `anthropics/skills` (`webapp-testing`) and `microsoft/playwright-cli`. Use this playbook whenever testing local web applications, debugging UI regressions, or verifying end-to-end user journeys in a real headless browser.

---

## 1. Decision Tree: Choosing the Execution Strategy

```
Task requires browser verification?
├─ Is it static HTML?
│  ├─ Yes → Read HTML file directly to identify selectors, or open file:/// URL in Playwright
│  └─ No (dynamic web app / Next.js / Vite / FastAPI)
│     ├─ Is the local dev server already running?
│     │  ├─ No → Manage server lifecycle automatically using the `with_server.py` pattern
│     │  └─ Yes → Connect Playwright directly and follow "Reconnaissance-Then-Action"
```

---

## 2. Multi-Server Lifecycle Automation (`with_server.py` Pattern)

Instead of leaving orphan background servers running or racing against an unready port, wrap Playwright test execution in a deterministic server lifecycle runner (`with_server.py` pattern):

```bash
# Single server example:
python scripts/with_server.py --server "npm run dev" --port 3000 -- python verify_app.py

# Full-stack multi-server example (Backend API + Frontend Dev Server):
python scripts/with_server.py \
  --server "cd backend && uvicorn main:app --port 8000" --port 8000 \
  --server "cd frontend && npm run dev -- --port 5173" --port 5173 \
  -- python verify_fullstack_flow.py
```

### Key Rules for Server Lifecycle Management
1. **Wait for TCP Port Readiness**: Poll `localhost:<port>` with a timeout ($30\text{s}$) before launching Chromium.
2. **Guaranteed Teardown**: Always terminate spawned server process groups in a `finally:` block so ports `3000`/`5173`/`8000` are never left zombie-locked.
3. **Single-Script Autonomy**: Write self-contained Playwright Python or TypeScript verification scripts rather than interactive step-by-step shell guesses.

---

## 3. The "Reconnaissance-Then-Action" Protocol

**CRITICAL ANTI-PATTERN**: Never inspect the DOM or assert on elements *before* `networkidle` on dynamic SPAs/SSR apps, and never guess selectors without inspecting the live rendered DOM.

### Step 1: Attach Diagnostic Listeners + Navigate + Wait for `networkidle`
```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 800})

    console_errors = []
    page_errors = []
    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
    page.on("pageerror", lambda err: page_errors.append(str(err)))

    page.goto("http://localhost:3000", wait_until="networkidle")
```

### Step 2: Reconnaissance (Inspect Rendered State)
- Capture a baseline screenshot: `page.screenshot(path="/tmp/recon_desktop.png", full_page=True)`
- Inspect visible interactive elements (`button`, `a`, `input`, `[role="button"]`) and accessible roles (`get_by_role`, `get_by_label`, `get_by_text`) rather than brittle CSS class chains (`.div > .btn-primary:nth-child(2)`).

### Step 3: Execute User Journey & Verify Zero Console/Page Errors
- Perform user interactions (`click`, `fill`, `press`), wait for network/DOM settlement, capture before/after screenshots, and assert:
  ```python
  assert len(console_errors) == 0, f"Console errors detected: {console_errors}"
  assert len(page_errors) == 0, f"Uncaught page errors detected: {page_errors}"
  ```
- Repeat viewport check at mobile width (`375x812`) to verify zero horizontal overflow (`document.documentElement.scrollWidth <= document.documentElement.clientWidth`).
