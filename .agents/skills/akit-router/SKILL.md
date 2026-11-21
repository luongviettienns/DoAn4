---
name: akit-router
description: Choose installed AKit skills for a multi-step engineering task when the right workflow is unclear. Skip routine edits and requests that already name a skill.
---
# AKit workflow selection

Use the smallest workflow that satisfies the request. The project's conventions and the user's scope govern the work.

- **FAST:** Handle a typo, documentation edit, or bounded fix directly. Run only the relevant checks. Do not use when there is no routing decision to make.
- **STANDARD:** For a feature or substantial fix, identify acceptance criteria, select the most relevant installed skill, and add testing or review guidance only where needed.
- **CRITICAL:** For auth, tenant isolation, payments, migrations, or production changes, identify the affected boundaries and require evidence for the checks that apply. Follow the host's permissions and report unverified checks.

Use [the routing matrix](references/routing-matrix.md) when choosing among domain skills. If a suggested skill is absent, continue with the project's existing tools and practices. For an unfamiliar integration, use `akit-prior-art` if installed and a comparison would change the implementation. Follow the repository's established Git workflow; apply Git Flow only when the project uses it or the user asks for it.

Use [the cross-platform mapping](references/cross-platform-tool-mapping.md) when a shared skill names a tool from another host. In Codex, use tools actually exposed in the session. Delegate only when authorized and useful; a custom agent inherits the current permissions. If isolated review is required, use a separate session with the required permissions or report the gap.

Read [Antigravity slash workflows](references/slash-command-auto-orchestration.md) only in Antigravity when that workflow is relevant. In other hosts, follow the requested task without assuming those commands or artifacts exist.
