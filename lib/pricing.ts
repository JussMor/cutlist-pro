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
  const subtotal = material + cutting + banding;
  const margin = subtotal * (config.marginPercent ?? 0);

  return {
    material,
    cutting,
    banding,
    margin,
    total: subtotal + margin,
  };
}
