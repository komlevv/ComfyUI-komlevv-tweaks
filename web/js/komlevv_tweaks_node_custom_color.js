import { app } from "../../scripts/app.js";
import { $el } from "../../scripts/ui.js";

const EXTENSION_ID = "komlevv.tweaks.nodeCustomColor";

function colorShade(col, amt) {
  let normalized = String(col ?? "").trim().replace(/^#/, "");
  if (normalized.length === 3) {
    normalized = normalized
      .split("")
      .map((channel) => channel + channel)
      .join("");
  }

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    normalized = "000000";
  }

  let [r, g, b] = normalized.match(/.{2}/g);
  [r, g, b] = [
    parseInt(r, 16) + amt,
    parseInt(g, 16) + amt,
    parseInt(b, 16) + amt
  ];

  r = Math.max(Math.min(255, r), 0).toString(16);
  g = Math.max(Math.min(255, g), 0).toString(16);
  b = Math.max(Math.min(255, b), 0).toString(16);

  const rr = (r.length < 2 ? "0" : "") + r;
  const gg = (g.length < 2 ? "0" : "") + g;
  const bb = (b.length < 2 ? "0" : "") + b;

  return `#${rr}${gg}${bb}`;
}

function normalizePickerValue(value, fallback = "#000000") {
  const source = String(value ?? "").trim().replace(/^#/, "");

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

  return normalizePickerValue(fallback, "#000000");
}

function clampUnit(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(1, numeric));
}

function hexToRgbUnit(hex) {
  const normalized = normalizePickerValue(hex, "#000000").slice(1);
  return {
    r: parseInt(normalized.slice(0, 2), 16) / 255,
    g: parseInt(normalized.slice(2, 4), 16) / 255,
    b: parseInt(normalized.slice(4, 6), 16) / 255
  };
}

function rgbUnitToHex({ r, g, b }) {
  return `#${+r, g, b]
    .map(
      (value) =>
        Math.round(clampUnit(value) * 255)
          .toString(16)
          .padStart(2, "0")
    )
    .join("")}`;
}

function rgbUnitToHsl({ r, g, b }) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: lightness };
  }

  const delta = max - min;
  const saturation =
    lightness > 0.5
      ? delta / (2 - max - min)
      : delta / (max + min);

  let hue = 0;
  switch (max) {
    case r:
      hue = (g - b) / delta + (g < b ? 6 : 0);
      break;
    case g:
      hue = (b - r) / delta + 2;
      break;
    default:
      hue = (r - g) / delta + 4;
      break;
  }

  hue /= 6;
  return { h: hue, s: saturation, l: lightness };
}

function hueToRgbUnit(p, q, t) {
  let value = t;
  if (value < 0) value += 1;
  if (value > 1) value -= 1;
  if (value < 1 / 6) return p + (q - p) * 6 * value;
  if (value < 1 / 2) return q;
  if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
  return p;
}

function hslToRgbUnit({ h, s, l }) {
  if (s === 0) {
    return { r: l, g: l, b: l };
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: hueToRgbUnit(p, q, h + 1 / 3),
    g: hueToRgbUnit(p, q, h),
    b: hueToRgbUnit(p, q, h - 1 / 3)
  };
}

function getNodeLightnessCompensation() {
  const value = Number(globalThis?.LiteGraph?.nodeLightness ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function compensateHexForRendererLightness(value, fallback = "#000000") {
  const normalized = normalizePickerValue(value, fallback);
  const lightnessDelta = getNodeLightnessCompensation();

  if (Math.abs(lightnessDelta) < 1e-6) {
    return normalized;
  }

  const hsl = rgbUnitToHsl(hexToRgbUnit(normalized));
  const compensated = {
    h: hsl.h,
    s: hsl.s,
    l: clampUnit(hsl.l - lightnessDelta)
  };

  return rgbUnitToHex(hslToRgbUnit(compensated));
}

function applyRendererLightnessToHex(value, fallback = "#000000") {
  const normalized = normalizePickerValue(value, fallback);
  const lightnessDelta = getNodeLightnessCompensation();

  if (Math.abs(lightnessDelta) < 1e-6) {
    return normalized;
  }

  const hsl = rgbUnitToHsl(hexToRgbUnit(normalized));
  const adjusted = {
    h: hsl.h,
    s: hsl.s,
    l: clampUnit(hsl.l + lightnessDelta)
  };

  return rgbUnitToHex(hslToRgbUnit(adjusted));
}

function redrawCanvas() {
  app.canvas?.setDirty?.(true, true);
  app.graph?.setDirtyCanvas?.(true, true);
}

function isNodeColorsMenu(menuElement) {
  const firstEntry = menuElement?.firstElementChild;
  const text = firstEntry?.textContent ?? "";
  const content = firstEntry?.value?.content ?? "";
  return text.includes("No color") || content.includes("No color");
}

function applyColorToNode(node, pickerValue) {
  if (!node || !pickerValue) return;

  if (node.constructor === LiteGraph.LGraphGroup) {
    node.color = pickerValue;
  } else {
    const shadedTitleColor = colorShade(pickerValue, 20);
    node.color = compensateHexForRendererLightness(
      shadedTitleColor,
      shadedTitleColor
    );
    node.bgcolor = compensateHexForRendererLightness(
      pickerValue,
      pickerValue
    );
  }
}

app.registerExtension({
  name: EXTENSION_ID,
  setup() {
    let picker;
    let activeNode;

    const onMenuNodeColors = LGraphCanvas.onMenuNodeColors;
    LGraphCanvas.onMenuNodeColors = function (value, options, e, menu, node) {
      const result = onMenuNodeColors.apply(this, arguments);

      requestAnimationFrame(() => {
        const menus = document.querySelectorAll(".litecontextmenu");
        for (let i = menus.length - 1; i >= 0; i--) {
          const targetMenu = menus[i];
          if (!isNodeColorsMenu(targetMenu)) continue;

          $el(
            "div.litemenu-entry.submenu",
            {
              parent: targetMenu,
              $: (el) => {
                el.onclick = () => {
                  LiteGraph.closeAllContextMenus();

                  if (!picker) {
                    picker = $el("input", {
                      type: "color",
                      parent: document.body,
                      style: {
                        display: "none"
                      }
                    });

                    picker.onchange = () => {
                      if (!activeNode || !picker.value) return;

                      const graphcanvas = LGraphCanvas.active_canvas;
                      if (
                        activeNode.constructor !== LiteGraph.LGraphGroup &&
                        graphcanvas?.selected_nodes &&
                        Object.keys(graphcanvas.selected_nodes).length > 1
                      ) {
                        for (const nodeId in graphcanvas.selected_nodes) {
                          applyColorToNode(graphcanvas.selected_nodes[nodeId], picker.value);
                        }
                      } else {
                        applyColorToNode(activeNode, picker.value);
                      }

                      redrawCanvas();
                    };
                  }

                  activeNode = null;
                  picker.value = normalizePickerValue(
                    node?.constructor === LiteGraph.LGraphGroup
                      ? node?.color
                      : applyRendererLightnessToHex(node?.bgcolor, "#000000"),
                    "#000000"
                  );
                  activeNode = node;
                  picker.click();
                };
              }
            },
            [
              $el("span", {
                style: {
                  paddingLeft: "4px",
                  display: "block"
                },
                textContent: "Custom"
              })
            ]
          );
          break;
        }
      });

      return result;
    };
  }
});
