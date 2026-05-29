/**
 * lib/studio/geometry.ts
 * Pure builder: StudioDocument -> list of 3D boxes (the cabinet carcass + cell
 * content). Single source of truth consumed by the r3f viewer (Phase 4) and the
 * despiece engine (Phase 5).
 *
 * Coordinate convention (meters): x = width (left->right), y = height (up),
 * z = depth (front face at z=0, back at z=D). `pos` is the box CENTER and
 * `size` is [w, h, d] — matching three.js boxGeometry which is centered.
 */
import { ROLE_COLORS } from "./colors";
import type { StudioCell, StudioColumn, StudioDocument } from "./document";

export type BoxRole =
  | "deck"
  | "side"
  | "back"
  | "door"
  | "drawer-front"
  | "drawer-side"
  | "drawer-back"
  | "drawer-bottom"
  | "drawer-inner-front"
  | "shelf";

export interface Box3D {
  id: string;
  role: BoxRole;
  pos: [number, number, number]; // center, meters
  size: [number, number, number]; // [w, h, d], meters
  color: string;
  rotation?: [number, number, number];
  meta?: {
    column?: number;
    cell?: number;
    drawer?: number;
    side?: "left" | "right";
    deckIndex?: number;
    deckCount?: number;
  };
}

export type AssemblyState = "closed" | "open";

const mm = (v: number) => v / 1000;
const cellH = (c: StudioCell) => Math.max(0.02, c.height);

/** Structural height of a column: a deck under/over every cell + the openings. */
function columnHeight(col: StudioColumn, t: number): number {
  const openings = col.cells.reduce((acc, c) => acc + cellH(c), 0);
  return (col.cells.length + 1) * t + openings;
}

interface CellCtx {
  cx: number;
  innerW: number;
  bottom: number;
  top: number;
  D: number;
  t: number;
  ci: number;
  idx: number;
  state: AssemblyState;
}

function addCellContent(boxes: Box3D[], cell: StudioCell, ctx: CellCtx): void {
  const { cx, innerW, bottom, top, D, t, ci, idx, state } = ctx;
  const ch = Math.max(0.02, top - bottom);
  const cyc = (bottom + top) / 2;
  const gap = 0.003;

  switch (cell.type) {
    case "shelf": {
      const n = Math.max(0, cell.shelfCount ?? 1);
      for (let s = 1; s <= n; s += 1) {
        const yy = bottom + (ch * s) / (n + 1);
        boxes.push({
          id: `shelf-${ci}-${idx}-${s}`,
          role: "shelf",
          pos: [cx, yy, D / 2],
          size: [innerW, t, D - 0.02],
          color: ROLE_COLORS.shelf,
          meta: { column: ci, cell: idx, deckIndex: s, deckCount: n + 1 },
        });
      }
      break;
    }
    case "drawer": {
      const n = Math.max(1, cell.drawerCount ?? 1);
      const fh = ch / n - gap;
      const sideT = Math.min(t, Math.max(0.008, t * 0.83));
      const bottomT = Math.min(t, Math.max(0.004, t * 0.28));
      const backT = sideT;
      const drawerDepth = Math.max(0.05, D - 0.07);
      const sideH = Math.max(0.04, Math.min(0.12, fh * 0.58));
      const drawerInnerW = Math.max(0.02, innerW - sideT * 2);
      const frontZ = -t / 2;
      const drawerCenterZ = t + drawerDepth / 2;
      for (let d = 0; d < n; d += 1) {
        const yy = bottom + gap / 2 + fh / 2 + d * (ch / n);
        const boxY = Math.max(bottom + bottomT / 2, yy - fh * 0.1);
        const openZ = state === "open" ? -(0.14 + (n - 1 - d) * 0.06) : 0;
        boxes.push({
          id: `drawer-${ci}-${idx}-${d}`,
          role: "drawer-front",
          pos: [cx, yy, frontZ + openZ],
          size: [innerW - gap, fh, t],
          color: ROLE_COLORS["drawer-front"],
          meta: { column: ci, cell: idx, drawer: d },
        });
        boxes.push({
          id: `drawer-side-l-${ci}-${idx}-${d}`,
          role: "drawer-side",
          pos: [cx - drawerInnerW / 2 - sideT / 2, boxY, drawerCenterZ + openZ],
          size: [sideT, sideH, drawerDepth],
          color: ROLE_COLORS["drawer-side"],
          meta: { column: ci, cell: idx, drawer: d, side: "left" },
        });
        boxes.push({
          id: `drawer-side-r-${ci}-${idx}-${d}`,
          role: "drawer-side",
          pos: [cx + drawerInnerW / 2 + sideT / 2, boxY, drawerCenterZ + openZ],
          size: [sideT, sideH, drawerDepth],
          color: ROLE_COLORS["drawer-side"],
          meta: { column: ci, cell: idx, drawer: d, side: "right" },
        });
        boxes.push({
          id: `drawer-back-${ci}-${idx}-${d}`,
          role: "drawer-back",
          pos: [cx, boxY, t + drawerDepth - backT / 2 + openZ],
          size: [drawerInnerW, sideH, backT],
          color: ROLE_COLORS["drawer-back"],
          meta: { column: ci, cell: idx, drawer: d },
        });
        boxes.push({
          id: `drawer-bottom-${ci}-${idx}-${d}`,
          role: "drawer-bottom",
          pos: [cx, boxY - sideH / 2 + bottomT / 2, drawerCenterZ + openZ],
          size: [drawerInnerW, bottomT, drawerDepth - backT],
          color: ROLE_COLORS["drawer-bottom"],
          meta: { column: ci, cell: idx, drawer: d },
        });
        boxes.push({
          id: `drawer-inner-front-${ci}-${idx}-${d}`,
          role: "drawer-inner-front",
          pos: [cx, boxY, t + backT / 2 + openZ],
          size: [drawerInnerW, sideH, backT],
          color: ROLE_COLORS["drawer-inner-front"],
          meta: { column: ci, cell: idx, drawer: d },
        });
      }
      break;
    }
    case "doors": {
      const leafW = innerW / 2 - gap;
      boxes.push(doorBox(`door-${ci}-${idx}-l`, cx - innerW / 2, leafW, cyc, ch - gap, t, "left", state));
      boxes.push(doorBox(`door-${ci}-${idx}-r`, cx + innerW / 2, leafW, cyc, ch - gap, t, "right", state));
      break;
    }
    case "left-door": {
      boxes.push(doorBox(`door-${ci}-${idx}`, cx - innerW / 2, innerW - gap, cyc, ch - gap, t, "left", state));
      break;
    }
    case "right-door": {
      boxes.push(doorBox(`door-${ci}-${idx}`, cx + innerW / 2, innerW - gap, cyc, ch - gap, t, "right", state));
      break;
    }
    default:
      break; // "multiple" -> open compartment
  }
}

