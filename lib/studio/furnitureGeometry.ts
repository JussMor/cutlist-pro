/**
 * Shared config types, defaults, and Box3D geometry generators for the
 * non-cabinet furniture modes (desk, door, column).
 *
 * Kept in lib/ so both the design panes (components/) and the cutlist
 * derivation (lib/studio/despiece.ts) can import from here without a
 * components → lib reverse dependency.
 */
import type { Box3D } from "./geometry";

const mm = (v: number) => v / 1000;
const cm = (v: number) => v / 100;

// ─── Desk ────────────────────────────────────────────────────────────────────

export interface DeskConfig {
  width: number;        // cm
  depth: number;        // cm
  height: number;       // cm
  topThickness: number; // mm
  legType: "panel" | "square";
  legThickness: number; // mm
  legInset: number;     // cm
  apron: boolean;
  apronHeight: number;  // mm
  modesty: boolean;
}

export const DESK_DEFAULTS: DeskConfig = {
  width: 140, depth: 70, height: 75,
  topThickness: 25, legType: "panel",
  legThickness: 18, legInset: 0,
  apron: false, apronHeight: 70, modesty: false,
};

export function deskToBoxes(cfg: DeskConfig): Box3D[] {
  const W = cm(cfg.width);
  const D = cm(cfg.depth);
  const H = cm(cfg.height);
  const topT = mm(cfg.topThickness);
  const legT = mm(cfg.legThickness);
  const inset = cm(cfg.legInset);
  const apronH = cfg.apron ? mm(cfg.apronHeight) : 0;
  const legH = H - topT - apronH;

  const boxes: Box3D[] = [];

  boxes.push({
    id: "desk-top",
    role: "deck",
    pos: [0, H - topT / 2, D / 2],
    size: [W, topT, D],
    color: "#2fd06a",
  });

  if (cfg.apron) {
    boxes.push({
      id: "desk-apron",
      role: "side",
      pos: [0, H - topT - apronH / 2, mm(18) / 2],
      size: [W - 2 * (inset + legT), apronH, mm(18)],
      color: "#2f88ff",
    });
  }

  const legXL = -(W / 2 - inset - legT / 2);
  const legXR = +(W / 2 - inset - legT / 2);
  const legD = cfg.legType === "square" ? legT : D;

  boxes.push({
    id: "desk-leg-l",
    role: "side",
    pos: [legXL, legH / 2, D / 2],
    size: [legT, legH, legD],
    color: "#2f88ff",
  });
  boxes.push({
    id: "desk-leg-r",
    role: "side",
    pos: [legXR, legH / 2, D / 2],
    size: [legT, legH, legD],
    color: "#2f88ff",
  });

  if (cfg.modesty) {
    const modH = legH * 0.5;
    boxes.push({
      id: "desk-modesty",
      role: "back",
      pos: [0, legH - modH / 2, mm(18) / 2],
      size: [W - 2 * (inset + legT), modH, mm(18)],
      color: "#8a93a6",
    });
  }

  return boxes;
}

// ─── Door ────────────────────────────────────────────────────────────────────

export type DoorStyle = "slab" | "shaker" | "shaker-glass";

export interface DoorConfig {
  width: number;              // cm
  height: number;             // cm
  thickness: number;          // mm
  style: DoorStyle;
  stileWidth: number;         // mm
  topRail: number;            // mm
  bottomRail: number;         // mm
  midRails: number;
  sidesGap: number;           // mm
  topGap: number;             // mm
  bottomGap: number;          // mm
  tapaMarco: boolean;
  tapaMarcoSides: 1 | 2;
  tapaMarcoWidth: number;     // cm
  tapaMarcoThickness: number; // mm
}

export const DOOR_DEFAULTS: DoorConfig = {
  width: 82.5, height: 203, thickness: 40,
  style: "shaker", stileWidth: 95, topRail: 95, bottomRail: 120, midRails: 0,
  sidesGap: 2, topGap: 2, bottomGap: 5,
  tapaMarco: false, tapaMarcoSides: 2, tapaMarcoWidth: 7, tapaMarcoThickness: 12,
};

