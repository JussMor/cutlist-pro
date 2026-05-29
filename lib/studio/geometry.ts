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
  | "shelf";

export interface Box3D {
  id: string;
  role: BoxRole;
  pos: [number, number, number]; // center, meters
  size: [number, number, number]; // [w, h, d], meters
  color: string;
}

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
}

function addCellContent(boxes: Box3D[], cell: StudioCell, ctx: CellCtx): void {
  const { cx, innerW, bottom, top, D, t, ci, idx } = ctx;
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
        });
      }
      break;
    }
    case "drawer": {
      const n = Math.max(1, cell.drawerCount ?? 1);
      const fh = ch / n - gap;
      for (let d = 0; d < n; d += 1) {
        const yy = bottom + gap / 2 + fh / 2 + d * (ch / n);
        boxes.push({
          id: `drawer-${ci}-${idx}-${d}`,
          role: "drawer-front",
          pos: [cx, yy, t / 2],
          size: [innerW - gap, fh, t],
          color: ROLE_COLORS["drawer-front"],
        });
      }
      break;
    }
    case "doors": {
      const leafW = innerW / 2 - gap;
      for (const [k, dx] of [
        ["l", -innerW / 4],
        ["r", innerW / 4],
      ] as const) {
        boxes.push({
          id: `door-${ci}-${idx}-${k}`,
          role: "door",
          pos: [cx + dx, cyc, t / 2],
          size: [leafW, ch - gap, t],
          color: ROLE_COLORS.door,
        });
      }
      break;
    }
    case "left-door":
    case "right-door": {
      boxes.push({
        id: `door-${ci}-${idx}`,
        role: "door",
        pos: [cx, cyc, t / 2],
        size: [innerW - gap, ch - gap, t],
        color: ROLE_COLORS.door,
      });
      break;
    }
    default:
      break; // "multiple" -> open compartment
  }
}

export function buildAssembly(doc: StudioDocument): Box3D[] {
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
      });
      addCellContent(boxes, cell, { cx, innerW, bottom, top, D, t, ci, idx });
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
