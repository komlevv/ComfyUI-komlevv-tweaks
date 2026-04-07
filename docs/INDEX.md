# Documentation index

- Status: stable
- Scope: registry of agent-facing docs, read order, lifecycle, and active task references
- Applies to: `docs/**`, root instruction files, nested agent docs
- Source of truth level: registry
- Last verified commit: 783ce6bc055d2a57e151459710e91735a9351030
- Update when: a new doc is added, a doc is superseded or archived, read order changes, or a different task becomes active
- Supersedes: none
- Superseded by: none

## Purpose

This file is the registry for the repository's multi-file context system.

Use it to determine:

- what each document is for
- which documents are stable versus task-specific
- what to read for a given kind of task
- which task or handoff docs are current
- which docs are superseded or archived

## Read order

### Always read first

1. `CLAUDE.md`
2. `AGENTS.md`
3. `docs/INDEX.md`

### Then read by task type

#### Frontend subsystem change under `web/js/**`

- if the task may require repository access through GitHub, verify the GitHub connector before deeper code analysis
- if that connector check fails or is ambiguous, ask the human whether to continue without it before proceeding
- relevant `docs/features/*.md`
- relevant nested `web/js/**/AGENTS.md`
- `docs/PROJECT_ARCHITECTURE.md`
- `docs/COMPATIBILITY.md`
- after the first working pass, re-review the solution quality and performance before concluding the task

#### GitHub connector read/write workflow

- `docs/tools/github_connector.md`

#### Active task continuation

- current file in `docs/tasks/`
- relevant file in `docs/handoffs/` if the task builds on a prior branch/session

#### Vendor maintenance work

- `docs/features/coloris_vendor.md`
- `docs/DECISIONS/0002-coloris-vendor-policy.md`
- `web/js/coloris/AGENTS.md`

## Stable docs

### Root instruction layer

- `AGENTS.md` — canonical repository-wide agent rules
- `CLAUDE.md` — thin Claude-specific entrypoint

### Stable architecture / compatibility

- `docs/PROJECT_ARCHITECTURE.md`
- `docs/COMPATIBILITY.md`

### Stable subsystem docs

- `docs/features/canvas_style.md`
- `docs/features/light_theme_color_pipeline.md`
- `docs/features/node_custom_color.md`
- `docs/features/coloris_vendor.md`
- `docs/features/link_style.md`

### Stable operational docs

- `docs/tools/github_connector.md`

### Stable decision logs

- `docs/DECISIONS/0001-context-governance.md`
- `docs/DECISIONS/0002-coloris-vendor-policy.md`

### Nested local guardrails

- `web/js/common/AGENTS.md`
- `web/js/coloris/AGENTS.md`
- `web/js/node_custom_color/AGENTS.md`

## Active task docs

- `docs/tasks/2026-04-07-light-theme-canvas-wysiwyg.md`

## Active handoff docs

None.
Current handoff references are historical continuation docs, not active global task docs.

## Historical handoffs

- `docs/handoffs/2026-04-06-coloris-vendor-clean.md`

## Lifecycle rules

- exactly one task doc should be active for a given narrow problem
- handoff docs should represent completed or paused session state, not competing live task truth
- superseded docs must say what replaced them
- archived docs should no longer be read by default

## Source-of-truth reminder

Use this factual precedence:

1. current code in target branch
2. current active task doc
3. relevant feature doc
4. architecture and compatibility docs
5. README
6. archived or superseded docs

If code and docs disagree, update the doc.
