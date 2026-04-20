---
name: guillotine-optimizer
description: "Work with the guillotine 2D bin-packing cut optimizer in lib/optimizer/guillotine.ts. Use when: adding panel placement logic, modifying kerf/rotation/grain constraints, debugging cut optimization results, extending the optimizer with new scoring strategies, or interpreting CutResult output."
---

# Guillotine Optimizer Skill

## When to Use

- Adding or modifying panel placement / scoring logic
- Changing kerf width, grain direction, or rotation behavior
- Debugging why panels are not placed or placed suboptimally
- Extending with new bin-packing strategies or heuristics
- Interpreting `CutResult` / `PlacedPanel` output in other components

## Key Files

- [`lib/optimizer/guillotine.ts`](../../../lib/optimizer/guillotine.ts) — Core algorithm
- [`lib/domain/types.ts`](../../../lib/domain/types.ts) — `Panel`, `StockSheet`, `CutResult`, `PlacedPanel` types
- [`workers/api.ts`](../../../workers/api.ts) — `POST /api/optimize` endpoint (calls optimizer in-worker)
- [`components/cutlist/SheetLayouts.tsx`](../../../components/cutlist/SheetLayouts.tsx) — Visual layout renderer
- [`components/cutlist/CutlistTable.tsx`](../../../components/cutlist/CutlistTable.tsx) — Cut list table

## Algorithm Overview

1. **Input**: `Panel[]` (with dimensions, grain, edge banding) + `StockSheet[]` + `kerfWidth`
2. **Candidate scoring**: tries short-side fit, long-side fit, and area fit; picks best score
3. **Guillotine splits**: after placing a panel, splits remaining free rect into two sub-rects (tries both vertical-first and horizontal-first; picks tighter fit)
4. **Rotation**: panels without grain constraint can be rotated 90°
5. **Output**: `CutResult` — array of sheets, each with `PlacedPanel[]` (x, y, w, h, rotated) and waste percentage

## Constraints

- Grain direction: if `panel.grain === 'length'`, the panel's length must align with the sheet's long axis — no rotation allowed
- Kerf is added to panel dimensions before scoring to account for saw blade width
- Panels that don't fit on any sheet are tracked as `unplaced`

## Extending the Optimizer

When adding a new scoring strategy:

1. Add the scoring function alongside existing ones in `guillotine.ts`
2. Try the new strategy in the candidate loop and compare scores
3. Update the `OptimizeRequest` type in `lib/domain/types.ts` if new config is needed
4. Expose the config in `POST /api/optimize` payload (`workers/api.ts`)

## Debugging Tips

- Log `freeRects` before and after each placement to trace why a panel doesn't fit
- Compare `rotated: true` placements vs expected grain direction
- Check that kerf is not double-counted (applied once per split, not per candidate)
- Waste % = `(unusedArea / totalSheetArea) * 100`
