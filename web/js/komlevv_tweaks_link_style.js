import { app } from "../../scripts/app.js";
import { makeKomlevvTweaksCategory } from "./komlevv_tweaks_common.js";

const EXTENSION_ID = "komlevv.tweaks.linkStyle";

const SETTING_ID_REROUTE_DOT_RADIUS = "komlevv.tweaks.linkStyle.rerouteDotRadius";
const SETTING_ID_LINK_WIDTH = "komlevv.tweaks.linkStyle.linkWidth";
const SETTING_ID_LINK_STROKE_WIDTH = "komlevv.tweaks.linkStyle.linkStrokeWidth";
const SETTING_ID_LINK_STROKE_COLOR = "komlevv.tweaks.linkStyle.linkStrokeColor";

const DEFAULT_REROUTE_DOT_RADIUS = 6;
const MIN_REROUTE_DOT_RADIUS = 3;
const MAX_REROUTE_DOT_RADIUS = 16;

const DEFAULT_LINK_WIDTH = 3;
const MIN_LINK_WIDTH = 1;
const MAX_LINK_WIDTH = 12;

const DEFAULT_LINK_STROKE_WIDTH = 4;
const MIN_LINK_STROKE_WIDTH = 1;
const MAX_LINK_STROKE_WIDTH = 12;

const DEFAULT_LINK_STROKE_COLOR = "000000";
const DEFAULT_LINK_STROKE_OPACITY = 0.5;
const DEFAULT_LINK_STROKE_RGBA = `rgba(0,0,0,${DEFAULT_LINK_STROKE_OPACITY})`;

const PATCH_STATE_KEY = "__komlevvTweaksLinkStylePatchState";

const currentSettings = {
  rerouteDotRadius: DEFAULT_REROUTE_DOT_RADIUS,
  linkWidth: DEFAULT_LINK_WIDTH,
  linkStrokeWidth: DEFAULT_LINK_STROKE_WIDTH,
  linkStrokeColor: DEFAULT_LINK_STROKE_COLOR
};

function clampInteger(value, fallback, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function normalizeHexColor(value, fallback = DEFAULT_LINK_STROKE_COLOR) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/^#/, "")
    .toLowerCase();

  return /^[0-9a-f]{6}$/.test(normalized) ? normalized : fallback;
}

function hexToRgba(hex, alpha = DEFAULT_LINK_STROKE_OPACITY) {
  const normalized = normalizeHexColor(hex);
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red},${green},${blue},${alpha})`;
}

function getPatchState() {
  if (!globalThis[PATCH_STATE_KEY]) {
    globalThis[PATCH_STATE_KEY] = {
      canvasPrototype: null,
      canvasOriginalBuildLinkRenderContext: null,
      linkRendererPrototype: null,
      linkRendererOriginalConvertToPathRenderContext: null,
      pathRendererPrototype: null,
      pathRendererOriginalDrawLinkPath: null
    };
  }

  return globalThis[PATCH_STATE_KEY];
}

function getCurrentCanvas() {
  return (
    app.canvas ?? globalThis?.LiteGraph?.LGraphCanvas?.active_canvas ?? null
  );
}

function getCanvasPrototype() {
  return getCurrentCanvas()?.constructor?.prototype ?? null;
}

function getLinkRendererPrototype() {
  return getCurrentCanvas()?.linkRenderer?.constructor?.prototype ?? null;
}

function getPathRendererPrototype() {
  return getCurrentCanvas()?.linkRenderer?.pathRenderer?.constructor?.prototype ?? null;
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

function getEffectiveLinkStrokeColor(linkRenderContext) {
  return linkRenderContext?.lowQuality
    ? DEFAULT_LINK_STROKE_RGBA
    : hexToRgba(currentSettings.linkStrokeColor);
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

  const originalBuildLinkRenderContext = canvasPrototype.buildLinkRenderContext;
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
    pathRenderContext.style.borderColor = linkRenderContext?.renderBorder
      ? getEffectiveLinkStrokeColor(linkRenderContext)
      : undefined;

    return pathRenderContext;
  };
}

function ensurePathRendererPatch() {
  const patchState = getPatchState();
  const pathRendererPrototype = getPathRendererPrototype();
  if (!pathRendererPrototype) return;

  if (
    patchState.pathRendererPrototype === pathRendererPrototype &&
    patchState.pathRendererOriginalDrawLinkPath
  ) {
    return;
  }

  const originalDrawLinkPath = pathRendererPrototype.drawLinkPath;
  if (typeof originalDrawLinkPath !== "function") return;

  patchState.pathRendererPrototype = pathRendererPrototype;
  patchState.pathRendererOriginalDrawLinkPath = originalDrawLinkPath;

  pathRendererPrototype.drawLinkPath = function (...args) {
    const [ctx, path, link, context, lineWidth, color] = args;

    const isBorderPass =
      color === DEFAULT_LINK_STROKE_RGBA &&
      context?.style?.borderColor &&
      lineWidth ===
        context.style.connectionWidth + (context.style.borderWidth ?? 0);

    const effectiveColor = isBorderPass ? context.style.borderColor : color;

    return patchState.pathRendererOriginalDrawLinkPath.call(
      this,
      ctx,
      path,
      link,
      context,
      lineWidth,
      effectiveColor
    );
  };
}

function ensurePatches() {
  ensureCanvasPatch();
  ensureLinkRendererPatch();
  ensurePathRendererPatch();
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

function applyLinkStrokeColor(value) {
  currentSettings.linkStrokeColor = normalizeHexColor(value);
  ensurePatches();
  redrawCanvas();
}

function applyAllSettings() {
  ensurePatches();
  applyRerouteDotRadius(currentSettings.rerouteDotRadius);
  syncCurrentCanvasLinkWidth();
  redrawCanvas();
}

const extension = {
  name: EXTENSION_ID,
  settings: [
    {
      id: SETTING_ID_REROUTE_DOT_RADIUS,
      category: makeKomlevvTweaksCategory("Link Style", "Reroute dot radius"),
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
    },
    {
      id: SETTING_ID_LINK_WIDTH,
      category: makeKomlevvTweaksCategory("Link Style", "Link width"),
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
    },
    {
      id: SETTING_ID_LINK_STROKE_WIDTH,
      category: makeKomlevvTweaksCategory("Link Style", "Link stroke width"),
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
    },
    {
      id: SETTING_ID_LINK_STROKE_COLOR,
      category: makeKomlevvTweaksCategory("Link Style", "Link stroke color"),
      name: "Link stroke color",
      tooltip:
        "Changes link stroke color in normal rendering mode. ComfyUI low-quality zoom-out rendering is left unchanged.",
      type: "color",
      defaultValue: DEFAULT_LINK_STROKE_COLOR,
      onChange: (value) => applyLinkStrokeColor(value)
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
