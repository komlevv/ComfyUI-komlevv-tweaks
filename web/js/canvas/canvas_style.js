import { app } from "../../../scripts/app.js";
import { makeKomlevvTweaksCategory } from "../common/common.js";
import {
  configureColorisForComfy,
  isComfyLightThemeActive,
  syncColorisThemeMode
} from "../coloris/coloris_shared.js";

const EXTENSION_ID = "komlevv.tweaks.canvasStyle";

const SETTING_ID_FORCE_HIDE_BACKGROUND_PATTERN =
  "komlevv.tweaks.canvasStyle.forceHideBackgroundPattern";
const SETTING_ID_CUSTOM_BACKGROUND_COLOR_ENABLED =
  "komlevv.tweaks.canvasStyle.customBackgroundColorEnabled";
const SETTING_ID_CUSTOM_BACKGROUND_COLOR_DARK =
  "komlevv.tweaks.canvasStyle.customBackgroundColorDark";
const SETTING_ID_CUSTOM_BACKGROUND_COLOR_LIGHT =
  "komlevv.tweaks.canvasStyle.customBackgroundColorLight";
const SETTING_ID_CUSTOM_BACKGROUND_COLOR_RESET =
  "komlevv.tweaks.canvasStyle.customBackgroundColorReset";

const DEFAULT_FORCE_HIDE_BACKGROUND_PATTERN = false;
const DEFAULT_CUSTOM_BACKGROUND_COLOR_ENABLED = false;
const DEFAULT_CUSTOM_BACKGROUND_COLOR_DARK = "#222222";
const DEFAULT_CUSTOM_BACKGROUND_COLOR_LIGHT = "#d8d8d8";

const PATCH_STATE_KEY = "__komlevvTweaksCanvasStylePatchState";
const COLORIS_SETTINGS_PATCH_MARKER = "__komlevvCanvasStyleColorisPatchInstalled";

const currentSettings = {
  forceHideBackgroundPattern: DEFAULT_FORCE_HIDE_BACKGROUND_PATTERN,
  customBackgroundColorEnabled: DEFAULT_CUSTOM_BACKGROUND_COLOR_ENABLED,
  customBackgroundColorDark: DEFAULT_CUSTOM_BACKGROUND_COLOR_DARK,
  customBackgroundColorLight: DEFAULT_CUSTOM_BACKGROUND_COLOR_LIGHT
};

function redrawCanvas() {
  app.canvas?.setDirty?.(true, true);
  app.graph?.setDirtyCanvas?.(true, true);
}