export function doorToBoxes(cfg: DoorConfig): Box3D[] {
  const W = cm(cfg.width);
  const H = cm(cfg.height);
  const T = mm(cfg.thickness);
  const sidesGap = mm(cfg.sidesGap);
  const topGap = mm(cfg.topGap);
  const bottomGap = mm(cfg.bottomGap);

  const boxes: Box3D[] = [];

  boxes.push({
    id: "door-leaf",
    role: "door",
    pos: [0, bottomGap + H / 2, T / 2],
    size: [W, H, T],
    color: "#f4b450",
  });

  if (cfg.tapaMarco) {
    const openW = W + 2 * sidesGap;
    const openH = H + topGap + bottomGap;
    const tmW = cm(cfg.tapaMarcoWidth);
    const tmT = mm(cfg.tapaMarcoThickness);

    boxes.push({ id: "tm-left",  role: "side", pos: [-(openW / 2 + tmW / 2), openH / 2, tmT / 2],   size: [tmW, openH, tmT], color: "#2f88ff" });
    boxes.push({ id: "tm-right", role: "side", pos: [+(openW / 2 + tmW / 2), openH / 2, tmT / 2],   size: [tmW, openH, tmT], color: "#2f88ff" });
    boxes.push({ id: "tm-top",   role: "deck", pos: [0, openH + tmW / 2, tmT / 2], size: [openW + 2 * tmW, tmW, tmT], color: "#2fd06a" });

    if (cfg.tapaMarcoSides === 2) {
      const backZ = T + tmT / 2;
      boxes.push({ id: "tm-left-back",  role: "side", pos: [-(openW / 2 + tmW / 2), openH / 2, backZ], size: [tmW, openH, tmT], color: "#2f88ff" });
      boxes.push({ id: "tm-right-back", role: "side", pos: [+(openW / 2 + tmW / 2), openH / 2, backZ], size: [tmW, openH, tmT], color: "#2f88ff" });
      boxes.push({ id: "tm-top-back",   role: "deck", pos: [0, openH + tmW / 2, backZ], size: [openW + 2 * tmW, tmW, tmT], color: "#2fd06a" });
    }
  }

  return boxes;
}

// ─── Column ──────────────────────────────────────────────────────────────────

export type ExposedSides = "1" | "2-corner" | "3-wall" | "4-full";
export type FaceContent = "none" | "shelves" | "drawers";

export interface ColumnConfig {
  colWidth: number;          // cm
  colDepth: number;          // cm
  claddingThickness: number; // mm
  height: number;            // cm
  exposedSides: ExposedSides;
  plinth: boolean;
  plinthHeight: number; // cm
  cap: boolean;
  capHeight: number;    // cm
  // Per-face interior content
  frontContent: FaceContent;
  backContent: FaceContent;
  leftContent: FaceContent;
  rightContent: FaceContent;
  contentCount: number; // shelf panels or drawer fronts per face
}

export const COLUMN_DEFAULTS: ColumnConfig = {
  colWidth: 30, colDepth: 30, claddingThickness: 18,
  height: 250, exposedSides: "4-full",
  plinth: false, plinthHeight: 10, cap: false, capHeight: 8,
  frontContent: "none", backContent: "none",
  leftContent: "none", rightContent: "none",
  contentCount: 3,
};