function doorBox(
  id: string,
  hingeX: number,
  width: number,
  cy: number,
  height: number,
  t: number,
  hinge: "left" | "right",
  state: AssemblyState,
): Box3D {
  if (state === "closed") {
    const dir = hinge === "left" ? 1 : -1;
    return {
      id,
      role: "door",
      pos: [hingeX + dir * width / 2, cy, -t / 2],
      size: [width, height, t],
      color: ROLE_COLORS.door,
      meta: { side: hinge },
    };
  }

  const angle = Math.PI * 0.46;
  const dir = hinge === "left" ? 1 : -1;
  return {
    id,
    role: "door",
    pos: [
      hingeX + dir * Math.cos(angle) * width / 2,
      cy,
      -t / 2 - Math.sin(angle) * width / 2,
    ],
    size: [width, height, t],
    color: ROLE_COLORS.door,
    rotation: [0, dir * angle, 0],
    meta: { side: hinge },
  };
}

export function buildAssembly(
  doc: StudioDocument,
  state: AssemblyState = "closed",
): Box3D[] {
  const t = mm(doc.globals.thickness);
  const D = Math.max(0.05, doc.globals.depth);
  const overhang = mm(doc.globals.overhang);
  const boxes: Box3D[] = [];

  // cumulative x boundaries (N columns -> N+1 boundaries)
  const xs: number[] = [0];
  for (const col of doc.columns) {
    xs.push(xs[xs.length - 1] + Math.max(0.05, col.width));
  }
  const heights = doc.columns.map((c) => columnHeight(c, t));

  // vertical sides on each boundary; height = max of the adjacent columns
  for (let b = 0; b < xs.length; b += 1) {
    const leftH = b > 0 ? heights[b - 1] : 0;
    const rightH = b < doc.columns.length ? heights[b] : 0;
    const h = Math.max(leftH, rightH);
    if (h <= 0) continue;
    boxes.push({
      id: `side-${b}`,
      role: "side",
      pos: [xs[b], h / 2, D / 2],
      size: [t, h, D],
      color: ROLE_COLORS.side,
      meta: { side: b === 0 ? "left" : b === xs.length - 1 ? "right" : undefined },
    });
  }

  doc.columns.forEach((col, ci) => {
    const cx = (xs[ci] + xs[ci + 1]) / 2;
    const innerW = xs[ci + 1] - xs[ci] - t;
    const k = col.cells.length;

    // deck centers: k+1 horizontal panels
    const deckCenters: number[] = [];
    for (let j = 0; j <= k; j += 1) {
      const openings = col.cells.slice(0, j).reduce((a, c) => a + cellH(c), 0);
      deckCenters.push(t / 2 + j * t + openings);
    }
    deckCenters.forEach((dc, j) => {
      const isTop = j === k;
      boxes.push({
        id: `deck-${ci}-${j}`,
        role: "deck",
        pos: [cx, dc, (isTop ? D + overhang : D) / 2],
        size: [innerW, t, isTop ? D + overhang : D],
        color: ROLE_COLORS.deck,
        meta: { column: ci, deckIndex: j, deckCount: k },
      });
    });

    col.cells.forEach((cell, idx) => {
      const bottom = deckCenters[idx] + t / 2;
      const top = deckCenters[idx + 1] - t / 2;
      const cyc = (bottom + top) / 2;
      boxes.push({
        id: `back-${ci}-${idx}`,
        role: "back",
        pos: [cx, cyc, D - t / 2],
        size: [innerW, Math.max(0.02, top - bottom), t],
        color: ROLE_COLORS.back,
        meta: { column: ci, cell: idx },
      });
      addCellContent(boxes, cell, { cx, innerW, bottom, top, D, t, ci, idx, state });
    });
  });

  return boxes;
}

