---
name: ecc-continuous-learning
description: Manually extract reusable lessons from the current chat into skills scoped
  to this project.
---

> Project Codex adaptation: use the tools and commands available in this session.
> Upstream slash-command names describe workflows, not registered Codex commands.
> Check example commands against the actual project stack and current shell before running them.
> Global Claude configuration and hooks are not part of this installation.

# Project Continuous Learning

Run this workflow when explicitly requested. Use only the context available in this
chat or project documents explicitly provided for this task. No session-end hook is installed.

1. Identify reusable lessons: resolved errors, user corrections, workarounds,
   debugging techniques, and established project conventions.
2. Exclude typos, temporary external failures, secrets, and one-off details.
3. Check existing project skills and avoid duplicating their guidance.
4. Save each useful lesson at `.agents/skills/ecc-learned-<topic>/SKILL.md`
   relative to the project root, with YAML `name` and `description` and concise
   instructions describing the trigger, evidence, and reusable solution.
5. Report created paths. If no reusable lesson is supported by the available
   context, say so and create no files.

Never write learned skills or configuration to a user-level directory.
`config.json` records the project-local extraction preferences; it is not a hook registration.
The original Claude workflow and hook script are archived under
`.tools/everything-claude-code/upstream/skills/continuous-learning/`.
