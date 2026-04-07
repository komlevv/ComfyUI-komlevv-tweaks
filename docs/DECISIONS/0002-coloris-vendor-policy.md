# 0002 - Coloris vendor policy

- Status: stable
- Scope: durable rationale for how vendored Coloris is maintained in this repository
- Applies to: `web/js/coloris/**`, `docs/features/coloris_vendor.md`, `web/js/node_custom_color/**`
- Source of truth level: decision
- Last verified commit: 4479a4521e2ea79e6855da1f843825aa95cb4957
- Update when: vendor maintenance policy or integration strategy changes
- Supersedes: none
- Superseded by: none

## Decision

Vendored Coloris is maintained as a trimmed upstream-like copy rather than being rewritten into a repository-specific picker.

Repository-specific behavior should live primarily in `coloris_shared.js` and in integration code outside the vendor file.

## Why

This preserves:

- easier future diffs against upstream
- more understandable maintenance
- smaller local customization surface
- better separation between vendor behavior and repository glue

## Additional constraints

The current vendor policy intentionally keeps the picker:

- popup-oriented
- lazy-initialized
- desktop-browser focused

The repository intentionally does not want to reintroduce, without strong justification:

- inline mode
- keyboard navigation / keyboard shortcuts
- touch-specific behavior
- project-specific rewrites of the upstream file structure

## Consequences

- changes to `coloris.js` should be conservative
- local integration work should prefer `coloris_shared.js`
- changes that expand vendor drift must update the feature doc and this decision record

## Revisit

Revisit this only if the project intentionally decides to stop tracking upstream structure.
