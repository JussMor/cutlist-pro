/**
 * lib/studio/geometry.ts
 * Pure builder: StudioDocument -> list of 3D boxes (the cabinet carcass + cell
 * content). Single source of truth consumed by the r3f viewer (Phase 4) and the
 * despiece engine (Phase 5).
 *
 * The Studio document stores authoring dimensions in centimeters. This builder
 * converts those values to meters for Three.js. Coordinate convention after
 * conversion: x = width (left->right), y = height (up), z = depth
 * (front face at z=0, back at z=D). `pos` is the box CENTER and
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
const cm = (v: number) => v / 100;
const cellH = (c: StudioCell) => Math.max(0.02, cm(c.height));

/** Structural height of a column: sum of cell heights (each cell's input is its
 *  total exterior section height, with top/bottom boards fitting inside). */
function columnHeight(col: StudioColumn): number {
  return col.cells.reduce((acc, c) => acc + cellH(c), 0);
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
      rotation: [0, 0, 0],
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
  const D = Math.max(0.05, cm(doc.globals.depth));
  const boxes: Box3D[] = [];

  // cumulative x boundaries (N columns -> N+1 boundaries)
  const xs: number[] = [0];
  for (const col of doc.columns) {
    xs.push(xs[xs.length - 1] + Math.max(0.05, cm(col.width)));
  }
  const heights = doc.columns.map((c) => columnHeight(c));

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

    // deck centers: k+1 horizontal panels.
    // Outer decks (bottom / top) sit t/2 from the column edge, so they fit
    // inside the first/last cell's height.  Intermediate decks land exactly on
    // the boundary between adjacent cells.
    const totalH = columnHeight(col);
    const deckCenters: number[] = [t / 2]; // deck 0 = bottom plate
    let cumH = 0;
    for (let j = 1; j <= k; j += 1) {
      cumH += cellH(col.cells[j - 1]);
      deckCenters.push(j < k ? cumH : totalH - t / 2); // intermediate or top plate
    }
    deckCenters.forEach((dc, j) => {
      boxes.push({
        id: `deck-${ci}-${j}`,
        role: "deck",
        pos: [cx, dc, D / 2],
        size: [innerW, t, D],
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

const isDrawer = (b: Box3D): boolean => b.role.startsWith("drawer");
const drawerKey = (b: Box3D): string =>
  `${b.meta?.column ?? 0}-${b.meta?.cell ?? 0}-${b.meta?.drawer ?? 0}`;

const isSide = (b: Box3D): boolean => b.role === "side";

/** Largest extent along `axis` over the boxes matched by `pick` (0 if none). */
function maxExtent(
  boxes: Box3D[],
  pick: (b: Box3D) => boolean,
  axis: 0 | 1 | 2,
): number {
  let m = 0;
  for (const b of boxes) if (pick(b)) m = Math.max(m, b.size[axis]);
  return m;
}

interface ExpandCtx {
  center: [number, number, number];
  D: number;  // cabinet depth; explosion distances are fractions of D
  R: number;  // horizontal span; used for the small outward side nudge
  drawerOffsetZ: Map<string, number>; // per-drawer rigid z translation
}

/**
 * "Pull-apart" explosion: covering parts (doors, drawers) slide toward the
 * viewer so the interior becomes visible; structural panels (sides, backs)
 * nudge slightly outward; decks/shelves are already spaced by cell heights so
 * they only need a depth snap to face the camera — no Y re-ordering needed.
 *
 *  doors   → pulled toward viewer so their center sits on the door plane (−0.85·D)
 *  drawers → rigid unit pulled fully out so its REAR face lands on the door
 *            plane — the drawer reads as completely extracted, back flush
 *            with the doors
 *  sides   → small outward X nudge as bookends
 *  backs   → small Z push away from viewer
 *  decks   → depth snapped to C.z only; assembled Y spacing already separates them
 */
function expandedOffset(box: Box3D, ctx: ExpandCtx): [number, number, number] {
  const { center: C, D, R } = ctx;
  const z = box.pos[2];

  if (isDrawer(box)) {
    // All boxes of one drawer share this z → same offset → rigid unit. The
    // offset is precomputed so the drawer's rear face aligns with the doors.
    const dz = ctx.drawerOffsetZ.get(drawerKey(box)) ?? -D * 0.65 - z;
    return [0, 0, dz];
  }

  switch (box.role) {
    case "door":
      return [0, 0, -D * 0.85 - z]; // pull toward viewer; keep X and Y
    case "side": {
      // Only the outer walls move; interior dividers stay in place
      if (!box.meta?.side) return [0, 0, 0];
      const sx = box.meta.side === "left" ? -1 : 1;
      return [sx * R * 0.18, 0, 0];
    }
    case "back":
      return [0, 0, D * 0.6]; // push behind cabinet; keep X and Y
    case "deck":
    case "shelf":
      // Snap to mid-depth so panels face the camera; keep assembled X and Y —
      // cell heights already provide clear vertical separation between decks.
      return [0, 0, C[2] - z];
    default:
      return [0, 0, 0];
  }
}

/**
 * Gentle exploded layout for inspection. Covering parts pull toward the viewer;
 * structural parts stay near their assembled positions. Drawers translate as
 * rigid units.
 */
export function expandAssembly(boxes: Box3D[], factor = 1): Box3D[] {
  const { center, size } = assemblyBounds(boxes);
  const D = Math.max(maxExtent(boxes, isSide, 2), size[2] * 0.8, 0.1);
  const R = Math.max(size[0], size[1], 0.3);

  // Door parts all settle at center z = −0.85·D (their offset cancels their
  // assembled z). Pull each drawer out as a rigid unit so its rear-most face
  // lands on that same plane — the drawer ends up fully extracted, its back
  // flush with the doors instead of staying buried in the carcass.
  const doorPlane = -0.85 * D;
  const drawerRearZ = new Map<string, number>();
  for (const b of boxes) {
    if (!isDrawer(b)) continue;
    const k = drawerKey(b);
    const rear = b.pos[2] + b.size[2] / 2;
    drawerRearZ.set(k, Math.max(drawerRearZ.get(k) ?? -Infinity, rear));
  }
  const drawerOffsetZ = new Map<string, number>();
  for (const [k, rear] of drawerRearZ) drawerOffsetZ.set(k, doorPlane - rear);

  const ctx: ExpandCtx = { center, D, R, drawerOffsetZ };

  return boxes.map((box) => {
    const [dx, dy, dz] = expandedOffset(box, ctx);
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
