/**
 * Hardcoded preset colors used when ComfyUI light-theme node lightness
 * heuristic is active and extensions want WYSIWYG explicit colors.
 *
 * Other extensions may import either the full preset objects or the bgcolor map.
 */
export const LIGHT_THEME_PRESET_COLORS = Object.freeze({
  red: Object.freeze({
    color: "#e6c9c9",
    bgcolor: "#d2b5b5",
    groupcolor: "#d2b5b5"
  }),
  brown: Object.freeze({
    color: "#eacec6",
    bgcolor: "#d6bab2",
    groupcolor: "#d6bab2"
  }),
  green: Object.freeze({
    color: "#c9e6c9",
    bgcolor: "#b5d2b5",
    groupcolor: "#b5d2b5"
  }),
  blue: Object.freeze({
    color: "#c9c9e6",
    bgcolor: "#b5b5d2",
    groupcolor: "#b5b5d2"
  }),
  pale_blue: Object.freeze({
    color: "#d7e3e8",
    bgcolor: "#c3cfd4",
    groupcolor: "#c3cfd4"
  }),
  cyan: Object.freeze({
    color: "#c9e6e6",
    bgcolor: "#b5d2d2",
    groupcolor: "#b5d2d2"
  }),
  purple: Object.freeze({
    color: "#e6c9e6",
    bgcolor: "#d2b5d2",
    groupcolor: "#d2b5d2"
  }),
  yellow: Object.freeze({
    color: "#f1e6cf",
    bgcolor: "#ddd2bb",
    groupcolor: "#ddd2bb"
  }),
  black: Object.freeze({
    color: "#949494",
    bgcolor: "#808080",
    groupcolor: "#808080"
  })
});

export const LIGHT_THEME_PRESET_BGCOLORS = Object.freeze(
  Object.fromEntries(
    Object.entries(LIGHT_THEME_PRESET_COLORS).map(([name, colorOption]) => [
      name,
      colorOption.bgcolor
    ])
  )
);
