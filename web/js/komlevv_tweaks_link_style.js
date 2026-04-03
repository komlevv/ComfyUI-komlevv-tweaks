import { app } from "../../scripts/app.js";
import { makeKomlevvTweaksCategory } from "./komlevv_tweaks_common.js";

const EXTENSION_ID = "komlevv.tweaks.linkStyle";
const SETTING_ID_REROUTE_DOT_RADIUS = "komlevv.tweaks.linkStyle.rerouteDotRadius";
const SETTING_ID_LINK_WIDTH = "komlevv.tweaks.linkStyle.linkWidth";
const SETTING_ID_LINK_STROKE_WIDTH = "komlevv.tweaks.linkStyle.linkStrokeWidth";

const DEFAULT_REROUTE_DOT_RADIUS = 6;
const MIN_REROUTE_DOT_RADIUS = 3;
const MAX_REROUTE_DOT_RADIUS = 16;

const DEFAULT_LINK_WIDTH = 3;
const MIN_LINK_WIDTH = 1;
const MAX_LINK_WIDTH = 12;

const DEFAULT_LINK_STROKE_WIDTH = 4;
const MIN_LINK_STROKE_WIDTH = 1;
const MAX_LINK_STROKE_WIDTH = 12;

const PATCH_STATE_KEY = "__komlevvTweaksLinkStylePatchState";

let initialized = false;

const currentSettings = {
  rerouteDotRadius: DEFAULT_REROUTE_DOT_RADIUS,
  linkWidth: DEFAULT_LINK_WIDTH,
  linkStrokeWidth: DEFAULT_LINK_STROKE_WIDTH
};

