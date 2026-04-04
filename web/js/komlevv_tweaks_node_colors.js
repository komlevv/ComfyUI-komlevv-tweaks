import { app } from "../../scripts/app.js";
import { makeKomlevvTweaksCategory } from "./komlevv_tweaks_common.js";

const EXTENSION_ID = "komlevv.tweaks.nodeColors";
const PATCH_STATE_KEY = "__komlevvTweaksNodeColorsPatchState";
const COLOR_PICKER_BORDER_STYLE_ID = "komlevv-tweaks-color-picker-border-style";

const BUILTIN_PRESET_KEYS = [
  "red",
  "brown",
  "green",
  "blue",
  "pale_blue",
  "cyan",
  "purple",
  "yellow",
  "black"
];

const BUILTIN_PRESET_DEFAULTS = Object.freeze({
  red: { color: "#322", bgcolor: "#533", groupcolor: "#A88" },
  brown: { color: "#332922", bgcolor: "#593930", groupcolor: "#b06634" },
  green: { color: "#232", bgcolor: "#353", groupcolor: "#8A8" },
  blue: { color: "#223", bgcolor: "#335", groupcolor: "#88A" },
  pale_blue: { color: "#2a363b", bgcolor: "#3f5159", groupcolor: "#3f789e" },
  cyan: { color: "#233", bgcolor: "#355", groupcolor: "#8AA" },
  purple: { color: "#323", bgcolor: "#535", groupcolor: "#a1309b" },
  yellow: { color: "#432", bgcolor: "#653", groupcolor: "#b58b2a" },
  black: { color: "#222", bgcolor: "#000", groupcolor: "#444" }
});

const PRESET_LABELS = Object.freeze({
  red: "Red",
  brown: "Brown",
  green: "Green",
  blue: "Blue",
  pale_blue: "Pale blue",
  cyan: "Cyan",
  purple: "Purple",
  yellow: "Yellow",
  black: "Black"
});

const SETTING_IDS = Object.freeze(
  Object.fromEntries(
    BUILTIN_PRESET_KEYS.map((presetKey) => [
      presetKey,
      `komlevv.tweaks.nodeColors.${presetKey}`
    ])
  )
);

