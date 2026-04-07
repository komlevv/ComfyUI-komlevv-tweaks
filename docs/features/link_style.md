# Link Style

- Status: stable
- Scope: reroute and link visual customization, including widths, strokes, and current rendering constraints
- Applies to: `web/js/link_style/**`
- Source of truth level: feature
- Last verified commit: 4479a4521e2ea79e6855da1f843825aa95cb4957
- Update when: link/reroute styling options, rendering constraints, or exclusions change
- Supersedes: none
- Superseded by: none

## Purpose

This subsystem owns visual customization for links and inline reroute dots.

## Current scope

The current implementation provides settings for:

- reroute dot radius
- reroute stroke width and colors
- reroute selected ring styling
- reroute flat fill behavior
- normal link width
- normal link stroke width and color
- link stroke enable/disable behavior

## Current important constraints

The current design intentionally does not:

- change the white Reroute node
- override ComfyUI low-quality zoom-out link rendering

## What not to do

- Do not merge this subsystem into generic canvas styling.
- Do not treat low-quality zoom-out rendering as a bug unless the task explicitly changes that policy.
- Do not break the current theme-aware visibility behavior of settings color preview swatches.

## Regression surface

Re-check this subsystem when changing:

- reroute rendering hooks
- normal-mode link stroke behavior
- low-quality rendering expectations
