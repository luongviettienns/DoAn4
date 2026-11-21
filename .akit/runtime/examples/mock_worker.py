"""TEST ONLY: synthetic deterministic worker; NOT an AI worker.

Protocol: stdin is a JSON task, stdout is JSON {"text": "response"}.
Use this solely to verify orchestration. Not suitable for real decisions.
"""
import json
import sys

req = json.load(sys.stdin)
role = req["role"]
if role == "propose":
    result = f"Synthetic approach by {req['candidate']}: {req['strategy']} Test-only content."
elif role in ("attack", "challenge"):
    result = "Synthetic review: document potential negative input, authorization and rollback failures."
elif role == "revise":
    result = req["own_solution"] + " Revised with test cases and rollback."
elif role == "synthesize":
    result = (
        "Synthesized Decision Contract: adopt proposer core architecture with challenger's "
        "authorization boundary checks and rollback verification."
    )
elif role == "judge":
    score = {"correctness": 20, "completeness": 20, "robustness": 15, "specificity": 10, "clarity": 8}
    result = json.dumps({"a": {"scores": score, "fatal_flaw": False, "fatal_evidence": ""},
                         "b": {"scores": score, "fatal_flaw": False, "fatal_evidence": ""},
                         "reason": "TIE - Synthetic judge for orchestration tests only."})
else:
    raise SystemExit("Unknown role")
print(json.dumps({"text": result}))
