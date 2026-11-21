# Backward Root-Cause Tracing, 4-Layer Defense-in-Depth & Condition-Based Waiting (`obra/superpowers`)

## 1. Backward Root-Cause Tracing (`root-cause-tracing.md`)
Bugs often manifest deep in the call stack (e.g., `git init` running inside the source repo, a database query failing on an empty `tenantId`, or a file written to the wrong path). Fixing where the error surfaces only masks the symptom.

### The 5-Step Backward Trace Protocol
1. **Observe the Symptom:** Record the exact error message and failing line.
2. **Identify the Immediate Cause:** Which function call directly failed, and what argument value was passed to it? (e.g., `cwd = ""` which resolved to `process.cwd()`).
3. **Trace One Level Up:** Who called that function with the invalid value?
4. **Keep Tracing Up the Call Chain:** Walk backward through callers until you find the **original trigger** where valid/uninitialized state turned into invalid state (e.g., a test accessing `context.tempDir` before `beforeEach` ran).
5. **Stack Trace Instrumentation (When Static Tracing Is Ambiguous):**
   - Log **before** the dangerous operation using `console.error()` (in tests, loggers are often suppressed) along with `new Error().stack`, `cwd`, and relevant parameters.
   - Remove temporary debug instrumentation once the root cause is confirmed and tested.

---

## 2. 4-Layer Defense-in-Depth Validation (`defense-in-depth.md`)
Adding a check at a single point says *"We fixed the bug."* Adding validation across all 4 layers says *"We made the bug structurally impossible"* (even when mocks or future refactors bypass one layer):

| Layer | Responsibility | Concrete Example |
| :--- | :--- | :--- |
| **Layer 1: Entry Point Validation** | Reject obviously invalid input at the public API / controller / constructor boundary. | Throw immediately if `workingDirectory.trim() === ""` or path does not exist. |
| **Layer 2: Business Logic Validation** | Ensure data invariants make sense for the specific domain operation. | `WorkspaceManager.initialize()` verifies `projectDir` and `sessionId` are non-empty before proceeding. |
| **Layer 3: Environment & Safety Guards** | Prevent dangerous operations in specific runtime contexts (`NODE_ENV === "test"` / `CI`). | Refuse destructive operations (`git init`, `rm -rf`, DB truncate) outside `os.tmpdir()` during test runs. |
| **Layer 4: Structured Forensics / Telemetry** | Capture structured context (`akit-observability`) right before high-risk operations. | Structured debug log with caller context before executing subprocess or migration commands. |

---

## 3. Condition-Based Waiting vs. Arbitrary Sleeps (`condition-based-waiting.md`)
Flaky tests and race-condition patches often guess at timing with `setTimeout(r, 200)` or `time.sleep(0.5)`. These pass on a fast laptop and fail under CI load.

### Core Rule: Wait for the Condition, Never Guess the Duration
Replace arbitrary delays with a bounded polling helper (`waitFor`):

```typescript
async function waitFor<T>(
  condition: () => T | undefined | null | false,
  description: string,
  timeoutMs = 5000
): Promise<T> {
  const start = Date.now();
  while (true) {
    const value = condition();
    if (value) return value;
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timeout waiting for ${description} after ${timeoutMs}ms`);
    }
    await new Promise((r) => setTimeout(r, 10)); // Poll every 10ms
  }
}
```

- **When an arbitrary timeout IS justified:** Only when testing actual timed behavior (debounce, throttle, heartbeat tick intervals). Even then: (1) first `waitFor` the starting condition, (2) wait the exact known tick multiple, and (3) add a comment explaining **why** the duration is deterministic.
