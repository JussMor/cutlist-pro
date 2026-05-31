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
 *
 * Stacked modules: when a column's total height exceeds MAX_MODULE_HEIGHT_M,
 * the column is split into independent stacked modules. Each module gets its
 * own lateral side panels and top/bottom deck panels — matching real furniture
 * construction where tall carcasses are built as two bolted units.
 */
import { ROLE_COLORS } from "./colors";
import { cellFront, cellInterior } from "./document";
import type { CellFront, StudioCell, StudioColumn, StudioDocument } from "./document";

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
  | "shelf"
  | "hanging-rail"   // horizontal clothes rod structural bar
  | "hanging-bar"    // individual hanging bar (not a cut panel)
  | "divider-panel"; // vertical divider panel

export interface Box3D {
  id: string;
  role: BoxRole;
  pos: [number, number, number]; // center, meters
  size: [number, number, number]; // [w, h, d], meters
  color: string;
  rotation?: [number, number, number];
  meta?: {
    column?: number;
    columnRight?: number; // for merged spanning decks: the right-column index
    cell?: number;
    drawer?: number;
    side?: "left" | "right" | "up";
    deckIndex?: number;
    deckCount?: number;
    module?: number; // stacked module index (0 = bottom)
    merged?: boolean; // true when two adjacent-column decks are merged into one spanning panel
  };
}

export type AssemblyState = "closed" | "open";

const mm = (v: number) => v / 1000;
const cm = (v: number) => v / 100;
const cellH = (c: StudioCell) => Math.max(0.02, cm(c.height));

// Each stacked module must be no taller than this (mirrors MAX_MODULE_HEIGHT_CM)
const MAX_MODULE_HEIGHT_M = 2.40;

interface ModuleSegment {
  cells: StudioCell[];
  startY: number;     // Y of the module's floor (meters)
  height: number;     // total height of this module (meters)
  cellOffset: number; // global index of the first cell in col.cells
}

/**
 * Split a column's cells into stacked module segments, each ≤ MAX_MODULE_HEIGHT_M.
 * Greedy: pack cells until the next one would overflow, then start a new segment.
 */
function splitColumnIntoModules(col: StudioColumn): ModuleSegment[] {
  const segments: ModuleSegment[] = [];
  let currentCells: StudioCell[] = [];
  let currentH = 0;
  let startY = 0;
  let segCellOffset = 0;

  for (let i = 0; i < col.cells.length; i++) {
    const cell = col.cells[i];
    const ch = cellH(cell);
    if (currentH > 0 && currentH + ch > MAX_MODULE_HEIGHT_M) {
      segments.push({ cells: [...currentCells], startY, height: currentH, cellOffset: segCellOffset });
      startY += currentH;
      currentCells = [];
      currentH = 0;
      segCellOffset = i;
    }
    currentCells.push(cell);
    currentH += ch;
  }
  if (currentCells.length > 0) {
    segments.push({ cells: currentCells, startY, height: currentH, cellOffset: segCellOffset });
  }
  return segments;
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
  skipFront?: boolean; // true when this cell is part of a spanning front pair
}

