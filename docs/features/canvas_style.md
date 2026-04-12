# Canvas Style

- Status: stable
- Scope: canvas background behavior, pattern suppression, and background render throttling
- Applies to: `web/js/canvas/*`
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

The current implementation adds these `Canvas Style` settings:

- `Force hide background pattern`
- `Throttle background rendering`

It currently owns:

- LiteGraph background pattern suppression
- low-zoom background fill suppression
- canvas background visual consistency across zoom levels
- canvas render throttling when the page is unfocused or hidden

## Current patch shape

The implementation currently uses two narrow version-sensitive behaviors:

1. a `drawBackCanvas` wrapper that temporarily overrides:
   - `background_image`
   - `clear_background_color`

2. page visibility / focus listeners that manage the current canvas instance:
   - `maximumFps`
   - `pause_rendering`

The render-throttle behavior intentionally avoids rewriting the LiteGraph render loop.
It adjusts the current canvas render budget instead.

This is intentional and version-sensitive.

## What not to do

- Do not fold this logic into generic node color handling.
- Do not assume this subsystem owns Selection Toolbox behavior.
- Do not casually widen this patch into a global rendering rewrite.
- Do not assume canvas color issues are the same as explicit node/group color issues.
- Do not patch `draw()` or `startRendering()` here unless the narrower render-budget approach no longer works for the validated frontend version.

## Regression surface

Re-check this subsystem when changing:

- low-quality zoom-out behavior
- background image handling
- clear background color handling
- `maximumFps` behavior
- `pause_rendering` behavior
- page `visibilitychange` handling
- window `focus` / `blur` handling
- any other patch that touches canvas render budget or `drawBackCanvas`

Also re-check interactions with any other extension that changes:

- LiteGraph canvas timing
- canvas pause state
- canvas FPS limiting

## Related docs

- `docs/features/light_theme_color_pipeline.md`
- `docs/tasks/2026-04-07-light-theme-canvas-wysiwyg.md`
- `docs/COMPATIBILITY.md`
