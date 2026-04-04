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
  }

  return normalizeHexColor(fallback, "000000");
}

function normalizeCanvasHexColor(value, fallback = "000000") {
  return `#${normalizeHexColor(value, fallback)}`;
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

function ensureOriginalNodeColors() {
  const patchState = getPatchState();
  if (patchState.originalNodeColors) return patchState.originalNodeColors;

  const LGraphCanvas = getLiteGraphCanvasClass();
  if (!LGraphCanvas?.node_colors) return null;

  patchState.originalNodeColors = cloneNodeColors(LGraphCanvas.node_colors);
  return patchState.originalNodeColors;
}

function loadSavedSettingsIntoCurrentState() {
  for (const presetKey of BUILTIN_PRESET_KEYS) {
    for (const field of PRESET_FIELDS) {
      const defaultValue = normalizeHexColor(BUILTIN_PRESET_DEFAULTS[presetKey][field]);
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
          color: normalizeCanvasHexColor(
            currentSettings[presetKey].color,
            normalizeHexColor(sourcePreset.color)
          ),
          bgcolor: normalizeCanvasHexColor(
            currentSettings[presetKey].bgcolor,
            normalizeHexColor(sourcePreset.bgcolor)
          ),
          groupcolor: normalizeCanvasHexColor(
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

    for (const presetKey of BUILTIN_PRESET_KEYS) {
      const previous = previousNodeColors?.[presetKey];
      const next = nextNodeColors?.[presetKey];
      if (!previous || !next) continue;

      const nodeColor = normalizeCanvasHexColor(node.color ?? previous.color);
      const nodeBgColor = normalizeCanvasHexColor(node.bgcolor ?? previous.bgcolor);
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

      const groupColor = normalizeCanvasHexColor(group.color ?? previous.groupcolor);
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

function setPresetToValues(presetKey, values, syncStoredSettings = false) {
  for (const field of PRESET_FIELDS) {
    const normalized = normalizeHexColor(values[field], normalizeHexColor(BUILTIN_PRESET_DEFAULTS[presetKey][field]));
    currentSettings[presetKey][field] = normalized;

    if (syncStoredSettings) {
      setStoredSettingValue(getSettingId(presetKey, field), normalized);
    }
  }
}

function resetPresetToStock(presetKey, syncStoredSettings = true) {
  setPresetToValues(presetKey, BUILTIN_PRESET_DEFAULTS[presetKey], syncStoredSettings);
  applyNodeColors();
}

function resetAllPresetsToStock(syncStoredSettings = true) {
  for (const presetKey of BUILTIN_PRESET_KEYS) {
    setPresetToValues(presetKey, BUILTIN_PRESET_DEFAULTS[presetKey], syncStoredSettings);
  }
  applyNodeColors();
}

function applyPresetSetting(presetKey, field, value) {
  const fallback = normalizeHexColor(BUILTIN_PRESET_DEFAULTS[presetKey][field]);
  currentSettings[presetKey][field] = normalizeHexColor(value, fallback);
  applyNodeColors();
}

function createPresetFieldSetting(presetKey, field) {
  const label = PRESET_LABELS[presetKey];
  const fieldLabel = PRESET_FIELD_LABELS[field];
  const defaultValue = normalizeHexColor(BUILTIN_PRESET_DEFAULTS[presetKey][field]);

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
