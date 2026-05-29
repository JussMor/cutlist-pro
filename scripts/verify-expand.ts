/**
 * scripts/verify-expand.ts
 * Overlap invariant for the exploded ("expanded") 3D view. Builds several
 * representative cabinets, explodes them with expandAssembly, and asserts that
 * no two part AABBs intersect — except boxes that belong to the SAME drawer,
 * which nest by design. Exits non-zero (so it can gate) if any config overlaps.
 *
 * Run (geometry.ts uses extensionless relative imports + moduleResolution
 * "bundler", so bundle with the repo's esbuild rather than node --strip-types):
 *   node_modules/.bin/esbuild scripts/verify-expand.ts --bundle --platform=node \
 *     --format=esm --outfile=/tmp/verify-expand.mjs && node /tmp/verify-expand.mjs
 */
import { buildAssembly, expandAssembly, type Box3D } from "../lib/studio/geometry";
import {
  DEFAULT_GLOBALS,
  type CellType,
  type StudioCell,
  type StudioColumn,
  type StudioDocument,
} from "../lib/studio/document";

let uid = 0;
const nextId = (p: string): string => `${p}-${(uid += 1)}`;

function cell(type: CellType, opts: Partial<StudioCell> = {}): StudioCell {
  return {
    id: nextId("cell"),
    type,
    height: opts.height ?? 0.3,
    shelfCount: opts.shelfCount,
    drawerCount: opts.drawerCount,
  };
}

function column(width: number, cells: StudioCell[]): StudioColumn {
  return { id: nextId("col"), width, cells };
}

function doc(title: string, columns: StudioColumn[]): StudioDocument {
  const now = Date.now();
  return {
    id: nextId("doc"),
    title,
    columns,
    globals: { ...DEFAULT_GLOBALS },
    createdAt: now,
    updatedAt: now,
  };
}

const configs: StudioDocument[] = [
  doc("tiny (1 col, doors)", [column(0.45, [cell("doors")])]),
  doc("GOOD (screenshot 1)", [
    column(0.45, [cell("doors"), cell("drawer", { drawerCount: 2 }), cell("doors")]),
    column(0.45, [cell("shelf", { shelfCount: 1 })]),
  ]),
  doc("BAD (screenshot 2 regression)", [
    column(0.4, [
      cell("doors", { height: 0.5 }),
      cell("drawer", { drawerCount: 3, height: 0.45 }),
      cell("doors", { height: 0.4 }),
    ]),
    column(0.45, [cell("shelf", { shelfCount: 1 })]),
  ]),
  doc("stress (4 cols mixed)", [
    column(0.5, [cell("doors"), cell("drawer", { drawerCount: 3 })]),
    column(0.35, [cell("shelf", { shelfCount: 3 }), cell("left-door")]),
    column(0.6, [cell("drawer", { drawerCount: 2 }), cell("doors"), cell("shelf", { shelfCount: 2 })]),
    column(0.3, [cell("right-door"), cell("multiple"), cell("drawer", { drawerCount: 1 })]),
  ]),
  doc("tall single drawer-stack", [
    column(0.45, Array.from({ length: 5 }, () => cell("drawer", { drawerCount: 1, height: 0.18 }))),
  ]),
];

const isDrawer = (b: Box3D): boolean => b.role.startsWith("drawer");
const drawerKey = (b: Box3D): string =>
  `${b.meta?.column ?? 0}-${b.meta?.cell ?? 0}-${b.meta?.drawer ?? 0}`;

/** Do two axis-aligned boxes intersect? Touching within eps counts as separate. */
function overlaps(p: Box3D, q: Box3D, eps = 1e-4): boolean {
  for (let a = 0; a < 3; a += 1) {
    const pmin = p.pos[a] - p.size[a] / 2;
    const pmax = p.pos[a] + p.size[a] / 2;
    const qmin = q.pos[a] - q.size[a] / 2;
    const qmax = q.pos[a] + q.size[a] / 2;
    if (pmax <= qmin + eps || qmax <= pmin + eps) return false;
  }
  return true;
}

let failed = 0;
for (const d of configs) {
  const exploded = expandAssembly(buildAssembly(d, "closed"));
  const offenders: string[] = [];
  for (let i = 0; i < exploded.length; i += 1) {
    for (let j = i + 1; j < exploded.length; j += 1) {
      const p = exploded[i];
      const q = exploded[j];
      if (isDrawer(p) && isDrawer(q) && drawerKey(p) === drawerKey(q)) continue;
      if (overlaps(p, q)) offenders.push(`${p.id} (${p.role}) ∩ ${q.id} (${q.role})`);
    }
  }
  if (offenders.length) {
    failed += 1;
    console.error(`FAIL  ${d.title}: ${offenders.length} overlapping pair(s)`);
    for (const o of offenders.slice(0, 12)) console.error(`        ${o}`);
  } else {
    console.log(`ok    ${d.title}: ${exploded.length} parts, no overlaps`);
  }
}

if (failed) {
  console.error(`\n${failed} config(s) have overlapping parts.`);
  process.exit(1);
}
console.log("\nAll configs explode without overlapping parts.");