const currentSettings = Object.fromEntries(
  BUILTIN_PRESET_KEYS.map((presetKey) => [
    presetKey,
    BUILTIN_PRESET_DEFAULTS[presetKey].bgcolor.replace(/^#/, "").toLowerCase()
  ])
);

function getPatchState() {
  if (!globalThis[PATCH_STATE_KEY]) {
    globalThis[PATCH_STATE_KEY] = {
      originalNodeColors: null,
      lastAppliedNodeColors: null
    };
  }

  return globalThis[PATCH_STATE_KEY];
}

function getCurrentCanvas() {
  return (
    app.canvas ?? globalThis?.LiteGraph?.LGraphCanvas?.active_canvas ?? null
  );
}

function getGraph() {
  return app.graph ?? getCurrentCanvas()?.graph ?? null;
}

function redrawCanvas() {
  app.canvas?.setDirty?.(true, true);
  app.graph?.setDirtyCanvas?.(true, true);
}

function ensureColorPickerBorderStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById(COLOR_PICKER_BORDER_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = COLOR_PICKER_BORDER_STYLE_ID;
  style.textContent = `
    .comfy-settings-dialog .p-colorpicker-preview,
    .p-dialog .p-colorpicker-preview {
      border: 1px solid var(--p-inputtext-border-color, var(--border-color, #b6c1cf));
      box-sizing: border-box;
    }
  `;

  document.head.append(style);
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeHexColor(value, fallback = "000000") {
  const normalized = String(value ?? "")
    .trim()
    .replace(/^#/, "")
    .toLowerCase();

  return /^[0-9a-f]{6}$/.test(normalized) ? normalized : fallback;
}

function expandHexColor(value) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/^#/, "")
    .toLowerCase();

  if (/^[0-9a-f]{3}$/.test(normalized)) {
    return normalized
      .split("")
      .map((channel) => channel + channel)
      .join("");
  }

  return /^[0-9a-f]{6}$/.test(normalized) ? normalized : null;
}

function normalizeCanvasHexColor(value) {
  const expanded = expandHexColor(value);
  return expanded ? `#${expanded}` : null;
}

function hexToRgb(hex) {
  const expanded = expandHexColor(hex);
  if (!expanded) return null;

  return {
    red: Number.parseInt(expanded.slice(0, 2), 16),
    green: Number.parseInt(expanded.slice(2, 4), 16),
    blue: Number.parseInt(expanded.slice(4, 6), 16)
  };
}

function rgbToHex({ red, green, blue }) {
  const toHex = (channel) =>
    clampNumber(Math.round(channel), 0, 255).toString(16).padStart(2, "0");

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function mixColors(sourceHex, targetHex, amount) {
  const source = hexToRgb(sourceHex);
  const target = hexToRgb(targetHex);
  if (!source || !target) return "#000000";

  const blend = clampNumber(amount, 0, 1);
  return rgbToHex({
    red: source.red + (target.red - source.red) * blend,
    green: source.green + (target.green - source.green) * blend,
    blue: source.blue + (target.blue - source.blue) * blend
  });
}

function getRelativeLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const toLinear = (channel) => {
    const value = channel / 255;
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  };

  return (
    0.2126 * toLinear(rgb.red) +
    0.7152 * toLinear(rgb.green) +
    0.0722 * toLinear(rgb.blue)
  );
}

function derivePresetColorOption(bgHex) {
  const background = normalizeCanvasHexColor(bgHex) ?? "#000000";
  const luminance = getRelativeLuminance(background);

  const color =
    luminance < 0.12
      ? mixColors(background, "#ffffff", 0.18)
      : luminance > 0.65
        ? mixColors(background, "#000000", 0.42)
        : mixColors(background, "#000000", 0.24);

  const groupcolor =
    luminance < 0.52
      ? mixColors(background, "#ffffff", 0.36)
      : mixColors(background, "#000000", 0.16);

  return {
    color,
    bgcolor: background,
    groupcolor
  };
}

function cloneNodeColors(nodeColors) {
  return Object.fromEntries(
    Object.entries(nodeColors ?? {}).map(([key, value]) => [
      key,
      value
        ? {
            color: value.color,
            bgcolor: value.bgcolor,
            groupcolor: value.groupcolor
          }
        : value
    ])
  );
}

function getLiteGraphCanvasClass() {
  return globalThis?.LiteGraph?.LGraphCanvas ?? null;
}

function ensureOriginalNodeColors() {
  const patchState = getPatchState();
  if (patchState.originalNodeColors) return patchState.originalNodeColors;

  const LGraphCanvas = getLiteGraphCanvasClass();
  if (!LGraphCanvas?.node_colors) return null;

  patchState.originalNodeColors = cloneNodeColors(LGraphCanvas.node_colors);
  return patchState.originalNodeColors;
}

function buildNodeColorOverrides(baseNodeColors) {
  const source = baseNodeColors ?? BUILTIN_PRESET_DEFAULTS;

  return Object.fromEntries(
    BUILTIN_PRESET_KEYS.map((presetKey) => {
      const fallbackHex =
        normalizeCanvasHexColor(source?.[presetKey]?.bgcolor) ??
        normalizeCanvasHexColor(BUILTIN_PRESET_DEFAULTS[presetKey].bgcolor) ??
        "#000000";

      const normalizedSetting = normalizeHexColor(
        currentSettings[presetKey],
        fallbackHex.replace(/^#/, "")
      );

      return [presetKey, derivePresetColorOption(normalizedSetting)];
    })
  );
}

function syncExistingGraphColors(previousNodeColors, nextNodeColors) {
  const graph = getGraph();
  if (!graph) return;

  for (const node of graph._nodes ?? []) {
    if (!node) continue;

    for (const presetKey of BUILTIN_PRESET_KEYS) {
      const previous = previousNodeColors?.[presetKey];
      const next = nextNodeColors?.[presetKey];
      if (!previous || !next) continue;

      const nodeColor = normalizeCanvasHexColor(node.color);
      const nodeBgColor = normalizeCanvasHexColor(node.bgcolor);
      const previousColor = normalizeCanvasHexColor(previous.color);
      const previousBgColor = normalizeCanvasHexColor(previous.bgcolor);

      if (nodeColor === previousColor && nodeBgColor === previousBgColor) {
        node.color = next.color;
        node.bgcolor = next.bgcolor;
        break;
      }
    }
  }

  for (const group of graph._groups ?? []) {
    if (!group) continue;

    for (const presetKey of BUILTIN_PRESET_KEYS) {
      const previous = previousNodeColors?.[presetKey];
      const next = nextNodeColors?.[presetKey];
      if (!previous || !next) continue;

      const groupColor = normalizeCanvasHexColor(group.color);
      const previousGroupColor = normalizeCanvasHexColor(previous.groupcolor);

      if (groupColor === previousGroupColor) {
        group.color = next.groupcolor;
        break;
      }
    }
  }
}

function applyNodeColors() {
  ensureColorPickerBorderStyle();

  const LGraphCanvas = getLiteGraphCanvasClass();
  if (!LGraphCanvas?.node_colors) {
    console.warn(`[${EXTENSION_ID}] LiteGraph.LGraphCanvas.node_colors is not available.`);
    return;
  }

  const patchState = getPatchState();
  const originalNodeColors = ensureOriginalNodeColors();
  if (!originalNodeColors) return;

  const nextNodeColors = buildNodeColorOverrides(originalNodeColors);
  const previousNodeColors =
    patchState.lastAppliedNodeColors ?? cloneNodeColors(originalNodeColors);

  syncExistingGraphColors(previousNodeColors, nextNodeColors);

  for (const presetKey of BUILTIN_PRESET_KEYS) {
    LGraphCanvas.node_colors[presetKey] = nextNodeColors[presetKey];
  }

  patchState.lastAppliedNodeColors = cloneNodeColors(nextNodeColors);
  redrawCanvas();
}

function applyPresetSetting(presetKey, value) {
  const fallback = BUILTIN_PRESET_DEFAULTS[presetKey].bgcolor.replace(/^#/, "");
  currentSettings[presetKey] = normalizeHexColor(value, fallback);
  applyNodeColors();
}

function createPresetSetting(presetKey) {
  const label = PRESET_LABELS[presetKey];

  return {
    id: SETTING_IDS[presetKey],
    category: makeKomlevvTweaksCategory("Node Colors", label),
    name: label,
    tooltip:
      `Changes LiteGraph built-in ${label.toLowerCase()} preset background color. ` +
      "Node title and group accent colors are derived automatically from the chosen value.",
    type: "color",
    defaultValue: BUILTIN_PRESET_DEFAULTS[presetKey].bgcolor.replace(/^#/, ""),
    onChange: (value) => applyPresetSetting(presetKey, value)
  };
}

function applyAllSettings() {
  applyNodeColors();
}

const extension = {
  name: EXTENSION_ID,
  settings: BUILTIN_PRESET_KEYS.map((presetKey) => createPresetSetting(presetKey)),
  setup() {
    applyAllSettings();
  },
  init() {
    applyAllSettings();
  }
};

app.registerExtension(extension);
