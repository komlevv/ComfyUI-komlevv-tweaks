# Local agent rules for `web/js/common`

- Status: stable
- Scope: local rules for shared frontend helpers and cross-cutting patches
- Applies to: `web/js/common/**`
- Source of truth level: local-root
- Last verified commit: 4479a4521e2ea79e6855da1f843825aa95cb4957
- Update when: shared-helper ownership, patch policy, or local invariants change
- Supersedes: none
- Superseded by: none

## Purpose

This directory holds shared frontend logic and cross-cutting patches.

## Local rules

- keep shared helpers generic and reusable across multiple frontend subsystems
- do not move one-off feature-specific behavior into `common` just because it is convenient
- if a patch here changes behavior across multiple subsystems, update the relevant feature docs too
- document any upstream-sensitive patch points in the relevant feature doc
- avoid long-lived caching of live DOM selection state
- avoid broad DOM observation unless the behavior truly requires it

## Important current file

- `light_theme_custom_node_color_patch.js` is a shared cross-cutting patch, not a generic dumping ground for unrelated UI behavior
