import { app } from "../../scripts/app.js";
import { $el } from "../../scripts/ui.js";
import { patchLightThemeCustomNodeColors } from "./komlevv_tweaks_light_theme_custom_node_color_patch.js";

patchLightThemeCustomNodeColors();

const EXTENSION_ID = "komlevv.tweaks.nodeCustomColor";
const CUSTOM_SWATCH_BUTTON_SELECTOR = '[data-komlevv-custom-color-button="true"]';
const CUSTOM_SWATCH_SELECTOR = '[data-komlevv-custom-color-swatch="true"]';

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

function getSelectedTargets(preferredNode = null) {
  const graphcanvas = LGraphCanvas.active_canvas;
  const selectedNodes = Object.values(graphcanvas?.selected_nodes ?? {});

  if (preferredNode) {
    if (preferredNode.constructor !== LiteGraph.LGraphGroup && selectedNodes.length > 1) {
      return selectedNodes;
    }

    return [preferredNode];
  }

  if (selectedNodes.length) {
    return selectedNodes;
  }

  const selectedGroup = graphcanvas?.selected_group ?? graphcanvas?.selectedGroup;
  return selectedGroup ? [selectedGroup] : [];
}

function getDisplayColorForNode(node) {
  if (!node) return null;
  return node.constructor === LiteGraph.LGraphGroup ? node.color : node.bgcolor;
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
    let activeTargets = [];
    let pendingToolboxSync = false;

    function syncCustomToolboxButtons() {
      pendingToolboxSync = false;

      const selectButtons = document.querySelectorAll(".selection-toolbox .p-selectbutton");
      for (const selectButton of selectButtons) {
        let customButton = selectButton.querySelector(CUSTOM_SWATCH_BUTTON_SELECTOR);
        if (!customButton) {
          const templateButton = selectButton.querySelector("button");
          if (!templateButton) continue;

          customButton = templateButton.cloneNode(true);
          customButton.dataset.komlevvCustomColorButton = "true";
          customButton.setAttribute("title", "Custom");
          customButton.setAttribute("aria-label", "Custom");
          customButton.classList.remove("p-highlight", "p-togglebutton-checked");
          customButton.removeAttribute("aria-pressed");
          customButton.removeAttribute("data-p-highlight");

          const customSwatch = document.createElement("span");
          customSwatch.dataset.komlevvCustomColorSwatch = "true";
          customSwatch.style.display = "block";
          customSwatch.style.width = "0.9rem";
          customSwatch.style.height = "0.9rem";
          customSwatch.style.borderRadius = "9999px";
          customSwatch.style.boxSizing = "border-box";

          customButton.replaceChildren(customSwatch);
          customButton.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();

            const targets = getSelectedTargets();
            if (!targets.length) return;

            ensurePicker();
            activeTargets = targets;
            picker.value = normalizePickerValue(
              getDisplayColorForNode(targets[0]),
              "#000000"
            );
            picker.click();
          };

          selectButton.append(customButton);
        }

        const customSwatch = customButton.querySelector(CUSTOM_SWATCH_SELECTOR);
        if (!customSwatch) continue;

        const previewColor = getDisplayColorForNode(getSelectedTargets()[0]);
        if (previewColor) {
          customSwatch.style.background = normalizePickerValue(previewColor, previewColor);
          customSwatch.style.border = "1px solid rgba(0, 0, 0, 0.18)";
          customSwatch.style.boxShadow = "inset 0 0 0 1px rgba(255, 255, 255, 0.22)";
        } else {
          customSwatch.style.background = "transparent";
          customSwatch.style.border = "1px dashed currentColor";
          customSwatch.style.boxShadow = "none";
        }
      }
    }

    function queueCustomToolboxButtonSync() {
      if (pendingToolboxSync) return;
      pendingToolboxSync = true;
      requestAnimationFrame(syncCustomToolboxButtons);
    }

    function ensurePicker() {
      if (picker) return picker;

      picker = $el("input", {
        type: "color",
        parent: document.body,
        style: {
          display: "none"
        }
      });

      picker.onchange = () => {
        if (!activeTargets.length || !picker.value) return;

        for (const target of activeTargets) {
          applyColorToNode(target, picker.value);
        }

        redrawCanvas();
        queueCustomToolboxButtonSync();
      };

      return picker;
    }

    const observer = new MutationObserver(() => {
      queueCustomToolboxButtonSync();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false
    });

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

                  const targets = getSelectedTargets(node);
                  if (!targets.length) return;

                  ensurePicker();
                  activeTargets = targets;
                  picker.value = normalizePickerValue(
                    getDisplayColorForNode(targets[0]),
                    "#000000"
                  );
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

    queueCustomToolboxButtonSync();
  }
});
