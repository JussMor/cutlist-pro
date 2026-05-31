"use client";

import { Fragment, useEffect, useMemo, useState } from "react";

import { SheetLayouts } from "@/components/cutlist/SheetLayouts";
import { StockSelector } from "@/components/cutlist/StockSelector";
import { CostBreakdown } from "@/components/pricing/CostBreakdown";
import { optimize, fetchSheets } from "@/lib/api/client";
import type {
  CutResult,
  GuillotineSplitPreference,
  MaterialMode,
  Panel,
  PanelRole,
  StockSheet,
} from "@/lib/domain/types";
import { aggregateDespiece, type AggregateEntry } from "@/lib/studio/aggregate";
import { computeDespiece } from "@/lib/studio/despiece";
import type { StudioPanel } from "@/lib/studio/despiece";
import type { ManualPanel } from "@/lib/studio/document";
import { usePricingStore } from "@/store/pricingStore";
import { useStudioStore } from "@/store/studioStore";
import { Plus, RefreshCw, Scissors, Trash2 } from "lucide-react";

import { CombinedProjectsPicker } from "./CombinedProjectsPicker";

const roleLabels: Record<StudioPanel["role"], string> = {
  "back-panel": "Fondo",
  "horizontal-deck": "Tapa / base / entrepanio",
  "vertical-side": "Lateral",
  door: "Puerta",
  "drawer-front": "Frente de cajon",
  "drawer-side": "Lateral de cajon",
  "drawer-back": "Trasera de cajon",
  "drawer-bottom": "Fondo de cajon",
  "drawer-inner-front": "Frente interno",
};

const roleMap: Record<StudioPanel["role"], PanelRole> = {
  "back-panel": "back",
  "horizontal-deck": "shelf",
  "vertical-side": "side",
  door: "door",
  "drawer-front": "drawer-front",
  "drawer-side": "drawer-side",
  "drawer-back": "drawer-back",
  "drawer-bottom": "drawer-bottom",
  "drawer-inner-front": "drawer-front",
};

function panelId(panel: StudioPanel) {
  return `studio-${panel.badge}-${panel.key.replace(/[^a-z0-9]+/gi, "-")}`;
}

const ROLE_BANDING: Record<StudioPanel["role"], Panel["banding"]> = {
  // front vertical edge of side panel = left edge (length L = column height)
  "vertical-side": { top: false, bottom: false, left: true, right: false },
  // front edge of shelf/deck = left edge (length L = inner width, after L/W fix)
  "horizontal-deck": { top: false, bottom: false, left: true, right: false },
  // all 4 edges visible on doors and drawer fronts
  door: { top: true, bottom: true, left: true, right: true },
  "drawer-front": { top: true, bottom: true, left: true, right: true },
  // top edge of drawer side is visible when looking into the drawer
  "drawer-side": { top: true, bottom: false, left: false, right: false },
  // hidden parts — no banding
  "back-panel": { top: false, bottom: false, left: false, right: false },
  "drawer-back": { top: false, bottom: false, left: false, right: false },
  "drawer-bottom": { top: false, bottom: false, left: false, right: false },
  "drawer-inner-front": { top: false, bottom: false, left: false, right: false },
};

function toOptimizerPanel(
  panel: StudioPanel,
  stockSheetId: number | null,
  bandingOverride?: Panel["banding"],
): Panel {
  return {
    id: panelId(panel),
    label: `${panel.badge} ${roleLabels[panel.role]}`,
    role: roleMap[panel.role],
    qty: panel.qty,
    L: panel.height,
    W: panel.width,
    banding: bandingOverride ?? ROLE_BANDING[panel.role],
    stockSheetId,
    grainDirection: "none",
  };
}

function manualToOptimizerPanel(panel: ManualPanel, stockSheetId: number | null): Panel {
  return {
    id: `manual-${panel.id}`,
    label: panel.label || "Pieza manual",
    role: "shelf",
    qty: panel.qty,
    L: panel.L,
    W: panel.W,
    banding: panel.banding,
    stockSheetId,
    grainDirection: "none",
  };
}

