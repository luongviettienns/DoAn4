"""Read-only validator of a locally installed AKit project."""
from __future__ import annotations
import argparse
import hashlib
import json
import re
from pathlib import Path

try:
    from tomllib import loads as load_toml
except ImportError:  # Python 3.9/3.10: check the keys of AKit's standalone templates.
    load_toml = None

from .install import (
    PATHS,
    AGENT_PATHS,
    HOOK_PATHS,
    AKIT_RULE_START,
    AKIT_RULE_END,
    digest_dir,
)

REF_PATTERN = re.compile(r"references/[A-Za-z0-9_.\-]+\.(?:md|jsonl)")
CODEX_SKILL_REF = re.compile(r"\.agents/skills/(akit-[a-z0-9-]+)/SKILL\.md")
CODEX_AGENT_KEYS = {"name", "description", "developer_instructions"}
CODEX_INHERITED_KEYS = {"sandbox_mode", "approval_policy", "allowed_tools", "disallowed_tools"}
ANTIGRAVITY_REQUIRED_TOOLS = ("- view_file", "- grep_search", "- list_dir", "- find_by_name")
ANTIGRAVITY_REQUIRED_DISALLOWED = (
    "- write_to_file",
    "- replace_file_content",
    "- multi_replace_file_content",
    "- write_file",
    "- edit_file",
    "- run_command",
)


def _antigravity_agent_issue(path: Path) -> str | None:
    body = path.read_text(encoding="utf-8")
    if not body.startswith("---\n") or "\n---\n" not in body[4:]:
        return "missing YAML frontmatter"
    frontmatter = body.split("---", 2)[1]
    for required_field in ("subagent: true", "mainAgent: false", "commandExecutionPolicy: off"):
        if required_field not in frontmatter:
            return f"missing {required_field}"
    if "disallowedTools:" not in frontmatter:
        return "missing disallowedTools section"
    tools_section, disallowed_section = frontmatter.split("disallowedTools:", 1)
    if "- read_file" in tools_section or any(t not in tools_section for t in ANTIGRAVITY_REQUIRED_TOOLS):
        return "invalid tool allowlist (must use view_file and grep_search, not read_file)"
    if any(t not in disallowed_section for t in ANTIGRAVITY_REQUIRED_DISALLOWED):
        return "missing required write/exec tools in disallowedTools"
    return None


def _codex_agent_issue(path: Path) -> str | None:
    body = path.read_text(encoding="utf-8")
    if load_toml is not None:
        try:
            data = load_toml(body)
        except ValueError:
            return "invalid TOML"
        keys = data.keys()
        if any(not isinstance(data.get(k), str) or not data[k].strip() for k in CODEX_AGENT_KEYS):
            return "expected nonempty name, description and developer_instructions"
    else:
        without_strings = re.sub(r'""".*?"""', '""', body, flags=re.DOTALL)
        keys = set(re.findall(r"(?m)^\s*([a-z_]+)\s*=", without_strings))
        if not CODEX_AGENT_KEYS.issubset(keys):
            return "missing name, description or developer_instructions"
    unsupported = CODEX_INHERITED_KEYS.intersection(keys)
    if unsupported:
        return f"unsupported permission keys ({', '.join(sorted(unsupported))}); roles inherit session permissions"
    return None


def _validate_hooks_schema(target: str, hdata: object) -> bool:
    if not isinstance(hdata, dict) or not hdata:
        return False
    if target == "antigravity":
        # Official Antigravity hooks.json: top-level keys are hook names mapping to event configs
        if "hooks" in hdata and isinstance(hdata.get("hooks"), dict):
            return True
        for val in hdata.values():
            if isinstance(val, dict) and any(k in val for k in ("PreToolUse", "PostToolUse", "Stop", "SessionStart", "PreInvocation", "PostInvocation")):
                stop_handlers = val.get("Stop", [])
                if isinstance(stop_handlers, list) and any(isinstance(s, dict) and "matcher" in s for s in stop_handlers):
                    return False
                return True
        return False
    return "hooks" in hdata and isinstance(hdata.get("hooks"), dict)


