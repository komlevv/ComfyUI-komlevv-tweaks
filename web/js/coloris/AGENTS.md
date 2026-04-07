# Local agent rules for `web/js/coloris`

- Status: stable
- Scope: local rules for the vendored Coloris subsystem
- Applies to: `web/js/coloris/**`
- Source of truth level: local-root
- Last verified commit: 4479a4521e2ea79e6855da1f843825aa95cb4957
- Update when: vendor maintenance policy, lazy-init strategy, or local integration boundaries change
- Supersedes: none
- Superseded by: none

## Purpose

This directory contains a vendored dependency area.
Treat it differently from normal repository application code.

## Local rules

- preserve the current upstream-like structure of the vendored files where possible
- keep repository-specific glue primarily in `coloris_shared.js`
- do not casually reintroduce inline mode
- do not casually reintroduce keyboard navigation or keyboard shortcuts
- preserve lazy initialization
- preserve JS-driven CSS loading
- do not turn `coloris.js` into a repository-specific rewrite without an explicit project decision

## Read before editing

Before changing anything here, read:

- `docs/features/coloris_vendor.md`
- `docs/DECISIONS/0002-coloris-vendor-policy.md`
- `web/js/coloris/README.md`