export interface Bounds {
  min: [number, number, number];
  max: [number, number, number];
  center: [number, number, number];
  size: [number, number, number];
}

export function assemblyBounds(boxes: Box3D[]): Bounds {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const b of boxes) {
    for (let a = 0; a < 3; a += 1) {
      min[a] = Math.min(min[a], b.pos[a] - b.size[a] / 2);
      max[a] = Math.max(max[a], b.pos[a] + b.size[a] / 2);
    }
  }
  if (!boxes.length) {
    return { min: [0, 0, 0], max: [0, 0, 0], center: [0, 0, 0], size: [0, 0, 0] };
  }
  return {
    min,
    max,
    center: [
      (min[0] + max[0]) / 2,
      (min[1] + max[1]) / 2,
      (min[2] + max[2]) / 2,
    ],
    size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]],
  };
}

function thicknessAxis(size: [number, number, number]): number {
  let a = 0;
  for (let i = 1; i < 3; i += 1) if (size[i] < size[a]) a = i;
  return a;
}

/** Offsets each box outward from the assembly center along its thickness axis. */
export function explode(boxes: Box3D[], factor: number): Box3D[] {
  if (factor <= 0) return boxes;
  const { center } = assemblyBounds(boxes);
  return boxes.map((b) => {
    const a = thicknessAxis(b.size);
    const dir = Math.sign(b.pos[a] - center[a]) || 1;
    const pos: [number, number, number] = [...b.pos];
    pos[a] += dir * factor;
    return { ...b, pos };
  });
}

function drawerOffset(box: Box3D): [number, number, number] {
  const d = box.meta?.drawer ?? 0;
  const unit = 0.16 + d * 0.08;
  if (box.role === "drawer-front") {
    return [-0.5 - d * 0.03, 0, -unit - 0.08];
  }
  if (box.role === "drawer-side") {
    const side = box.meta?.side === "left" ? -0.025 : 0.025;
    return [-0.34 - d * 0.03 + side, 0, -unit];
  }
  return [-0.34 - d * 0.03, 0, -unit];
}

function expandedOffset(box: Box3D, center: [number, number, number]): [number, number, number] {
  const [x, y, z] = box.pos;
  const sx = Math.sign(x - center[0]) || (box.meta?.side === "left" ? -1 : 1);
  const sy = Math.sign(y - center[1]) || 1;

  switch (box.role) {
    case "drawer-front":
    case "drawer-side":
    case "drawer-back":
    case "drawer-bottom":
    case "drawer-inner-front":
      return drawerOffset(box);
    case "door":
      return [sx * 0.22, 0, -0.2];
    case "side":
      return [sx * 0.2, 0, 0.02];
    case "back":
      return [0, 0, 0.24];
    case "deck":
    case "shelf":
      return [0, sy * 0.16, 0];
    default:
      return [0, 0, z > center[2] ? 0.12 : -0.12];
  }
}

/** Role-aware expansion for inspection; drawer parts stay grouped as drawer boxes. */
export function expandAssembly(boxes: Box3D[], factor = 1): Box3D[] {
  const { center } = assemblyBounds(boxes);
  return boxes.map((box) => {
    const [dx, dy, dz] = expandedOffset(box, center);
    return {
      ...box,
      pos: [
        box.pos[0] + dx * factor,
        box.pos[1] + dy * factor,
        box.pos[2] + dz * factor,
      ],
    };
  });
}
