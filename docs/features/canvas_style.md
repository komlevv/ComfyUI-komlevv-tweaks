# Canvas Style

- Status: stable
- Scope: canvas background behavior, pattern suppression, and zoom-level visual consistency
- Applies to: `web/js/canvas/**`
- Source of truth level: feature
- Last verified commit: 4479a4521e2ea79e6855da1f843825aa95cb4957
- Update when: canvas background behavior, settings, patch location, or regression surface changes
- Supersedes: none
- Superseded by: none

## Purpose

This subsystem owns graph canvas background behavior.

## Primary file

- `web/js/canvas/canvas_style.js`

## Current responsibility

The current implementation adds the `Force hide background pattern` setting and uses a `drawBackCanvas` patch to suppress:

- LiteGraph background pattern rendering
- the low-zoom background fill that would otherwise darken the canvas while zooming out

The goal is visual consistency across zoom levels, with or without a custom canvas background image.

## Current patch shape

The implementation currently wraps `drawBackCanvas` and temporarily overrides:

- `background_image`
- `clear_background_color`

before delegating to the original implementation.

This is intentional and version-sensitive.

## What not to do

- Do not fold this logic into generic node color handling.
- Do not assume this subsystem owns Selection Toolbox behavior.
- Do not casually widen this patch into a global rendering rewrite.
- Do not assume canvas color issues are the same as explicit node/group color issues.

## Regression surface

Re-check this subsystem when changing:

- low-quality zoom-out behavior
- background image handling
- clear background color handling
- any canvas patch that touches `drawBackCanvas`

## Related docs

- `docs/features/light_theme_color_pipeline.md`
- `docs/tasks/2026-04-07-light-theme-canvas-wysiwyg.md`
- `docs/COMPATIBILITY.md`
