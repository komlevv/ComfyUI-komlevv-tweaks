# Coloris vendor

- Status: stable
- Scope: vendored Coloris policy, lazy initialization, CSS loading strategy, and repository glue boundaries
- Applies to: `web/js/coloris/**`
- Source of truth level: feature
- Last verified commit: 4479a4521e2ea79e6855da1f843825aa95cb4957
- Update when: vendor diff policy, lazy-init behavior, CSS loading strategy, or repository-specific glue boundaries change
- Supersedes: none
- Superseded by: none

## Purpose

This subsystem documents how the vendored Coloris picker is maintained and integrated in this repository.

## Primary files

- `web/js/coloris/coloris.js`
- `web/js/coloris/coloris.css`
- `web/js/coloris/coloris_shared.js`
- `web/js/coloris/README.md`

## Current policy

The vendored copy is intentionally kept close to upstream structure while removing features not needed by this repository.

Repository-specific glue should live primarily in `coloris_shared.js`.

## Current intentional differences from upstream

This vendored copy intentionally removes or avoids:

- virtual instances support
- custom parent container support
- input wrapping / preview field support
- inline mode
- keyboard navigation / keyboard shortcuts
- touch event support
- legacy browser fallbacks / polyfills

## Lazy initialization

The picker must not create popup DOM at module import time.

The current policy is:

- module may auto-load because it lives under `web/js`
- popup DOM should only appear after explicit initialization through the shared helper layer

## CSS loading

Because non-JS files under `web/js` are not auto-loaded, CSS must be loaded from JS.

Keep that behavior explicit.

## What not to do

- Do not turn `coloris.js` into repository-specific application code.
- Do not casually reintroduce inline mode.
- Do not casually reintroduce keyboard navigation.
- Do not move repository glue out of `coloris_shared.js` unless there is a clear structural reason.
- Do not remove lazy initialization.

## Related docs

- `docs/DECISIONS/0002-coloris-vendor-policy.md`
- `web/js/coloris/AGENTS.md`
- `docs/handoffs/2026-04-06-coloris-vendor-clean.md`
