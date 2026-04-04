# ComfyUI komlevv tweaks

A monorepo for personal ComfyUI tweaks, frontend extensions, custom nodes, and future utilities.

## Disclaimer

Tested on:

- ComfyUI `0.18.2 Portable`
- `ComfyUI_frontend v1.41.21`
- `Templates v0.9.36`
- `Edge 146.0.3`

Use at your own risk.

## Install

Clone this repo into your `ComfyUI/custom_nodes` folder, restart ComfyUI, then refresh the browser page.

## Application Settings layout

Custom settings from this repo live under:

`komlevv-tweaks`

Current tweak groups:

- `komlevv-tweaks > Canvas Style`
- `komlevv-tweaks > Link Style`

## Repository layout

- `py/` — Python backend modules and future custom nodes
- `web/js/` — frontend extensions and shared JS helpers

## Included tweaks

### Canvas Style

Canvas Style is the tweak group for graph canvas background behavior.

Current settings added by this tweak group:

- `Force hide background pattern`

Current behavior:

- Suppresses the LiteGraph background pattern layer
- Suppresses the low-zoom background fill that would otherwise darken the canvas during zoom out
- Keeps the canvas background visually consistent across zoom levels
- Works both with and without a custom Canvas Background Image

### Link Style

Link Style is the tweak group for link-related visual customization.

Current settings added by this tweak group:

- `Reroute dot radius`
- `Reroute stroke width`
- `Reroute stroke color`
- `Reroute inner stroke color`
- `Reroute selected ring color`
- `Reroute selected ring stroke width`
- `Reroute flat fill mode`
- `Reroute stroke enabled`
- `Link width`
- `Link stroke width`
- `Link stroke color`
- `Link stroke enabled`

Current behavior:

- Changes the size of the inline reroute point on links
- Changes inline reroute dot stroke width
- Changes inline reroute dot outer stroke color
- Changes inline reroute dot inner stroke color
- Changes inline reroute dot selected ring color
- Changes inline reroute selected ring stroke width independently from other reroute strokes
- Can switch reroute fill to flat mode (inner highlight uses same fill color as outer)
- Can toggle reroute circle stroke on/off without affecting selected ring
- Adds a theme-aware border around settings color preview swatches so white values stay visible on light palettes
- Changes normal-mode link width
- Changes normal-mode link stroke width
- Changes normal-mode link stroke color
- Can toggle normal-mode link stroke on/off
- Does not change the white Reroute node
- Does not override ComfyUI low-quality zoom-out link rendering

Notes:

- `Link stroke color` uses the chosen color with a fixed semi-transparent stroke so the default ComfyUI look stays close to stock.

### Custom Node Colors

Custom Node Colors adds a `Custom` entry into the standard ComfyUI node/group color menu.

Current behavior:

- Hooks the built-in `Node Colors` context menu through `LGraphCanvas.onMenuNodeColors`
- Opens a native browser color picker
- Applies custom colors directly to the selected node or group
- For nodes, stores the picked color in `bgcolor` and applies a slightly lighter derived `color` to match the original pythongosssss behavior
- For groups, stores the picked color directly in `group.color`
- Applies the color to all selected nodes when multiple nodes are selected
- Stores raw custom colors on the node/group itself, so they serialize with the workflow and stay independent from theme palette presets
