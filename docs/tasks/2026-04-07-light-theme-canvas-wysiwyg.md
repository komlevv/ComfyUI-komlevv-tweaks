# Light-theme canvas WYSIWYG

- Status: active
- Scope: active task context for light-theme canvas/background color behavior
- Applies to: `web/js/canvas/**`, light-theme-related shared color behavior only where directly relevant to canvas/background
- Source of truth level: task
- Last verified commit: 4479a4521e2ea79e6855da1f843825aa95cb4957
- Update when: hypothesis, target files, patch location, or regression surface changes
- Supersedes: none
- Superseded by: none

## Goal

Adjust canvas/background color behavior under light theme so it becomes more WYSIWYG and visually closer to the expected stock result after the built-in light-theme heuristic was bypassed elsewhere.

## Problem statement

After the light-theme heuristic was disabled or bypassed for relevant color handling, the canvas/background became visually darker than expected.

The task is to restore a visually correct background result without regressing the already-working node/group custom color and toolbox preview behavior.

## Working assumptions

- current code in `main` is the primary truth
- the repository already contains light-theme explicit color patching and toolbox preview handling
- canvas/background behavior must be investigated separately from explicit node/group color rendering

## Investigation order

1. inspect the current `web/js` tree
2. identify current canvas-related modules
3. identify current light-theme shared patch modules
4. inspect matching upstream frontend source for the validated versions
5. locate where canvas/background color is computed upstream
6. locate where light-theme compensation or visual heuristics influence that path
7. determine which local bypass or patch caused the darker background
8. apply the smallest targeted fix

## Target local areas

- `web/js/canvas/canvas_style.js`
- relevant shared light-theme helpers only if the background issue intersects them directly

## Regression surface

A fix must avoid regressing:

- node custom colors
- group custom colors
- toolbox preset preview colors
- toolbox current-color preview behavior
- existing canvas pattern suppression behavior

## Deliverable expectation

A focused fix, not a global color pipeline rewrite.

Current branch implementation adds an explicit canvas background override workflow with:

- enable/disable toggle
- separate dark-theme and light-theme color values
- Coloris-backed picker inputs for those values

while keeping node/group custom color and toolbox preview behavior untouched.
