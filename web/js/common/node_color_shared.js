const COLOR_PARSE_CONTEXT = document.createElement("canvas").getContext("2d");

export function normalizeHexColor(value, fallback = "#000000") {
  for (const candidate of [value, fallback, "#000000"]) {
    const source = String(candidate ?? "").trim().replace(/^#/, "");

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
  }

  return "#000000";
}

function rgbaChannelsToHex(channels) {
  return `#${channels
    .map((channel) => Number(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

function tryParseCssColorToHex(value) {
  const source = String(value ?? "").trim();
  if (!source || !COLOR_PARSE_CONTEXT) {
    return null;
  }

  const directHex = source.replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(directHex) || /^[0-9a-fA-F]{6}$/.test(directHex)) {
    return normalizeHexColor(source, "#000000");
  }

  const sentinel = "#010203";
  COLOR_PARSE_CONTEXT.fillStyle = sentinel;

  try {
    COLOR_PARSE_CONTEXT.fillStyle = source;
  } catch {
    return null;
  }

  const resolved = String(COLOR_PARSE_CONTEXT.fillStyle ?? "").trim();
  if (resolved === sentinel && source.toLowerCase() !== sentinel) {
    return null;
  }

  const normalizedResolvedHex = normalizeHexColor(resolved, "");
  if (normalizedResolvedHex !== "#000000" || resolved.toLowerCase() === "#000000" || resolved.toLowerCase() === "#000") {
    return normalizedResolvedHex;
  }

  const match = resolved.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) {
    return null;
  }

  return rgbaChannelsToHex(match.slice(1, 4));
}

export function normalizeColorToHex(value, fallback = "#000000") {
  for (const candidate of [value, fallback, "#000000"]) {
    const normalized = tryParseCssColorToHex(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return "#000000";
}

export function shadeHexColor(color, amount) {
  const normalized = normalizeColorToHex(color, "#000000").slice(1);
  const channels = normalized.match(/.{2}/g) ?? ["00", "00", "00"];

  return `#${channels
    .map((channel) => {
      const value = Math.max(
        0,
        Math.min(255, parseInt(channel, 16) + amount)
      );
      return value.toString(16).padStart(2, "0");
    })
    .join("")}`;
}

export function isGraphNode(item) {
  const LGraphNodeRef = globalThis?.LiteGraph?.LGraphNode;
  return Boolean(LGraphNodeRef && item instanceof LGraphNodeRef);
}

export function isGraphGroup(item) {
  const LGraphGroupRef = globalThis?.LiteGraph?.LGraphGroup;
  return Boolean(LGraphGroupRef && item instanceof LGraphGroupRef);
}

export function isColorTarget(item) {
  return isGraphNode(item) || isGraphGroup(item);
}

export function getSelectedColorTargets(graphcanvas = globalThis?.LGraphCanvas?.active_canvas) {
  const selectedItems = [...(graphcanvas?.selectedItems ?? [])].filter(isColorTarget);
  if (selectedItems.length) {
    return selectedItems;
  }

  const selectedNodes = Object.values(graphcanvas?.selected_nodes ?? {}).filter(isGraphNode);
  if (selectedNodes.length) {
    return selectedNodes;
  }

  const selectedGroup = graphcanvas?.selected_group ?? graphcanvas?.selectedGroup;
  return selectedGroup && isGraphGroup(selectedGroup) ? [selectedGroup] : [];
}

export function getColorTargetPreviewColor(target) {
  if (isGraphGroup(target)) {
    return target.color ?? null;
  }

  if (isGraphNode(target)) {
    return target.bgcolor ?? null;
  }

  return null;
}
