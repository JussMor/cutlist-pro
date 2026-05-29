/**
 * lib/studio/despiece.ts
 * Pure engine: StudioDocument -> grouped panel cutlist + machining operations.
 * Derived from the same boxes as the 3D viewer (buildAssembly) so the cutlist
 * and the model can never drift. All dimensions are METERS to match the model.
 */
import { buildAssembly, type Box3D, type BoxRole } from "./geometry";
import type { StudioDocument } from "./document";

export type PanelRoleStudio =
  | "back-panel"
  | "horizontal-deck"
  | "vertical-side"
  | "door"
  | "drawer-front";

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
};

const round = (v: number) => Math.round(v * 1000) / 1000;

/** Map a 3D box to its flat-panel cut dimensions + orientation. */
function rawFromBox(box: Box3D): RawPanel {
  const [sx, sy, sz] = box.size;
  const role: Record<BoxRole, PanelRoleStudio> = {
    side: "vertical-side",
    deck: "horizontal-deck",
    shelf: "horizontal-deck",
    back: "back-panel",
    door: "door",
    "drawer-front": "drawer-front",
  };
  const r = role[box.role];
  if (r === "vertical-side") {
    return { role: r, orientation: "vertical-yz", width: round(sz), height: round(sy), thickness: round(sx) };
  }
  if (r === "horizontal-deck") {
    return { role: r, orientation: "horizontal-xz", width: round(sx), height: round(sz), thickness: round(sy) };
  }
  // back-panel, door, drawer-front: flat in the x-y plane
  return { role: r, orientation: "vertical-xy", width: round(sx), height: round(sy), thickness: round(sz) };
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
        depth: 0.005,
        width: 0.021,
        length,
        through: false,
        qty: p.qty,
      });
    }
  }
  if (p.role === "back-panel") {
    ops.push({ type: "groove", targetRole: p.role, depth: 0.008, width: round(p.thickness), length: round(p.width), through: false, qty: p.qty });
  }
  if (p.role === "door") {
    ops.push({ type: "hinge-bore", targetRole: p.role, diameter: 0.035, depth: 0.012, through: false, qty: p.qty * 2 });
  }
  if (p.role === "drawer-front") {
    ops.push({ type: "slide-pilot", targetRole: p.role, diameter: 0.004, depth: 0.01, through: false, qty: p.qty * 4 });
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

export function computeDespiece(doc: StudioDocument): DespieceResult {
  const boxes = buildAssembly(doc);

  // group identical raw panels (deterministic by first-seen order)
  const groups = new Map<string, StudioPanel>();
  const badgeCount: Record<string, number> = {};

  for (const box of boxes) {
    const raw = rawFromBox(box);
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
