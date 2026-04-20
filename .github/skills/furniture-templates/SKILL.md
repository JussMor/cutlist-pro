---
name: furniture-templates
description: "Create, modify, or debug parametric furniture templates in cutlist-pro. Use when: adding a new furniture template (wardrobe, cabinet, shelf, etc.), modifying despiece() panel generation, updating isoLayout() 3D positions, adding template parameters, or working with template categories (cocina, dormitorio, almacenaje, oficina)."
---

# Furniture Templates Skill

## When to Use

- Creating a new parametric furniture template
- Modifying `despiece()` — the panel generation function
- Updating `isoLayout()` — the isometric 3D layout positions
- Adding or changing template parameters (`ParamSchema`)
- Working with template categories: `cocina`, `dormitorio`, `almacenaje`, `oficina`

## Key Files

- [`lib/domain/types.ts`](../../../lib/domain/types.ts) — `FurnitureTemplate`, `Panel`, `IsoPanel`, `ParamSchema` types
- [`lib/templates/`](../../../lib/templates/) — One file per template
- [`components/editor/ParamEditor.tsx`](../../../components/editor/ParamEditor.tsx) — Param form UI (driven by `ParamSchema`)
- [`components/preview/IsoPreview.tsx`](../../../components/preview/IsoPreview.tsx) — 3D isometric renderer
- [`lib/preview/iso.ts`](../../../lib/preview/iso.ts) — Isometric projection math helpers
- [`components/editor/workshopIsoHelpers.ts`](../../../components/editor/workshopIsoHelpers.ts) — Iso layout wiring

## FurnitureTemplate Shape

```typescript
interface FurnitureTemplate {
  id: string;
  name: string;
  category: "cocina" | "dormitorio" | "almacenaje" | "oficina";
  params: ParamSchema[]; // drives ParamEditor form
  despiece: (params) => Panel[]; // returns panels for cut list
  isoLayout: (params) => IsoPanel[]; // returns 3D panel positions
}
```

## Creating a New Template

1. Create `lib/templates/<name>.ts`
2. Define `params: ParamSchema[]` — each param has `key`, `label`, `type` (`number`|`boolean`|`select`), `default`, optionally `min`/`max`/`options`
3. Implement `despiece(params)`: return a `Panel[]`. Each panel needs:
   - `id`, `label`, `width`, `height`, `thickness`
   - `moduleId` (group), `qty`
   - Optional: `grain`, `banding` (top/bottom/left/right booleans), `sheetId`
4. Implement `isoLayout(params)`: return `IsoPanel[]`. Each entry needs `panelId`, `x`, `y`, `z`, `axis` (`'x'|'y'|'z'` — rotation axis for face direction)
5. Register the template in the template registry (check `lib/templates/index.ts` or similar)

## Panel Conventions

- Dimensions are in **millimeters**
- `width` = horizontal (X), `height` = vertical (Y) when panel is front-facing
- `thickness` = depth (Z), typically 18mm for standard MDF/plywood
- Edge banding: `banding.top/bottom/left/right` — set `true` for visible edges

## isoLayout Conventions

- Origin `(0,0,0)` is typically the bottom-front-left corner of the piece
- `axis` determines which face is rendered:
  - `'z'` — front/back face (XY plane)
  - `'x'` — side face (YZ plane)
  - `'y'` — top/bottom face (XZ plane)
- Positions must match `despiece()` output dimensions exactly to avoid visual gaps

## Debugging Tips

- If panels appear misaligned in iso preview, check that `isoLayout` positions account for `thickness` offsets
- If `ParamEditor` shows wrong controls, check `ParamSchema.type` and `min`/`max`
- Run `despiece(defaultParams)` locally to verify panel count and dimensions before wiring the template
