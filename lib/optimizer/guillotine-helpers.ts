import { CutStep, Panel } from "@/lib/domain/types";

interface CutSpace {
  x: number;
  y: number;
  W: number;
  H: number;
}

interface UsedRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function computeBandingLengthCm(panels: Panel[]): number {
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

export function buildCutStepsForPlacement(
  space: CutSpace,
  used: UsedRect,
  kerfCm: number,
  split: "vertical-first" | "horizontal-first",
  panelId: string,
  startOrder: number,
): CutStep[] {
  const remW = space.W - used.w - kerfCm;
  const remH = space.H - used.h - kerfCm;
  const xCut = space.x + used.w + kerfCm / 2;
  const yCut = space.y + used.h + kerfCm / 2;
  const steps: CutStep[] = [];

  if (remW > 0.1 && remH > 0.1) {
    if (split === "vertical-first") {
      steps.push({
        order: startOrder,
        panelId,
        split,
        orientation: "vertical",
        x1: xCut,
        y1: space.y,
        x2: xCut,
        y2: space.y + space.H,
        length: space.H,
      });
      steps.push({
        order: startOrder + 1,
        panelId,
        split,
        orientation: "horizontal",
        x1: space.x,
        y1: yCut,
        x2: space.x + used.w,
        y2: yCut,
        length: used.w,
      });
    } else {
      steps.push({
        order: startOrder,
        panelId,
        split,
        orientation: "horizontal",
        x1: space.x,
        y1: yCut,
        x2: space.x + space.W,
        y2: yCut,
        length: space.W,
      });
      steps.push({
        order: startOrder + 1,
        panelId,
        split,
        orientation: "vertical",
        x1: xCut,
        y1: space.y,
        x2: xCut,
        y2: space.y + used.h,
        length: used.h,
      });
    }
    return steps;
  }

  if (remW > 0.1) {
    steps.push({
      order: startOrder,
      panelId,
      split,
      orientation: "vertical",
      x1: xCut,
      y1: space.y,
      x2: xCut,
      y2: space.y + space.H,
      length: space.H,
    });
  } else if (remH > 0.1) {
    steps.push({
      order: startOrder,
      panelId,
      split,
      orientation: "horizontal",
      x1: space.x,
      y1: yCut,
      x2: space.x + space.W,
      y2: yCut,
      length: space.W,
    });
  }

  return steps;
}
