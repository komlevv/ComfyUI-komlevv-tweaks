# CLAUDE.md

Read these files in this order before working:

1. `AGENTS.md`
2. `docs/INDEX.md`
3. the relevant `docs/features/*.md` files for the subsystem you will touch
4. the relevant active task doc under `docs/tasks/`, if one exists
5. the relevant nested `AGENTS.md` file inside any directory you modify
6. `docs/tools/github_connector.md` before any GitHub connector write workflow

Additional Claude-specific notes:

- `AGENTS.md` is the canonical root instruction file for this repository.
- Do not duplicate or fork the rule set here.
- Use the current branch code as the primary factual source of truth.
- If docs and code disagree, update the doc rather than carrying stale assumptions forward.
