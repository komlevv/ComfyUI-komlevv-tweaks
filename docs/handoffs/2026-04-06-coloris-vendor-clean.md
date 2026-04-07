# Coloris vendor clean handoff

- Status: stable
- Scope: historical handoff context for the clean Coloris vendor integration work and its intended continuation state
- Applies to: `web/js/coloris/**`, `web/js/node_custom_color/**`
- Source of truth level: handoff
- Last verified commit: 4479a4521e2ea79e6855da1f843825aa95cb4957
- Update when: this historical handoff is superseded by a newer Coloris maintenance handoff
- Supersedes: `context2.md` chat handoff notes
- Superseded by: none

## Purpose

This file preserves the practical continuation context for the Coloris vendor integration work so future agents do not need to reconstruct that history from chat.

## High-level outcome

The repository now has:

- a vendored Coloris module under `web/js/coloris/`
- repository-specific glue in `coloris_shared.js`
- lazy initialization so popup DOM is not created at module load
- CSS loaded from JS
- Selection Toolbox integration through `node_custom_color`
- popup-only, mouse-first usage for the current project needs

## Important constraints carried forward

The following were explicit project constraints for this work:

- do not reintroduce inline picker mode
- do not reintroduce keyboard navigation / keyboard shortcuts
- keep overall theme integration but do not rewrite global dark/light project logic
- do not enable alpha in the node custom color defaults
- keep the current `web/js` subfolder architecture
- preserve an understandable relationship to upstream vendor code

## Current default picker shape

The current picker defaults aim for a pill-style popup with:

- `theme: "pill"`
- `alpha: false`
- `format: "hex"`
- `formatToggle: true`
- `clearButton: false`
- `closeButton: false`
- wrapped swatches providing a second row

## Current continuation advice

When continuing work here:

- prefer small CSS tuning over large JS rewrites if only the visuals need adjustment
- keep vendor drift disciplined
- preserve lazy initialization
- preserve the single hidden picker anchor in `node_custom_color`
- be careful with observer changes; the toolbox is dynamic for real reasons

## Relationship to current code

Treat this file as historical continuation context.
The current code still wins if it differs.
If future work changes the vendor policy materially, update:

- `docs/features/coloris_vendor.md`
- `docs/DECISIONS/0002-coloris-vendor-policy.md`
- this handoff if it remains the latest historical continuation reference
