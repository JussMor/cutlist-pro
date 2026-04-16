import {
  CutResult,
  Panel,
  PlacedPanel,
  PlacedSheet,
  StockSheet,
} from "@/lib/domain/types";

interface Space {
  x: number;
  y: number;
  W: number;
  H: number;
}

interface Item extends Panel {
  instanceId: string;
}

interface SheetInstance extends StockSheet {
  instanceId: string;
}

interface PlacementCandidate {
  itemIndex: number;
  spaceIndex: number;
  rotated: boolean;
  w: number;
  h: number;
  split: "vertical-first" | "horizontal-first";
  scoreShort: number;
  scoreLong: number;
  scoreArea: number;
}

function contains(a: Space, b: Space): boolean {
  return (
    b.x >= a.x && b.y >= a.y && b.x + b.W <= a.x + a.W && b.y + b.H <= a.y + a.H
  );
}

function pruneSpaces(spaces: Space[]): Space[] {
  const pruned: Space[] = [];
  for (let i = 0; i < spaces.length; i += 1) {
    const s = spaces[i];
    if (s.W <= 0.1 || s.H <= 0.1) continue;
    let covered = false;
    for (let j = 0; j < spaces.length; j += 1) {
      if (i === j) continue;
      if (contains(spaces[j], s)) {
        covered = true;
        break;
      }
    }
    if (!covered) pruned.push(s);
  }
  return pruned;
}

function splitGuillotineSpace(
  space: Space,
  used: { x: number; y: number; w: number; h: number },
  kerfCm: number,
  split: "vertical-first" | "horizontal-first",
): Space[] {
  const next: Space[] = [];
  const remW = space.W - used.w - kerfCm;
  const remH = space.H - used.h - kerfCm;

  if (split === "vertical-first") {
    // 1) Vertical full-height cut => right strip
    if (remW > 0.1) {
      next.push({
        x: space.x + used.w + kerfCm,
        y: space.y,
        W: remW,
        H: space.H,
      });
    }
    // 2) Horizontal cut inside left strip => top-left remainder
    if (remH > 0.1) {
      next.push({
        x: space.x,
        y: space.y + used.h + kerfCm,
        W: used.w,
        H: remH,
      });
    }
  } else {
    // 1) Horizontal full-width cut => top strip
    if (remH > 0.1) {
      next.push({
        x: space.x,
        y: space.y + used.h + kerfCm,
        W: space.W,
        H: remH,
      });
    }
    // 2) Vertical cut inside lower strip => right-bottom remainder
    if (remW > 0.1) {
      next.push({
        x: space.x + used.w + kerfCm,
        y: space.y,
        W: remW,
        H: used.h,
      });
    }
  }

  return next;
}

function findBestCandidate(
  spaces: Space[],
  items: Item[],
  sheetOdooId: number,
): PlacementCandidate | null {
  let best: PlacementCandidate | null = null;

  for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
    const item = items[itemIndex];
    if (item.stockSheetId && item.stockSheetId !== sheetOdooId) continue;

    for (let spaceIndex = 0; spaceIndex < spaces.length; spaceIndex += 1) {
      const s = spaces[spaceIndex];

      const trials: Array<{ rotated: boolean; w: number; h: number }> = [
        { rotated: false, w: item.W, h: item.L },
        { rotated: true, w: item.L, h: item.W },
      ];

      for (const trial of trials) {
        if (trial.w > s.W || trial.h > s.H) continue;

        const leftoverW = s.W - trial.w;
        const leftoverH = s.H - trial.h;
        const scoreShort = Math.min(leftoverW, leftoverH);
        const scoreLong = Math.max(leftoverW, leftoverH);
        const scoreArea = leftoverW * leftoverH;

        const splitModes: Array<"vertical-first" | "horizontal-first"> = [
          "vertical-first",
          "horizontal-first",
        ];

        for (const split of splitModes) {
          if (
            !best ||
            scoreShort < best.scoreShort ||
            (scoreShort === best.scoreShort && scoreLong < best.scoreLong) ||
            (scoreShort === best.scoreShort &&
              scoreLong === best.scoreLong &&
              scoreArea < best.scoreArea)
          ) {
            best = {
              itemIndex,
              spaceIndex,
              rotated: trial.rotated,
              w: trial.w,
              h: trial.h,
              split,
              scoreShort,
              scoreLong,
              scoreArea,
            };
          }
        }
      }
    }
  }

  return best;
}

