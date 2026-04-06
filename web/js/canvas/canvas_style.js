import { app } from "../../../scripts/app.js";
import { makeKomlevvTweaksCategory } from "../common/common.js";

const EXTENSION_ID = "komlevv.tweaks.canvasStyle";

const SETTING_ID_FORCE_HIDE_BACKGROUND_PATTERN =
  "komlevv.tweaks.canvasStyle.forceHideBackgroundPattern";

const DEFAULT_FORCE_HIDE_BACKGROUND_PATTERN = false;

const PATCH_STATE_KEY = "__komlevvTweaksCanvasStylePatchState";

const currentSettings = {
  forceHideBackgroundPattern: DEFAULT_FORCE_HIDE_BACKGROUND_PATTERN
};

function redrawCanvas() {
  app.canvas?.setDirty?.(true, true);
  app.graph?.setDirtyCanvas?.(true, true);
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

function shouldSuppressBackgroundPattern() {
  return currentSettings.forceHideBackgroundPattern;
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
    if (!shouldSuppressBackgroundPattern()) {
      return patchState.canvasOriginalDrawBackCanvas.apply(this, args);
    }

    const originalBackgroundImage = this.background_image;
    const originalClearBackgroundColor = this.clear_background_color;
    this.background_image = "";
    this.clear_background_color = "";

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

function applyAllSettings() {
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
