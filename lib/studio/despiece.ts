/**
 * lib/studio/despiece.ts
 * Pure engine: StudioDocument -> grouped panel cutlist + machining operations.
 * Derived from the same boxes as the 3D viewer (buildAssembly) so the cutlist
 * and the model can never drift. Public panel dimensions are CENTIMETERS so
 * they match the optimizer and the Studio authoring units.
 */
import { buildAssembly, type Box3D, type BoxRole } from "./geometry";
import type { StudioDocument } from "./document";

export type PanelRoleStudio =
  | "back-panel"
  | "horizontal-deck"
  | "vertical-side"
  | "door"
  | "drawer-front"
  | "drawer-side"
  | "drawer-back"
  | "drawer-bottom"
  | "drawer-inner-front";

export type Orientation = "vertical-xy" | "horizontal-xz" | "vertical-yz";

export interface StudioPanel {
  key: string;
  badge: string; // B1, H1, S1...
  role: PanelRoleStudio;
  orientation: Orientation;
  width: number;
  height: number;
  thickness: number;
  qty: number;
}

export type OperationType = "rail-cut" | "hinge-bore" | "groove" | "slide-pilot";

export interface StudioOperation {
  type: OperationType;
  targetRole: PanelRoleStudio;
  face?: "front" | "back";
  diameter?: number;
  depth?: number;
  width?: number;
  length?: number;
  through: boolean;
  qty: number;
}

export interface DespieceResult {
  panels: StudioPanel[];
  operations: StudioOperation[];
}

interface RawPanel {
  role: PanelRoleStudio;
  orientation: Orientation;
  width: number;
  height: number;
  thickness: number;
}

const ROLE_BADGE: Record<PanelRoleStudio, string> = {
  "back-panel": "B",
  "horizontal-deck": "H",
  "vertical-side": "S",
  door: "D",
  "drawer-front": "F",
  "drawer-side": "DS",
  "drawer-back": "DB",
  "drawer-bottom": "DF",
  "drawer-inner-front": "IF",
};

const round = (v: number) => Math.round(v * 1000) / 1000;
const toCm = (v: number) => Math.round(v * 1000) / 10;

/** Map a 3D box to its flat-panel cut dimensions + orientation.
 *  Returns null for non-cut roles (hanging bars, etc.) that are visual only. */
function rawFromBox(box: Box3D): RawPanel | null {
  const [sx, sy, sz] = box.size;
  const role: Partial<Record<BoxRole, PanelRoleStudio>> = {
    side: "vertical-side",
    deck: "horizontal-deck",
    shelf: "horizontal-deck",
    back: "back-panel",
    door: "door",
    "drawer-front": "drawer-front",
    "drawer-side": "drawer-side",
    "drawer-back": "drawer-back",
    "drawer-bottom": "drawer-bottom",
    "drawer-inner-front": "drawer-inner-front",
    "hanging-rail": "horizontal-deck", // structural bar appears in cutlist as a horizontal panel
    "divider-panel": "vertical-side",  // vertical divider appears as a side panel
    // "hanging-bar" intentionally omitted — metal rod, not a cut panel
  };
  const r = role[box.role];
  if (!r) return null; // non-cut role (hanging-bar, etc.)
  if (r === "vertical-side") {
    return { role: r, orientation: "vertical-yz", width: toCm(sz), height: toCm(sy), thickness: toCm(sx) };
  }
  if (r === "drawer-side") {
    return { role: r, orientation: "vertical-yz", width: toCm(sz), height: toCm(sy), thickness: toCm(sx) };
  }
  if (r === "horizontal-deck") {
    // height → innerW (cabinet opening, Largo); width → D (depth/fondo, Ancho)
    return { role: r, orientation: "horizontal-xz", width: toCm(sz), height: toCm(sx), thickness: toCm(sy) };
  }
  if (r === "drawer-bottom") {
    // height → drawerInnerW (Largo); width → drawerDepth (Ancho)
    return { role: r, orientation: "horizontal-xz", width: toCm(sz), height: toCm(sx), thickness: toCm(sy) };
  }
  // back-panel, door, drawer-front/back/inner-front: flat in the x-y plane
  return { role: r, orientation: "vertical-xy", width: toCm(sx), height: toCm(sy), thickness: toCm(sz) };
}

function panelKey(p: RawPanel): string {
  return `${p.role}|${p.width}|${p.height}|${p.thickness}`;
}