export function columnToBoxes(cfg: ColumnConfig): Box3D[] {
  const CW = cm(cfg.colWidth);
  const CD = cm(cfg.colDepth);
  const ct = mm(cfg.claddingThickness);
  const H = cm(cfg.height);
  const plinthH = cfg.plinth ? cm(cfg.plinthHeight) : 0;
  const capH = cfg.cap ? cm(cfg.capHeight) : 0;
  const panelH = H - plinthH - capH;
  const panelY = plinthH + panelH / 2;

  const show4 = cfg.exposedSides === "4-full";
  const show3 = cfg.exposedSides === "3-wall";
  const showL = cfg.exposedSides === "2-corner";
  const showBack  = show4 || show3;
  const showLeft  = show4 || show3 || showL;
  const showRight = show4;

  const n = Math.max(1, cfg.contentCount);

  const boxes: Box3D[] = [];

  if (cfg.plinth) {
    boxes.push({ id: "col-plinth", role: "deck", pos: [0, plinthH / 2, (CD + 2 * ct) / 2], size: [CW + 2 * ct, plinthH, CD + 2 * ct], color: "#2fd06a" });
  }
  if (cfg.cap) {
    boxes.push({ id: "col-cap", role: "deck", pos: [0, H - capH / 2, (CD + 2 * ct) / 2], size: [CW + 2 * ct, capH, CD + 2 * ct], color: "#2fd06a" });
  }

  // ── Cladding panels — only when the face has no interior content ──────────
  // Front (always exposed; cladding omitted when face has drawers or shelves)
  if (cfg.frontContent === "none") {
    boxes.push({ id: "col-front", role: "side", pos: [0, panelY, CD + ct / 2],     size: [CW, panelH, ct], color: "#2f88ff" });
  }
  if (showBack && cfg.backContent === "none") {
    boxes.push({ id: "col-back",  role: "side", pos: [0, panelY, -ct / 2],          size: [CW, panelH, ct], color: "#2f88ff" });
  }
  if (showLeft && cfg.leftContent === "none") {
    const leftX = show4 ? -(CW / 2 + ct / 2) : -CW / 2;
    boxes.push({ id: "col-left",  role: "side", pos: [leftX, panelY, CD / 2],       size: [ct, panelH, show4 ? CD + 2 * ct : CD], color: "#2f88ff" });
  }
  if (showRight && cfg.rightContent === "none") {
    boxes.push({ id: "col-right", role: "side", pos: [CW / 2 + ct / 2, panelY, CD / 2], size: [ct, panelH, CD + 2 * ct], color: "#2f88ff" });
  }

  // ── Interior horizontal shelves (shared by all faces that have content) ───
  const hasContent =
    cfg.frontContent !== "none" ||
    (showBack  && cfg.backContent  !== "none") ||
    (showLeft  && cfg.leftContent  !== "none") ||
    (showRight && cfg.rightContent !== "none");

  if (hasContent) {
    const interval = panelH / (n + 1);
    for (let i = 1; i <= n; i++) {
      boxes.push({
        id: `col-shelf-${i}`,
        role: "deck",
        pos: [0, plinthH + interval * i, CD / 2],
        size: [CW, ct, CD],
        color: "#2fd06a",
      });
    }
  }

  // ── Drawer fronts — stacked on each face configured as "drawers" ──────────
  function addDrawerFronts(faceId: string, posCenter: [number, number, number], lateral: boolean) {
    const drawerH = panelH / n;
    for (let i = 0; i < n; i++) {
      const y = plinthH + drawerH * (i + 0.5);
      const pos: [number, number, number] = [posCenter[0], y, posCenter[2]];
      const size: [number, number, number] = lateral
        ? [ct, drawerH - ct, CD]
        : [CW, drawerH - ct, ct];
      boxes.push({ id: `col-drawer-${faceId}-${i}`, role: "door", pos, size, color: "#f4b450" });
    }
  }

  if (cfg.frontContent === "drawers") {
    addDrawerFronts("front", [0, 0, CD + ct * 1.5], false);
  }
  if (showBack && cfg.backContent === "drawers") {
    addDrawerFronts("back", [0, 0, -ct * 1.5], false);
  }
  if (showLeft && cfg.leftContent === "drawers") {
    const leftX = show4 ? -(CW / 2 + ct * 1.5) : -(CW / 2 + ct * 0.5);
    addDrawerFronts("left", [leftX, 0, CD / 2], true);
  }
  if (showRight && cfg.rightContent === "drawers") {
    addDrawerFronts("right", [CW / 2 + ct * 1.5, 0, CD / 2], true);
  }

  return boxes;
}