function BandingToggle({
  banding,
  onChange,
}: {
  banding: ManualPanel["banding"];
  onChange: (b: ManualPanel["banding"]) => void;
}) {
  const on = "#f4b450";
  const off = "#2a3040";
  const toggle = (edge: keyof ManualPanel["banding"]) =>
    onChange({ ...banding, [edge]: !banding[edge] });
  return (
    <div className="flex flex-col items-center gap-0.5">
      <button type="button" onClick={() => toggle("top")} title="Canto superior"
        className="h-2 w-6 rounded-sm transition" style={{ background: banding.top ? on : off }} />
      <div className="flex gap-0.5">
        <button type="button" onClick={() => toggle("left")} title="Canto izquierdo"
          className="h-4 w-2 rounded-sm transition" style={{ background: banding.left ? on : off }} />
        <div className="h-4 w-4 rounded-sm bg-[#1a2230]" />
        <button type="button" onClick={() => toggle("right")} title="Canto derecho"
          className="h-4 w-2 rounded-sm transition" style={{ background: banding.right ? on : off }} />
      </div>
      <button type="button" onClick={() => toggle("bottom")} title="Canto inferior"
        className="h-2 w-6 rounded-sm transition" style={{ background: banding.bottom ? on : off }} />
    </div>
  );
}

function splitPreferenceLabel(value: GuillotineSplitPreference) {
  if (value === "vertical-first") return "Normal";
  if (value === "horizontal-first") return "Invertida";
  if (value === "short-side-first") return "Lado menor";
  return "Auto optimo";
}

function isDrawerPanel(panel: StudioPanel) {
  return panel.role.startsWith("drawer-");
}

function panelFitsSheet(panel: Panel, sheet: StockSheet): boolean {
  return (
    (panel.L <= sheet.L && panel.W <= sheet.W) ||
    (panel.W <= sheet.L && panel.L <= sheet.W)
  );
}

function panelFitsAnySheet(panel: Panel, sheets: StockSheet[]): boolean {
  return sheets.some((s) => panelFitsSheet(panel, s));
}

/** Deduplicate source sheets by material+dimensions — the optimizer treats
 *  sheets of equal size as interchangeable, so sending duplicates inflates
 *  the layout count without adding value. Remap panel stockSheetIds to the
 *  canonical representative for each group. */
function canonicalizeMixedSheets(
  panels: Panel[],
  sheets: StockSheet[],
): { panels: Panel[]; sheets: StockSheet[] } {
  const canonicalId = new Map<number, number>(); // odooId → canonical odooId
  const seen = new Map<string, number>(); // "material|LxW" → canonical odooId
  const dedupedSheets: StockSheet[] = [];

  for (const sheet of sheets) {
    const key = `${sheet.material ?? ""}|${sheet.L}x${sheet.W}`;
    const existing = seen.get(key);
    if (existing != null) {
      canonicalId.set(sheet.odooId, existing);
    } else {
      seen.set(key, sheet.odooId);
      canonicalId.set(sheet.odooId, sheet.odooId);
      dedupedSheets.push(sheet);
    }
  }

  const remappedPanels = panels.map((p) => {
    if (!p.stockSheetId) return p;
    const cId = canonicalId.get(p.stockSheetId) ?? p.stockSheetId;
    return cId !== p.stockSheetId ? { ...p, stockSheetId: cId } : p;
  });

  return { panels: remappedPanels, sheets: dedupedSheets };
}

function drawerCollectionIndex(panel: StudioPanel) {
  const match = panel.badge.match(/\d+$/);
  return match ? Number(match[0]) : 1;
}

