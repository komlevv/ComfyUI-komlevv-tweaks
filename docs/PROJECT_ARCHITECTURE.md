# Project architecture

- Status: stable
- Scope: stable repository architecture, subsystem boundaries, extension points, and document ownership
- Applies to: entire repository, especially `web/js/**` and `docs/**`
- Source of truth level: architecture
- Last verified commit: 4479a4521e2ea79e6855da1f843825aa95cb4957
- Update when: directory structure, subsystem boundaries, integration strategy, or document ownership changes
- Supersedes: none
- Superseded by: none

## Purpose

This document describes the stable architecture of the repository and the intended ownership boundaries between its frontend subsystems.

It is not a task log and not a changelog.

## Repository shape

Current high-level layout:

- `py/` — backend Python modules and future custom nodes
- `web/js/common/` — shared frontend helpers and cross-cutting patches
- `web/js/canvas/` — canvas-related frontend tweaks
- `web/js/link_style/` — link and reroute rendering tweaks
- `web/js/node_custom_color/` — custom node/group color workflow and toolbox integration
- `web/js/coloris/` — vendored Coloris picker plus shared integration glue
- `docs/` — multi-file agent context system

## Frontend architecture principles

### 1. Work inside the current `web/js` module layout

This repository already uses a split subfolder architecture under `web/js`.
Do not re-flatten it and do not create a parallel structure for new work unless there is a very strong repository-level reason.

### 2. Shared code belongs in `web/js/common/`

Use `web/js/common/` for:

- shared helpers
- shared light-theme color patches
- utilities used by more than one frontend tweak

Do not create new shared modules casually for one-off behavior that belongs to a single feature module.

### 3. Vendor code and repository glue stay separated

`web/js/coloris/` is a vendored dependency area.

Keep:

- vendor mechanics in `coloris.js` / `coloris.css`
- repository-specific integration in `coloris_shared.js`

Avoid turning vendor files into a project-specific rewrite.

### 4. Feature docs follow subsystem boundaries, not individual source files

Subsystem truth belongs under `docs/features/`.
Do not build a giant file-by-file development log as the primary context system.

## Subsystem boundaries

### Canvas Style

Owns:

- canvas background pattern suppression
- `drawBackCanvas` related patching
- canvas background consistency behavior

Does not own:

- explicit node color rendering
- toolbox preview colors
- picker UX
- link styling

### Light-theme color pipeline

Owns:

- WYSIWYG explicit color behavior under light themes
- Selection Toolbox preset preview consistency
- Selection Toolbox current-color preview consistency
- any deliberate bypass of frontend lightness heuristics for explicit node/group colors

Does not own:

- canvas/background image policy
- Coloris vendor behavior
- link/reroute style

### Node Custom Color

Owns:

- custom color entry point in the Selection Toolbox
- selected node/group target resolution
- picker launch flow
- color application flow to nodes and groups
- redraw and preview synchronization for that flow

Does not own:

- vendor internals beyond documented configuration points
- generic light-theme patch policy
- canvas/background rendering

### Coloris vendor

Owns:

- vendored popup picker behavior
- lazy initialization
- CSS loading through JS glue
- Comfy light/dark theme mode mapping for the picker

Does not own:

- broader repository theme strategy
- toolbox mutation observation
- node/group application logic outside documented integration points

### Link Style

Owns:

- reroute and link visual appearance
- reroute radius and stroke styling
- normal link width and stroke styling

Does not own:

- canvas background behavior
- node/group color pipeline
- picker workflow

## Extension strategy

### Prefer official extension points

When there is a documented frontend extension point or stable hook, prefer it.

### Patch internals only when required

Some current functionality depends on patching LiteGraph or frontend internals.
When doing so:

- keep the patch scope as narrow as possible
- document the touchpoint and reason in the relevant feature doc
- re-check upstream files when versions change

## UI asset rule

Files under `web/js` are auto-loaded as JS.
Non-JS assets are not.
If CSS is needed, it must be loaded from JS.

## Document ownership

- repository-wide behavior rules live in `AGENTS.md`
- architecture boundaries live here
- compatibility assumptions live in `docs/COMPATIBILITY.md`
- subsystem truth lives in `docs/features/*.md`
- operational tool workflows live in `docs/tools/*.md`
- current problem state lives in `docs/tasks/*.md`
- historical session or branch continuation context lives in `docs/handoffs/*.md`
- durable rationale lives in `docs/DECISIONS/*.md`

## Maintenance rule

Any non-trivial architecture or ownership change must update this file in the same commit.
