import type { GrainDirection, Panel } from "@/lib/domain/types";

export function grainDirectionLabel(value: GrainDirection) {
  if (value === "vertical") return "Veta vertical";
  if (value === "horizontal") return "Veta horizontal";
  return "Libre";
}

export function applyGrainDirection(panel: Panel, grainDirection: GrainDirection): Panel {
  if (grainDirection === "none") {
    return { ...panel, grainDirection: "none" };
  }

  const longSide = Math.max(panel.L, panel.W);
  const shortSide = Math.min(panel.L, panel.W);

  return {
    ...panel,
    L: grainDirection === "vertical" ? longSide : shortSide,
    W: grainDirection === "vertical" ? shortSide : longSide,
    grainDirection,
  };
}

export function applyGrainDirectionToPanels(
  panels: Panel[],
  grainDirection: GrainDirection,
): Panel[] {
  return panels.map((panel) => applyGrainDirection(panel, grainDirection));
}

export function panelFitsSheetWithGrain(panel: Panel, sheet: { L: number; W: number }) {
  if (panel.grainDirection && panel.grainDirection !== "none") {
    return panel.L <= sheet.L && panel.W <= sheet.W;
  }

  return (
    (panel.L <= sheet.L && panel.W <= sheet.W) ||
    (panel.W <= sheet.L && panel.L <= sheet.W)
  );
}
