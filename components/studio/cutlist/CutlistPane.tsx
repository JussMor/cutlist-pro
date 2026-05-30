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
import { computeDespiece } from "@/lib/studio/despiece";
import type { StudioPanel } from "@/lib/studio/despiece";
import { usePricingStore } from "@/store/pricingStore";
import { useStudioStore } from "@/store/studioStore";
import { RefreshCw, Scissors } from "lucide-react";

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
): Panel {
  return {
    id: panelId(panel),
    label: `${panel.badge} ${roleLabels[panel.role]}`,
    role: roleMap[panel.role],
    qty: panel.qty,
    L: panel.height,
    W: panel.width,
    banding: ROLE_BANDING[panel.role],
    stockSheetId,
    grainDirection: "none",
  };
}

function BandingIndicator({ banding }: { banding: Panel["banding"] }) {
  const on = "#f4b450";
  const off = "#2a3040";
  return (
    <svg width="28" height="22" viewBox="0 0 28 22" fill="none" className="shrink-0">
      <line x1="3" y1="3" x2="25" y2="3" stroke={banding.top ? on : off} strokeWidth={banding.top ? 3 : 1.5} strokeLinecap="round" />
      <line x1="3" y1="19" x2="25" y2="19" stroke={banding.bottom ? on : off} strokeWidth={banding.bottom ? 3 : 1.5} strokeLinecap="round" />
      <line x1="3" y1="3" x2="3" y2="19" stroke={banding.left ? on : off} strokeWidth={banding.left ? 3 : 1.5} strokeLinecap="round" />
      <line x1="25" y1="3" x2="25" y2="19" stroke={banding.right ? on : off} strokeWidth={banding.right ? 3 : 1.5} strokeLinecap="round" />
    </svg>
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

function drawerCollectionIndex(panel: StudioPanel) {
  const match = panel.badge.match(/\d+$/);
  return match ? Number(match[0]) : 1;
}

export function CutlistPane() {
  const doc = useStudioStore((s) => s.doc);
  const pricing = usePricingStore((s) => s.pricing);
  const { panels } = useMemo(() => computeDespiece(doc), [doc]);
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

  const optimizerPanels = useMemo(
    () =>
      panels.map((panel) => {
        const sheetId =
          materialMode === "single"
            ? primarySheetId
            : (panelSheets[panelId(panel)] ?? null);
        return toOptimizerPanel(panel, sheetId);
      }),
    [materialMode, panelSheets, panels, primarySheetId],
  );

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
  }, [doc, materialMode, primarySheetId, selectedSheetIds, globalDims, panelSheets]);

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
          {optPanel && <BandingIndicator banding={optPanel.banding} />}
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
            {optPanel && <BandingIndicator banding={optPanel.banding} />}
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
      const optimized = await optimize(optimizerPanels, assignableSheets, pricing, {
        splitPreference,
      });
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

          {error && (
            <div className="mb-4 rounded-md border border-[#6b3d2d] bg-[#21130f] px-3 py-2 text-xs text-[#f2a987]">
              {error}
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
        <div className="mb-4 rounded-lg border border-[#1c2330] bg-[#0f141e] p-3 text-sm">
          <CostBreakdown breakdown={result?.totalCost} />
        </div>
        <SheetLayouts panels={optimizerPanels} result={result} />
      </div>
    </div>
  );
}