def check(project: Path, strict: bool = False) -> dict:
    project = project.resolve()
    manifest_path = project / ".akit" / "AKIT_INSTALL.json"
    findings: list[str] = []
    if not manifest_path.is_file():
        return {"ok": False, "findings": ["AKIT_INSTALL.json not found; reinstall v0.2+ with installer"]}
    manifest: dict = {}
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        if not isinstance(manifest, dict):
            raise ValueError("Expected an object")
        target = manifest["target"]
        if target not in PATHS:
            raise ValueError("Unknown target")
        for name, expected in manifest["skills"].items():
            path = project / PATHS[target] / name
            if not path.is_dir() or path.is_symlink():
                findings.append(f"Missing or unsafe skill: {name}")
                continue
            if digest_dir(path) != expected:
                findings.append(f"Locally changed skill: {name}")
            skill_md = path / "SKILL.md"
            if not skill_md.is_file():
                findings.append(f"Missing SKILL.md: {name}")
                continue
            body = skill_md.read_text(encoding="utf-8")
            if not body.startswith(f"---\nname: {name}\n"):
                findings.append(f"Invalid SKILL.md frontmatter: {name}")
            if (path / "references").is_dir():
                for ref in sorted(set(REF_PATTERN.findall(body))):
                    if not (path / ref).is_file():
                        findings.append(f"Missing referenced file {ref} in skill {name}")

        target_states = manifest.get("target_states")
        if isinstance(target_states, dict) and target_states:
            for tgt, state in target_states.items():
                if tgt in AGENT_PATHS and isinstance(state, dict):
                    for name, expected_hash in state.get("agents", {}).items():
                        fp = project / AGENT_PATHS[tgt] / name
                        if not fp.is_file() or fp.is_symlink() or hashlib.sha256(fp.read_bytes()).hexdigest() != expected_hash:
                            findings.append(f"Custom agent missing or changed: {name}")
                        elif strict and tgt == "antigravity":
                            issue = _antigravity_agent_issue(fp)
                            if issue:
                                findings.append(f"Antigravity agent {name}: {issue}")
                        elif strict and tgt == "codex":
                            issue = _codex_agent_issue(fp)
                            if issue:
                                findings.append(f"Codex agent {name}: {issue}")
                if strict and isinstance(state, dict):
                    for rule_rel in state.get("auto_rules", []):
                        rule_fp = project / rule_rel
                        if not rule_fp.is_file() or rule_fp.is_symlink():
                            findings.append(f"Missing or symlinked auto_rules file: {rule_rel}")
                        else:
                            rule_text = rule_fp.read_text(encoding="utf-8")
                            if AKIT_RULE_START not in rule_text or AKIT_RULE_END not in rule_text:
                                findings.append(f"Managed block missing in auto_rules file: {rule_rel}")
                            elif tgt == "codex" and rule_rel == "AGENTS.md":
                                block = rule_text.split(AKIT_RULE_START, 1)[1].split(AKIT_RULE_END, 1)[0]
                                for skill in sorted(set(CODEX_SKILL_REF.findall(block))):
                                    if not (project / PATHS[tgt] / skill / "SKILL.md").is_file():
                                        findings.append(f"AGENTS.md references missing Codex skill: {skill}")
                            elif tgt == "antigravity" and rule_rel == "GEMINI.md":
                                block = rule_text.split(AKIT_RULE_START, 1)[1].split(AKIT_RULE_END, 1)[0]
                                for skill in sorted(set(CODEX_SKILL_REF.findall(block))):
                                    if not (project / PATHS[tgt] / skill / "SKILL.md").is_file():
                                        findings.append(f"GEMINI.md references missing Antigravity skill: {skill}")
                    if tgt in HOOK_PATHS and state.get("hooks") in ("installed", "exists"):
                        hook_fp = project / HOOK_PATHS[tgt][0]
                        if not hook_fp.is_file() or hook_fp.is_symlink():
                            findings.append(f"Missing or symlinked hooks file: {HOOK_PATHS[tgt][0]}")
                        else:
                            try:
                                hdata = json.loads(hook_fp.read_text(encoding="utf-8"))
                                if not _validate_hooks_schema(tgt, hdata):
                                    findings.append(f"Invalid hooks schema in {HOOK_PATHS[tgt][0]}")
                            except ValueError:
                                findings.append(f"Malformed JSON in hooks file {HOOK_PATHS[tgt][0]}")
        elif target in AGENT_PATHS:
            for name, expected_hash in manifest.get("agents", {}).items():
                if name.endswith(".toml"):
                    agent_target = "codex"
                elif target == "claude-code":
                    agent_target = "claude-code"
                else:
                    agent_target = "antigravity"
                fp = project / AGENT_PATHS[agent_target] / name
                if not fp.is_file() or fp.is_symlink() or hashlib.sha256(fp.read_bytes()).hexdigest() != expected_hash:
                    findings.append(f"Custom agent missing or changed: {name}")
                elif strict and agent_target == "antigravity":
                    issue = _antigravity_agent_issue(fp)
                    if issue:
                        findings.append(f"Antigravity agent {name}: {issue}")
                elif strict and agent_target == "codex":
                    issue = _codex_agent_issue(fp)
                    if issue:
                        findings.append(f"Codex agent {name}: {issue}")

        expected = manifest.get("runtime")
        rt = project / ".akit" / "runtime"
        if expected and (not rt.is_dir() or rt.is_symlink() or digest_dir(rt) != expected):
            findings.append("Runtime missing or changed")
    except (ValueError, KeyError, OSError, TypeError) as exc:
        findings.append(f"Bad manifest: {exc}")
    return {
        "ok": not findings,
        "strict": strict,
        "verification": "local_artifacts_only",
        "findings": sorted(set(findings)),
        "skills": len(manifest.get("skills", {})) if isinstance(manifest, dict) else 0,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Read-only AKit install verification")
    parser.add_argument("--project", type=Path, default=Path.cwd())
    parser.add_argument("--strict", action="store_true", help="Also verify auto_rules managed blocks and installed hooks schema")
    args = parser.parse_args()
    outcome = check(args.project, strict=args.strict)
    print(json.dumps(outcome, indent=2))
    if not outcome["ok"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
