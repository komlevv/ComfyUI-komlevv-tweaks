import { $el } from "../../../scripts/ui.js";
import "./coloris.js";

function addStylesheet(url) {
  if (url.endsWith(".js")) {
    url = url.substr(0, url.length - 2) + "css";
  }

  $el("link", {
    parent: document.head,
    rel: "stylesheet",
    type: "text/css",
    href: url.startsWith("http") ? url : getUrl(url)
  });
}

function getUrl(path, baseUrl) {
  if (baseUrl) {
    return new URL(path, baseUrl).toString();
  }

  return new URL("../" + path, import.meta.url).toString();
}

addStylesheet(getUrl("coloris.css", import.meta.url));

export function isComfyLightThemeActive() {
  const nodeLightness = globalThis?.LiteGraph?.nodeLightness;
  return typeof nodeLightness === "number" && !Number.isNaN(nodeLightness) && nodeLightness !== 0;
}

export function getComfyColorisThemeMode() {
  return isComfyLightThemeActive() ? "light" : "dark";
}

export function getColoris() {
  return globalThis.Coloris;
}

export function ensureColorisInitialized() {
  const Coloris = getColoris();
  Coloris?.init?.();
  return Coloris;
}

export function configureColorisForComfy(options = {}) {
  const Coloris = ensureColorisInitialized();
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
