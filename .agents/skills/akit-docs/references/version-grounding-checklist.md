# High-Risk Framework Version Drift & Grounding Reference (`akit-docs`)

Use this reference to catch common LLM training-data version hallucinations across popular ecosystems (inspired by `upstash/context7`).

---

## 1. Common Version-Drift Hallucination Traps

| Library / Framework | Legacy Pattern (Often Hallucinated by LLMs) | Modern Version-Matched Pattern | How to Verify Locally |
| :--- | :--- | :--- | :--- |
| **Next.js 15+ (App Router)** | Synchronous `params.id`, `searchParams.q`, `cookies()`, `headers()` | `params`, `searchParams`, `cookies()`, and `headers()` are **async Promises** (`const { id } = await params`) | Check `next` version in `package.json` & `.next/types` |
| **React 19** | `React.forwardRef(...)` boilerplate everywhere; `useFormState` from `react-dom` | `ref` passed as a standard prop; `useActionState` imported from `'react'` | Check `react` & `@types/react` version |
| **Tailwind CSS v4** | `tailwind.config.js` + `@tailwind base; @tailwind components; @tailwind utilities;` | `@import "tailwindcss";` + CSS-first `@theme { ... }` configuration | Check `tailwindcss` version in `package.json` |
| **Pydantic v2 (Python)** | `.dict()`, `.parse_obj()`, `class Config:`, `@validator` | `.model_dump()`, `.model_validate()`, `model_config = ConfigDict(...)`, `@field_validator` | Check `pydantic` version in `pyproject.toml` |
| **SQLAlchemy 2.0 (Python)** | `session.query(User).filter_by(...)` legacy 1.x API | `select(User).where(...)` with `session.scalars(stmt)` | Check `sqlalchemy` version |
| **Prisma 5/6** | Deprecated middleware `$use` | Client extensions `$extends({...})` | Check `prisma` version & generated `.prisma/client/index.d.ts` |
| **Zod v3.23+ / v4** | Hallucinated validator chains | Inspect `node_modules/zod/index.d.ts` for exact method signatures | Run `tsc --noEmit` |

---

## 2. Offline & Local Type-Inspection Playbook

Even without internet or Context7 MCP, you can verify 100% accurate API signatures directly from installed packages:

```powershell
# TypeScript / Node.js: Search exported declarations in installed package .d.ts
rg -n "export (function|interface|type|class)" node_modules/<package-name>/

# Python: Inspect exact function signature & docstring via python -c
python -c "import inspect, pydantic; print(inspect.signature(pydantic.BaseModel.model_dump))"
```

---

## 3. Version-Grounded Output Note Template

```markdown
### API & Version Grounding Note
- **Package & Installed Version:** `[e.g., next@15.2.1 (verified in pnpm-lock.yaml)]`
- **Verification Source:** `[Local node_modules/next/types | Context7 MCP | Official Docs URL]`
- **Verified Signature & Breaking Changes Handled:** `[e.g., Awaited async params and cookies() per Next.js 15 contract]`
- **Compiler / Test Proof:** `[pnpm typecheck -> Exit 0]`
```
