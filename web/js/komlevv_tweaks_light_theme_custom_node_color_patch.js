/**
 * Shared frontend patch for ComfyUI light-theme explicit color rendering.
 *
 * Problem:
 * When a palette has `light_theme: true`, ComfyUI frontend applies extra
 * lightness adjustments in two places:
 * 1. node rendering via `LiteGraph.nodeLightness`
 * 2. Selection Toolbox color preview swatches via a separate light-theme path
 *
 * For extensions that want WYSIWYG explicit colors, both behaviors are
 * undesirable because the preview and/or final rendered node color differ from
 * the actual explicit `node.color` / `node.bgcolor` values.
 *
 * What this patch does:
 * - bypasses `LiteGraph.nodeLightness` for nodes with explicit colors
 * - forces Selection Toolbox preset previews to use raw preset bg colors
 * - forces the Selection Toolbox current-color indicator to use the raw
 *   explicit color of the selected node/group when there is an unambiguous
 *   explicit color to show
 *
 * Scope:
 * This affects both custom picker colors and standard preset colors once they
 * are stored as explicit node/group colors. That is intentional for extensions
 * that want toolbox preview and applied colors to stay WYSIWYG.
 *
 * Usage:
 * Import this module from any extension that depends on exact explicit colors,
 * then call `patchLightThemeCustomNodeColors()` before the rest of the
 * extension logic runs.
 */
const NODE_PATCH_MARKER = "__komlevvCustomNodeColorLightThemePatched";
const TOOLBOX_PATCH_MARKER = "__komlevvLightThemeToolboxPreviewPatched";
const TOOLBOX_SELECTOR = ".selection-toolbox";
const CURRENT_COLOR_SELECTOR =
  '.selection-toolbox [data-testid="color-picker-current-color"]';

function isGraphNode(item) {
  const LGraphNodeRef = globalThis?.LiteGraph?.LGraphNode;
  return Boolean(LGraphNodeRef && item instanceof LGraphNodeRef);
}

function isGraphGroup(item) {
  const LGraphGroupRef = globalThis?.LiteGraph?.LGraphGroup;
  return Boolean(LGraphGroupRef && item instanceof LGraphGroupRef);
}

function isColorTarget(item) {
  return isGraphNode(item) || isGraphGroup(item);
}

function getSelectedTargets() {
  const graphcanvas = globalThis?.LGraphCanvas?.active_canvas;
  const selectedItems = [...(graphcanvas?.selectedItems ?? [])].filter(isColorTarget);
  if (selectedItems.length) {
    return selectedItems;
  }

  const selectedNodes = Object.values(graphcanvas?.selected_nodes ?? {}).filter(isGraphNode);
  if (selectedNodes.length) {
    return selectedNodes;
  }

  const selectedGroup = graphcanvas?.selected_group ?? graphcanvas?.selectedGroup;
  return selectedGroup && isGraphGroup(selectedGroup) ? [selectedGroup] : [];
}

function getExplicitPreviewColor(target) {
  if (isGraphGroup(target)) {
    return target.color ?? null;
  }

  if (isGraphNode(target)) {
    return target.bgcolor ?? null;
  }

  return null;
}

function getUniformExplicitPreviewColor() {
  const targets = getSelectedTargets();
  if (!targets.length) return null;

  const colors = targets.map(getExplicitPreviewColor);
  const firstColor = colors[0];
  if (firstColor == null) return null;

  return colors.every((color) => color === firstColor) ? firstColor : null;
}

function syncToolboxPreviewColors() {
  if (typeof document === "undefined") return;

  const nodeColors = globalThis?.LGraphCanvas?.node_colors ?? {};
  for (const [name, colorOption] of Object.entries(nodeColors)) {
    const selector = `${TOOLBOX_SELECTOR} .p-selectbutton [data-testid="${name}"]`;
    const icons = document.querySelectorAll(selector);
    for (const icon of icons) {
      if (colorOption?.bgcolor) {
        icon.style.color = colorOption.bgcolor;
      }
    }
  }

  const explicitPreviewColor = getUniformExplicitPreviewColor();
  const currentColorIcons = document.querySelectorAll(CURRENT_COLOR_SELECTOR);
  for (const icon of currentColorIcons) {
    if (explicitPreviewColor) {
      icon.style.color = explicitPreviewColor;
    } else {
      icon.style.removeProperty("color");
    }
  }
}

export function patchLightThemeToolboxPreviewColors() {
  if (typeof document === "undefined") return false;
  if (globalThis[TOOLBOX_PATCH_MARKER]) return true;

  let pendingSync = false;
  let isApplyingPatch = false;

  const queueSync = () => {
    if (pendingSync) return;
    pendingSync = true;

    requestAnimationFrame(() => {
      pendingSync = false;
      isApplyingPatch = true;
      try {
        syncToolboxPreviewColors();
      } finally {
        isApplyingPatch = false;
      }
    });
  };

  const observer = new MutationObserver(() => {
    if (isApplyingPatch) return;
    queueSync();
  });

  const observerTarget = document.body ?? document.documentElement;
  if (observerTarget) {
    observer.observe(observerTarget, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class", "aria-pressed", "data-p-highlight"]
    });
  }

  Object.defineProperty(globalThis, TOOLBOX_PATCH_MARKER, {
    value: observer,
    configurable: false,
    enumerable: false,
    writable: false
  });

  queueSync();
  return true;
}

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
  patchLightThemeToolboxPreviewColors();

  const LiteGraphRef = globalThis?.LiteGraph;
  const nodePrototype = LiteGraphRef?.LGraphNode?.prototype;
  if (!LiteGraphRef || !nodePrototype) return false;
  if (nodePrototype[NODE_PATCH_MARKER]) return true;

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

  Object.defineProperty(nodePrototype, NODE_PATCH_MARKER, {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false
  });

  return true;
}

export function isLightThemeCustomNodeColorPatchApplied() {
  return Boolean(globalThis?.LiteGraph?.LGraphNode?.prototype?.[NODE_PATCH_MARKER]);
}