function normalizeCanvasHexColor(value, fallback = "#000000") {
  for (const candidate of [value, fallback, "#000000"]) {
    const source = String(candidate ?? "").trim().replace(/^#/, "");

    if (/^[0-9a-fA-F]{3}$/.test(source)) {
      return `#${source
        .split("")
        .map((channel) => channel + channel)
        .join("")
        .toLowerCase()}`;
    }

    if (/^[0-9a-fA-F]{6}$/.test(source)) {
      return `#${source.toLowerCase()}`;
    }
  }

  return "#000000";
}

function getCurrentCanvas() {
  return (
    app.canvas ?? globalThis?.LiteGraph?.LGraphCanvas?.active_canvas ?? null
  );
}

function getCanvasPrototype() {
  return getCurrentCanvas()?.constructor?.prototype ?? null;
}

function getPatchState() {
  if (!globalThis[PATCH_STATE_KEY]) {
    globalThis[PATCH_STATE_KEY] = {
      canvasPrototype: null,
      canvasOriginalDrawBackCanvas: null
    };
  }

  return globalThis[PATCH_STATE_KEY];
}

function getColorInputSelector() {
  const settingIds = [
    SETTING_ID_CUSTOM_BACKGROUND_COLOR_DARK,
    SETTING_ID_CUSTOM_BACKGROUND_COLOR_LIGHT
  ];

  return settingIds
    .map((settingId) => `[id="${settingId}"]`)
    .join(", ");
}

function ensureColorisSettingsPatch() {
  const selector = getColorInputSelector();

  configureColorisForComfy({
    el: selector,
    theme: "pill",
    alpha: false,
    format: "hex",
    formatToggle: true,
    clearButton: false,
    closeButton: false,
    swatchesOnly: false,
    swatches: [
      "#1f8fe5", "#9ad0f5", "#81e36a", "#f5d21f", "#f58a4b", "#e06a6a",
      "#8e44ad", "#2ecc71", "#3498db", "#f39c12", "#e74c3c", "#95a5a6"
    ]
  });

  if (globalThis[COLORIS_SETTINGS_PATCH_MARKER]) return;

  document.addEventListener("focusin", (event) => {
    if (!(event.target instanceof Element)) return;
    if (!event.target.matches(selector)) return;

    syncColorisThemeMode();
  });

  Object.defineProperty(globalThis, COLORIS_SETTINGS_PATCH_MARKER, {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false
  });
}

function shouldSuppressBackgroundPattern() {
  return currentSettings.forceHideBackgroundPattern;
}

function shouldApplyCustomBackgroundColor() {
  return currentSettings.customBackgroundColorEnabled;
}

function getThemeAwareBackgroundColor() {
  return isComfyLightThemeActive()
    ? currentSettings.customBackgroundColorLight
    : currentSettings.customBackgroundColorDark;
}

function ensureCanvasPatch() {
  const patchState = getPatchState();
  const canvasPrototype = getCanvasPrototype();
  if (!canvasPrototype) return;

  if (
    patchState.canvasPrototype === canvasPrototype &&
    patchState.canvasOriginalDrawBackCanvas
  ) {
    return;
  }

  const originalDrawBackCanvas = canvasPrototype.drawBackCanvas;
  if (typeof originalDrawBackCanvas !== "function") return;

  patchState.canvasPrototype = canvasPrototype;
  patchState.canvasOriginalDrawBackCanvas = originalDrawBackCanvas;

  canvasPrototype.drawBackCanvas = function (...args) {
    const suppressPattern = shouldSuppressBackgroundPattern();
    const applyCustomColor = shouldApplyCustomBackgroundColor();

    if (!suppressPattern && !applyCustomColor) {
      return patchState.canvasOriginalDrawBackCanvas.apply(this, args);
    }

    const originalBackgroundImage = this.background_image;
    const originalClearBackgroundColor = this.clear_background_color;

    if (suppressPattern) {
      this.background_image = "";
      this.clear_background_color = "";
    }

    if (applyCustomColor) {
      this.clear_background_color = getThemeAwareBackgroundColor();
    }

    try {
      return patchState.canvasOriginalDrawBackCanvas.apply(this, args);
    } finally {
      this.background_image = originalBackgroundImage;
      this.clear_background_color = originalClearBackgroundColor;
    }
  };
}

function applyForceHideBackgroundPattern(value) {
  currentSettings.forceHideBackgroundPattern = Boolean(value);
  ensureCanvasPatch();
  redrawCanvas();
}

function applyCustomBackgroundColorEnabled(value) {
  currentSettings.customBackgroundColorEnabled = Boolean(value);
  ensureCanvasPatch();
  redrawCanvas();
}

function applyCustomBackgroundColorDark(value) {
  currentSettings.customBackgroundColorDark = normalizeCanvasHexColor(
    value,
    DEFAULT_CUSTOM_BACKGROUND_COLOR_DARK
  );
  ensureCanvasPatch();
  redrawCanvas();
}

function applyCustomBackgroundColorLight(value) {
  currentSettings.customBackgroundColorLight = normalizeCanvasHexColor(
    value,
    DEFAULT_CUSTOM_BACKGROUND_COLOR_LIGHT
  );
  ensureCanvasPatch();
  redrawCanvas();
}


function setSettingValueIfAvailable(settingId, value) {
  if (typeof app.ui?.settings?.setSettingValue === "function") {
    app.ui.settings.setSettingValue(settingId, value);
    return;
  }

  const input = document.getElementById(settingId);
  if (!(input instanceof HTMLInputElement)) return;

  input.value = String(value ?? "");
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function resetCustomBackgroundColorsToDefault() {
  applyCustomBackgroundColorDark(DEFAULT_CUSTOM_BACKGROUND_COLOR_DARK);
  applyCustomBackgroundColorLight(DEFAULT_CUSTOM_BACKGROUND_COLOR_LIGHT);

  setSettingValueIfAvailable(
    SETTING_ID_CUSTOM_BACKGROUND_COLOR_DARK,
    DEFAULT_CUSTOM_BACKGROUND_COLOR_DARK
  );
  setSettingValueIfAvailable(
    SETTING_ID_CUSTOM_BACKGROUND_COLOR_LIGHT,
    DEFAULT_CUSTOM_BACKGROUND_COLOR_LIGHT
  );
}


function applyCustomBackgroundColorReset(value) {
  if (!Boolean(value)) return;

  resetCustomBackgroundColorsToDefault();
  setSettingValueIfAvailable(SETTING_ID_CUSTOM_BACKGROUND_COLOR_RESET, false);
}

function applyAllSettings() {
  ensureColorisSettingsPatch();
  syncColorisThemeMode();
  ensureCanvasPatch();
  redrawCanvas();
}

const extension = {
  name: EXTENSION_ID,
  settings: [
    {
      id: SETTING_ID_FORCE_HIDE_BACKGROUND_PATTERN,
      category: makeKomlevvTweaksCategory(
        "Canvas Style",
        "Force hide background pattern"
      ),
      name: "Force hide background pattern",
      tooltip:
        "Suppresses LiteGraph background pattern and low-zoom background fill so the canvas background stays visually consistent with or without a custom Canvas Background Image.",
      type: "boolean",
      defaultValue: DEFAULT_FORCE_HIDE_BACKGROUND_PATTERN,
      onChange: (value) => applyForceHideBackgroundPattern(value)
    },
    {
      id: SETTING_ID_CUSTOM_BACKGROUND_COLOR_ENABLED,
      category: makeKomlevvTweaksCategory(
        "Canvas Style",
        "Custom background color enabled"
      ),
      name: "Custom background color enabled",
      tooltip:
        "Enables custom canvas background color override and switches between dark/light color by current ComfyUI theme mode.",
      type: "boolean",
      defaultValue: DEFAULT_CUSTOM_BACKGROUND_COLOR_ENABLED,
      onChange: (value) => applyCustomBackgroundColorEnabled(value)
    },
    {
      id: SETTING_ID_CUSTOM_BACKGROUND_COLOR_DARK,
      category: makeKomlevvTweaksCategory(
        "Canvas Style",
        "Custom background color (dark theme)"
      ),
      name: "Custom background color (dark theme)",
      tooltip: "Canvas clear color override used in dark theme mode.",
      type: "color",
      attrs: {
        "data-coloris": "true"
      },
      defaultValue: DEFAULT_CUSTOM_BACKGROUND_COLOR_DARK,
      onChange: (value) => applyCustomBackgroundColorDark(value)
    },
    {
      id: SETTING_ID_CUSTOM_BACKGROUND_COLOR_LIGHT,
      category: makeKomlevvTweaksCategory(
        "Canvas Style",
        "Custom background color (light theme)"
      ),
      name: "Custom background color (light theme)",
      tooltip: "Canvas clear color override used in light theme mode.",
      type: "color",
      attrs: {
        "data-coloris": "true"
      },
      defaultValue: DEFAULT_CUSTOM_BACKGROUND_COLOR_LIGHT,
      onChange: (value) => applyCustomBackgroundColorLight(value)
    },
    {
      id: SETTING_ID_CUSTOM_BACKGROUND_COLOR_RESET,
      category: makeKomlevvTweaksCategory(
        "Canvas Style",
        "Reset custom background colors"
      ),
      name: "Reset custom background colors to default",
      tooltip:
        "Toggle to reset both dark and light custom background colors to defaults.",
      type: "boolean",
      defaultValue: false,
      onChange: (value) => applyCustomBackgroundColorReset(value)
    }
  ],
  setup() {
    applyAllSettings();
  },
  init() {
    applyAllSettings();
  }
};

app.registerExtension(extension);
