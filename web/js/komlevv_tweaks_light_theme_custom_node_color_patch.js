import { LIGHT_THEME_PRESET_BGCOLORS } from "./komlevv_tweaks_light_theme_preset_colors.js";

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
 * - swaps standard preset colors to a hardcoded light-theme palette when the
 *   light-theme node lightness heuristic is active
 * - restores the original preset colors when switching back away from light theme
 * - forces Selection Toolbox preset previews to use the same raw preset colors
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
const ORIGINAL_NODE_COLORS_MARKER = "__komlevvOriginalNodeColors";
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

function isLightThemeNodeHeuristicActive() {
  const nodeLightness = globalThis?.LiteGraph?.nodeLightness;
  return typeof nodeLightness === "number" && !Number.isNaN(nodeLightness) && nodeLightness !== 0;
}

function cloneNodeColors(nodeColors) {
  return Object.fromEntries(
    Object.entries(nodeColors ?? {}).map(([name, colorOption]) => [
      name,
      colorOption ? { ...colorOption } : colorOption
    ])
  );
}

function colorShade(col, amt) {
  let normalized = String(col ?? "").trim().replace(/^#/, "");
  if (normalized.length === 3) {
    normalized = normalized
      .split("")
      .map((channel) => channel + channel)
      .join("");
  }

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    normalized = "000000";
  }

  let [r, g, b] = normalized.match(/.{2}/g);
  [r, g, b] = [
    parseInt(r, 16) + amt,
    parseInt(g, 16) + amt,
    parseInt(b, 16) + amt
  ];

  r = Math.max(Math.min(255, r), 0).toString(16);
  g = Math.max(Math.min(255, g), 0).toString(16);
  b = Math.max(Math.min(255, b), 0).toString(16);

  return `#${r.padStart(2, "0")}${g.padStart(2, "0")}${b.padStart(2, "0")}`;
}

function getOriginalNodeColors() {
  const graphCanvasRef = globalThis?.LGraphCanvas;
  if (!graphCanvasRef?.node_colors) return null;

  if (!globalThis[ORIGINAL_NODE_COLORS_MARKER]) {
    Object.defineProperty(globalThis, ORIGINAL_NODE_COLORS_MARKER, {
      value: cloneNodeColors(graphCanvasRef.node_colors),
      configurable: false,
      enumerable: false,
      writable: false
    });
  }

  return globalThis[ORIGINAL_NODE_COLORS_MARKER];
}

function buildLightThemePresetNodeColors(originalNodeColors) {
  const nextNodeColors = cloneNodeColors(originalNodeColors);

  for (const [name, bgcolor] of Object.entries(LIGHT_THEME_PRESET_BGCOLORS)) {
    const existing = nextNodeColors[name] ?? {};
    nextNodeColors[name] = {
      ...existing,
      color: colorShade(bgcolor, 20),
      bgcolor,
      groupcolor: bgcolor
    };
  }

  return nextNodeColors;
}

function syncPresetNodeColorsForTheme() {
  const graphCanvasRef = globalThis?.LGraphCanvas;
  const originalNodeColors = getOriginalNodeColors();
  if (!graphCanvasRef || !originalNodeColors) return;

  graphCanvasRef.node_colors = isLightThemeNodeHeuristicActive()
    ? buildLightThemePresetNodeColors(originalNodeColors)
    : cloneNodeColors(originalNodeColors);
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

  syncPresetNodeColorsForTheme();

  const nodeColors = globalThis?.LGraphCanvas?.node_colors ?? {};
  for (const [name, colorOption] of Object.entries(nodeColors)) {
    const selector = `${TOOLBOX_SELECTOR} .p-selectbutton [data-testid="${name}"]`;
    const icons = document.querySelectorAll(selector);
    for (const icon of icons) {
      if (colorOption?.bgcolor) {
        icon.style.color = colorOption.bgcolor;
      } else {
        icon.style.removeProperty("color");
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
  syncPresetNodeColorsForTheme();

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
