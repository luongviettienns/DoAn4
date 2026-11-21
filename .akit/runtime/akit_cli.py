"""Project-local AKit command runner (standard library only)."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from akit import arena, eval, doctor, checks
COMMANDS = {"arena": arena.main, "eval": eval.main, "doctor": doctor.main, "checks": checks.main}
if len(sys.argv) < 2 or sys.argv[1] not in COMMANDS:
    raise SystemExit("Usage: python .akit/runtime/akit_cli.py [arena|eval|doctor|checks] ...")
command = sys.argv.pop(1)
COMMANDS[command]()
