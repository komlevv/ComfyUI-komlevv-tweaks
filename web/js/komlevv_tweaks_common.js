export const KOMLEVV_TWEAKS_CATEGORY = Object.freeze(["komlevv-tweaks"]);

export function makeKomlevvTweaksCategory(...parts) {
  return [...KOMLEVV_TWEAKS_CATEGORY, ...parts];
}
