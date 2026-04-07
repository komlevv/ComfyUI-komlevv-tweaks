# AGENTS.md

This is the canonical agent operating manual for this repository.

## Scope

- Status: stable
- Scope: repository-wide working rules, source-of-truth precedence, context maintenance, and anti-drift guardrails
- Applies to: entire repository
- Source of truth level: root-rule
- Last verified commit: 783ce6bc055d2a57e151459710e91735a9351030
- Update when: workflow rules, context governance, source-of-truth precedence, document lifecycle, or completion requirements change
- Supersedes: none
- Superseded by: none

## Purpose

This file exists to keep agents aligned with the current project architecture and to prevent regression into the same bad habits across sessions.

This repository uses a multi-file context system.
Do not treat chat history as the primary project memory.
Use the current branch code and the docs under `docs/` instead.

## Canonical root

`AGENTS.md` is the canonical repository root for agent instructions.

`CLAUDE.md` is a thin Claude-specific entrypoint only.
Do not duplicate the full instruction set in both files.

## Instruction precedence

When deciding how to work, use this order:

1. system / platform / developer instructions
2. `AGENTS.md`
3. nested `AGENTS.md` files inside directories you actually modify
4. `docs/tools/*.md` for the relevant tool workflow
5. `docs/tasks/*.md` for the active task
6. `docs/features/*.md` for subsystem-specific rules
7. `docs/PROJECT_ARCHITECTURE.md`
8. `docs/COMPATIBILITY.md`
9. `README.md`
10. `docs/archive/*`

## Factual precedence

When deciding what is true about the project right now, use this order:

1. current code in the target branch
2. relevant active task doc under `docs/tasks/`
3. relevant subsystem doc under `docs/features/`
4. `docs/PROJECT_ARCHITECTURE.md`
5. `docs/COMPATIBILITY.md`
6. `README.md`
7. archived or superseded docs

If docs disagree with code, code wins.
Update the doc rather than carrying the stale description forward.

## Startup algorithm

For any coding session:

1. read `CLAUDE.md`
2. read `AGENTS.md`
3. read `docs/INDEX.md`
4. if the task may require repository reads or writes through GitHub, read `docs/tools/github_connector.md`
5. check GitHub connector availability before deeper code investigation, implementation planning, or repository analysis
6. if the connector check fails or remains ambiguous, stop and ask the human whether to continue without a working connector
7. inspect the current repo tree and current target branch
8. read only the feature docs relevant to the files you will touch
9. read nested `AGENTS.md` files inside touched directories
10. read the current code before proposing or applying changes
11. read the relevant active task doc if one exists
12. read the relevant tool playbook if the workflow depends on one
13. after the first working implementation pass, run a self-review before treating the task as complete
14. explicitly evaluate whether the current solution is good enough and whether it is performant enough for the current scope

For any GitHub connector write session:

15. read `docs/tools/github_connector.md`
16. follow that SOP exactly
17. do not conclude that the connector cannot write after a single failed attempt

## Repository-specific guardrails

### Check GitHub connector before code work

When the task is about this repository and may require GitHub access:

- verify early that the GitHub connector is present and responding before doing deeper code reasoning or repo exploration
- treat connector availability as an early gating check, not a late implementation detail
- if that check fails or is inconclusive, do not silently continue into full code analysis or implementation
- ask the human whether to continue without a working connector and wait for explicit confirmation before proceeding

This rule exists to avoid wasting time on repository work in a session that cannot actually read or write through the intended path.

### Re-review the first implementation pass

After producing the first working implementation or first substantive proposed solution:

- pause and check whether the work is actually good
- look for unnecessary complexity, accidental regressions, and places where the patch can be made leaner
- explicitly evaluate performance implications for the current scope, even if the solution is functionally correct
- if a leaner or faster solution is clearly better, prefer that before concluding the task

This rule exists to prevent agents from stopping at the first merely-working answer when a cleaner or more performant answer is available with modest additional effort.

### Work inside the current custom node structure

- Work inside the current repository structure for this ComfyUI custom node.
- Do not assume the project is frontend-only; it may contain Python node logic, frontend extensions, shared helpers, and static assets under the current package layout and any exported `WEB_DIRECTORY`.
- Do not invent a parallel subsystem or move code into a new top-level structure when an existing layer already matches the responsibility.
- Do not assume older flat file layouts or older branch structures are still authoritative.

