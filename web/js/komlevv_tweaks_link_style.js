import { app } from "../../scripts/app.js";
import { makeKomlevvTweaksCategory } from "./komlevv_tweaks_common.js";

const EXTENSION_ID = "komlevv.tweaks.linkStyle";
const SETTING_ID_REROUTE_DOT_RADIUS = "komlevv.tweaks.linkStyle.rerouteDotRadius";
const DEFAULT_REROUTE_DOT_RADIUS = 6;
const MIN_REROUTE_DOT_RADIUS = 3;
const MAX_REROUTE_DOT_RADIUS = 16;

let initialized = false;

function clampInteger(value, fallback, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function getRerouteClass() {
  return globalThis?.LiteGraph?.Reroute;
}

function redrawCanvas() {
  app.canvas?.setDirty?.(true, true);
  app.graph?.setDirtyCanvas?.(true, true);
}

function applyRerouteDotRadius(value) {
  const Reroute = getRerouteClass();
  if (!Reroute) {
    console.warn(`[${EXTENSION_ID}] LiteGraph.Reroute is not available.`);
    return;
  }

  Reroute.radius = clampInteger(
    value,
    DEFAULT_REROUTE_DOT_RADIUS,
    MIN_REROUTE_DOT_RADIUS,
    MAX_REROUTE_DOT_RADIUS
  );
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

  applyRerouteDotRadius(
    rerouteDotRadiusSetting?.value ?? DEFAULT_REROUTE_DOT_RADIUS
  );
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
