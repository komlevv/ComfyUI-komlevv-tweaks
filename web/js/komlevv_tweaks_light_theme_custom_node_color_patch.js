const PATCH_MARKER = "__komlevvCustomNodeColorLightThemePatched";

function definePatchedGetter(target, propertyName, descriptor, shouldBypass) {
  Object.defineProperty(target, propertyName, {
    configurable: true,
    enumerable: descriptor.enumerable ?? false,
    get() {
      if (!shouldBypass(this)) {
        return descriptor.get.call(this);
      }

      const LiteGraphRef = globalThis?.LiteGraph;
      const previousNodeLightness = LiteGraphRef?.nodeLightness;

      if (LiteGraphRef) {
        LiteGraphRef.nodeLightness = undefined;
      }

      try {
        return descriptor.get.call(this);
      } finally {
        if (LiteGraphRef) {
          LiteGraphRef.nodeLightness = previousNodeLightness;
        }
      }
    }
  });
}

export function patchLightThemeCustomNodeColors() {
  const LiteGraphRef = globalThis?.LiteGraph;
  const nodePrototype = LiteGraphRef?.LGraphNode?.prototype;
  if (!LiteGraphRef || !nodePrototype) return false;
  if (nodePrototype[PATCH_MARKER]) return true;

  const renderingColorDescriptor = Object.getOwnPropertyDescriptor(
    nodePrototype,
    "renderingColor"
  );
  const renderingBgColorDescriptor = Object.getOwnPropertyDescriptor(
    nodePrototype,
    "renderingBgColor"
  );

  if (!renderingColorDescriptor?.get || !renderingBgColorDescriptor?.get) {
    return false;
  }

  definePatchedGetter(
    nodePrototype,
    "renderingColor",
    renderingColorDescriptor,
    (node) => node?.color != null
  );
  definePatchedGetter(
    nodePrototype,
    "renderingBgColor",
    renderingBgColorDescriptor,
    (node) => node?.bgcolor != null
  );

  Object.defineProperty(nodePrototype, PATCH_MARKER, {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false
  });

  return true;
}

export function isLightThemeCustomNodeColorPatchApplied() {
  return Boolean(globalThis?.LiteGraph?.LGraphNode?.prototype?.[PATCH_MARKER]);
}