export function CutlistPane() {
  const doc = useStudioStore((s) => s.doc);
  const addManualPanel = useStudioStore((s) => s.addManualPanel);
  const updateManualPanel = useStudioStore((s) => s.updateManualPanel);
  const deleteManualPanel = useStudioStore((s) => s.deleteManualPanel);
  const save = useStudioStore((s) => s.save);
  const updateBandingOverride = useStudioStore((s) => s.updateBandingOverride);
  const pricing = usePricingStore((s) => s.pricing);
  const setPricingField = usePricingStore((s) => s.setPricingField);
  const { panels } = useMemo(() => computeDespiece(doc), [doc]);
  const manualPanels = useMemo(() => doc.manualPanels ?? [], [doc.manualPanels]);
  // Option B: other furniture documents pulled into this same optimization run.
  // Ephemeral — selection lives here, not persisted on the document.
  const [extraEntries, setExtraEntries] = useState<AggregateEntry[]>([]);
  const extraPanels = useMemo(
    () => aggregateDespiece(extraEntries).panels,
    [extraEntries],
  );
  const [sheets, setSheets] = useState<StockSheet[]>([]);
  const [selectedSheetIds, setSelectedSheetIds] = useState<number[]>([]);
  const [primarySheetId, setPrimarySheetId] = useState<number | null>(null);
  const [materialMode, setMaterialMode] = useState<MaterialMode>("single");
  const [globalDims, setGlobalDims] = useState({ L: 244, W: 215 });
  const [panelSheets, setPanelSheets] = useState<Record<string, number | null>>(
    {},
  );
  const [splitPreference, setSplitPreference] =
    useState<GuillotineSplitPreference>("vertical-first");
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [result, setResult] = useState<CutResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openDrawerCollections, setOpenDrawerCollections] = useState<
    Record<number, boolean>
  >({});

  const assignableSheets = useMemo(() => {
    const applyDims = (sheet: StockSheet): StockSheet => ({
      ...sheet,
      L: globalDims.L,
      W: globalDims.W,
    });

    if (materialMode === "single") {
      return sheets
        .filter((sheet) => sheet.odooId === primarySheetId)
        .map(applyDims);
    }

    return sheets
      .filter((sheet) => selectedSheetIds.includes(sheet.odooId))
      .map(applyDims);
  }, [globalDims, materialMode, primarySheetId, selectedSheetIds, sheets]);

  const bandingOverrides = useMemo(() => doc.bandingOverrides ?? {}, [doc.bandingOverrides]);

  const optimizerPanels = useMemo(() => {
    const auto = panels.map((panel) => {
      const sheetId =
        materialMode === "single"
          ? primarySheetId
          : (panelSheets[panelId(panel)] ?? null);
      return toOptimizerPanel(panel, sheetId, bandingOverrides[panel.key]);
    });
    const manual = manualPanels.map((mp) => {
      const sheetId =
        materialMode === "single"
          ? primarySheetId
          : (panelSheets[`manual-${mp.id}`] ?? null);
      return manualToOptimizerPanel(mp, sheetId);
    });
    // Panels from other furniture documents added to this run. They reuse the
    // same StudioPanel → optimizer mapping; their keys/badges are already
    // namespaced per source doc so ids never collide with the current doc.
    const extra = extraPanels.map((panel) => {
      const sheetId =
        materialMode === "single"
          ? primarySheetId
          : (panelSheets[panelId(panel)] ?? null);
      return toOptimizerPanel(panel, sheetId);
    });
    return [...auto, ...manual, ...extra];
  }, [materialMode, manualPanels, panelSheets, panels, extraPanels, primarySheetId, bandingOverrides]);

  // Pre-flight: panels that won't fit any selected sheet — shown before the user
  // even clicks "Optimizar" so they can fix the sheet selection first.
  const oversizedPanels = useMemo(() => {
    if (assignableSheets.length === 0) return [];
    return optimizerPanels.filter((p) => !panelFitsAnySheet(p, assignableSheets));
  }, [optimizerPanels, assignableSheets]);

  const unplacedWarnings = useMemo(() => {
    if (!result || result.stats.unplacedPanels === 0) return [];
    const placedCounts: Record<string, number> = {};
    for (const sheet of result.sheets) {
      for (const p of sheet.placed) {
        placedCounts[p.panelId] = (placedCounts[p.panelId] ?? 0) + 1;
      }
    }
    return optimizerPanels
      .filter((p) => (placedCounts[p.id] ?? 0) < p.qty)
      .map((p) => ({
        id: p.id,
        label: p.label,
        L: p.L,
        W: p.W,
        missing: p.qty - (placedCounts[p.id] ?? 0),
      }));
  }, [result, optimizerPanels]);

  const structuralPanels = useMemo(
    () => panels.filter((panel) => !isDrawerPanel(panel)),
    [panels],
  );
  const drawerCollections = useMemo(() => {
    const groups = new Map<number, StudioPanel[]>();
    for (const panel of panels.filter(isDrawerPanel)) {
      const index = drawerCollectionIndex(panel);
      groups.set(index, [...(groups.get(index) ?? []), panel]);
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => a - b)
      .map(([index, groupPanels]) => ({
        index,
        panels: groupPanels,
        panelIds: groupPanels.map(panelId),
        drawerCount:
          groupPanels.find((panel) => panel.role === "drawer-front")?.qty ??
          Math.max(1, ...groupPanels.map((panel) => panel.qty)),
      }));
  }, [panels]);

  useEffect(() => {
    void loadSheets();
  }, []);

  useEffect(() => {
    if (primarySheetId !== null || sheets.length === 0) return;
    setPrimarySheetId(sheets[0].odooId);
    setSelectedSheetIds([sheets[0].odooId]);
  }, [primarySheetId, sheets]);

  useEffect(() => {
    setResult(null);
  }, [doc, materialMode, primarySheetId, selectedSheetIds, globalDims, panelSheets, extraEntries]);

  async function loadSheets(forceRefresh = false) {
    try {
      setLoadingSheets(true);
      setError(null);
      const loaded = await fetchSheets(forceRefresh);
      setSheets(loaded);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando tableros");
    } finally {
      setLoadingSheets(false);
    }
  }

  function toggleSheetSelection(sheetId: number) {
    setSelectedSheetIds((current) =>
      current.includes(sheetId)
        ? current.filter((id) => id !== sheetId)
        : [...current, sheetId],
    );
  }

  function changeMaterialMode(mode: MaterialMode) {
    setMaterialMode(mode);
    setResult(null);
  }

  function changePrimarySheet(sheetId: number) {
    setPrimarySheetId(sheetId);
    setSelectedSheetIds((current) =>
      current.includes(sheetId) ? current : [...current, sheetId],
    );
  }

  function changePanelSheet(id: string, sheetId: number | null) {
    setPanelSheets((current) => ({ ...current, [id]: sheetId }));
  }

  function changeDrawerCollectionSheet(
    panelIds: string[],
    sheetId: number | null,
  ) {
    setPanelSheets((current) => {
      const next = { ...current };
      for (const id of panelIds) next[id] = sheetId;
      return next;
    });
  }

  function selectedSheetName(sheetId: number | null | undefined) {
    if (materialMode === "single") {
      return (
        sheets.find((sheet) => sheet.odooId === primarySheetId)?.name ??
        "Sin tablero"
      );
    }
    if (!sheetId) return "Auto";
    return (
      assignableSheets.find((sheet) => sheet.odooId === sheetId)?.name ??
      "Sin tablero"
    );
  }

  function drawerCollectionSheetValue(panelIds: string[]) {
    const values = Array.from(
      new Set(panelIds.map((id) => panelSheets[id] ?? null)),
    );
    return values.length === 1 ? values[0] : "mixed";
  }

  function handleAddManualPanel() {
    addManualPanel({
      label: "Pieza extra",
      L: 60,
      W: 30,
      thickness: Number((doc.globals.thickness / 10).toFixed(1)),
      qty: 1,
      banding: { top: false, bottom: false, left: false, right: false },
    });
    void save();
  }

  function handleUpdateManualPanel(id: string, patch: Partial<Omit<ManualPanel, "id">>) {
    updateManualPanel(id, patch);
    void save();
  }

  function handleDeleteManualPanel(id: string) {
    deleteManualPanel(id);
    void save();
  }

  function renderManualPanelRow(mp: ManualPanel) {
    const sheetId = materialMode === "single" ? primarySheetId : (panelSheets[`manual-${mp.id}`] ?? null);
    return (
      <tr key={mp.id} className="border-t border-[#1c2330] bg-[#0d1520]">
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#2a3a55] text-[10px] font-bold text-[#9aa4b6]">M</span>
            <input
              className="table-input w-32"
              value={mp.label}
              onChange={(e) => handleUpdateManualPanel(mp.id, { label: e.target.value })}
            />
          </div>
        </td>
        <td className="px-3 py-2">
          <input type="number" className="table-input w-20" value={mp.L} min={1} step={0.1}
            onChange={(e) => handleUpdateManualPanel(mp.id, { L: Number(e.target.value) })} />
        </td>
        <td className="px-3 py-2">
          <input type="number" className="table-input w-20" value={mp.W} min={1} step={0.1}
            onChange={(e) => handleUpdateManualPanel(mp.id, { W: Number(e.target.value) })} />
        </td>
        <td className="px-3 py-2">
          <input type="number" className="table-input w-16" value={mp.thickness} min={0.1} step={0.1}
            onChange={(e) => handleUpdateManualPanel(mp.id, { thickness: Number(e.target.value) })} />
        </td>
        <td className="px-3 py-2">
          <input type="number" className="table-input w-14" value={mp.qty} min={1} step={1}
            onChange={(e) => handleUpdateManualPanel(mp.id, { qty: Math.max(1, Number(e.target.value)) })} />
        </td>
        <td className="px-3 py-2">
          <BandingToggle banding={mp.banding}
            onChange={(b) => handleUpdateManualPanel(mp.id, { banding: b })} />
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            {materialMode === "single" ? (
              <span className="block max-w-44 truncate text-[#9aa4b6]">{selectedSheetName(sheetId)}</span>
            ) : (
              <select className="table-input min-w-36" value={sheetId ?? ""}
                onChange={(e) => changePanelSheet(`manual-${mp.id}`, e.target.value ? Number(e.target.value) : null)}>
                <option value="">Auto</option>
                {assignableSheets.map((s) => (
                  <option key={s.odooId} value={s.odooId}>{s.name}</option>
                ))}
              </select>
            )}
            <button type="button" onClick={() => handleDeleteManualPanel(mp.id)}
              className="shrink-0 text-[#6b7a93] hover:text-[#f87171] transition">
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  function renderManualPanelCard(mp: ManualPanel) {
    return (
      <div key={mp.id} className="border-t border-[#1c2330] bg-[#0d1520] py-3">
        <div className="flex items-center gap-2 px-1">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#2a3a55] text-[10px] font-bold text-[#9aa4b6]">M</span>
          <input className="table-input flex-1 text-sm" value={mp.label}
            onChange={(e) => handleUpdateManualPanel(mp.id, { label: e.target.value })} />
          <button type="button" onClick={() => handleDeleteManualPanel(mp.id)}
            className="text-[#6b7a93] hover:text-[#f87171] transition">
            <Trash2 className="size-4" />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 px-1">
          <label className="grid gap-0.5 text-xs text-[#7d879a]">
            L (cm)
            <input type="number" className="table-input w-20" value={mp.L} min={1} step={0.1}
              onChange={(e) => handleUpdateManualPanel(mp.id, { L: Number(e.target.value) })} />
          </label>
          <label className="grid gap-0.5 text-xs text-[#7d879a]">
            W (cm)
            <input type="number" className="table-input w-20" value={mp.W} min={1} step={0.1}
              onChange={(e) => handleUpdateManualPanel(mp.id, { W: Number(e.target.value) })} />
          </label>
          <label className="grid gap-0.5 text-xs text-[#7d879a]">
            Esp (cm)
            <input type="number" className="table-input w-16" value={mp.thickness} min={0.1} step={0.1}
              onChange={(e) => handleUpdateManualPanel(mp.id, { thickness: Number(e.target.value) })} />
          </label>
          <label className="grid gap-0.5 text-xs text-[#7d879a]">
            Cant.
            <input type="number" className="table-input w-14" value={mp.qty} min={1} step={1}
              onChange={(e) => handleUpdateManualPanel(mp.id, { qty: Math.max(1, Number(e.target.value)) })} />
          </label>
          <div className="grid gap-0.5 text-xs text-[#7d879a]">
            Canto
            <BandingToggle banding={mp.banding}
              onChange={(b) => handleUpdateManualPanel(mp.id, { banding: b })} />
          </div>
        </div>
      </div>
    );
  }

  function renderPanelRow(panel: StudioPanel) {
    const id = panelId(panel);
    const optPanel = optimizerPanels.find((p) => p.id === id);
    return (
      <tr key={panel.key} className="border-t border-[#1c2330]">
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#e8eaee] text-[10px] font-bold text-[#0b0e14]">
              {panel.badge}
            </span>
            <span className="text-[#d7dde9]">{roleLabels[panel.role]}</span>
          </div>
        </td>
        <td className="px-3 py-2 text-[#9aa4b6]">
          {optPanel?.L.toFixed(1)}
        </td>
        <td className="px-3 py-2 text-[#9aa4b6]">
          {optPanel?.W.toFixed(1)}
        </td>
        <td className="px-3 py-2 text-[#9aa4b6]">
          {panel.thickness.toFixed(1)}
        </td>
        <td className="px-3 py-2 font-semibold text-[#d7dde9]">
          {panel.qty}
        </td>
        <td className="px-3 py-2">
          <BandingToggle
            banding={bandingOverrides[panel.key] ?? ROLE_BANDING[panel.role]}
            onChange={(b) => { updateBandingOverride(panel.key, b); void save(); }}
          />
        </td>
        <td className="px-3 py-2">
          {materialMode === "single" ? (
            <span className="block max-w-60 truncate text-[#9aa4b6]">
              {selectedSheetName(primarySheetId)}
            </span>
          ) : (
            <select
              className="table-input min-w-44"
              value={panelSheets[id] ?? ""}
              onChange={(event) =>
                changePanelSheet(
                  id,
                  event.target.value ? Number(event.target.value) : null,
                )
              }
            >
              <option value="">Auto</option>
              {assignableSheets.map((sheet) => (
                <option key={sheet.odooId} value={sheet.odooId}>
                  {sheet.name}
                </option>
              ))}
            </select>
          )}
        </td>
      </tr>
    );
  }

  function renderPanelCard(panel: StudioPanel) {
    const id = panelId(panel);
    const optPanel = optimizerPanels.find((p) => p.id === id);
    return (
      <div key={panel.key} className="flex items-start gap-3 border-t border-[#1c2330] py-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#e8eaee] text-[10px] font-bold text-[#0b0e14]">
          {panel.badge}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-[#d7dde9]">{roleLabels[panel.role]}</span>
            <span className="shrink-0 text-xs font-semibold text-[#d7dde9]">×{panel.qty}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {optPanel && (
              <span className="text-xs text-[#9aa4b6]">
                {optPanel.L.toFixed(1)} × {optPanel.W.toFixed(1)} × {panel.thickness.toFixed(1)} cm
              </span>
            )}
            <BandingToggle
              banding={bandingOverrides[panel.key] ?? ROLE_BANDING[panel.role]}
              onChange={(b) => { updateBandingOverride(panel.key, b); void save(); }}
            />
          </div>
          <div className="mt-1 text-xs text-[#7d879a]">
            {materialMode === "single" ? (
              <span className="truncate">{selectedSheetName(primarySheetId)}</span>
            ) : (
              <select
                className="table-input w-full"
                value={panelSheets[id] ?? ""}
                onChange={(e) =>
                  changePanelSheet(id, e.target.value ? Number(e.target.value) : null)
                }
              >
                <option value="">Auto</option>
                {assignableSheets.map((sheet) => (
                  <option key={sheet.odooId} value={sheet.odooId}>{sheet.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>
    );
  }

  async function runOptimize() {
    try {
      setOptimizing(true);
      setError(null);
      if (optimizerPanels.length === 0) {
        throw new Error("No hay piezas para optimizar.");
      }
      if (assignableSheets.length === 0) {
        throw new Error("Selecciona al menos un tablero para optimizar.");
      }

      let panels = optimizerPanels;
      let source = assignableSheets;

      // Mixed mode: canonicalize duplicate sheets (same material+dims) so the
      // optimizer doesn't create separate layouts for identical materials.
      if (materialMode === "mixed") {
        ({ panels, sheets: source } = canonicalizeMixedSheets(panels, source));
      }

      const optimized = await optimize(panels, source, pricing, { splitPreference });

      const placedCount = optimized.sheets.reduce(
        (sum, s) => sum + s.placed.length,
        0,
      );
      if (panels.length > 0 && placedCount === 0) {
        throw new Error(
          "No se pudo ubicar ninguna pieza. Revisá las dimensiones de la plancha o la asignación por pieza.",
        );
      }

      setResult(optimized);
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "Error optimizando");
    } finally {
      setOptimizing(false);
    }
  }

  return (
    <div className="grid h-full grid-cols-1 gap-4 overflow-auto p-3 sm:gap-6 sm:p-6 xl:grid-cols-[minmax(560px,1fr)_minmax(420px,0.85fr)]">
      <div className="space-y-6">
        <section className="rounded-lg border border-[#1c2330] bg-[#0b1019] p-4">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[#d7dde9]">
                Cutlist de piezas
              </h2>
              <p className="mt-1 text-xs text-[#7d879a]">
                Dimensiones en cm generadas desde el diseno del Studio.
              </p>
            </div>
            <button
              type="button"
              className="template-btn"
              disabled={loadingSheets}
              onClick={() => void loadSheets(true)}
            >
              <RefreshCw size={14} />
              {loadingSheets ? "Cargando" : "Actualizar tableros"}
            </button>
          </div>

          <div className="mb-4">
            <StockSelector
              sheets={sheets}
              selectedSheetIds={selectedSheetIds}
              materialMode={materialMode}
              primarySheetId={primarySheetId}
              globalDims={globalDims}
              onToggleSheet={toggleSheetSelection}
              onMaterialModeChange={changeMaterialMode}
              onPrimarySheetChange={changePrimarySheet}
              onGlobalDimsChange={(L, W) => setGlobalDims({ L, W })}
            />
          </div>

          <div className="mb-4 flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-xs text-[#7d879a]">
              Modo de corte
              <select
                className="table-input min-w-40"
                value={splitPreference}
                onChange={(event) =>
                  setSplitPreference(
                    event.target.value as GuillotineSplitPreference,
                  )
                }
              >
                {(
                  [
                    "vertical-first",
                    "horizontal-first",
                    "short-side-first",
                    "auto-best",
                  ] as GuillotineSplitPreference[]
                ).map((preference) => (
                  <option key={preference} value={preference}>
                    {splitPreferenceLabel(preference)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs text-[#7d879a]">
              Kerf sierra (cm)
              <input
                type="number"
                className="table-input w-24"
                step="0.01"
                min="0"
                value={pricing.kerfCm}
                onChange={(e) => setPricingField("kerfCm", Number(e.target.value))}
              />
            </label>
            <button
              type="button"
              className="template-btn active"
              disabled={optimizing || loadingSheets}
              onClick={() => void runOptimize()}
            >
              <Scissors size={14} />
              {optimizing ? "Optimizando" : "Optimizar corte"}
            </button>
          </div>

          {oversizedPanels.length > 0 && (
            <div className="mb-4 rounded-md border border-[#7c5a1e] bg-[#1e1508] px-3 py-2 text-xs text-[#f4b450]">
              <p className="mb-1 font-semibold">
                {oversizedPanels.length === 1
                  ? "1 pieza supera las dimensiones de la plancha seleccionada"
                  : `${oversizedPanels.length} piezas superan las dimensiones de la plancha seleccionada`}
              </p>
              <ul className="space-y-0.5 text-[#d4a030]">
                {oversizedPanels.map((p) => (
                  <li key={p.id}>
                    {p.label} — {p.L.toFixed(1)} × {p.W.toFixed(1)} cm
                    {" "}(plancha mín. {Math.max(p.L, p.W).toFixed(0)} cm)
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-md border border-[#6b3d2d] bg-[#21130f] px-3 py-2 text-xs text-[#f2a987]">
              {error}
            </div>
          )}

          {unplacedWarnings.length > 0 && (
            <div className="mb-4 rounded-md border border-[#7c5a1e] bg-[#1e1508] px-3 py-2 text-xs text-[#f4b450]">
              <p className="mb-1.5 font-semibold">
                {unplacedWarnings.length === 1
                  ? "1 pieza no cabe en la plancha seleccionada"
                  : `${unplacedWarnings.length} tipos de pieza no caben en la plancha seleccionada`}
              </p>
              <ul className="space-y-0.5 text-[#d4a030]">
                {unplacedWarnings.map((w) => (
                  <li key={w.id}>
                    × {w.missing} {w.label} — {w.L.toFixed(1)} × {w.W.toFixed(1)} cm
                    {" "}(plancha mín. {Math.max(w.L, w.W).toFixed(0)} cm)
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Mobile card list (< md) */}
          <div className="block md:hidden text-sm">
            {structuralPanels.map(renderPanelCard)}
            {drawerCollections.map((collection) => {
              const isOpen = openDrawerCollections[collection.index] ?? true;
              const sheetValue = drawerCollectionSheetValue(collection.panelIds);
              return (
                <div key={`m-drawer-${collection.index}`} className="border-t border-[#1c2330]">
                  <div className="flex items-center gap-3 bg-[#111824] py-3">
                    <button
                      type="button"
                      className="flex flex-1 items-center gap-3 text-left"
                      onClick={() =>
                        setOpenDrawerCollections((c) => ({ ...c, [collection.index]: !isOpen }))
                      }
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f4b450] text-xs font-bold text-[#17120a]">
                        {isOpen ? "−" : "+"}
                      </span>
                      <span>
                        <span className="block font-semibold text-[#d7dde9]">Cajon {collection.index}</span>
                        <span className="text-xs text-[#7d879a]">
                          {collection.panels.length} piezas · {collection.drawerCount} cajon{collection.drawerCount === 1 ? "" : "es"}
                        </span>
                      </span>
                    </button>
                    {materialMode === "mixed" && (
                      <select
                        className="table-input max-w-36"
                        value={sheetValue ?? ""}
                        onChange={(e) =>
                          changeDrawerCollectionSheet(
                            collection.panelIds,
                            e.target.value === "mixed" || e.target.value === "" ? null : Number(e.target.value),
                          )
                        }
                      >
                        <option value="">Auto</option>
                        {sheetValue === "mixed" && <option value="mixed">Mixto</option>}
                        {assignableSheets.map((s) => (
                          <option key={s.odooId} value={s.odooId}>{s.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  {isOpen && collection.panels.map(renderPanelCard)}
                </div>
              );
            })}
            {manualPanels.map(renderManualPanelCard)}
            <div className="border-t border-[#1c2330] py-3">
              <button type="button" onClick={handleAddManualPanel}
                className="flex items-center gap-2 text-xs text-[#6b7a93] hover:text-[#9aa4b6] transition">
                <Plus className="size-4" />
                Agregar pieza manual
              </button>
            </div>
          </div>

          {/* Desktop table (≥ md) */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[820px] border-collapse text-xs">
              <thead>
                <tr className="text-left text-[#7d879a]">
                  <th className="px-3 py-2 font-medium">Pieza</th>
                  <th className="px-3 py-2 font-medium">Largo</th>
                  <th className="px-3 py-2 font-medium">Ancho</th>
                  <th className="px-3 py-2 font-medium">Espesor</th>
                  <th className="px-3 py-2 font-medium">Cantidad</th>
                  <th className="px-3 py-2 font-medium">Canto</th>
                  <th className="px-3 py-2 font-medium">Melamina</th>
                </tr>
              </thead>
              <tbody>
                {structuralPanels.map(renderPanelRow)}
                {drawerCollections.map((collection) => {
                  const isOpen = openDrawerCollections[collection.index] ?? true;
                  const sheetValue = drawerCollectionSheetValue(collection.panelIds);
                  return (
                    <Fragment key={`drawer-group-${collection.index}`}>
                      <tr className="border-t border-[#1c2330] bg-[#111824]">
                        <td colSpan={6} className="px-3 py-3">
                          <button
                            type="button"
                            className="flex items-center gap-3 text-left"
                            onClick={() =>
                              setOpenDrawerCollections((current) => ({
                                ...current,
                                [collection.index]: !isOpen,
                              }))
                            }
                          >
                            <span className="flex size-7 items-center justify-center rounded-full bg-[#f4b450] text-xs font-bold text-[#17120a]">
                              {isOpen ? "−" : "+"}
                            </span>
                            <span>
                              <span className="block font-semibold text-[#d7dde9]">
                                Cajon {collection.index}
                              </span>
                              <span className="text-xs text-[#7d879a]">
                                Coleccion de {collection.panels.length} piezas ·{" "}
                                {collection.drawerCount} cajon
                                {collection.drawerCount === 1 ? "" : "es"}
                              </span>
                            </span>
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          {materialMode === "single" ? (
                            <span className="block max-w-60 truncate text-[#9aa4b6]">
                              {selectedSheetName(primarySheetId)}
                            </span>
                          ) : (
                            <select
                              className="table-input min-w-44"
                              value={sheetValue ?? ""}
                              onChange={(event) =>
                                changeDrawerCollectionSheet(
                                  collection.panelIds,
                                  event.target.value === "mixed" || event.target.value === ""
                                    ? null
                                    : Number(event.target.value),
                                )
                              }
                            >
                              <option value="">Auto</option>
                              {sheetValue === "mixed" && <option value="mixed">Mixto</option>}
                              {assignableSheets.map((sheet) => (
                                <option key={sheet.odooId} value={sheet.odooId}>
                                  {sheet.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                      </tr>
                      {isOpen && collection.panels.map(renderPanelRow)}
                    </Fragment>
                  );
                })}
                {manualPanels.map(renderManualPanelRow)}
                <tr className="border-t border-[#1c2330]">
                  <td colSpan={7} className="px-3 py-2">
                    <button type="button" onClick={handleAddManualPanel}
                      className="flex items-center gap-2 text-xs text-[#6b7a93] hover:text-[#9aa4b6] transition">
                      <Plus className="size-3.5" />
                      Agregar pieza manual
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="rounded-lg border border-[#1c2330] bg-[#0b1019] p-4">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-[#d7dde9]">
            Optimizacion
          </h2>
          <p className="mt-1 text-xs text-[#7d879a]">
            Vista de planchas, piezas ubicadas y pasos de corte.
          </p>
        </div>
        <CombinedProjectsPicker
          currentDocId={doc.id}
          onChange={setExtraEntries}
          className="mb-4"
        />
        <div className="mb-4 rounded-lg border border-[#1c2330] bg-[#0f141e] p-3 text-sm">
          <CostBreakdown breakdown={result?.totalCost} />
        </div>
        <SheetLayouts panels={optimizerPanels} result={result} />
      </div>
    </div>
  );
}
