---
name: akit-eval
description: Use when evaluating whether an Agent Skill, prompt modification, or code diff measurably improves activation accuracy, adheres to Andrej Karpathy's 4 coding laws, and passes behavioral verification before shipping.
---
# AKit Eval — Skill Activation & Karpathy 4-Laws Code Quality Evaluator

## Overview
`akit-eval` provides an empirical evaluation harness for both **Skill Routing Accuracy** and **Code/Diff Output Quality**, combining:
1. **`multica-ai/andrej-karpathy-skills`:** Automated & behavioral scoring of real code diffs against Andrej Karpathy's 4 Laws (`Think Before Coding`, `Simplicity First`, `Surgical Changes`, `Goal-Driven Execution`).
2. **`anthropics/skills` (`skill-creator`) & `obra/superpowers` (`writing-skills`):** Controlled A/B behavioral evaluations and offline activation F1 scoring (`akit/eval.py`).

**Core principle:** Measure both *routing precision* (`--mode activation`) and *code execution discipline* (`--mode karpathy`). Never claim quality without machine-recorded diff and test evidence.

---

## Four-Tier Evaluation Architecture
- **Do not use when:** You are still in early requirement clarification (`akit-requirements`) and no diff, check log, or benchmark observation exists yet.

| Tier | What It Measures | Tool / Mechanism | Cost & Speed |
| :--- | :--- | :--- | :--- |
| **Tier 1: Static & Integrity Check** | Frontmatter validity, SHA-256 manifest match, reference link existence | `python -m akit.doctor --project .` | Instant, zero tokens |
| **Tier 2: Offline Activation Eval** | Precision, recall, F1, and coverage of skill selection against ground-truth prompts | `python -m akit.eval --mode activation --cases skills/akit-eval/references/activation-cases.jsonl --observations obs.jsonl` | Instant on recorded JSONL |
| **Tier 3: Karpathy 4-Laws Diff & Evidence Eval** | Heuristic supporting check of a git diff + test evidence across `Think Before Coding`, `Simplicity First`, `Surgical Changes`, and `Goal-Driven Execution` (`is_heuristic: true`) | `python -m akit.eval --mode karpathy --diff-file .akit/task.diff --evidence .akit/evidence.json --allowed-files ...` | Instant, heuristic diff + test audit |
| **Tier 3.5: Fail-Closed 6 Hard Engineering Gates & 100% Test Pass Eval** | Enforces fail-closed `Strict Type Safety` (`any` ban without `APPROVED-ANY:`, TS strict + ESLint), `Multi-tenant Security` (executed cross-account integration test evidence, never regex-only), `Business Invariants` (explicit evidence required), `Safe Database Operations` (explicit 4-point DB evidence required), `Independent Review` (verified `head_sha` & `diff_sha256` provenance), and `Evidence-based Completion` (`total_tests > 0`, 100% pass rate, exit code `1` on any fail/unverified gate, exit code `2` on invalid input) | `python -m akit.eval --mode gates --diff-file .akit/task.diff --evidence .akit/evidence.json --db-evidence .akit/db.json --invariants-evidence .akit/inv.json --cross-tenant-evidence .akit/ct.json --review-evidence .akit/rev.json --git-evidence .akit/git.json --report-md` | Instant, deterministic fail-closed gate |
| **Tier 4: Blind A/B Subagent Eval** | Controlled A/B comparison (Without-Skill Baseline vs. With-Skill) on real tasks & pressure scenarios | Isolated subagents / worktrees (`invoke_subagent`) + `references/evaluation-report.template.md` | High signal; consumes real model tokens |

---

## Antigravity Native Tool Mapping
1. **Run Static & Unit Verification (`run_command`):**
   ```powershell
   python -m unittest discover -s tests -v
   python -m akit.doctor --project .
   ```
