"""Record real command-based verification evidence locally with secret redaction; never claim synthetic passes."""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

SECRET_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----"), "[REDACTED_PRIVATE_KEY]"),
    (re.compile(r"\b(Bearer\s+)[A-Za-z0-9\-._~+/]+=*", re.IGNORECASE), r"\1[REDACTED_TOKEN]"),
    (re.compile(r"\b(?:sk-[A-Za-z0-9\-_]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9\-]{10,})\b"), "[REDACTED_SECRET]"),
    (re.compile(r"((?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis)://[^:\s/]+:)[^@\s]+(@)", re.IGNORECASE), r"\1[REDACTED_PASSWORD]\2"),
    (re.compile(r"\b((?:[A-Z0-9_]*?(?:API_KEY|SECRET|PASSWORD|PASSWD|TOKEN|PRIVATE_KEY|ACCESS_KEY))\s*[:=]\s*['\"]?)([^\s'\"\n]+)", re.IGNORECASE), r"\1[REDACTED_SECRET]"),
)


def redact_secrets(text: str) -> str:
    """Redact common API keys, bearer tokens, private keys, and DB URI passwords from command logs."""
    redacted = text
    for pattern, replacement in SECRET_PATTERNS:
        redacted = pattern.sub(replacement, redacted)
    return redacted


def _detect_git_head_sha(project: Path) -> str | None:
    try:
        proc = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=project,
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
        sha = (proc.stdout or "").strip()
        if proc.returncode == 0 and re.fullmatch(r"[0-9a-f]{7,40}", sha):
            return sha
    except OSError:
        pass
    return None


def run_checks(project: Path, command: list[str], output: Path, timeout: int = 180) -> dict:
    if not command or any(not x for x in command):
        raise ValueError("Expected explicit executable and arguments")
    if not (1 <= timeout <= 900):
        raise ValueError("Timeout out of bounds")
    project = project.resolve()
    if not project.is_dir():
        raise FileNotFoundError(project)
    if output.is_symlink():
        raise ValueError("Refusing symlinked output")
    started = datetime.now(timezone.utc).isoformat()
    try:
        proc = subprocess.run(
            command,
            cwd=project,
            capture_output=True,
            text=True,
            timeout=timeout,
            errors="replace",
            check=False,
        )
        status = "passed" if proc.returncode == 0 else "failed"
        exit_code = proc.returncode
        raw_stdout, raw_stderr = proc.stdout or "", proc.stderr or ""
        stdout = redact_secrets(raw_stdout[-8000:])
        stderr = redact_secrets(raw_stderr[-8000:])
    except subprocess.TimeoutExpired:
        status, exit_code = "timeout", None
        raw_stdout, raw_stderr = "", f"Timed out after {timeout} seconds"
        stdout, stderr = "", raw_stderr
    result = {
        "schema_version": "1.0",
        "kind": "command_execution_evidence",
        "command": command,
        "cwd": str(project),
        "head_sha": _detect_git_head_sha(project),
        "started_utc": started,
        "finished_utc": datetime.now(timezone.utc).isoformat(),
        "status": status,
        "exit_code": exit_code,
        "stdout_sha256": hashlib.sha256(raw_stdout.encode("utf-8", errors="replace")).hexdigest(),
        "stderr_sha256": hashlib.sha256(raw_stderr.encode("utf-8", errors="replace")).hexdigest(),
        "stdout_tail": stdout,
        "stderr_tail": stderr,
        "disclaimer": "A passing command is only evidence for this check, not a security or production guarantee.",
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Run an explicitly supplied local verification command and write evidence")
    parser.add_argument("--project", type=Path, default=Path.cwd())
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--timeout", type=int, default=180)
    parser.add_argument("command", nargs=argparse.REMAINDER, help="Command after --, e.g. -- python -m unittest discover")
    args = parser.parse_args()
    command = args.command[1:] if args.command and args.command[0] == "--" else args.command
    if not command:
        parser.error("Specify command after --")
    result = run_checks(args.project, command, args.out, args.timeout)
    print(json.dumps({"status": result["status"], "exit_code": result["exit_code"], "evidence": str(args.out)}))
    if result["status"] != "passed":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