function addCellContent(boxes: Box3D[], cell: StudioCell, ctx: CellCtx): void {
  const { cx, innerW, bottom, top, D, t, ci, idx, state } = ctx;
  const ch = Math.max(0.02, top - bottom);
  const cyc = (bottom + top) / 2;
  const gap = 0.003;

  const interior = cellInterior(cell);
  const front = cellFront(cell);

  switch (interior) {
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
      const drawerDepth = Math.max(0.05, D - t - 0.02);
      const sideH = Math.max(0.04, fh - 0.02);
      const drawerInnerW = Math.max(0.02, innerW - sideT * 2);
      const frontZ = -t / 2;
      const drawerCenterZ = t + drawerDepth / 2;
      for (let d = 0; d < n; d += 1) {
        const yy = bottom + gap / 2 + fh / 2 + d * (ch / n);
        const boxY = yy;
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
    case "hanging": {
      // Horizontal clothes rail near the top of the compartment
      const railH = Math.min(t * 1.2, 0.025);
      const railY = top - railH / 2 - 0.005;
      boxes.push({
        id: `hanging-rail-${ci}-${idx}`,
        role: "hanging-rail",
        pos: [cx, railY, D / 2],
        size: [innerW, railH, D * 0.12],
        color: ROLE_COLORS["hanging-rail"],
        meta: { column: ci, cell: idx },
      });
      // Individual hanging bars below the rail (visual only, not cut panels)
      const nBars = Math.max(2, Math.round(innerW / 0.15));
      const barH = (top - bottom) * 0.50;
      const barY = railY - barH / 2 - railH / 2;
      for (let h = 0; h < nBars; h++) {
        const bx = cx - innerW / 2 + (innerW / (nBars + 1)) * (h + 1);
        boxes.push({
          id: `hanging-bar-${ci}-${idx}-${h}`,
          role: "hanging-bar",
          pos: [bx, barY, D * 0.40],
          size: [0.008, barH, 0.008],
          color: ROLE_COLORS["hanging-bar"],
          meta: { column: ci, cell: idx },
        });
      }
      break;
    }
    case "divider": {
      const n = Math.max(1, cell.dividerCount ?? 1);
      const divH = Math.max(0.02, ch - t);
      for (let d = 0; d < n; d++) {
        const dx = cx - innerW / 2 + (innerW * (d + 1)) / (n + 1);
        boxes.push({
          id: `divider-panel-${ci}-${idx}-${d}`,
          role: "divider-panel",
          pos: [dx, cyc, D / 2],
          size: [t, divH, D - t],
          color: ROLE_COLORS["divider-panel"],
          meta: { column: ci, cell: idx },
        });
      }
      break;
    }
    case "appliance":
      break; // open space reserved for appliance — no structural panels generated

    default:
      break; // "empty" -> open compartment, no interior parts
  }

  // Front doors are independent of the interior.
  // Skip if this cell is part of a spanning front pair — a single tall door is
  // added for the whole pair after the main loop.
  if (!ctx.skipFront) {
    addFront(boxes, front, { cx, innerW, cyc, ch, top, t, ci, idx, gap, state });
  }
}

interface FrontCtx {
  cx: number;
  innerW: number;
  cyc: number;
  ch: number;
  top: number;
  t: number;
  ci: number;
  idx: number | string; // string used for spanning-front unique IDs
  gap: number;
  state: AssemblyState;
}

function addFront(boxes: Box3D[], front: CellFront, ctx: FrontCtx): void {
  const { cx, innerW, cyc, ch, top, t, ci, idx, gap, state } = ctx;
  switch (front) {
    case "double": {
      const leafW = innerW / 2 - gap;
      boxes.push(doorBox(`door-${ci}-${idx}-l`, cx - innerW / 2, leafW, cyc, ch - gap, t, "left", state));
      boxes.push(doorBox(`door-${ci}-${idx}-r`, cx + innerW / 2, leafW, cyc, ch - gap, t, "right", state));
      break;
    }
    case "left":
      boxes.push(doorBox(`door-${ci}-${idx}`, cx - innerW / 2, innerW - gap, cyc, ch - gap, t, "left", state));
      break;
    case "right":
      boxes.push(doorBox(`door-${ci}-${idx}`, cx + innerW / 2, innerW - gap, cyc, ch - gap, t, "right", state));
      break;
    case "flip-up":
      boxes.push(flipDoorBox(`door-${ci}-${idx}`, cx, innerW - gap, cyc, ch - gap, t, top, state));
      break;
    default:
      break; // "none" -> open front
  }
}

/**
 * Lift-up door: hinged along the TOP edge, swinging the bottom outward/up.
 * Rotates about the X axis (vs. the Y-axis swing of side doors).
 */
function flipDoorBox(
  id: string,
  cx: number,
  width: number,
  cy: number,
  height: number,
  t: number,
  topY: number,
  state: AssemblyState,
): Box3D {
  if (state === "closed") {
    return {
      id,
      role: "door",
      pos: [cx, cy, -t / 2],
      size: [width, height, t],
      color: ROLE_COLORS.door,
      rotation: [0, 0, 0],
      meta: { side: "up" },
    };
  }

  const angle = Math.PI * 0.46;
  const hingeY = topY - gapless(t); // hinge sits at the top edge of the opening
  return {
    id,
    role: "door",
    pos: [
      cx,
      hingeY - Math.cos(angle) * (height / 2),
      -t / 2 - Math.sin(angle) * (height / 2),
    ],
    size: [width, height, t],
    color: ROLE_COLORS.door,
    rotation: [-angle, 0, 0],
    meta: { side: "up" },
  };
}

const gapless = (t: number) => t / 2;

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

  // Split every column into module segments
  const columnModules = doc.columns.map(splitColumnIntoModules);
  const maxModules = columnModules.length > 0
    ? Math.max(...columnModules.map((m) => m.length))
    : 0;

  const colIdToIdx = new Map(doc.columns.map((c, i) => [c.id, i]));

  // ── Horizontal deck merges ────────────────────────────────────────────────
  // Keys format: "${leftColId}:${rightColId}/${mi}/${j}"
  interface HMerge { ciL: number; ciR: number; mi: number; j: number; }
  const hMerges: HMerge[] = [];
  for (const key of doc.globals.mergedDecks ?? []) {
    const m = key.match(/^([^:]+):([^/]+)\/(\d+)\/(\d+)$/);
    if (!m) continue;
    const ciL = colIdToIdx.get(m[1]);
    const ciR = colIdToIdx.get(m[2]);
    if (ciL == null || ciR == null || ciR !== ciL + 1) continue;
    hMerges.push({ ciL, ciR, mi: Number(m[3]), j: Number(m[4]) });
  }
  // ── Open joints: boundaries where the intermediate side panel is removed,
  //    and floor + ceiling decks are automatically spanned into one wide panel.
  // Key format: "${leftColId}:${rightColId}"
  const openJointBoundaries = new Set<number>();
  for (const key of doc.globals.openJoints ?? []) {
    const sep = key.indexOf(":");
    if (sep < 0) continue;
    const ciL = colIdToIdx.get(key.slice(0, sep));
    const ciR = colIdToIdx.get(key.slice(sep + 1));
    if (ciL == null || ciR == null || ciR !== ciL + 1) continue;
    openJointBoundaries.add(ciL + 1);

    // For each shared module, auto-span the floor (j=0) and ceiling (j=k) decks.
    // This is what makes two columns into a true single body — shared structural panels.
    // Max module height constraint is preserved: each module gets its own spanning panels.
    const maxMi = Math.max(columnModules[ciL]?.length ?? 0, columnModules[ciR]?.length ?? 0);
    for (let mi = 0; mi < maxMi; mi++) {
      const modL = columnModules[ciL]?.[mi];
      const modR = columnModules[ciR]?.[mi];
      if (!modL && !modR) continue;

      // Floor deck (j=0): always present in every module
      const floorAlreadyMerged = hMerges.some(
        (hm) => hm.ciL === ciL && hm.ciR === ciR && hm.mi === mi && hm.j === 0,
      );
      if (!floorAlreadyMerged) hMerges.push({ ciL, ciR, mi, j: 0 });

      // Ceiling deck: j = cell count of whichever module exists (they should match
      // for a well-formed grouped cabinet; if they differ, use the left column's count)
      const kCeil = modL?.cells.length ?? modR?.cells.length ?? 0;
      if (kCeil > 0) {
        const ceilAlreadyMerged = hMerges.some(
          (hm) => hm.ciL === ciL && hm.ciR === ciR && hm.mi === mi && hm.j === kCeil,
        );
        if (!ceilAlreadyMerged) hMerges.push({ ciL, ciR, mi, j: kCeil });
      }
    }
  }

  // Decks that are replaced by a merged spanning panel are skipped in per-column rendering
  const skipDeck = new Set<string>();
  for (const hm of hMerges) {
    skipDeck.add(`${hm.ciL}/${hm.mi}/${hm.j}`);
    skipDeck.add(`${hm.ciR}/${hm.mi}/${hm.j}`);
  }

  // ── Spanning fronts: cells whose individual door is replaced by a joint panel ──
  // Key format: "${colId}/${bottomCellId}/${topCellId}"
  const spanSkipCells = new Set<string>();
  for (const key of doc.globals.spanningFronts ?? []) {
    const parts = key.split("/");
    if (parts.length === 3) {
      spanSkipCells.add(parts[1]); // bottomCellId
      spanSkipCells.add(parts[2]); // topCellId
    }
  }

  // Maps cell.id → its computed 3D bounds (filled during the main loop below)
  const cellBoundsMap = new Map<string, { bottom: number; top: number; cx: number; innerW: number; ci: number }>();

  // Vertical sides: one panel per boundary per module.
  // Height at boundary b for module m = max of adjacent columns' module-m height.
  for (let b = 0; b < xs.length; b++) {
    // Open joint: skip the intermediate separator panel at this boundary
    if (b > 0 && b < xs.length - 1 && openJointBoundaries.has(b)) continue;
    for (let mi = 0; mi < maxModules; mi++) {
      const leftMod = b > 0 ? columnModules[b - 1][mi] : undefined;
      const rightMod = b < doc.columns.length ? columnModules[b][mi] : undefined;
      if (!leftMod && !rightMod) continue;
      const h = Math.max(leftMod?.height ?? 0, rightMod?.height ?? 0);
      if (h <= 0) continue;
      const startY = leftMod?.startY ?? rightMod!.startY;
      boxes.push({
        id: `side-${b}-m${mi}`,
        role: "side",
        pos: [xs[b], startY + h / 2, D / 2],
        size: [t, h, D],
        color: ROLE_COLORS.side,
        meta: {
          side: b === 0 ? "left" : b === xs.length - 1 ? "right" : undefined,
          module: mi,
        },
      });
    }
  }

  doc.columns.forEach((col, ci) => {
    const cx = (xs[ci] + xs[ci + 1]) / 2;
    const innerW = xs[ci + 1] - xs[ci] - t;
    const modules = columnModules[ci];

    modules.forEach((mod, mi) => {
      const k = mod.cells.length;
      const startY = mod.startY;
      const totalH = mod.height;

      // Deck centers: k+1 horizontal panels per module.
      // Outer decks (bottom/top) sit t/2 from the module edge.
      const deckCenters: number[] = [startY + t / 2];
      let cumH = 0;
      for (let j = 1; j <= k; j++) {
        cumH += cellH(mod.cells[j - 1]);
        deckCenters.push(j < k ? startY + cumH : startY + totalH - t / 2);
      }

      deckCenters.forEach((dc, j) => {
        // Skip decks absorbed into a horizontal merged spanning panel
        if (skipDeck.has(`${ci}/${mi}/${j}`)) return;

        boxes.push({
          id: `deck-${ci}-m${mi}-${j}`,
          role: "deck",
          pos: [cx, dc, D / 2],
          size: [innerW, t, D],
          color: ROLE_COLORS.deck,
          meta: { column: ci, deckIndex: j, deckCount: k, module: mi },
        });
      });

      mod.cells.forEach((cell, localIdx) => {
        const globalIdx = mod.cellOffset + localIdx;
        const bottom = deckCenters[localIdx] + t / 2;
        const top = deckCenters[localIdx + 1] - t / 2;
        const cyc = (bottom + top) / 2;

        boxes.push({
          id: `back-${ci}-${globalIdx}`,
          role: "back",
          pos: [cx, cyc, D - t / 2],
          size: [innerW, Math.max(0.02, top - bottom), t],
          color: ROLE_COLORS.back,
          meta: { column: ci, cell: globalIdx, module: mi },
        });

        // Record cell bounds for spanning front post-processing
        cellBoundsMap.set(cell.id, { bottom, top, cx, innerW, ci });

        const before = boxes.length;
        addCellContent(boxes, cell, {
          cx, innerW, bottom, top, D, t, ci, idx: globalIdx, state,
          skipFront: spanSkipCells.has(cell.id),
        });
        // Tag newly added content boxes with their module index
        for (let i = before; i < boxes.length; i++) {
          boxes[i] = { ...boxes[i], meta: { ...(boxes[i].meta ?? {}), module: mi } };
        }
      });
    });
  });

  // ── Add spanning panels for each horizontal merge ─────────────────────────
  for (const { ciL, ciR, mi, j } of hMerges) {
    const modL = columnModules[ciL]?.[mi];
    if (!modL) continue;
    const k = modL.cells.length;
    const startY = modL.startY;
    const totalH = modL.height;
    // Recompute deck centers for the left column's module
    const dcs: number[] = [startY + t / 2];
    let cumH = 0;
    for (let jj = 1; jj <= k; jj++) {
      cumH += cellH(modL.cells[jj - 1]);
      dcs.push(jj < k ? startY + cumH : startY + totalH - t / 2);
    }
    if (j >= dcs.length) continue;
    // Span between inner faces of the two outer side panels:
    //   spanW = (xR - T/2) - (xL + T/2) = xR - xL - T
    //         = innerW_L + T_separator + innerW_R  (separator absorbed)
    const xL = xs[ciL];
    const xR = xs[ciR + 1];
    const spanW = xR - xL - t;
    const cxSpan = (xL + xR) / 2;
    boxes.push({
      id: `deck-hmerge-${ciL}-${ciR}-m${mi}-j${j}`,
      role: "deck",
      pos: [cxSpan, dcs[j], D / 2],
      size: [spanW, t, D],
      color: ROLE_COLORS.deck,
      meta: { column: ciL, columnRight: ciR, deckIndex: j, deckCount: k, module: mi, merged: true },
    });
  }

  // ── Add spanning door panels for shared fronts ───────────────────────────
  // Key format: "${colId}/${bottomCellId}/${topCellId}"
  const gap = 0.003;
  for (const key of doc.globals.spanningFronts ?? []) {
    const parts = key.split("/");
    if (parts.length !== 3) continue;
    const [colId, bottomCellId, topCellId] = parts;
    const bBounds = cellBoundsMap.get(bottomCellId);
    const tBounds = cellBoundsMap.get(topCellId);
    if (!bBounds || !tBounds || bBounds.ci !== tBounds.ci) continue;

    const { cx, innerW, ci } = bBounds;
    const combinedBottom = bBounds.bottom;
    const combinedTop = tBounds.top;
    const combinedH = combinedTop - combinedBottom;
    const cyc = (combinedBottom + combinedTop) / 2;

    // Use the bottom cell's front type for the spanning door
    const col = doc.columns[ci];
    const bottomCell = col?.cells.find((c) => c.id === bottomCellId);
    if (!bottomCell) continue;
    const front = cellFront(bottomCell);

    addFront(boxes, front, { cx, innerW, cyc, ch: combinedH, top: combinedTop, t, ci, idx: `span-${colId}-${bottomCellId}`, gap, state });
  }

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
  D: number;
  R: number;
  drawerOffsetZ: Map<string, number>;
}