2. **Run Karpathy 4-Laws Diff & Evidence Scoring (`run_command`):**
   ```powershell
   python -m akit.eval --mode karpathy --diff-file .akit/task.diff --evidence .akit/evidence.json --allowed-files src/app.py tests/test_app.py --assumptions-stated
   ```
   See `references/karpathy-4-laws-eval-rubric.md` for the full 100-point breakdown (`Think Before Coding`, `Simplicity First`, `Surgical Changes`, `Goal-Driven Execution`).
3. **Run Offline Activation Scoring (`run_command`):**
   ```powershell
   python -m akit.eval --mode activation --cases skills/akit-eval/references/activation-cases.jsonl --observations .akit/runs/observations.jsonl
   ```
4. **Run Blind A/B Subagent Trials (`invoke_subagent`):**
   - When authorized, run the same task and independent checks with and without the skill. In Codex use separate equivalent workspaces and capture real diff, test results and usage. Use `--mode karpathy` as a supporting heuristic.
   - From the AKit source checkout, `akit.benchmark_ab` runs an offline routing simulation. Its fixture matches cannot establish execution quality, token usage or sandbox enforcement.

---

## Step-by-Step Evaluation Workflow

### Step 1: Execute Tier 1 Static & Structural Gate
1. Verify every modified skill has valid `name` and `description` frontmatter (`akit-skillforge`).
2. Confirm all referenced files in `references/` exist and have substantive content (`akit.doctor`).
3. Run the automated unit test suite (`python -m unittest discover -s tests -v`).

### Step 2: Execute Tier 3 Karpathy 4-Laws Code & Diff Audit (`references/karpathy-4-laws-eval-rubric.md`)
For every implementation diff, verify:
1. **Think Before Coding (25 pts):** Assumptions and tradeoffs were surfaced explicitly (`--assumptions-stated`).
2. **Simplicity First (25 pts):** Net added lines stay within budget; zero single-use `Abstract*Factory` / `*FactoryManager` classes; zero speculative `TODO`/`FIXME` placeholders.
3. **Surgical Changes (25 pts):** Every touched file is in `--allowed-files`; zero unrelated file churn or leftover `console.log`/`debugger` statements.
4. **Goal-Driven Execution (25 pts):** Diff includes test updates and `.akit/evidence.json` proves `status == "passed"` and `exit_code == 0`.

### Step 3: Curate & Score Tier 2 Activation Cases (`references/activation-cases.jsonl`)
1. Record real agent skill-selection observations in JSONL format (`{"id": "auth_01", "selected": ["akit-security"]}`).
2. Run `python -m akit.eval --mode activation` to inspect Precision, Recall, F1, and Coverage.

---

## Red Flags & Rationalization Counter-Table

| Common Excuse / Rationalization | Engineering Reality & Mandatory Action |
| :--- | :--- |
| *"I'll generate fake `observations.jsonl` or fake `.akit/evidence.json` entries so `akit.eval` reports 100."* | **Scientific fraud.** Never fabricate observation records or test evidence. Run `python -m akit.checks` to generate real command evidence. |
| *"The diff touched 4 unrelated files and added a FactoryManager, but the tests pass."* | Fails Karpathy Law 2 (`Simplicity First`) and Law 3 (`Surgical Changes`). Run `akit-simplify` and revert out-of-scope file edits before finishing. |
| *"I only tested positive prompts where the skill should trigger."* | Without negative prompts (e.g., `short_11` one-character typo), overly broad descriptions will trigger on every turn and waste context. |

---

## Safety & Exit Gates
- Never claim empirical quality improvements without recorded diff/test evidence (`--mode karpathy`) or A/B test results (`references/evaluation-report.template.md`).
- Keep all evaluation artifacts and observation logs free of secrets and customer PII.

## Reference Materials & Attribution
- Andrej Karpathy's 4 Laws 100-point rubric & CLI guide: `references/karpathy-4-laws-eval-rubric.md`
- Offline activation fixture: `references/activation-cases.jsonl`
- Structured A/B evaluation report template: `references/evaluation-report.template.md`
- Inspired by `multica-ai/andrej-karpathy-skills`, `anthropics/skills` (`skill-creator`), and `obra/superpowers` (`writing-skills`). Original AKit instructions.