function computeBandingLengthCm(panels: Panel[]): number {
  let total = 0;
  for (const panel of panels) {
    const horizontalEdges =
      (panel.banding.top ? 1 : 0) + (panel.banding.bottom ? 1 : 0);
    const verticalEdges =
      (panel.banding.left ? 1 : 0) + (panel.banding.right ? 1 : 0);
    total += panel.qty * (horizontalEdges * panel.W + verticalEdges * panel.L);
  }
  return total;
}

export function optimizeGuillotine(
  panels: Panel[],
  sheets: StockSheet[],
  kerfCm: number,
): CutResult {
  const items: Item[] = panels.flatMap((p) =>
    Array.from({ length: Math.max(1, p.qty) }, (_, i) => ({
      ...p,
      instanceId: `${p.id}-${i + 1}`,
    })),
  );

  // Process large items first to stabilize packing.
  items.sort((a, b) => b.L * b.W - a.L * a.W);

  const sheetInstances: SheetInstance[] = sheets.flatMap((sheet) => {
    const copies = Math.max(1, Math.floor(sheet.qty || 1));
    return Array.from({ length: copies }, (_, index) => ({
      ...sheet,
      qty: 1,
      instanceId: `${sheet.odooId}-${index + 1}`,
    }));
  });

  const placedSheets: PlacedSheet[] = [];
  const totalArea = panels.reduce((sum, p) => sum + p.L * p.W * p.qty, 0);
  let totalCutLength = 0;
  let totalCuts = 0;

  for (const sheet of sheetInstances) {
    if (items.length === 0) break;

    const placed: PlacedPanel[] = [];
    let spaces: Space[] = [{ x: 0, y: 0, W: sheet.W, H: sheet.L }];

    // MaxRects-like loop: place one best-fit item at a time and split free spaces.
    while (true) {
      const candidate = findBestCandidate(spaces, items, sheet.odooId);
      if (!candidate) break;

      const space = spaces[candidate.spaceIndex];
      const item = items[candidate.itemIndex];

      const used = {
        x: space.x,
        y: space.y,
        w: candidate.w,
        h: candidate.h,
      };

      placed.push({
        panelId: item.instanceId,
        x: used.x,
        y: used.y,
        w: used.w,
        h: used.h,
        rotated: candidate.rotated,
      });
      items.splice(candidate.itemIndex, 1);

      spaces.splice(candidate.spaceIndex, 1);
      const splitSpaces = splitGuillotineSpace(
        space,
        used,
        kerfCm,
        candidate.split,
      );
      spaces = pruneSpaces([...spaces, ...splitSpaces]);

      const remW = space.W - used.w - kerfCm;
      const remH = space.H - used.h - kerfCm;

      // Straight-saw metrics: only full straight cuts implied by guillotine split.
      if (remW > 0.1 && remH > 0.1) {
        totalCuts += 2;
        if (candidate.split === "vertical-first") {
          totalCutLength += space.H + used.w;
        } else {
          totalCutLength += space.W + used.h;
        }
      } else if (remW > 0.1) {
        totalCuts += 1;
        totalCutLength += space.H;
      } else if (remH > 0.1) {
        totalCuts += 1;
        totalCutLength += space.W;
      }
    }

    if (placed.length > 0) {
      placedSheets.push({ sheet, placed });
    }
  }

  const usedArea = placedSheets.reduce(
    (sum, ps) => sum + ps.sheet.L * ps.sheet.W,
    0,
  );
  const wastedArea = Math.max(usedArea - totalArea, 0);

  return {
    sheets: placedSheets,
    stats: {
      sheetsUsed: placedSheets.length,
      totalArea,
      wastedArea,
      wastePercent: usedArea > 0 ? (wastedArea / usedArea) * 100 : 0,
      totalCuts,
      totalCutLength,
      totalBandingLength: computeBandingLengthCm(panels) / 100,
    },
  };
}
