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

const PRESET_FIELD_LABELS = Object.freeze({
  color: "Title color",
  bgcolor: "Background color",
  groupcolor: "Group color"
});

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

const PRESET_FIELDS = ["color", "bgcolor", "groupcolor"];
const RESET_ALL_SETTING_ID = "komlevv.tweaks.nodeColors.resetAllNow";

const currentSettings = Object.fromEntries(
  BUILTIN_PRESET_KEYS.map((presetKey) => [
    presetKey,
    Object.fromEntries(
      PRESET_FIELDS.map((field) => [
        field,
        "000000"
      ])
    )
  ])
);

function getPatchState() {
  if (!globalThis[PATCH_STATE_KEY]) {
    globalThis[PATCH_STATE_KEY] = {
      originalNodeColorsByTheme: new Map(),
      activeThemeSignature: null,
      lastAppliedThemeSignature: null,
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

function getSettingStore() {
  return app.extensionManager?.setting ?? null;
}

function getSettingId(presetKey, field) {
  return `komlevv.tweaks.nodeColors.${presetKey}.${field}`;
}

function getResetPresetSettingId(presetKey) {
  return `komlevv.tweaks.nodeColors.reset.${presetKey}`;
}

function getStoredSettingValue(settingId, fallback) {
  const store = getSettingStore();
  if (!store?.get) return fallback;

  try {
    const value = store.get(settingId);
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function setStoredSettingValue(settingId, value) {
  const store = getSettingStore();
  if (!store?.set) return;

  try {
    store.set(settingId, value);
  } catch {
    // ignore
  }
}

function clampColorChannel(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.min(255, Math.round(numeric)));
}

function rgbChannelsToHex(red, green, blue) {
  const channels = [red, green, blue].map((value) => clampColorChannel(value));
  if (channels.some((value) => value == null)) return null;

  return channels
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeHue(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;

  const normalized =
    Math.abs(numeric) <= 1
      ? numeric * 360
      : numeric;

  return ((normalized % 360) + 360) % 360;
}

function normalizeColorPercentage(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;

  const normalized =
    Math.abs(numeric) <= 1
      ? numeric * 100
      : numeric;

  return Math.max(0, Math.min(100, normalized));
}

function hsvLikeToHex(hueValue, saturationValue, valueValue) {
  const hue = normalizeHue(hueValue);
  const saturation = normalizeColorPercentage(saturationValue);
  const brightness = normalizeColorPercentage(valueValue);

  if (hue == null || saturation == null || brightness == null) return null;

  const saturationUnit = saturation / 100;
  const brightnessUnit = brightness / 100;
  const chroma = brightnessUnit * saturationUnit;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = brightnessUnit - chroma;

  let redPrime = 0;
  let greenPrime = 0;
  let bluePrime = 0;

  if (hue < 60) {
    redPrime = chroma;
    greenPrime = x;
  } else if (hue < 120) {
    redPrime = x;
    greenPrime = chroma;
  } else if (hue < 180) {
    greenPrime = chroma;
    bluePrime = x;
  } else if (hue < 240) {
    greenPrime = x;
    bluePrime = chroma;
  } else if (hue < 300) {
    redPrime = x;
    bluePrime = chroma;
  } else {
    redPrime = chroma;
    bluePrime = x;
  }

  return rgbChannelsToHex(
    (redPrime + m) * 255,
    (greenPrime + m) * 255,
    (bluePrime + m) * 255
  );
}

function normalizeHexColor(value, fallback = "000000") {
  if (typeof value === "string") {
    const normalized = value.trim().replace(/^#/, "").toLowerCase();

    if (/^[0-9a-f]{3}$/.test(normalized)) {
      return normalized
        .split("")
        .map((channel) => channel + channel)
        .join("");
    }

    if (/^[0-9a-f]{4}$/.test(normalized)) {
      return normalized
        .slice(0, 3)
        .split("")
        .map((channel) => channel + channel)
        .join("");
    }

    if (/^[0-9a-f]{6}$/.test(normalized)) {
      return normalized;
    }

    if (/^[0-9a-f]{8}$/.test(normalized)) {
      return normalized.slice(0, 6);
    }

    const rgbMatch = normalized.match(/^rgba?\(([^)]+)\)$/);
    if (rgbMatch) {
      const channels = rgbMatch[1].split(",").map((part) => part.trim());
      const rgbHex = rgbChannelsToHex(channels[0], channels[1], channels[2]);
      if (rgbHex) return rgbHex;
    }
  }

  if (Array.isArray(value) && value.length >= 3) {
    const rgbHex = rgbChannelsToHex(value[0], value[1], value[2]);
    if (rgbHex) return rgbHex;
  }

  if (value && typeof value === "object") {
    const candidateKeys = ["hex", "value", "color"];
    for (const key of candidateKeys) {
      if (typeof value[key] === "string") {
        return normalizeHexColor(value[key], fallback);
      }
    }

    const rgbHex = rgbChannelsToHex(
      value.r ?? value.red,
      value.g ?? value.green,
      value.b ?? value.blue
    );
    if (rgbHex) return rgbHex;

    const hsvHex = hsvLikeToHex(
      value.h ?? value.hue,
      value.s ?? value.saturation,
      value.v ?? value.b ?? value.value ?? value.brightness
    );
    if (hsvHex) return hsvHex;
  }

  return normalizeHexColor(fallback, "000000");
}

function normalizeCanvasHexColor(value, fallback = "000000") {
  return `#${normalizeHexColor(value, fallback)}`;
}

function clampUnit(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(1, numeric));
}

function hexToRgbUnit(hex) {
  const normalized = normalizeHexColor(hex, "000000");
  return {
    r: parseInt(normalized.slice(0, 2), 16) / 255,
    g: parseInt(normalized.slice(2, 4), 16) / 255,
    b: parseInt(normalized.slice(4, 6), 16) / 255
  };
}

function rgbUnitToHex({ r, g, b }) {
  return [r, g, b]
    .map((value) =>
      Math.round(clampUnit(value) * 255)
        .toString(16)
        .padStart(2, "0")
    )
    .join("");
}

function rgbUnitToHsl({ r, g, b }) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: lightness };
  }

  const delta = max - min;
  const saturation =
    lightness > 0.5
      ? delta / (2 - max - min)
      : delta / (max + min);

  let hue = 0;
  switch (max) {
    case r:
      hue = (g - b) / delta + (g < b ? 6 : 0);
      break;
    case g:
      hue = (b - r) / delta + 2;
      break;
    default:
      hue = (r - g) / delta + 4;
      break;
  }

  hue /= 6;
  return { h: hue, s: saturation, l: lightness };
}

function hueToRgbUnit(p, q, t) {
  let value = t;
  if (value < 0) value += 1;
  if (value > 1) value -= 1;
  if (value < 1 / 6) return p + (q - p) * 6 * value;
  if (value < 1 / 2) return q;
  if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
  return p;
}

function hslToRgbUnit({ h, s, l }) {
  if (s === 0) {
    return { r: l, g: l, b: l };
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: hueToRgbUnit(p, q, h + 1 / 3),
    g: hueToRgbUnit(p, q, h),
    b: hueToRgbUnit(p, q, h - 1 / 3)
  };
}

function getNodeLightnessCompensation() {
  const value = Number(globalThis?.LiteGraph?.nodeLightness ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function compensateHexForRendererLightness(value, fallback = "000000") {
  const normalized = normalizeHexColor(value, fallback);
  const lightnessDelta = getNodeLightnessCompensation();

  if (Math.abs(lightnessDelta) < 1e-6) {
    return `#${normalized}`;
  }

  const hsl = rgbUnitToHsl(hexToRgbUnit(normalized));
  const compensated = {
    h: hsl.h,
    s: hsl.s,
    l: clampUnit(hsl.l - lightnessDelta)
  };

  return `#${rgbUnitToHex(hslToRgbUnit(compensated))}`;
}

function applyRendererLightnessToHex(value, fallback = "000000") {
  const normalized = normalizeHexColor(value, fallback);
  const lightnessDelta = getNodeLightnessCompensation();

  if (Math.abs(lightnessDelta) < 1e-6) {
    return normalized;
  }

  const hsl = rgbUnitToHsl(hexToRgbUnit(normalized));
  const adjusted = {
    h: hsl.h,
    s: hsl.s,
    l: clampUnit(hsl.l + lightnessDelta)
  };

  return rgbUnitToHex(hslToRgbUnit(adjusted));
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

function getThemeSignature() {
  const store = getSettingStore();
  let paletteId = "unknown";

  try {
    const storedPaletteId = store?.get?.("Comfy.ColorPalette");
    if (storedPaletteId != null && storedPaletteId !== "") {
      paletteId = String(storedPaletteId);
    }
  } catch {
    // ignore
  }

  const lightness = Number(globalThis?.LiteGraph?.nodeLightness ?? 0);
  const opacity = Number(globalThis?.LiteGraph?.nodeOpacity ?? 1);

  return `${paletteId}::lightness=${Number.isFinite(lightness) ? lightness : 0}::opacity=${Number.isFinite(opacity) ? opacity : 1}`;
}

function ensureOriginalNodeColors() {
  const patchState = getPatchState();
  const LGraphCanvas = getLiteGraphCanvasClass();
  if (!LGraphCanvas?.node_colors) return null;

  const themeSignature = getThemeSignature();
  patchState.activeThemeSignature = themeSignature;

  const existingSnapshot =
    patchState.originalNodeColorsByTheme?.get?.(themeSignature) ?? null;

  if (existingSnapshot) {
    return existingSnapshot;
  }

  const snapshot = cloneNodeColors(LGraphCanvas.node_colors);
  patchState.originalNodeColorsByTheme.set(themeSignature, snapshot);
  return snapshot;
}

function getThemeStockRawPreset(presetKey) {
  const originalNodeColors = ensureOriginalNodeColors();
  return originalNodeColors?.[presetKey] ?? BUILTIN_PRESET_DEFAULTS[presetKey];
}

function getThemeStockVisibleField(presetKey, field) {
  const rawValue = getThemeStockRawPreset(presetKey)?.[field];
  const rawFallback = normalizeHexColor(BUILTIN_PRESET_DEFAULTS[presetKey][field]);
  return applyRendererLightnessToHex(rawValue, rawFallback);
}

function getThemeStockVisiblePreset(presetKey) {
  return Object.fromEntries(
    PRESET_FIELDS.map((field) => [field, getThemeStockVisibleField(presetKey, field)])
  );
}

function loadSavedSettingsIntoCurrentState() {
  for (const presetKey of BUILTIN_PRESET_KEYS) {
    for (const field of PRESET_FIELDS) {
      const defaultValue = getThemeStockVisibleField(presetKey, field);
      currentSettings[presetKey][field] = normalizeHexColor(
        getStoredSettingValue(getSettingId(presetKey, field), defaultValue),
        defaultValue
      );
    }
  }
}

function buildNodeColorOverrides(baseNodeColors) {
  const source = baseNodeColors ?? BUILTIN_PRESET_DEFAULTS;

  return Object.fromEntries(
    BUILTIN_PRESET_KEYS.map((presetKey) => {
      const sourcePreset = source?.[presetKey] ?? BUILTIN_PRESET_DEFAULTS[presetKey];

      return [
        presetKey,
        {
          color: compensateHexForRendererLightness(
            currentSettings[presetKey].color,
            normalizeHexColor(sourcePreset.color)
          ),
          bgcolor: compensateHexForRendererLightness(
            currentSettings[presetKey].bgcolor,
            normalizeHexColor(sourcePreset.bgcolor)
          ),
          groupcolor: compensateHexForRendererLightness(
            currentSettings[presetKey].groupcolor,
            normalizeHexColor(sourcePreset.groupcolor)
          )
        }
      ];
    })
  );
}

function syncExistingGraphColors(previousNodeColors, nextNodeColors) {
  const graph = getGraph();
  if (!graph) return;

  for (const node of graph._nodes ?? []) {
    if (!node) continue;
    if (typeof node.color !== "string" || typeof node.bgcolor !== "string") continue;

    const nodeColor = normalizeCanvasHexColor(node.color);
    const nodeBgColor = normalizeCanvasHexColor(node.bgcolor);

    for (const presetKey of BUILTIN_PRESET_KEYS) {
      const previous = previousNodeColors?.[presetKey];
      const next = nextNodeColors?.[presetKey];
      if (!previous || !next) continue;

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
    if (typeof group.color !== "string") continue;

    const groupColor = normalizeCanvasHexColor(group.color);

    for (const presetKey of BUILTIN_PRESET_KEYS) {
      const previous = previousNodeColors?.[presetKey];
      const next = nextNodeColors?.[presetKey];
      if (!previous || !next) continue;

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

  const themeSignature = patchState.activeThemeSignature ?? getThemeSignature();
  const previousNodeColors =
    patchState.lastAppliedThemeSignature === themeSignature && patchState.lastAppliedNodeColors
      ? patchState.lastAppliedNodeColors
      : cloneNodeColors(originalNodeColors);

  const nextNodeColors = buildNodeColorOverrides(originalNodeColors);

  syncExistingGraphColors(previousNodeColors, nextNodeColors);

  for (const presetKey of BUILTIN_PRESET_KEYS) {
    LGraphCanvas.node_colors[presetKey] = nextNodeColors[presetKey];
  }

  patchState.lastAppliedThemeSignature = themeSignature;
  patchState.lastAppliedNodeColors = cloneNodeColors(nextNodeColors);
  redrawCanvas();
}

function setPresetToValues(presetKey, values, syncStoredSettings = false) {
  for (const field of PRESET_FIELDS) {
    const normalized = normalizeHexColor(
      values?.[field],
      getThemeStockVisibleField(presetKey, field)
    );
    currentSettings[presetKey][field] = normalized;

    if (syncStoredSettings) {
      setStoredSettingValue(getSettingId(presetKey, field), normalized);
    }
  }
}

function resetPresetToStock(presetKey, syncStoredSettings = true) {
  setPresetToValues(presetKey, getThemeStockVisiblePreset(presetKey), syncStoredSettings);
  applyNodeColors();
}

function resetAllPresetsToStock(syncStoredSettings = true) {
  for (const presetKey of BUILTIN_PRESET_KEYS) {
    setPresetToValues(presetKey, getThemeStockVisiblePreset(presetKey), syncStoredSettings);
  }
  applyNodeColors();
}

function applyPresetSetting(presetKey, field, value) {
  const fallback = getThemeStockVisibleField(presetKey, field);
  currentSettings[presetKey][field] = normalizeHexColor(value, fallback);
  applyNodeColors();
}

function createPresetFieldSetting(presetKey, field) {
  const label = PRESET_LABELS[presetKey];
  const fieldLabel = PRESET_FIELD_LABELS[field];
  const defaultValue = getThemeStockVisibleField(presetKey, field);

  return {
    id: getSettingId(presetKey, field),
    category: makeKomlevvTweaksCategory("Node Colors", `${label} / ${fieldLabel}`),
    name: `${label} / ${fieldLabel}`,
    tooltip: `Changes the ${fieldLabel.toLowerCase()} for the built-in ${label.toLowerCase()} LiteGraph preset.`,
    type: "color",
    defaultValue,
    onChange: (value) => applyPresetSetting(presetKey, field, value)
  };
}

function createResetPresetSetting(presetKey) {
  const label = PRESET_LABELS[presetKey];
  const settingId = getResetPresetSettingId(presetKey);

  return {
    id: settingId,
    category: makeKomlevvTweaksCategory("Node Colors", `${label} / Reset to stock`),
    name: `Reset ${label} preset to stock now`,
    tooltip: `Immediately restores all ${label.toLowerCase()} preset colors to the built-in LiteGraph defaults.`,
    type: "boolean",
    defaultValue: false,
    onChange: (value) => {
      if (!value) return;
      resetPresetToStock(presetKey, true);
      setStoredSettingValue(settingId, false);
    }
  };
}

function createResetAllSetting() {
  return {
    id: RESET_ALL_SETTING_ID,
    category: makeKomlevvTweaksCategory("Node Colors", "Reset all presets to stock"),
    name: "Reset all presets to stock now",
    tooltip: "Immediately restores all built-in LiteGraph presets to their stock colors.",
    type: "boolean",
    defaultValue: false,
    onChange: (value) => {
      if (!value) return;
      resetAllPresetsToStock(true);
      setStoredSettingValue(RESET_ALL_SETTING_ID, false);
    }
  };
}

function createResetPresetCommand(presetKey) {
  const label = PRESET_LABELS[presetKey];

  return {
    id: `komlevv.tweaks.nodeColors.reset.${presetKey}`,
    label: `Reset Node Colors: ${label} preset to stock`,
    function: () => resetPresetToStock(presetKey, true)
  };
}

function applyAllSettings() {
  loadSavedSettingsIntoCurrentState();
  applyNodeColors();
}

const extension = {
  name: EXTENSION_ID,
  settings: [
    createResetAllSetting(),
    ...BUILTIN_PRESET_KEYS.flatMap((presetKey) => [
      createResetPresetSetting(presetKey),
      ...PRESET_FIELDS.map((field) => createPresetFieldSetting(presetKey, field))
    ])
  ],
  commands: [
    {
      id: "komlevv.tweaks.nodeColors.reset.all",
      label: "Reset Node Colors: all presets to stock",
      function: () => resetAllPresetsToStock(true)
    },
    ...BUILTIN_PRESET_KEYS.map((presetKey) => createResetPresetCommand(presetKey))
  ],
  setup() {
    applyAllSettings();
  },
  init() {
    applyAllSettings();
  }
};

app.registerExtension(extension);
