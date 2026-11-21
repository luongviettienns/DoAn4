<!-- AKIT:START -->
# AKit Workspace Index for Google Antigravity

- Full always-on engineering rules are loaded from `.agents/rules/akit.md` (`trigger: always_on`); kept concise here so Antigravity does not inject duplicate rule tokens into `<user_rules>`.
- Native Antigravity tool mapping: use `read_file`, `edit_file`, `write_file` (with `ArtifactMetadata` for `<appDataDir>/brain/<conversation-id>/implementation_plan.md` and `task.md`), `run_command`, `ask_question`, `schedule`, and `search_web`.
- Specialist subagent dispatch: invoke pre-mounted `.agents/agents/akit-*.md` via `invoke_subagent`. If AKit was installed mid-session and the role is not yet in `<subagents>`, read `.agents/agents/akit-<role>.md`, call `define_subagent(Name="akit-<role>", EnableWriteTools=False, EnableSubagentTools=False, EnableMCPTools=False)` to enforce read-only isolation, and then call `invoke_subagent` (or use `TypeName="research"`). Wait via reactive wakeup without polling loops.

- Select a workflow for a larger task: `.agents/skills/akit-router/SKILL.md`.
- Trace a regression: `.agents/skills/akit-debug/SKILL.md`.
- Compare approaches for an unfamiliar integration: `.agents/skills/akit-prior-art/SKILL.md`.
- Review a significant diff: `.agents/skills/akit-review/SKILL.md`.
- Check a security-sensitive change: `.agents/skills/akit-security/SKILL.md`.
- Verify recorded engineering evidence: `.agents/skills/akit-eval/SKILL.md`.
<!-- AKIT:END -->