function expandedOffset(box: Box3D, ctx: ExpandCtx): [number, number, number] {
  const { center: C, D, R } = ctx;
  const z = box.pos[2];

  if (isDrawer(box)) {
    const dz = ctx.drawerOffsetZ.get(drawerKey(box)) ?? -D * 0.65 - z;
    return [0, 0, dz];
  }

  switch (box.role) {
    case "door":
      return [0, 0, -D * 0.85 - z];
    case "side": {
      if (!box.meta?.side) return [0, 0, 0];
      const sx = box.meta.side === "left" ? -1 : 1;
      return [sx * R * 0.18, 0, 0];
    }
    case "back":
      return [0, 0, D * 0.6];
    case "deck":
    case "shelf":
      return [0, 0, C[2] - z];
    default:
      return [0, 0, 0];
  }
}

// Extra vertical gap added between stacked modules in expanded view
const MODULE_EXPAND_GAP = 0.30; // 30 cm

/**
 * Gentle exploded layout for inspection. Covering parts pull toward the viewer;
 * structural parts stay near their assembled positions. Drawers translate as
 * rigid units. When there are multiple stacked modules, each module above the
 * first is lifted by MODULE_EXPAND_GAP so they read as separate carcasses.
 */
export function expandAssembly(boxes: Box3D[], factor = 1): Box3D[] {
  const { center, size } = assemblyBounds(boxes);
  const D = Math.max(maxExtent(boxes, isSide, 2), size[2] * 0.8, 0.1);
  const R = Math.max(size[0], size[1], 0.3);

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
    // Lift each stacked module above module 0 by MODULE_EXPAND_GAP so
    // the two carcasses visually separate in the exploded view.
    const moduleGap = (box.meta?.module ?? 0) * MODULE_EXPAND_GAP * factor;
    return {
      ...box,
      pos: [
        box.pos[0] + dx * factor,
        box.pos[1] + dy * factor + moduleGap,
        box.pos[2] + dz * factor,
      ],
    };
  });
}
