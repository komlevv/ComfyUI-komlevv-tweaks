# Coloris vendor module for ComfyUI-komlevv-tweaks

This folder contains a vendored and trimmed copy of [Coloris](https://github.com/mdbassit/Coloris), adapted for use inside this repository's frontend extensions.

## Purpose

The goal of this vendor copy is not to reimplement Coloris, but to keep a version that is:

- easy to embed in `web/js/` feature modules,
- easier to diff against upstream than a full rewrite,
- smaller and more focused on the actual desktop-browser use case of this project.

## Files

- `coloris.js` — vendored upstream Coloris source with a minimal set of project-specific removals.
- `coloris.css` — vendored Coloris stylesheet.
- `coloris_shared.js` — small repository-specific helper layer for loading the stylesheet and syncing Coloris theme mode with ComfyUI.
- `LICENSE` — upstream MIT license.

## What is intentionally different from upstream

This copy is based on upstream Coloris, but some features were deliberately removed because they are not needed for this repository.

### Removed from `coloris.js`

- virtual instances support,
- custom parent container support,
- input wrapping / preview field support,
- inline mode,
- keyboard navigation / keyboard shortcuts,
- touch event support,
- legacy browser fallbacks / polyfills.

These removals were made to keep the vendor file leaner and more suitable for the desktop-browser ComfyUI environment used by this project.

## What is intentionally kept

The following behavior from upstream Coloris is still expected to exist here:

- swatches,
- alpha support,
- format switching (`hex`, `rgb`, `hsl`),
- theme / themeMode handling,
- popup positioning relative to the input element.

## Repository-specific glue

`coloris_shared.js` is the only project-specific integration layer in this folder.

It is responsible for:

- loading `coloris.css` from JS in the same style used elsewhere in ComfyUI custom frontend code,
- exposing helpers such as `getColoris()`,
- mapping ComfyUI light/dark state to Coloris `themeMode`.

This separation is intentional: repository-specific logic should live in `coloris_shared.js` as much as possible, while `coloris.js` should stay structurally close to upstream.

## Maintenance note

If upstream Coloris is updated in the future, prefer updating `coloris.js` by starting from the upstream file again and reapplying only the small set of removals listed above.

Avoid turning `coloris.js` into a repository-specific rewrite.

## License

Upstream Coloris is MIT-licensed. See `LICENSE` in this folder.
