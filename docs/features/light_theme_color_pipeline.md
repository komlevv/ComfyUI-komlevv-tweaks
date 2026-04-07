# Light-theme color pipeline

- Status: stable
- Scope: explicit node/group color WYSIWYG behavior under light themes and Selection Toolbox preview consistency
- Applies to: `web/js/common/light_theme_custom_node_color_patch.js`, related shared color helpers, Selection Toolbox preview behavior
- Source of truth level: feature
- Last verified commit: 4479a4521e2ea79e6855da1f843825aa95cb4957
- Update when: light-theme explicit color handling, preset preview logic, or patched upstream touchpoints change
- Supersedes: none
- Superseded by: none

## Purpose

This subsystem exists because ComfyUI light-theme rendering heuristics can make explicit colors display differently from the values actually stored on nodes or groups.

The local goal is WYSIWYG behavior for explicit node/group colors and consistent Selection Toolbox previews.

## Primary file

- `web/js/common/light_theme_custom_node_color_patch.js`

## Current responsibilities

The shared patch currently does all of the following:

- bypasses `LiteGraph.nodeLightness` for nodes with explicit `color` / `bgcolor`
- swaps the standard preset palette to a dedicated light-theme palette when the light-theme heuristic is active
- restores the original preset palette outside that condition
- forces Selection Toolbox preset previews to use the same raw preset colors
- forces the toolbox current-color indicator to use the explicit selected node/group color when there is a uniform explicit preview color

## Important distinction

This subsystem does not own canvas/background rendering.
Canvas light-theme/background work is related, but separate.

Keep these concerns distinct:

- explicit node/group colors
- preset preview colors
- current-color indicator
- canvas background color behavior

## Upstream-sensitive touchpoints

This subsystem is sensitive to:

- `LiteGraph.nodeLightness`
- `LGraphNode.prototype.renderingColor`
- `LGraphNode.prototype.renderingBgColor`
- current Selection Toolbox DOM structure and selectors

## What not to do

- Do not merge this patch into unrelated canvas or picker code.
- Do not casually change the dedicated light-theme preset values.
- Do not assume the same fix applies equally to nodes, groups, toolbox previews, and canvas background.

## Regression surface

Re-check this subsystem when changing:

- explicit node/group color storage
- toolbox preview DOM selectors
- light-theme preset palette values
- the upstream getter patch points