/** Rail-cut grooves machined into structural decks/sides for shelf rails. */
function operationsForPanel(p: StudioPanel): StudioOperation[] {
  const ops: StudioOperation[] = [];
  const railLen = (v: number) => round(v - 0.04);

  if (p.role === "horizontal-deck" || p.role === "vertical-side") {
    const length = railLen(p.role === "horizontal-deck" ? p.width : p.height);
    for (const face of ["front", "back"] as const) {
      ops.push({
        type: "rail-cut",
        targetRole: p.role,
        face,
        depth: 0.5,
        width: 2.1,
        length,
        through: false,
        qty: p.qty,
      });
    }
  }
  if (p.role === "back-panel") {
    ops.push({ type: "groove", targetRole: p.role, depth: 0.8, width: round(p.thickness), length: round(p.width), through: false, qty: p.qty });
  }
  if (p.role === "door") {
    ops.push({ type: "hinge-bore", targetRole: p.role, diameter: 3.5, depth: 1.2, through: false, qty: p.qty * 2 });
  }
  if (p.role === "drawer-front" || p.role === "drawer-side") {
    ops.push({ type: "slide-pilot", targetRole: p.role, diameter: 0.4, depth: 1, through: false, qty: p.qty * 4 });
  }
  return ops;
}

function groupOps(ops: StudioOperation[]): StudioOperation[] {
  const map = new Map<string, StudioOperation>();
  for (const op of ops) {
    const k = `${op.type}|${op.targetRole}|${op.face ?? ""}|${op.diameter ?? ""}|${op.depth ?? ""}|${op.width ?? ""}|${op.length ?? ""}`;
    const existing = map.get(k);
    if (existing) existing.qty += op.qty;
    else map.set(k, { ...op });
  }
  return Array.from(map.values());
}

export function computeDespieceFromBoxes(boxes: Box3D[]): DespieceResult {
  const groups = new Map<string, StudioPanel>();
  const badgeCount: Record<string, number> = {};

  for (const box of boxes) {
    const raw = rawFromBox(box);
    if (!raw) continue;
    const key = panelKey(raw);
    const existing = groups.get(key);
    if (existing) {
      existing.qty += 1;
      continue;
    }
    const prefix = ROLE_BADGE[raw.role];
    badgeCount[prefix] = (badgeCount[prefix] ?? 0) + 1;
    groups.set(key, {
      key,
      badge: `${prefix}${badgeCount[prefix]}`,
      role: raw.role,
      orientation: raw.orientation,
      width: raw.width,
      height: raw.height,
      thickness: raw.thickness,
      qty: 1,
    });
  }

  const panels = Array.from(groups.values());
  const operations = groupOps(panels.flatMap(operationsForPanel));
  return { panels, operations };
}

export function computeDespiece(doc: StudioDocument): DespieceResult {
  // Respect hidden back panels stored in doc.globals — same source of truth as
  // the 3D viewer's expanded mode. Build the exclusion set here so callers
  // don't need to replicate the col/cell → box-id mapping.
  const hidden = new Set(doc.globals.hiddenBackPanels ?? []);
  const excludeIds = new Set<string>();
  if (hidden.size > 0) {
    const colIdToIdx = new Map(doc.columns.map((c, i) => [c.id, i]));
    // Individual back panels
    doc.columns.forEach((col, ci) => {
      col.cells.forEach((cell, idx) => {
        if (hidden.has(`${col.id}/${cell.id}`)) excludeIds.add(`back-${ci}-${idx}`);
      });
    });
    // Grouped back panels — key format: "grouped/${leftColId}/${rightColId}/m${mi}"
    for (const hiddenKey of hidden) {
      if (!hiddenKey.startsWith("grouped/")) continue;
      const inner = hiddenKey.slice("grouped/".length);
      const lastSlash = inner.lastIndexOf("/");
      if (lastSlash < 0) continue;
      const colPart = inner.slice(0, lastSlash);
      const miStr = inner.slice(lastSlash + 1);
      const midSlash = colPart.indexOf("/");
      if (midSlash < 0) continue;
      const leftColId = colPart.slice(0, midSlash);
      const rightColId = colPart.slice(midSlash + 1);
      const mi = parseInt(miStr.slice(1), 10);
      const ciL = colIdToIdx.get(leftColId);
      const ciR = colIdToIdx.get(rightColId);
      if (ciL != null && ciR != null && !isNaN(mi)) {
        excludeIds.add(`back-grouped-${ciL}-${ciR}-m${mi}`);
      }
    }
  }

  const raw = buildAssembly(doc);
  const boxes = excludeIds.size > 0 ? raw.filter((b) => !excludeIds.has(b.id)) : raw;
  return computeDespieceFromBoxes(boxes);
}
