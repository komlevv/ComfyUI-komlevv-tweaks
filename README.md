# ComfyUI komlevv tweaks

A monorepo for personal ComfyUI tweaks, frontend extensions, custom nodes, and future utilities.

## Install

Clone this repo into your `ComfyUI/custom_nodes` folder, restart ComfyUI, then refresh the browser page.

## Application Settings layout

Custom settings from this repo live under:

`komlevv-tweaks`

Current tweak groups:

- `komlevv-tweaks > Link Style`

## Repository layout

- `py/` — Python backend modules and future custom nodes
- `web/js/` — frontend extensions and shared JS helpers

## Included tweaks

### Link Style

Link Style is the shared tweak group for link-related visual customization.

Current settings added by this tweak group:

- `Reroute dot radius`
- `Reroute stroke width`
- `Reroute stroke color`
- `Reroute inner stroke color`
- `Reroute selected ring color`
- `Reroute selected ring stroke width`
- `Reroute flat fill mode`
- `Link width`
- `Link stroke width`
- `Link stroke color`

Current behavior:

- Changes the size of the inline reroute point on links
- Changes inline reroute dot stroke width
- Changes inline reroute dot outer stroke color
- Changes inline reroute dot inner stroke color
- Changes inline reroute dot selected ring color
- Changes inline reroute selected ring stroke width independently from other reroute strokes
- Can switch reroute fill to flat mode (inner highlight uses same fill color as outer)
- Changes normal-mode link width
- Changes normal-mode link stroke width
- Changes normal-mode link stroke color
- Does not change the white Reroute node
- Does not override ComfyUI low-quality zoom-out link rendering

Notes:

- `Link stroke color` uses the chosen color with a fixed semi-transparent stroke so the default ComfyUI look stays close to stock.
