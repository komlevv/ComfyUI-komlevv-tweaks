import { app } from "../../../scripts/app.js";
import { $el } from "../../../scripts/ui.js";
import {
  configureColorisForComfy,
  syncColorisThemeMode
} from "../coloris/coloris_shared.js";
import { patchLightThemeCustomNodeColors } from "../common/light_theme_custom_node_color_patch.js";
import {
  getColorTargetPreviewColor,
  getSelectedColorTargets,
  normalizeHexColor,
  shadeHexColor
} from "../common/node_color_shared.js";

patchLightThemeCustomNodeColors();

const EXTENSION_ID = "komlevv.tweaks.nodeCustomColor";
const TOOLBOX_PATCH_MARKER = "__komlevvNodeCustomColorToolboxPatched";
const CUSTOM_SWATCH_BUTTON_SELECTOR = '[data-komlevv-custom-color-button="true"]';
const CUSTOM_SWATCH_SELECTOR = '[data-komlevv-custom-color-swatch="true"]';
const TOOLBOX_SELECT_BUTTON_SELECTOR = ".selection-toolbox .p-selectbutton";

function redrawCanvas() {
  app.canvas?.setDirty?.(true, true);
  app.graph?.setDirtyCanvas?.(true, true);
}

function applyColorToNode(node, pickerValue) {
  if (!node || !pickerValue) return;

  if (node instanceof LiteGraph.LGraphGroup) {
    node.color = pickerValue;
  } else {
    node.color = shadeHexColor(pickerValue, 20);
    node.bgcolor = normalizeHexColor(pickerValue, pickerValue);
  }
}

function createCustomSwatch() {
  const swatch = document.createElement("span");
  swatch.dataset.komlevvCustomColorSwatch = "true";
  swatch.style.display = "block";
  swatch.style.width = "0.9rem";
  swatch.style.height = "0.9rem";
  swatch.style.borderRadius = "9999px";
  swatch.style.boxSizing = "border-box";
  return swatch;
}

function getToolboxButtonClassName(selectButton) {
  const templateButton = selectButton.querySelector("button");
  if (!templateButton?.className) {
    return "p-button p-component";
  }

  return templateButton.className
    .split(/\s+/)
    .filter(
      (className) =>
        className &&
        className !== "p-highlight" &&
        className !== "p-togglebutton-checked"
    )
    .join(" ");
}

app.registerExtension({
  name: EXTENSION_ID,
  setup() {
    patchLightThemeCustomNodeColors();

    if (LGraphCanvas[TOOLBOX_PATCH_MARKER]) return;
    Object.defineProperty(LGraphCanvas, TOOLBOX_PATCH_MARKER, {
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

      const selectedTargets = getSelectedColorTargets();
      const previewColor = getColorTargetPreviewColor(selectedTargets[0]);
      const selectButtons = document.querySelectorAll(TOOLBOX_SELECT_BUTTON_SELECTOR);

      for (const selectButton of selectButtons) {
        let customButton = selectButton.querySelector(CUSTOM_SWATCH_BUTTON_SELECTOR);
        if (!customButton) {
          customButton = document.createElement("button");
          customButton.type = "button";
          customButton.dataset.komlevvCustomColorButton = "true";
          customButton.className = getToolboxButtonClassName(selectButton);
          customButton.setAttribute("title", "Custom");
          customButton.setAttribute("aria-label", "Custom");

          const customSwatch = createCustomSwatch();
          customButton.append(customSwatch);
          customButton.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();

            const targets = getSelectedColorTargets();
            if (!targets.length) return;

            const colorPicker = ensurePicker();
            activeTargets = targets;
            colorPicker.value = normalizeHexColor(
              getColorTargetPreviewColor(targets[0]),
              "#000000"
            );
            syncColorisThemeMode();
            positionPickerAnchor(colorPicker, customButton);
            colorPicker.dispatchEvent(new MouseEvent("click", {
              bubbles: true,
              cancelable: true,
              view: window
            }));
          });

          selectButton.append(customButton);
        }

        const customSwatch = customButton.querySelector(CUSTOM_SWATCH_SELECTOR);
        if (!customSwatch) continue;

        if (previewColor) {
          customSwatch.style.background = normalizeHexColor(previewColor, previewColor);
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

    function positionPickerAnchor(anchor, button) {
      const rect = button.getBoundingClientRect();
      anchor.style.left = `${rect.left}px`;
      anchor.style.top = `${rect.top}px`;
      anchor.style.width = `${Math.max(rect.width, 1)}px`;
      anchor.style.height = `${Math.max(rect.height, 1)}px`;
    }

    function applyPickerValue() {
      if (!activeTargets.length || !picker?.value) return;

      for (const target of activeTargets) {
        applyColorToNode(target, picker.value);
      }

      redrawCanvas();
      queueCustomToolboxButtonSync();
    }

    function ensurePicker() {
      if (picker) return picker;

      picker = $el("input", {
        type: "text",
        parent: document.body,
        dataset: {
          coloris: "true",
          komlevvColorisAnchor: "true"
        },
        style: {
          position: "fixed",
          left: "0px",
          top: "0px",
          width: "1px",
          height: "1px",
          opacity: 0,
          pointerEvents: "none",
          border: 0,
          padding: 0,
          margin: 0
        }
      });

      configureColorisForComfy({
        el: picker,
        alpha: false,
        format: "hex",
        formatToggle: false,
        swatchesOnly: false
      });

      picker.addEventListener("input", applyPickerValue);
      picker.addEventListener("change", applyPickerValue);

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

    queueCustomToolboxButtonSync();
  }
});
