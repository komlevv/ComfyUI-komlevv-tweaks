import { app } from "../../scripts/app.js";
import { makeKomlevvTweaksCategory } from "./komlevv_tweaks_common.js";

const EXTENSION_ID = "komlevv.tweaks.rerouteDotSize";
const SETTING_ID = "komlevv.tweaks.rerouteDotSize.radius";
const DEFAULT_RADIUS = 6;
const MIN_RADIUS = 3;
const MAX_RADIUS = 16;

let initialized = false;

function clampRadius(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_RADIUS;
  return Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, Math.round(numeric)));
}

function getRerouteClass() {
  return globalThis?.LiteGraph?.Reroute;
}

function redrawCanvas() {
  app.canvas?.setDirty?.(true, true);
  app.graph?.setDirtyCanvas?.(true, true);
}

function applyRadius(value) {
  const Reroute = getRerouteClass();
  if (!Reroute) {
    console.warn(`[${EXTENSION_ID}] LiteGraph.Reroute is not available.`);
    return;
  }

  Reroute.radius = clampRadius(value);
  redrawCanvas();
}

function initExtension() {
  if (initialized) return;
  initialized = true;

  const setting = app.ui.settings.addSetting({
    id: SETTING_ID,
    category: makeKomlevvTweaksCategory("ComfyUI reroute dot size"),
    name: "Reroute dot radius",
    tooltip:
      "Changes the size of the inline reroute point on a link. Does not affect the white Reroute node.",
    type: "slider",
    attrs: {
      min: MIN_RADIUS,
      max: MAX_RADIUS,
      step: 1
    },
    defaultValue: DEFAULT_RADIUS,
    onChange: (value) => applyRadius(value)
  });

  applyRadius(setting?.value ?? DEFAULT_RADIUS);
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
