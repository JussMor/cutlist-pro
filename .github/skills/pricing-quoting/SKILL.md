---
name: pricing-quoting
description: "Work with pricing, cost breakdown, and quoting configuration in cutlist-pro. Use when: modifying pricing formulas, adding new cost components, updating PricingConfig defaults, changing how edge banding or cut costs are calculated, debugging cost breakdowns, or working with the Zustand pricingStore."
---

# Pricing & Quoting Skill

## When to Use

- Modifying the pricing formula (material, cuts, edge banding)
- Adding a new cost component (e.g. hardware, assembly labor)
- Changing `PricingConfig` defaults or schema
- Debugging why a cost breakdown shows wrong values
- Working with the Zustand `pricingStore` state

## Key Files

- [`lib/pricing.ts`](../../../lib/pricing.ts) — `calculateCost()` — pure pricing formula
- [`lib/domain/types.ts`](../../../lib/domain/types.ts) — `PricingConfig`, `CostBreakdown` types
- [`store/pricingStore.ts`](../../../store/pricingStore.ts) — Zustand store for global pricing config
- [`components/pricing/CostBreakdown.tsx`](../../../components/pricing/CostBreakdown.tsx) — UI renderer
- [`components/editor/sections/PricingSection.tsx`](../../../components/editor/sections/PricingSection.tsx) — Editor sidebar Tarifa (solo costos)
- [`components/editor/sections/OptimizerSection.tsx`](../../../components/editor/sections/OptimizerSection.tsx) — Parametros tecnicos usados por optimizer/fitting
- [`workers/api.ts`](../../../workers/api.ts) — `POST /api/optimize` invokes `calculateCost` in-worker

## Pricing Formula

```
totalCost = materialCost + cuttingCost + bandingCost

materialCost  = sum of (placedPanels × sheet unit price)
cuttingCost   = totalCuts × config.costPerCut
bandingCost   = totalBandingMeters × config.costPerBandingMeter
```

`PricingConfig` fields:

- `costPerCut` — price per guillotine cut
- `costPerBandingMeter` — price per meter of edge banding applied
- Sheet prices come from `StockSheet.price` (pulled from Odoo)

## Adding a New Cost Component

1. Add the new field to `PricingConfig` in `lib/domain/types.ts`
2. Update `calculateCost()` in `lib/pricing.ts` to compute and return the new value
3. Add it to `CostBreakdown` return type
4. Update `CostBreakdown.tsx` to render the new line item
5. Update `pricingStore.ts` default config with a sensible default value
6. Update `PricingSection.tsx` to let users configure the new field

## Zustand Store Pattern

The pricing config is **global Zustand state** — it is NOT per-panel or per-module. When saving a project, the current config snapshot is serialized into the project workspace JSON.

```typescript
// Read
const config = usePricingStore((s) => s.config);
// Write
usePricingStore.getState().setConfig({ costPerCut: 1.5 });
```

## UI Split Convention (Tarifa vs Optimizador)

- `PricingSection` should expose tariff inputs only (`costPerCut`, `costPerBandingMeter`)
- Non-tariff technical settings (kerf, clearances, trim, door/drawer system, banding type) belong in `OptimizerSection`

## Edge Banding Calculation

Edge banding meters are summed from each placed panel's `Panel.banding` object:

- `top`, `bottom`, `left`, `right` — boolean flags per edge
- Length of each edge = panel dimension after placement (respecting rotation)