function clampInteger(value, fallback, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function getPatchState() {
  if (!globalThis[PATCH_STATE_KEY]) {
    globalThis[PATCH_STATE_KEY] = {
      canvasPrototype: null,
      canvasOriginalBuildLinkRenderContext: null,
      linkRendererPrototype: null,
      linkRendererOriginalConvertToPathRenderContext: null
    };
  }

  return globalThis[PATCH_STATE_KEY];
}

function getCurrentCanvas() {
  return app.canvas ?? null;
}

function getCanvasPrototype() {
  return getCurrentCanvas()?.constructor?.prototype ?? null;
}

function getLinkRendererPrototype() {
  return getCurrentCanvas()?.linkRenderer?.constructor?.prototype ?? null;
}

function getRerouteClass() {
  return globalThis?.LiteGraph?.Reroute;
}

function redrawCanvas() {
  app.canvas?.setDirty?.(true, true);
  app.graph?.setDirtyCanvas?.(true, true);
}

function getEffectiveLinkWidth(canvas) {
  return canvas?.low_quality ? DEFAULT_LINK_WIDTH : currentSettings.linkWidth;
}

function getEffectiveLinkStrokeWidth(linkRenderContext) {
  return linkRenderContext?.lowQuality
    ? DEFAULT_LINK_STROKE_WIDTH
    : currentSettings.linkStrokeWidth;
}

function syncCurrentCanvasLinkWidth() {
  const canvas = getCurrentCanvas();
  if (!canvas) return;

  canvas.connections_width = getEffectiveLinkWidth(canvas);
}

function ensureCanvasPatch() {
  const patchState = getPatchState();
  const canvasPrototype = getCanvasPrototype();
  if (!canvasPrototype) return;

  if (
    patchState.canvasPrototype === canvasPrototype &&
    patchState.canvasOriginalBuildLinkRenderContext
  ) {
    return;
  }

  const originalBuildLinkRenderContext =
    canvasPrototype.buildLinkRenderContext;
  if (typeof originalBuildLinkRenderContext !== "function") return;

  patchState.canvasPrototype = canvasPrototype;
  patchState.canvasOriginalBuildLinkRenderContext =
    originalBuildLinkRenderContext;

  canvasPrototype.buildLinkRenderContext = function (...args) {
    this.connections_width = getEffectiveLinkWidth(this);

    const linkRenderContext =
      patchState.canvasOriginalBuildLinkRenderContext.apply(this, args);
    if (!linkRenderContext) return linkRenderContext;

    linkRenderContext.connectionWidth = getEffectiveLinkWidth(this);
    return linkRenderContext;
  };
}

function ensureLinkRendererPatch() {
  const patchState = getPatchState();
  const linkRendererPrototype = getLinkRendererPrototype();
  if (!linkRendererPrototype) return;

  if (
    patchState.linkRendererPrototype === linkRendererPrototype &&
    patchState.linkRendererOriginalConvertToPathRenderContext
  ) {
    return;
  }

  const originalConvertToPathRenderContext =
    linkRendererPrototype.convertToPathRenderContext;
  if (typeof originalConvertToPathRenderContext !== "function") return;

  patchState.linkRendererPrototype = linkRendererPrototype;
  patchState.linkRendererOriginalConvertToPathRenderContext =
    originalConvertToPathRenderContext;

  linkRendererPrototype.convertToPathRenderContext = function (...args) {
    const [linkRenderContext] = args;
    const pathRenderContext =
      patchState.linkRendererOriginalConvertToPathRenderContext.apply(
        this,
        args
      );

    if (!pathRenderContext?.style) return pathRenderContext;

    pathRenderContext.style.borderWidth = linkRenderContext?.renderBorder
      ? getEffectiveLinkStrokeWidth(linkRenderContext)
      : undefined;

    return pathRenderContext;
  };
}

function ensurePatches() {
  ensureCanvasPatch();
  ensureLinkRendererPatch();
  syncCurrentCanvasLinkWidth();
}

function applyRerouteDotRadius(value) {
  currentSettings.rerouteDotRadius = clampInteger(
    value,
    DEFAULT_REROUTE_DOT_RADIUS,
    MIN_REROUTE_DOT_RADIUS,
    MAX_REROUTE_DOT_RADIUS
  );

  const Reroute = getRerouteClass();
  if (!Reroute) {
    console.warn(`[${EXTENSION_ID}] LiteGraph.Reroute is not available.`);
    return;
  }

  Reroute.radius = currentSettings.rerouteDotRadius;
  redrawCanvas();
}

function applyLinkWidth(value) {
  currentSettings.linkWidth = clampInteger(
    value,
    DEFAULT_LINK_WIDTH,
    MIN_LINK_WIDTH,
    MAX_LINK_WIDTH
  );

  ensurePatches();
  redrawCanvas();
}

function applyLinkStrokeWidth(value) {
  currentSettings.linkStrokeWidth = clampInteger(
    value,
    DEFAULT_LINK_STROKE_WIDTH,
    MIN_LINK_STROKE_WIDTH,
    MAX_LINK_STROKE_WIDTH
  );

  ensurePatches();
  redrawCanvas();
}

function applyAllSettings() {
  ensurePatches();
  applyRerouteDotRadius(currentSettings.rerouteDotRadius);
  syncCurrentCanvasLinkWidth();
  redrawCanvas();
}

function initExtension() {
  if (initialized) return;
  initialized = true;

  const rerouteDotRadiusSetting = app.ui.settings.addSetting({
    id: SETTING_ID_REROUTE_DOT_RADIUS,
    category: makeKomlevvTweaksCategory("Link Style"),
    name: "Reroute dot radius",
    tooltip:
      "Changes the size of the inline reroute point on a link. Does not affect the white Reroute node.",
    type: "slider",
    attrs: {
      min: MIN_REROUTE_DOT_RADIUS,
      max: MAX_REROUTE_DOT_RADIUS,
      step: 1
    },
    defaultValue: DEFAULT_REROUTE_DOT_RADIUS,
    onChange: (value) => applyRerouteDotRadius(value)
  });

  const linkWidthSetting = app.ui.settings.addSetting({
    id: SETTING_ID_LINK_WIDTH,
    category: makeKomlevvTweaksCategory("Link Style"),
    name: "Link width",
    tooltip:
      "Changes link width in normal rendering mode. ComfyUI low-quality zoom-out rendering is left unchanged.",
    type: "slider",
    attrs: {
      min: MIN_LINK_WIDTH,
      max: MAX_LINK_WIDTH,
      step: 1
    },
    defaultValue: DEFAULT_LINK_WIDTH,
    onChange: (value) => applyLinkWidth(value)
  });

  const linkStrokeWidthSetting = app.ui.settings.addSetting({
    id: SETTING_ID_LINK_STROKE_WIDTH,
    category: makeKomlevvTweaksCategory("Link Style"),
    name: "Link stroke width",
    tooltip:
      "Changes link stroke width in normal rendering mode. ComfyUI low-quality zoom-out rendering is left unchanged.",
    type: "slider",
    attrs: {
      min: MIN_LINK_STROKE_WIDTH,
      max: MAX_LINK_STROKE_WIDTH,
      step: 1
    },
    defaultValue: DEFAULT_LINK_STROKE_WIDTH,
    onChange: (value) => applyLinkStrokeWidth(value)
  });

  currentSettings.rerouteDotRadius = clampInteger(
    rerouteDotRadiusSetting?.value,
    DEFAULT_REROUTE_DOT_RADIUS,
    MIN_REROUTE_DOT_RADIUS,
    MAX_REROUTE_DOT_RADIUS
  );
  currentSettings.linkWidth = clampInteger(
    linkWidthSetting?.value,
    DEFAULT_LINK_WIDTH,
    MIN_LINK_WIDTH,
    MAX_LINK_WIDTH
  );
  currentSettings.linkStrokeWidth = clampInteger(
    linkStrokeWidthSetting?.value,
    DEFAULT_LINK_STROKE_WIDTH,
    MIN_LINK_STROKE_WIDTH,
    MAX_LINK_STROKE_WIDTH
  );

  applyAllSettings();
}

app.registerExtension({
  name: EXTENSION_ID,
  setup() {
    initExtension();
  },
  init() {
    initExtension();
  }
});
