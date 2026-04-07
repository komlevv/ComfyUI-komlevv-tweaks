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

This subsystem owns graph canvas background behavior, including optional custom background color override per theme.

## Primary file

- `web/js/canvas/canvas_style.js`

## Current responsibility

The current implementation adds the following settings:

- `Force hide background pattern`
- `Custom background color enabled`
- `Custom background color (dark theme)` (text input with adjacent Coloris launcher button)
- `Custom background color (light theme)` (text input with adjacent Coloris launcher button)
- `Reset custom background colors to default` (boolean toggle-style reset control)

It uses a `drawBackCanvas` patch to:

- suppress LiteGraph background pattern rendering and low-zoom darkening fill when requested
- override `clear_background_color` with a custom value when custom canvas colors are enabled
- choose dark/light custom color by current ComfyUI light-theme heuristic state
- provide reset-to-default behavior for both custom background colors through the settings toggle control
- use Coloris launcher buttons next to those text fields to avoid ComfyUI settings-native color picker interception

The goal is visual consistency across zoom levels and predictable WYSIWYG background color in both dark and light themes.

## Current patch shape

The implementation currently wraps `drawBackCanvas` and temporarily overrides:

- `background_image` (pattern suppression mode)
- `clear_background_color` (pattern suppression mode and/or custom color mode)

before delegating to the original implementation.

The custom background color mode is intentionally theme-aware and uses separate dark/light stored values.

This patch shape is intentional and version-sensitive.

## What not to do

- Do not fold this logic into generic node color handling.
- Do not assume this subsystem owns Selection Toolbox behavior.
- Do not casually widen this patch into a global rendering rewrite.
- Do not assume canvas color issues are the same as explicit node/group color issues.
- Do not collapse dark/light canvas custom color settings into a single shared value unless task scope explicitly changes that behavior.

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
