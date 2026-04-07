# Compatibility

- Status: stable
- Scope: verified environment, upstream touchpoints, and version-sensitive assumptions
- Applies to: entire repository, especially frontend patches under `web/js/**`
- Source of truth level: compatibility
- Last verified commit: 4479a4521e2ea79e6855da1f843825aa95cb4957
- Update when: tested versions, browser validation target, or upstream touchpoints change
- Supersedes: none
- Superseded by: none

## Verified environment

This repository is currently documented against:

- ComfyUI `0.18.2 Portable`
- `ComfyUI_frontend v1.41.21`
- `Templates v0.9.36`
- Browser validation target: `Edge 146.0.3`

## Why this file exists

This repository makes frontend changes that are sensitive to upstream implementation details.
Version drift matters.

Do not assume that a patch point from a different ComfyUI / frontend version is still valid here.

## Upstream touchpoints to re-check when versions change

At minimum, re-read the relevant upstream frontend implementation before changing behavior that depends on internal details.

Important touchpoints include:

- `src/lib/litegraph/src/LGraphCanvas.ts`
- `src/scripts/app.ts`
- any upstream file containing the specific method or getter being patched locally

## Current local areas most sensitive to upstream drift

### Canvas behavior

Anything that patches or wraps `drawBackCanvas` is version-sensitive.
Changes to background rendering, background image handling, low-quality rendering, or clear-background behavior upstream can affect local patches.

### Light-theme explicit node color behavior

Anything relying on:

- `LiteGraph.nodeLightness`
- `LGraphNode.prototype.renderingColor`
- `LGraphNode.prototype.renderingBgColor`
- Selection Toolbox color preview DOM structure

is version-sensitive.

### Node color menu / toolbox integration

Anything depending on:

- `LGraphCanvas.onMenuNodeColors`
- Selection Toolbox DOM structure
- current `selected_nodes` / `selectedItems` behavior

is version-sensitive.

### Vendor integration

Anything assuming how `web/js` modules auto-load or how CSS must be loaded from JS should be re-checked if frontend asset loading behavior changes.

## Revalidation triggers

Re-check compatibility assumptions when:

- ComfyUI version changes
- ComfyUI_frontend version changes
- Templates version changes in a way that affects UI behavior
- browser validation target changes and a UI bug appears only in one browser
- a patch against frontend internals stops behaving as documented

## Maintenance rule

If a version-sensitive patch location changes, update both this file and the relevant feature doc in the same commit.
