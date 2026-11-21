# Andrej Karpathy's 4 Laws — Code & Behavioral Evaluation Rubric (`multica-ai/andrej-karpathy-skills`)

## Overview
To overcome the limitation where skill evaluations only measure *which skill was selected* rather than *actual code output quality*, AKit integrates the 4 foundational laws from **`multica-ai/andrej-karpathy-skills`** into both an automated diff/evidence scorer (`python -m akit.eval --mode karpathy`) and a 100-point behavioral review rubric.

---

## 1. The 4 Karpathy Laws & 100-Point Scoring Rubric

| Law | Core Mandate | Automated & Behavioral Checks (25 pts each) | Common AI Failure Mode ("LLM Slop") |
| :--- | :--- | :--- | :--- |
| **Law 1: Think Before Coding** *(25 pts)* | *"Don't assume. Don't hide confusion. Surface tradeoffs."* | - Were assumptions and multiple interpretations stated upfront before editing files?<br>- For unfamiliar features, was `akit-prior-art` executed to compare 2–3 GitHub OSS projects?<br>- Did the agent push back when a simpler path existed? | Silently picking one interpretation of an ambiguous prompt and scaffolding 10 files in the wrong direction. |
| **Law 2: Simplicity First** *(25 pts)* | *"Minimum code that solves the problem. Nothing speculative."* | - **Bloat Gate:** Added lines stay within `max_added_lines` threshold.<br>- **Zero Single-Use Abstractions:** No `Abstract*Factory`, `*FactoryManager`, or `*Strategy` interfaces for a single implementation.<br>- **No Speculative Placeholders:** Zero `TODO`, `FIXME`, or `HACK` comments left in new code.<br>- **Senior Engineer Test:** If 200 lines could be 50 lines, rewrite it (`akit-simplify`). | Creating a 4-class factory hierarchy, configurable retry plugin system, and unrequested feature flags for a 15-line requirement. |
| **Law 3: Surgical Changes** *(25 pts)* | *"Touch only what you must. Clean up only your own mess."* | - **Traceability Gate:** Every modified file belongs to `allowed_files`; zero out-of-scope files touched.<br>- **No Adjacent Churn:** Zero unrequested reformatting, comment deletion, or style rewrites in untouched lines.<br>- **Clean Your Own Mess:** Remove unused imports/variables introduced by your diff, and leave zero `console.log` / `debugger` / `pdb.set_trace()` statements. | Reformatting 300 untouched lines, renaming existing working helpers, or leaving debug `console.log` statements in the diff. |
| **Law 4: Goal-Driven Execution** *(25 pts)* | *"Define success criteria. Loop until verified."* | - Imperative requests (*"fix the bug"*, *"add validation"*) are converted into `[Step] -> verify: [test command]` loops.<br>- Diff includes test/spec updates (`test_*`, `*.spec.*`, `*.test.*`).<br>- Machine-recorded verification evidence (`.akit/evidence.json` via `akit.checks`) shows `status: "passed"` and `exit_code: 0`. | Writing production code without a failing test, skipping test execution, and declaring *"Done! Everything should work now."* |

---

## 2. Running the Automated Karpathy Diff & Evidence Scorer

After completing any implementation task (`akit-implement` + `akit-simplify`), capture the git diff and test evidence and run `akit.eval --mode karpathy`:

```powershell
# 1. Record machine-verifiable test execution evidence
python -m akit.checks --out .akit/evidence.json -- python -m unittest discover -s tests

# 2. Save current task diff
git diff BASE_SHA..HEAD_SHA > .akit/task.diff

# 3. Score the diff + test evidence against Karpathy's 4 Laws
python -m akit.eval --mode karpathy `
  --diff-file .akit/task.diff `
  --evidence .akit/evidence.json `
  --allowed-files src/auth.py tests/test_auth.py `
  --assumptions-stated `
  --max-added-lines 120
```

### Pass Threshold
- A task passes the Karpathy Quality Gate only when:
  1. `total_score >= 80` (out of 100), **AND**
  2. Zero violations exist under **Law 4 (`Goal-Driven Execution`)** (tests must exist and pass with `exit_code == 0`).
