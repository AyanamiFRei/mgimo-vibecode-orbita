---
name: ecc-strategic-compact
description: Prepare a concise continuation note at a task boundary when explicitly
  requested.
---

> Project Codex adaptation: use the tools and commands available in this session.
> Upstream slash-command names describe workflows, not registered Codex commands.
> Check example commands against the actual project stack and current shell before running them.
> Global Claude configuration and hooks are not part of this installation.

# Project Strategic Compaction

Run this workflow when explicitly requested at a logical task boundary. No tool-call
counter or compaction hook is installed. Do not interrupt implementation to compact.

1. Summarize the user objective, accepted decisions, and current constraints.
2. Record files changed, completed validation, unresolved errors, and the next concrete step.
3. Include paths and commands needed to continue; omit secrets and repetitive logs.
4. Return a concise continuation note. Save it inside the project only if requested.
5. Leave actual context compaction to the host or the user. Do not claim that writing
   a note compacts the session, and do not invoke Claude-specific commands or hooks.

The original workflow and hook script are archived under
`.tools/everything-claude-code/upstream/skills/strategic-compact/`.
