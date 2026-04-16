import { CostBreakdown, CutResult, PricingConfig } from "@/lib/domain/types";

export function calculateCost(
  result: CutResult,
  config: PricingConfig,
): CostBreakdown {
  const material = result.sheets.reduce(
    (sum, ps) => sum + ps.sheet.pricePerSheet,
    0,
  );
  const cutting = result.stats.totalCuts * config.costPerCut;
  const banding = result.stats.totalBandingLength * config.costPerBandingMeter;

  return {
    material,
    cutting,
    banding,
    total: material + cutting + banding,
  };
}
