import "./coloris.js";

const COLORIS_STYLESHEET_ATTR = "data-komlevv-coloris-stylesheet";

export function getColorisStylesheetUrl() {
  return new URL("./coloris.css", import.meta.url).href;
}

export function ensureColorisStylesheet() {
  if (typeof document === "undefined") return null;

  const existing = document.querySelector(`link[${COLORIS_STYLESHEET_ATTR}="true"]`);
  if (existing) {
    return existing;
  }

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = getColorisStylesheetUrl();
  link.setAttribute(COLORIS_STYLESHEET_ATTR, "true");
  document.head.appendChild(link);
  return link;
}

export function isComfyLightThemeActive() {
  const nodeLightness = globalThis?.LiteGraph?.nodeLightness;
  return typeof nodeLightness === "number" && !Number.isNaN(nodeLightness) && nodeLightness !== 0;
}

export function getComfyColorisThemeMode() {
  return isComfyLightThemeActive() ? "light" : "dark";
}

export function getColoris() {
  ensureColorisStylesheet();
  return globalThis.Coloris;
}

export function configureColorisForComfy(options = {}) {
  const Coloris = getColoris();
  Coloris?.set?.({
    themeMode: getComfyColorisThemeMode(),
    ...options
  });
  return Coloris;
}

export function syncColorisThemeMode() {
  const Coloris = getColoris();
  Coloris?.set?.({ themeMode: getComfyColorisThemeMode() });
  return Coloris;
}

ensureColorisStylesheet();
