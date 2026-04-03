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

Current settings:

- `Reroute dot radius`

Current behavior:

- Changes the size of the inline reroute point on links
- Does not change the white Reroute node