### Respect subsystem boundaries

Do not merge separate concerns into one generic "color logic" bucket.

Keep these areas distinct unless the task explicitly requires otherwise:

- canvas/background behavior
- light-theme explicit node/group color rendering
- Selection Toolbox preview logic
- node/group custom color picker flow
- vendored Coloris behavior
- link and reroute styling

### Treat upstream patching as exceptional

- Prefer official ComfyUI / frontend extension points when they exist.
- Only patch LiteGraph / frontend internals when needed.
- If an internal patch is required, document the exact touchpoint and reason in the narrowest relevant context file.

### CSS loading rule

Files under `web/js` are auto-loaded as JS modules.
Non-JS resources are not.
If CSS is required, load it from JS.

### Current code is primary truth

Do not rely on old chat summaries, old branch names, or outdated file names.
Read the actual current files in the target branch before changing anything.

### README rule

`README.md` is a human-facing overview, not the primary detailed implementation spec.
Do not treat it as authoritative for active drift-sensitive details if code or docs disagree.

## What not to do

- Do not invent parallel architecture when a current module already exists.
- Do not assume a stale mental snapshot of a file is current.
- Do not change vendor code casually when a shared glue layer is the correct place.
- Do not widen patch scope without documenting why.
- Do not leave task docs marked active after replacing them with a newer task doc.
- Do not create a new context file if an existing file already has the right scope.
- Do not conclude GitHub connector write access is unavailable after one failed attempt.
- Do not ask the user to manually apply code if the documented connector workflow should still be able to do the write.
- Do not continue repository code work after an early connector failure unless the human explicitly confirmed that fallback.
- Do not stop at the first working implementation without re-checking solution quality and performance.
- Do not leave architecture, compatibility, or workflow docs stale after a non-trivial change.

## Context file classes

Use these document classes only:

- `docs/PROJECT_ARCHITECTURE.md` — stable architecture and boundaries
- `docs/COMPATIBILITY.md` — verified versions and upstream touchpoints
- `docs/features/*.md` — subsystem truth and invariants
- `docs/tools/*.md` — operational tool playbooks
- `docs/tasks/*.md` — active task/problem state
- `docs/handoffs/*.md` — continuation context for a completed session or branch
- `docs/DECISIONS/*.md` — durable rationale for non-obvious decisions
- `docs/archive/*` — retired or superseded docs

## New document rule

Do not create a new doc unless one of these is true:

- the current doc class does not match the needed scope
- the existing doc would become incoherent if expanded
- the document represents a new active task, new handoff, new decision, or new tool SOP

Otherwise, update the existing narrowest relevant doc.

## Context maintenance rule

Context maintenance is part of the task, not optional follow-up work.

Any non-trivial change must update the narrowest relevant context file in the same commit.

Non-trivial includes:

- architecture changes
- subsystem boundary changes
- vendor policy changes
- compatibility assumption changes
- new upstream workaround
- changed behavior that affects regressions or testing
- new operational workflow rules
- new source-of-truth rules
- removal of previously supported behavior
- new local invariant

## Document lifecycle rule

Every agent-facing doc must carry a status:

- `stable`
- `active`
- `archived`
- `superseded`

When replacing an active task or handoff doc:

- mark the old one `superseded`
- point it to the new file
- update `docs/INDEX.md`

Do not leave multiple competing active docs for the same task.

## Definition of done

Before finishing non-trivial work, the agent must verify all of the following:

- the code change is complete
- after the first implementation pass, the solution was re-reviewed for quality and performance
- the narrowest relevant context file was updated if needed
- `docs/INDEX.md` was updated if a new doc was added
- replaced task or handoff docs were marked superseded or archived
- nested `AGENTS.md` constraints were respected in touched directories
- if GitHub connector was used, the final report includes the branch, commit, and touched files

## GitHub connector rule

If the task involves reading from or writing to GitHub through the connector, read `docs/tools/github_connector.md` first and follow it exactly.

Use the connector as a blob/tree/commit/ref pipeline, not as a local git shell and not as a fragile line-patch tool.

Check connector availability before deeper repository work, and if the connector is not working, obtain explicit human confirmation before continuing without it.

Do not diagnose missing write access until the documented workflow has been exhausted.
