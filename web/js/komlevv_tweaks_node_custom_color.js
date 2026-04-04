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

function patchLightThemeCustomNodeColors() {
  const LiteGraphRef = globalThis?.LiteGraph;
  const nodePrototype = LiteGraphRef?.LGraphNode?.prototype;
  if (!LiteGraphRef || !nodePrototype) return;
  if (nodePrototype.__komlevvCustomNodeColorLightThemePatched) return;

  const renderingColorDescriptor = Object.getOwnPropertyDescriptor(
    nodePrototype,
    "renderingColor"
  );
  const renderingBgColorDescriptor = Object.getOwnPropertyDescriptor(
    nodePrototype,
    "renderingBgColor"
  );

  if (!renderingColorDescriptor?.get || !renderingBgColorDescriptor?.get) {
    return;
  }

  function callWithoutNodeLightness(getter, node) {
    const previousNodeLightness = LiteGraphRef.nodeLightness;
    LiteGraphRef.nodeLightness = undefined;

    try {
      return getter.call(node);
    } finally {
      LiteGraphRef.nodeLightness = previousNodeLightness;
    }
  }

  Object.defineProperty(nodePrototype, "renderingColor", {
    configurable: true,
    enumerable: renderingColorDescriptor.enumerable ?? false,
    get() {
      if (this.color != null) {
        return callWithoutNodeLightness(renderingColorDescriptor.get, this);
      }

      return renderingColorDescriptor.get.call(this);
    }
  });

  Object.defineProperty(nodePrototype, "renderingBgColor", {
    configurable: true,
    enumerable: renderingBgColorDescriptor.enumerable ?? false,
    get() {
      if (this.bgcolor != null) {
        return callWithoutNodeLightness(renderingBgColorDescriptor.get, this);
      }

      return renderingBgColorDescriptor.get.call(this);
    }
  });

  Object.defineProperty(nodePrototype, "__komlevvCustomNodeColorLightThemePatched", {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false
  });
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
    node.color = normalizePickerValue(shadedTitleColor, shadedTitleColor);
    node.bgcolor = normalizePickerValue(pickerValue, pickerValue);
  }
}

app.registerExtension({
  name: EXTENSION_ID,
  setup() {
    patchLightThemeCustomNodeColors();

    if (LGraphCanvas.__komlevvNodeCustomColorMenuPatched) return;
    Object.defineProperty(LGraphCanvas, "__komlevvNodeCustomColorMenuPatched", {
      value: true,
      configurable: false,
      enumerable: false,
      writable: false
    });

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
                      : node?.bgcolor,
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
