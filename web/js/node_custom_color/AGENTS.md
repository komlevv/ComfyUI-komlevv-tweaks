# Local agent rules for `web/js/node_custom_color`

- Status: stable
- Scope: local rules for custom node/group color workflow and toolbox integration
- Applies to: `web/js/node_custom_color/**`
- Source of truth level: local-root
- Last verified commit: 4479a4521e2ea79e6855da1f843825aa95cb4957
- Update when: picker launch flow, selection handling, observer strategy, or apply behavior changes
- Supersedes: none
- Superseded by: none

## Purpose

This directory owns the custom color workflow for nodes and groups.

## Local rules

- preserve the current toolbox-first integration unless the task explicitly changes the UX
- preserve the single hidden picker anchor pattern unless there is a strong reason to change it
- keep node/group target resolution behavior explicit
- do not casually revert to the native browser color input
- do not merge local picker flow with vendor internals
- if the observer strategy changes, document why; the toolbox is dynamic and the observer exists for a reason

## Read before editing

Before changing anything here, read:

- `docs/features/node_custom_color.md`
- `docs/features/light_theme_color_pipeline.md`
- `docs/features/coloris_vendor.md`
