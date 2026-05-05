import {
  CutResult,
  CutStep,
  GuillotineSplitPreference,
  OptimizeRequestOptions,
  OptimizerComparisonEntry,
  Panel,
  PlacedPanel,
  PlacedSheet,
  StockSheet,
} from "@/lib/domain/types";
import {
  buildCutStepsForPlacement,
  computeBandingLengthCm,
} from "@/lib/optimizer/guillotine-helpers";

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
  splitPenalty: number;
}

type EffectiveSplitPreference = Exclude<GuillotineSplitPreference, "auto-best">;

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
    if (remW > 0.1) {
      next.push({
        x: space.x + used.w + kerfCm,
        y: space.y,
        W: remW,
        H: space.H,
      });
    }
    if (remH > 0.1) {
      next.push({
        x: space.x,
        y: space.y + used.h + kerfCm,
        W: used.w,
        H: remH,
      });
    }
  } else {
    if (remH > 0.1) {
      next.push({
        x: space.x,
        y: space.y + used.h + kerfCm,
        W: space.W,
        H: remH,
      });
    }
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

function splitOrderForSpace(
  space: Space,
  splitPreference: EffectiveSplitPreference,
): Array<"vertical-first" | "horizontal-first"> {
  if (splitPreference === "vertical-first") {
    return ["vertical-first", "horizontal-first"];
  }
  if (splitPreference === "horizontal-first") {
    return ["horizontal-first", "vertical-first"];
  }
  return space.W <= space.H
    ? ["horizontal-first", "vertical-first"]
    : ["vertical-first", "horizontal-first"];
}

function findBestCandidate(
  spaces: Space[],
  items: Item[],
  sheetOdooId: number,
  splitPreference: EffectiveSplitPreference,
): PlacementCandidate | null {
  let best: PlacementCandidate | null = null;

  for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
    const item = items[itemIndex];

    // Skip panels constrained to a different sheet (mixed mode)
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

        const splitModes = splitOrderForSpace(s, splitPreference);
        for (
          let splitPenalty = 0;
          splitPenalty < splitModes.length;
          splitPenalty += 1
        ) {
          const split = splitModes[splitPenalty];
          if (
            !best ||
            scoreShort < best.scoreShort ||
            (scoreShort === best.scoreShort && scoreLong < best.scoreLong) ||
            (scoreShort === best.scoreShort &&
              scoreLong === best.scoreLong &&
              scoreArea < best.scoreArea) ||
            (scoreShort === best.scoreShort &&
              scoreLong === best.scoreLong &&
              scoreArea === best.scoreArea &&
              splitPenalty < best.splitPenalty)
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
              splitPenalty,
            };
          }
        }
      }
    }
  }

  return best;
}

function optimizeWithPreference(
  panels: Panel[],
  sheets: StockSheet[],
  kerfCm: number,
  splitPreference: EffectiveSplitPreference,
): CutResult {
  const items: Item[] = panels.flatMap((p) =>
    Array.from({ length: Math.max(1, p.qty) }, (_, i) => ({
      ...p,
      instanceId: `${p.id}-${i + 1}`,
    })),
  );

  items.sort((a, b) => b.L * b.W - a.L * a.W);

  if (sheets.length === 0) {
    const totalArea = panels.reduce((sum, p) => sum + p.L * p.W * p.qty, 0);
    return {
      sheets: [],
      stats: {
        sheetsUsed: 0,
        totalArea,
        wastedArea: 0,
        wastePercent: 0,
        totalCuts: 0,
        totalCutLength: 0,
        totalBandingLength: computeBandingLengthCm(panels) / 100,
        unplacedPanels: items.length,
      },
    };
  }

  const sheetTemplates: StockSheet[] = sheets.map((sheet) => ({
    ...sheet,
    qty: 1,
  }));
  const sheetInstanceCount = new Map<number, number>();

  const placedSheets: PlacedSheet[] = [];
  const totalArea = panels.reduce((sum, p) => sum + p.L * p.W * p.qty, 0);
  let totalCutLength = 0;
  let totalCuts = 0;

  let templateCursor = 0;
  let noPlacementStreak = 0;

  while (
    items.length > 0 &&
    noPlacementStreak < Math.max(3, sheetTemplates.length)
  ) {
    const template = sheetTemplates[templateCursor % sheetTemplates.length];
    templateCursor += 1;
    const nextInstanceNumber =
      (sheetInstanceCount.get(template.odooId) ?? 0) + 1;
    sheetInstanceCount.set(template.odooId, nextInstanceNumber);

    const sheet: SheetInstance = {
      ...template,
      instanceId: `${template.odooId}-${nextInstanceNumber}`,
    };

    const placed: PlacedPanel[] = [];
    const cutSteps: CutStep[] = [];
    let nextCutOrder = 1;
    let spaces: Space[] = [{ x: 0, y: 0, W: sheet.W, H: sheet.L }];

    while (true) {
      const candidate = findBestCandidate(
        spaces,
        items,
        sheet.odooId,
        splitPreference,
      );
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

      const steps = buildCutStepsForPlacement(
        space,
        used,
        kerfCm,
        candidate.split,
        item.instanceId,
        nextCutOrder,
      );
      nextCutOrder += steps.length;
      cutSteps.push(...steps);
      totalCuts += steps.length;
      totalCutLength += steps.reduce((sum, step) => sum + step.length, 0);
    }

    if (placed.length > 0) {
      placedSheets.push({ sheet, placed, cutSteps });
      noPlacementStreak = 0;
    } else {
      noPlacementStreak += 1;
    }
  }

  const usedArea = placedSheets.reduce(
    (sum, ps) => sum + ps.sheet.L * ps.sheet.W,
    0,
  );
  const wastedArea = Math.max(usedArea - totalArea, 0);
  const unplacedPanels = items.length;

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
      unplacedPanels,
    },
  };
}

