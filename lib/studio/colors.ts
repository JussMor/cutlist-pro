/**
 * lib/studio/colors.ts
 * Role -> color map shared by the 3D viewer and the cutlist thumbnails so both
 * surfaces render the cabinet with the same palette (green decks, blue sides).
 */
import type { BoxRole } from "./geometry";

export const ROLE_COLORS: Record<BoxRole, string> = {
  deck: "#2fd06a", // green
  shelf: "#2fd06a",
  side: "#2f88ff", // blue
  back: "#8a93a6", // muted gray
  door: "#f4b450", // accent yellow
  "drawer-front": "#f4b450",
  "drawer-side": "#d8dde2",
  "drawer-back": "#c6ccd3",
  "drawer-bottom": "#eceff2",
  "drawer-inner-front": "#bfc6cf",
  "hanging-rail": "#2f88ff", // same as structural side
  "hanging-bar": "#9ab4cc",  // lighter — metal rod
  "divider-panel": "#2f88ff", // structural vertical panel
};
