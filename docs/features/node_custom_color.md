# Node Custom Color

- Status: stable
- Scope: custom node/group color workflow, Selection Toolbox integration, picker launch, target resolution, and apply flow
- Applies to: `web/js/node_custom_color/**`
- Source of truth level: feature
- Last verified commit: 4479a4521e2ea79e6855da1f843825aa95cb4957
- Update when: launch flow, selection handling, observer strategy, picker configuration, or target-apply behavior changes
- Supersedes: none
- Superseded by: none

## Purpose

This subsystem provides the custom color workflow for nodes and groups.

## Primary file

- `web/js/node_custom_color/node_custom_color.js`

## Current design

The current implementation:

- integrates custom color into the Selection Toolbox color area
- patches light-theme explicit color behavior through shared common logic
- resolves selected nodes and groups as color targets
- creates and reuses one hidden text input anchor for the picker
- launches the Coloris popup near the toolbox custom button
- applies picked values live to current targets
- normalizes picker output into hex before the node/group apply pipeline so UI format toggles do not change stored/apply behavior
- updates the current swatch preview and redraws the canvas

## Current user-facing behavior

For nodes:

- the picked value is first normalized to hex regardless of whether the picker UI is showing Hex, RGB, or HSL
- the normalized hex value is stored in `bgcolor`
- a lighter derived `color` is calculated for title/body contrast behavior matching current repository expectations

For groups:

- the picked value is first normalized to hex regardless of picker UI format
- the normalized hex value is written directly to `group.color`

## Integration rules

- Keep the rest of the subsystem logic stable when changing only the picker backend.
- Prefer preserving the single hidden picker anchor.
- Preserve the current selection-target resolution logic for both nodes and groups unless the task explicitly changes that scope.

## Mutation observation

The Selection Toolbox is dynamic.
The current implementation uses mutation observation and narrows the observation root after discovering the relevant toolbox container.

That behavior is intentional.

## What not to do

- Do not revert to a native browser color input without an explicit project decision.
- Do not casually reintroduce the old right-click custom color path if the current UX is toolbox-first.
- Do not create one new hidden anchor input per click.
- Do not merge this subsystem with generic light-theme patch logic or vendor logic.

## Related docs

- `docs/features/light_theme_color_pipeline.md`
- `docs/features/coloris_vendor.md`
- `web/js/node_custom_color/AGENTS.md`