function compareResults(a: CutResult, b: CutResult): number {
  if (a.stats.sheetsUsed !== b.stats.sheetsUsed) {
    return a.stats.sheetsUsed - b.stats.sheetsUsed;
  }
  if (Math.abs(a.stats.wastePercent - b.stats.wastePercent) > 0.0001) {
    return a.stats.wastePercent - b.stats.wastePercent;
  }
  if (a.stats.totalCuts !== b.stats.totalCuts) {
    return a.stats.totalCuts - b.stats.totalCuts;
  }
  if (Math.abs(a.stats.totalCutLength - b.stats.totalCutLength) > 0.0001) {
    return a.stats.totalCutLength - b.stats.totalCutLength;
  }
  return a.stats.wastedArea - b.stats.wastedArea;
}

export function optimizeGuillotine(
  panels: Panel[],
  sheets: StockSheet[],
  kerfCm: number,
  options: OptimizeRequestOptions = {},
): CutResult {
  const requestedSplitPreference = options.splitPreference ?? "vertical-first";

  if (requestedSplitPreference === "auto-best") {
    const evaluated: Array<{
      splitPreference: EffectiveSplitPreference;
      result: CutResult;
    }> = [
      {
        splitPreference: "vertical-first",
        result: optimizeWithPreference(
          panels,
          sheets,
          kerfCm,
          "vertical-first",
        ),
      },
      {
        splitPreference: "horizontal-first",
        result: optimizeWithPreference(
          panels,
          sheets,
          kerfCm,
          "horizontal-first",
        ),
      },
      {
        splitPreference: "short-side-first",
        result: optimizeWithPreference(
          panels,
          sheets,
          kerfCm,
          "short-side-first",
        ),
      },
    ];

    let best = evaluated[0];
    for (let i = 1; i < evaluated.length; i += 1) {
      if (compareResults(evaluated[i].result, best.result) < 0) {
        best = evaluated[i];
      }
    }

    return {
      ...best.result,
      optimizer: {
        requestedSplitPreference,
        appliedSplitPreference: best.splitPreference,
        compared: evaluated.map<OptimizerComparisonEntry>((entry) => ({
          splitPreference: entry.splitPreference,
          sheetsUsed: entry.result.stats.sheetsUsed,
          wastePercent: entry.result.stats.wastePercent,
          totalCuts: entry.result.stats.totalCuts,
          totalCutLength: entry.result.stats.totalCutLength,
        })),
      },
    };
  }

  const appliedSplitPreference = requestedSplitPreference;
  const result = optimizeWithPreference(
    panels,
    sheets,
    kerfCm,
    appliedSplitPreference,
  );

  return {
    ...result,
    optimizer: {
      requestedSplitPreference,
      appliedSplitPreference,
    },
  };
}
