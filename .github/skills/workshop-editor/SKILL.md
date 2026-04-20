---
name: workshop-editor
description: "Work with the interactive panel workshop editor in cutlist-pro. Use when: adding editor sections, modifying WorkshopApp, working with editor hooks (useWorkshopPanels, useWorkshopModules, useWorkshopSheets, useWorkshopAssemblies, useWorkshopProjects, useWorkshopPreview), handling the module tree, managing panel state, or wiring new editor sidebar sections."
---

# Workshop Editor Skill

## When to Use

- Adding a new editor sidebar section
- Modifying `WorkshopApp.tsx` overall structure or section routing
- Working with any of the 6 editor hooks
- Adding panel fields, module logic, or assembly-to-panel wiring
- Handling project save/load lifecycle
- Debugging state sync issues between hooks

## Key Files

- [`components/editor/WorkshopApp.tsx`](../../../components/editor/WorkshopApp.tsx) — Main editor shell; coordinates all hooks and sections
- [`components/editor/workshopPanelHelpers.ts`](../../../components/editor/workshopPanelHelpers.ts) — Panel derivation utilities
- [`components/editor/workshopIsoHelpers.ts`](../../../components/editor/workshopIsoHelpers.ts) — Iso preview wiring helpers
- [`components/editor/hooks/useWorkshopPanels.ts`](../../../components/editor/hooks/useWorkshopPanels.ts) — Panel CRUD state
- [`components/editor/hooks/useWorkshopModules.ts`](../../../components/editor/hooks/useWorkshopModules.ts) — Module tree state
- [`components/editor/hooks/useWorkshopSheets.ts`](../../../components/editor/hooks/useWorkshopSheets.ts) — Sheet selection + stock loading
- [`components/editor/hooks/useWorkshopAssemblies.ts`](../../../components/editor/hooks/useWorkshopAssemblies.ts) — Assembly attach/detach
- [`components/editor/hooks/useWorkshopProjects.ts`](../../../components/editor/hooks/useWorkshopProjects.ts) — Project save/load
- [`components/editor/hooks/useWorkshopPreview.ts`](../../../components/editor/hooks/useWorkshopPreview.ts) — Iso preview state
- [`components/editor/sections/`](../../../components/editor/sections/) — Sidebar section components
- [`components/editor/sections/PricingSection.tsx`](../../../components/editor/sections/PricingSection.tsx) — Tarifa (solo costos)
- [`components/editor/sections/OptimizerSection.tsx`](../../../components/editor/sections/OptimizerSection.tsx) — Parametros de optimizacion y herrajes

## Hook Responsibilities

| Hook                    | Owns                                                           |
| ----------------------- | -------------------------------------------------------------- |
| `useWorkshopPanels`     | `Panel[]` — add, remove, update panel fields                   |
| `useWorkshopModules`    | Module tree — add, nest, rename, delete modules                |
| `useWorkshopSheets`     | Available `StockSheet[]` from API + per-panel sheet assignment |
| `useWorkshopAssemblies` | Attached assemblies → inflated to panels                       |
| `useWorkshopProjects`   | Save workspace to API, load existing project                   |
| `useWorkshopPreview`    | `showIso`, `isoCamera`, trigger re-render                      |

## Data Flow

```
WorkshopApp
 ├── useWorkshopPanels  → panels[]
 ├── useWorkshopModules → modules[] (tree)
 ├── useWorkshopSheets  → sheets[], stockMap
 ├── useWorkshopAssemblies → assembledPanels[]
 ├── useWorkshopPreview → isoState
 └── useWorkshopProjects → save(workspace), loadProject(id)
       ↓ merges all hook state into WorkspaceSnapshot for persistence
```

## Adding a New Editor Section

1. Create `components/editor/sections/MySection.tsx`
2. Accept relevant state slices as props (keep sections dumb — no direct hook calls)
3. Add the section to the sidebar switch/tab in `WorkshopApp.tsx`
4. If new state is needed, add it to the most relevant existing hook or create a new `useWorkshop*.ts`

## Right Panel Conventions

- Keep the `Tarifas` block focused on pricing-only inputs (`costPerCut`, `costPerBandingMeter`)
- Keep optimizer and fitting inputs (`kerfCm`, `fitClearanceCm`, `trimAllowanceCm`, door/drawer settings, etc.) in `Optimizador`
- Do not add action buttons unless explicitly requested; preserve removed controls

## Panel Field Conventions

- `panel.id` — UUID, stable across saves
- `panel.moduleId` — links panel to a module (required)
- `panel.sheetId` — user-selected stock sheet (optional; optimizer will assign if missing)
- `panel.qty` — multiplier (default 1); optimizer expands qty into individual instances
- `panel.label` — display name shown in cut list

## Project Save Pattern

`useWorkshopProjects.save()` collects a `WorkspaceSnapshot`:

```typescript
{
  (panels, modules, isoState, pricingConfig, cutResult);
}
```

This is sent to `POST /api/projects` which stores metadata in D1 and the full snapshot in KV.
