# AKit Arena Rubric, Call Budget & Protocol Reference (`akit-arena`)

Use this reference when executing or auditing an AKit Arena tournament session (`akit/arena.py`).

---

## 1. Call Budget & Candidate Scaling Table

Every bracket match between two candidates requires **5 tasks**:
- 2 `attack` tasks (`attack:rX-mY:a`, `attack:rX-mY:b`)
- 2 `revise` tasks (`revise:rX-mY:a`, `revise:rX-mY:b`)
- 1 `judge` task (`judge:rX-mY`)

Because each match eliminates exactly 1 candidate, an $N$-candidate single-elimination tournament has $N - 1$ matches:
$$\text{Total Calls} = N_{\text{propose}} + 5 \times (N - 1)$$

| Candidates ($N$) | Propose Calls | Bracket Matches ($N-1$) | Match Calls ($5(N-1)$) | Total Calls | Fits Default `--max-calls 25`? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **2** | 2 | 1 | 5 | **7** | Yes |
| **3** (1 bye) | 3 | 2 | 10 | **13** | Yes |
| **4** | 4 | 3 | 15 | **19** | Yes (Recommended max for routine architecture) |
| **8** | 8 | 7 | 35 | **43** | No (Requires explicit `--max-calls 45` & user approval) |
| **16** | 16 | 15 | 75 | **91** | No (Requires explicit user quota approval) |

---

## 2. 100-Point Judge Rubric Specification

| Dimension | Max Points | Scoring Criteria |
| :--- | :--- | :--- |
| **`correctness`** | **30** | Solves the exact task statement; obeys all constraints; contains no logical bugs, race conditions, or broken invariants. |
| **`completeness`** | **25** | Addresses happy path, boundary/error states, migration/rollback strategy, and concrete acceptance tests. |
| **`robustness`** | **20** | Resilient under invalid input, partial dependency failure, concurrency, and security trust boundaries. |
| **`specificity`** | **15** | Names concrete files, modules, SQL/API schemas, and verification commands rather than generic prose. |
| **`clarity`** | **10** | Clean separation of concerns, minimal moving parts, easy for engineers to maintain and review. |

---

## 3. Strict Judge JSON Schema (`judge:rX-mY`)

When submitting a response for any `judge:*` task ID, the file passed to `arena submit` MUST be valid JSON with the exact keys below:

```json
{
  "a": {
    "scores": {
      "correctness": 26,
      "completeness": 22,
      "robustness": 17,
      "specificity": 13,
      "clarity": 9
    },
    "fatal_flaw": false,
    "fatal_evidence": ""
  },
  "b": {
    "scores": {
      "correctness": 18,
      "completeness": 20,
      "robustness": 10,
      "specificity": 12,
      "clarity": 8
    },
    "fatal_flaw": true,
    "fatal_evidence": "Candidate B executes unparameterized tenant filtering in raw SQL, allowing cross-tenant data leakage when tenantId contains quotes."
  },
  "reason": "Candidate A enforces parameterized PostgreSQL RLS policies with transaction-scoped context and provides a reversible migration, whereas Candidate B has a reproducible cross-tenant injection flaw."
}
```

### Validation Rules Enforced by `akit.arena.validate_judgment`
1. `a` and `b` must both be objects containing `scores`, `fatal_flaw` (boolean), and `fatal_evidence` (string).
2. `scores` must have the exact 5 keys (`correctness`, `completeness`, `robustness`, `specificity`, `clarity`) with numeric values within `0..limit`.
3. If `fatal_flaw` is `true`, `fatal_evidence` **must be a non-empty string** describing the reproducible counterexample.
4. `reason` must be a non-empty string comparing both solutions on concrete evidence.
