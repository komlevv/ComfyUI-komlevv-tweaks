/**
 * Shared frontend patch for ComfyUI light-theme node color rendering.
 *
 * Problem:
 * When a color palette has `light_theme: true`, ComfyUI frontend sets
 * `LiteGraph.nodeLightness` and then adjusts node `renderingColor` /
 * `renderingBgColor` through a lightness heuristic at render time.
 *
 * That behavior is fine for built-in palette colors, but it breaks explicit
 * custom node colors because the final rendered color is no longer WYSIWYG.
 * In practice, some custom colors are shifted, some title/body pairs diverge,
 * and darker colors can collapse toward neutral gray in light themes.
 *
 * Why this file exists:
 * Extensions that assign explicit `node.color` / `node.bgcolor` need a shared,
 * deterministic fix so those overrides render exactly as chosen by the user,
 * even when the active palette uses `light_theme: true`.
 *
 * What this patch does:
 * It wraps LiteGraph's `renderingColor` and `renderingBgColor` getters and
 * bypasses `LiteGraph.nodeLightness` only for nodes that already have explicit
 * custom colors assigned. Nodes without explicit overrides continue using the
 * default ComfyUI light-theme behavior.
 *
 * Usage:
 * Import this module from any extension that depends on exact custom node
 * colors, then call `patchLightThemeCustomNodeColors()` before the rest of the
 * extension logic runs.
 */
const PATCH_MARKER = "__komlevvCustomNodeColorLightThemePatched";

function definePatchedGetter(target, propertyName, descriptor, shouldBypass) {
  Object.defineProperty(target, propertyName, {
    configurable: true,
    enumerable: descriptor.enumerable ?? false,
    get() {
      if (!shouldBypass(this)) {
        return descriptor.get.call(this);
      }

      const LiteGraphRef = globalThis?.LiteGraph;
      const previousNodeLightness = LiteGraphRef?.nodeLightness;

      if (LiteGraphRef) {
        LiteGraphRef.nodeLightness = undefined;
      }

      try {
        return descriptor.get.call(this);
      } finally {
        if (LiteGraphRef) {
          LiteGraphRef.nodeLightness = previousNodeLightness;
        }
      }
    }
  });
}

export function patchLightThemeCustomNodeColors() {
  const LiteGraphRef = globalThis?.LiteGraph;
  const nodePrototype = LiteGraphRef?.LGraphNode?.prototype;
  if (!LiteGraphRef || !nodePrototype) return false;
  if (nodePrototype[PATCH_MARKER]) return true;

  const renderingColorDescriptor = Object.getOwnPropertyDescriptor(
    nodePrototype,
    "renderingColor"
  );
  const renderingBgColorDescriptor = Object.getOwnPropertyDescriptor(
    nodePrototype,
    "renderingBgColor"
  );

  if (!renderingColorDescriptor?.get || !renderingBgColorDescriptor?.get) {
    return false;
  }

  definePatchedGetter(
    nodePrototype,
    "renderingColor",
    renderingColorDescriptor,
    (node) => node?.color != null
  );
  definePatchedGetter(
    nodePrototype,
    "renderingBgColor",
    renderingBgColorDescriptor,
    (node) => node?.bgcolor != null
  );

  Object.defineProperty(nodePrototype, PATCH_MARKER, {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false
  });

  return true;
}

export function isLightThemeCustomNodeColorPatchApplied() {
  return Boolean(globalThis?.LiteGraph?.LGraphNode?.prototype?.[PATCH_MARKER]);
}
