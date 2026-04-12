import { app } from "../../../scripts/app.js";
import { makeKomlevvTweaksCategory } from "../common/common.js";

const EXTENSION_ID = "komlevv.tweaks.canvasStyle";

const SETTING_ID_FORCE_HIDE_BACKGROUND_PATTERN =
  "komlevv.tweaks.canvasStyle.forceHideBackgroundPattern";
const SETTING_ID_BACKGROUND_RENDER_THROTTLE_ENABLED =
  "komlevv.tweaks.canvasStyle.backgroundRenderThrottleEnabled";

const DEFAULT_FORCE_HIDE_BACKGROUND_PATTERN = false;
const DEFAULT_BACKGROUND_RENDER_THROTTLE_ENABLED = false;
const BACKGROUND_RENDER_THROTTLE_FPS = 5;

const PATCH_STATE_KEY = "__komlevvTweaksCanvasStylePatchState";

const currentSettings = {
  forceHideBackgroundPattern: DEFAULT_FORCE_HIDE_BACKGROUND_PATTERN,
  backgroundRenderThrottleEnabled: DEFAULT_BACKGROUND_RENDER_THROTTLE_ENABLED
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
      canvasOriginalDrawBackCanvas: null,
      backgroundRenderListenersBound: false,
      canvasRenderStateByInstance: new WeakMap()
    };
  }

  return globalThis[PATCH_STATE_KEY];
}

function getCanvasMaximumFrameGap(canvas) {
  return typeof canvas?._maximumFrameGap === "number"
    ? canvas._maximumFrameGap
    : 0;
}

function setCanvasMaximumFrameGap(canvas, value) {
  if (typeof canvas?._maximumFrameGap === "number") {
    canvas._maximumFrameGap = value;
  } else {
    canvas.maximumFps = value > 0 ? 1000 / value : 0;
  }
}

function getCanvasRenderState(canvas) {
  const patchState = getPatchState();
  let renderState = patchState.canvasRenderStateByInstance.get(canvas);
  if (renderState) return renderState;

  renderState = {
    baseMaximumFrameGap: getCanvasMaximumFrameGap(canvas),
    basePauseRendering: Boolean(canvas.pause_rendering),
    managed: false,
    mode: "foreground"
  };

  patchState.canvasRenderStateByInstance.set(canvas, renderState);
  return renderState;
}

function captureCanvasRenderBaseState(canvas, renderState) {
  renderState.baseMaximumFrameGap = getCanvasMaximumFrameGap(canvas);
  renderState.basePauseRendering = Boolean(canvas.pause_rendering);
}

function restoreCanvasRenderBaseState(canvas, renderState) {
  setCanvasMaximumFrameGap(canvas, renderState.baseMaximumFrameGap);
  canvas.pause_rendering = renderState.basePauseRendering;
}

function getCanvasBackgroundRenderMode() {
  if (typeof document === "undefined") return "foreground";

  const isHidden = document.visibilityState === "hidden";
  if (isHidden) return "hidden";

  const hasFocus =
    typeof document.hasFocus === "function" ? document.hasFocus() : true;

  return hasFocus ? "foreground" : "background";
}

function syncCurrentCanvasBackgroundRenderMode() {
  const canvas = getCurrentCanvas();
  if (!canvas) return;

  const renderState = getCanvasRenderState(canvas);

  if (!currentSettings.backgroundRenderThrottleEnabled) {
    if (renderState.managed) {
      restoreCanvasRenderBaseState(canvas, renderState);
      renderState.managed = false;
      renderState.mode = "foreground";
      redrawCanvas();
      return;
    }

    captureCanvasRenderBaseState(canvas, renderState);
    return;
  }

  if (!renderState.managed) {
    captureCanvasRenderBaseState(canvas, renderState);
    renderState.managed = true;
  }

  const nextMode = getCanvasBackgroundRenderMode();
  const previousMode = renderState.mode;

  if (nextMode === "hidden") {
    canvas.pause_rendering = true;
  } else if (nextMode === "background") {
    canvas.maximumFps = BACKGROUND_RENDER_THROTTLE_FPS;
    canvas.pause_rendering = renderState.basePauseRendering;
  } else {
    restoreCanvasRenderBaseState(canvas, renderState);
  }

  renderState.mode = nextMode;

  if (previousMode !== nextMode && nextMode === "foreground") {
    redrawCanvas();
  }
}

function ensureBackgroundRenderListeners() {
  const patchState = getPatchState();
  if (patchState.backgroundRenderListenersBound) return;
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const syncBackgroundRenderMode = () => syncCurrentCanvasBackgroundRenderMode();

  window.addEventListener("focus", syncBackgroundRenderMode, true);
  window.addEventListener("blur", syncBackgroundRenderMode, true);
  document.addEventListener(
    "visibilitychange",
    syncBackgroundRenderMode,
    true
  );

  patchState.backgroundRenderListenersBound = true;
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

function applyBackgroundRenderThrottleEnabled(value) {
  currentSettings.backgroundRenderThrottleEnabled = Boolean(value);
  ensureBackgroundRenderListeners();
  syncCurrentCanvasBackgroundRenderMode();
}

function applyAllSettings() {
  ensureCanvasPatch();
  ensureBackgroundRenderListeners();
  syncCurrentCanvasBackgroundRenderMode();
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
      id: SETTING_ID_BACKGROUND_RENDER_THROTTLE_ENABLED,
      category: makeKomlevvTweaksCategory(
        "Canvas Style",
        "Throttle background rendering"
      ),
      name: "Throttle background rendering",
      tooltip:
        "When enabled, keeps normal canvas rendering while focused, limits unfocused rendering to 5 FPS, and pauses canvas drawing while the browser tab is hidden.",
      type: "boolean",
      defaultValue: DEFAULT_BACKGROUND_RENDER_THROTTLE_ENABLED,
      onChange: (value) => applyBackgroundRenderThrottleEnabled(value)
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
