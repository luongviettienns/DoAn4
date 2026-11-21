# AKit Skill Evaluation Report Template (`akit-eval`)

Complete this report using real command outputs and recorded observations before claiming a skill creation or upgrade improved agent behavior.

---

```markdown
# Skill Evaluation Report: `[akit-<skill-name>]` (`v0.4.0`)

## 1. Metadata & Environment
- **Evaluated Skill & Hash:** `[skills/akit-<name>/SKILL.md]` (`SHA-256: ...`)
- **Runtime & Model:** `[e.g., Google Antigravity / OpenAI Codex + Model Name]`
- **Evaluation Date:** `[YYYY-MM-DD]`
- **Static Doctor Check (`python -m akit.doctor`):** `[PASS / FAIL + findings]`

---

## 2. Tier 2: Offline Skill Activation Benchmark (`akit.eval`)
- **Benchmark File:** `skills/akit-eval/references/activation-cases.jsonl` (20 cases)
- **Observations File:** `[path/to/observations.jsonl]`
- **Command Executed:**
  `python -m akit.eval --cases skills/akit-eval/references/activation-cases.jsonl --observations <file>`

| Metric | Observed Value | Target Threshold | Status |
| :--- | :--- | :--- | :--- |
| **Coverage** | `[0.00 - 1.00]` | `1.00` (for full release) | `[PASS / PARTIAL]` |
| **Precision** | `[0.00 - 1.00]` | `>= 0.85` (low false-positive bloat) | `[PASS / FAIL]` |
| **Recall** | `[0.00 - 1.00]` | `>= 0.90` (high trigger reliability) | `[PASS / FAIL]` |
| **F1 Score** | `[0.00 - 1.00]` | `>= 0.88` | `[PASS / FAIL]` |

- **False Positives Observed:** `[List case IDs and why description over-triggered]`
- **False Negatives Observed:** `[List case IDs and missing trigger keywords]`

---

## 3. Tier 3: Controlled Behavioral & Pressure A/B Comparison

| Scenario ID & Pressure Type | Control (Without Skill) Outcome | Treatment (With Skill) Outcome | Acceptance Suite Exit Code (`Control` vs `Treatment`) |
| :--- | :--- | :--- | :--- |
| **Case 1 (Standard Application)** | `[Exact failure or shortcut taken]` | `[Observed compliance & output shape]` | `Exit 1` vs `Exit 0` |
| **Case 2 (Time + Sunk Cost Pressure)** | `[Rationalization verbatim]` | `[Followed Red-Flag counter]` | `Exit 1` vs `Exit 0` |
| **Case 3 (Edge Case / Negative)** | `[Behavior]` | `[Behavior]` | `Exit 0` vs `Exit 0` |

---

## 4. Token Cost, Limitations & Release Verdict
- **Skill Token Footprint:** `[Word count / byte size of SKILL.md]`
- **Unverified Claims & Caveats:** `[State clearly what was not live-tested]`
- **Final Decision:** `[SHIP | REVISE DESCRIPTION | REVISE PLAYBOOK | REJECT]`
```
