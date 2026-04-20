import { fetchSheets, optimize } from "@/lib/api/client";
import { preparePanelsByRole } from "@/lib/domain/roleRules";
import {
  ArtifactInstance,
  CutResult,
  GuillotineSplitPreference,
  MaterialMode,
  ModuleNode,
  Panel,
  PricingConfig,
  StockSheet,
} from "@/lib/domain/types";
import React, { useMemo, useState } from "react";
import {
  buildManualIsoLayout,
  materialPreviewColor,
  rolePreviewColors,
} from "../workshopIsoHelpers";
import {
  expandPanels,
  generatePanelsFromArtifact,
  resolvePanelForIso,
  sheetGroupKey,
} from "../workshopPanelHelpers";

type PreviewColorMode = "material" | "piece";

export interface UseWorkshopPreviewOptions {
  setResult: React.Dispatch<React.SetStateAction<CutResult | null>>;
  allPanels: Panel[];
  editablePanels: Panel[];

  artifacts: ArtifactInstance[];
  modules: ModuleNode[];
  pricing: PricingConfig;
  assignableSheets: StockSheet[];
  sheets: StockSheet[];
  materialMode: MaterialMode;
  primarySheetId: number | null;
  hiddenPreviewPanelIds: string[];
  setSheets: React.Dispatch<React.SetStateAction<StockSheet[]>>;
  setError: (msg: string | null) => void;
}

export interface UseWorkshopPreviewReturn {
  optimizing: boolean;
  opsSummary: string | null;
  warnings: string[];
  splitPreference: GuillotineSplitPreference;
  previewColorMode: PreviewColorMode;
  coloredIsoPanels: ReturnType<typeof buildManualIsoLayout>;
  runOptimize: (options?: { bypassRoleValidation?: boolean }) => Promise<void>;
  setSplitPreference: React.Dispatch<
    React.SetStateAction<GuillotineSplitPreference>
  >;
  setPreviewColorMode: React.Dispatch<React.SetStateAction<PreviewColorMode>>;
  setWarnings: React.Dispatch<React.SetStateAction<string[]>>;
}

export function useWorkshopPreview({
  setResult,
  allPanels,
  editablePanels,
  artifacts,
  modules,
  pricing,
  assignableSheets,
  sheets,
  materialMode,
  primarySheetId,
  hiddenPreviewPanelIds,
  setSheets,
  setError,
}: UseWorkshopPreviewOptions): UseWorkshopPreviewReturn {
  const [optimizing, setOptimizing] = useState(false);
  const [opsSummary, setOpsSummary] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [splitPreference, setSplitPreference] =
    useState<GuillotineSplitPreference>("vertical-first");
  const [previewColorMode, setPreviewColorMode] =
    useState<PreviewColorMode>("material");

  const previewSourcePanels = useMemo(() => {
    const derivedPanels = artifacts.flatMap((artifact) =>
      generatePanelsFromArtifact(artifact),
    );
    return [...editablePanels, ...derivedPanels].filter(
      (panel) => !hiddenPreviewPanelIds.includes(panel.id),
    );
  }, [artifacts, editablePanels, hiddenPreviewPanelIds]);

  const previewPanels = useMemo(() => {
    const prepared = preparePanelsByRole(previewSourcePanels, pricing, modules);
    return prepared.panels;
  }, [modules, previewSourcePanels, pricing]);

  const isoPanels = useMemo(
    () => buildManualIsoLayout(previewPanels, modules),
    [modules, previewPanels],
  );

  const coloredIsoPanels = useMemo(() => {
    if (isoPanels.length === 0) return [];
    const expandedPanels = expandPanels(previewPanels);
    return isoPanels.map((isoPanel, index) => {
      const panel =
        expandedPanels[index] ?? resolvePanelForIso(isoPanel, expandedPanels);
      const assignedSheet =
        sheets.find((sheet) => sheet.odooId === panel?.stockSheetId) ?? null;
      return {
        ...isoPanel,
        color:
          previewColorMode === "piece"
            ? rolePreviewColors[isoPanel.role]
            : materialPreviewColor(assignedSheet),
      };
    });
  }, [isoPanels, previewColorMode, previewPanels, sheets]);

  function panelFitsAnySource(panel: Panel, sourceSheets: StockSheet[]) {
    return sourceSheets.some(
      (sheet) =>
        (panel.W <= sheet.W && panel.L <= sheet.L) ||
        (panel.L <= sheet.W && panel.W <= sheet.L),
    );
  }

  function toCm(value: number) {
    return value / 10;
  }

  function normalizeSheetMmToCm(sheet: StockSheet): StockSheet {
    return { ...sheet, L: toCm(sheet.L), W: toCm(sheet.W) };
  }

  function normalizePanelMmToCm(panel: Panel): Panel {
    return { ...panel, L: toCm(panel.L), W: toCm(panel.W) };
  }

  function normalizeSourceSheets(sourceSheets: StockSheet[]): {
    normalized: StockSheet[];
    converted: boolean;
  } {
    const shouldConvertSheets = sourceSheets.some(
      (sheet) => sheet.L > 500 || sheet.W > 500,
    );

    if (!shouldConvertSheets) {
      return { normalized: sourceSheets, converted: false };
    }

    return {
      normalized: sourceSheets.map(normalizeSheetMmToCm),
      converted: true,
    };
  }

  function normalizePanelsForOptimization(
    panels: Panel[],
    sourceSheets: StockSheet[],
    sourceWasConverted: boolean,
  ): {
    normalized: Panel[];
    convertedCount: number;
    autoDetectedCount: number;
  } {
    if (sourceWasConverted) {
      return {
        normalized: panels.map(normalizePanelMmToCm),
        convertedCount: panels.length,
        autoDetectedCount: panels.length,
      };
    }

    let convertedCount = 0;
    let autoDetectedCount = 0;
    const normalized = panels.map((panel) => {
      if (panelFitsAnySource(panel, sourceSheets)) return panel;

      const asCm = normalizePanelMmToCm(panel);
      if (!panelFitsAnySource(asCm, sourceSheets)) return panel;

      convertedCount += 1;
      autoDetectedCount += 1;
      return asCm;
    });

    return { normalized, convertedCount, autoDetectedCount };
  }

  async function runOptimize(options?: { bypassRoleValidation?: boolean }) {
    const startedAt = Date.now();
    let failed = false;
    try {
      const bypassRoleValidation = Boolean(options?.bypassRoleValidation);
      console.info("[optimize] runOptimize:start", {
        bypassRoleValidation,
        materialMode,
        splitPreference,
        panels: allPanels.length,
        modules: modules.length,
        assignableSheets: assignableSheets.length,
        sheetsInState: sheets.length,
        primarySheetId,
      });
      setOptimizing(true);
      setError(null);
      setOpsSummary(null);
      setWarnings([]);

      const prepared = preparePanelsByRole(allPanels, pricing, modules);
      console.info("[optimize] preparePanelsByRole", {
        preparedPanels: prepared.panels.length,
        warnings: prepared.warnings.length,
        issues: prepared.issues,
        ops: prepared.ops.length,
      });
      const effectiveWarnings = [
        ...prepared.warnings,
        ...(bypassRoleValidation
          ? prepared.issues.map((issue) => `Modo rapido: ${issue}`)
          : []),
      ];
      if (effectiveWarnings.length > 0) setWarnings(effectiveWarnings);
      if (prepared.issues.length > 0 && !bypassRoleValidation) {
        console.warn("[optimize] blocked by role validation", {
          issues: prepared.issues,
        });
        throw new Error(prepared.issues.join(" "));
      }
      if (prepared.issues.length > 0 && bypassRoleValidation) {
        console.warn("[optimize] bypassing role validation issues", {
          issues: prepared.issues,
        });
      }

      const opsByType = prepared.ops.reduce<Record<string, number>>(
        (acc, op) => {
          acc[op.type] = (acc[op.type] ?? 0) + 1;
          return acc;
        },
        {},
      );
      if (prepared.ops.length > 0) {
        setOpsSummary(
          Object.entries(opsByType)
            .map(([t, c]) => `${t}: ${c}`)
            .join(" | "),
        );
      }

      let source = assignableSheets;
      let optimizePanels = prepared.panels;
      if (sheets.length === 0) {
        console.info("[optimize] sheets missing in state, fetching sheets API");
        const loaded = await fetchSheets();
        setSheets(loaded);
        source =
          materialMode === "single"
            ? loaded.filter(
                (s) => s.odooId === (primarySheetId ?? loaded[0]?.odooId),
              )
            : loaded;
        console.info("[optimize] sheets fetched", {
          loadedSheets: loaded.length,
          selectedSheets: source.length,
          materialMode,
        });
      }

      if (source.length === 0) {
        console.error("[optimize] no source sheets available", {
          materialMode,
          primarySheetId,
        });
        throw new Error("Selecciona al menos un tablero para optimizar");
      }

      if (materialMode === "single" && source.length > 0) {
        const targetSheetId = source[0].odooId;
        const constrainedToOther = optimizePanels.filter(
          (panel) =>
            Boolean(panel.stockSheetId) && panel.stockSheetId !== targetSheetId,
        );
        if (constrainedToOther.length > 0) {
          console.warn("[optimize] single mode sheet mismatch", {
            targetSheetId,
            mismatchedPanels: constrainedToOther.length,
            samplePanelIds: constrainedToOther.slice(0, 5).map((p) => p.id),
            bypassRoleValidation,
          });

          if (bypassRoleValidation) {
            optimizePanels = optimizePanels.map((panel) =>
              panel.stockSheetId && panel.stockSheetId !== targetSheetId
                ? { ...panel, stockSheetId: targetSheetId }
                : panel,
            );
            setWarnings((current) => [
              ...current,
              `Modo rapido: ${constrainedToOther.length} pieza(s) reasignadas al tablero activo para forzar el corte.`,
            ]);
            console.warn("[optimize] single mode reassignment applied", {
              targetSheetId,
              reassignedPanels: constrainedToOther.length,
            });
          }
        }
      }

      if (materialMode === "mixed") {
        const sourceBeforeCanonicalization = source.length;
        const canonicalByGroup = new Map<string, number>();
        const canonicalBySheetId = new Map<number, number>();
        for (const sheet of source) {
          const gk = sheetGroupKey(sheet);
          const cId = canonicalByGroup.get(gk) ?? sheet.odooId;
          if (!canonicalByGroup.has(gk)) canonicalByGroup.set(gk, cId);
          canonicalBySheetId.set(sheet.odooId, cId);
        }
        const seen = new Set<number>();
        source = source.filter((s) => {
          const cId = canonicalBySheetId.get(s.odooId) ?? s.odooId;
          if (seen.has(cId)) return false;
          seen.add(cId);
          return true;
        });
        let remappedPanels = 0;
        optimizePanels = prepared.panels.map((panel) => {
          if (!panel.stockSheetId) return panel;
          const cId =
            canonicalBySheetId.get(panel.stockSheetId) ?? panel.stockSheetId;
          if (cId !== panel.stockSheetId) remappedPanels += 1;
          return cId === panel.stockSheetId
            ? panel
            : { ...panel, stockSheetId: cId };
        });
        console.info("[optimize] mixed canonicalization", {
          sourceBeforeCanonicalization,
          sourceAfterCanonicalization: source.length,
          remappedPanels,
        });
      }

      const normalizedSourceResult = normalizeSourceSheets(source);
      source = normalizedSourceResult.normalized;

      const normalizedPanelsResult = normalizePanelsForOptimization(
        optimizePanels,
        source,
        normalizedSourceResult.converted,
      );
      optimizePanels = normalizedPanelsResult.normalized;

      if (
        normalizedSourceResult.converted ||
        normalizedPanelsResult.convertedCount > 0
      ) {
        setWarnings((current) => [
          ...current,
          `Conversion de unidades aplicada: hojas ${
            normalizedSourceResult.converted ? "mm→cm" : "sin cambio"
          }, piezas convertidas ${normalizedPanelsResult.convertedCount} (auto detectadas: ${normalizedPanelsResult.autoDetectedCount}).`,
        ]);
      }

      console.info("[optimize] unit normalization", {
        convertedSheets: normalizedSourceResult.converted,
        convertedPanels: normalizedPanelsResult.convertedCount,
        autoDetectedPanels: normalizedPanelsResult.autoDetectedCount,
      });

      const sourceSheetIds = new Set(source.map((sheet) => sheet.odooId));
      const constrainedPanels = optimizePanels.filter((panel) =>
        Boolean(panel.stockSheetId),
      );
      const sheetMismatchPanels = optimizePanels.filter(
        (panel) =>
          Boolean(panel.stockSheetId) &&
          !sourceSheetIds.has(panel.stockSheetId as number),
      );
      const oversizedPanels = optimizePanels.filter(
        (panel) => !panelFitsAnySource(panel, source),
      );
      console.info("[optimize] preflight", {
        constrainedPanels: constrainedPanels.length,
        sheetMismatchPanels: sheetMismatchPanels.length,
        oversizedPanels: oversizedPanels.length,
      });
      if (sheetMismatchPanels.length > 0) {
        console.warn("[optimize] preflight sheet mismatch details", {
          samplePanelIds: sheetMismatchPanels.slice(0, 5).map((p) => p.id),
          sourceSheetIds: Array.from(sourceSheetIds),
        });
      }
      if (oversizedPanels.length > 0) {
        console.warn("[optimize] preflight oversized details", {
          samplePanels: oversizedPanels.slice(0, 5).map((panel) => ({
            id: panel.id,
            L: panel.L,
            W: panel.W,
            stockSheetId: panel.stockSheetId ?? null,
          })),
          sourceSheets: source.slice(0, 3).map((sheet) => ({
            odooId: sheet.odooId,
            L: sheet.L,
            W: sheet.W,
          })),
        });
      }

      console.info("[optimize] optimize API request", {
        panelCount: optimizePanels.length,
        sheetCount: source.length,
        splitPreference,
        kerfCm: pricing.kerfCm,
      });
      const opt = await optimize(optimizePanels, source, pricing, {
        splitPreference,
      });
      console.info("[optimize] optimize API success", {
        sheetsUsed: opt.stats.sheetsUsed,
        wastePercent: opt.stats.wastePercent,
        appliedSplitPreference: opt.optimizer?.appliedSplitPreference,
      });

      const placedCount = opt.sheets.reduce(
        (sum, sheet) => sum + sheet.placed.length,
        0,
      );
      if (optimizePanels.length > 0 && placedCount === 0) {
        const diagnostic = {
          optimizePanels: optimizePanels.length,
          sourceSheets: source.length,
          constrainedPanels: constrainedPanels.length,
          sheetMismatchPanels: sheetMismatchPanels.length,
          oversizedPanels: oversizedPanels.length,
        };
        console.error("[optimize] empty placement result", diagnostic);
        throw new Error(
          "No se pudo ubicar ninguna pieza en el tablero seleccionado. Revisa asignacion de tablero por pieza o dimensiones (L/W).",
        );
      }
      setResult(opt);
    } catch (e) {
      failed = true;
      const message = e instanceof Error ? e.message : "Error optimizando";
      console.error("[optimize] runOptimize failed", {
        message,
        error: e,
        materialMode,
        splitPreference,
        panels: allPanels.length,
        assignableSheets: assignableSheets.length,
        sheetsInState: sheets.length,
        primarySheetId,
      });
      setError(e instanceof Error ? e.message : "Error optimizando");
    } finally {
      console.info("[optimize] runOptimize:end", {
        failed,
        durationMs: Date.now() - startedAt,
      });
      setOptimizing(false);
    }
  }

  return {
    optimizing,
    opsSummary,
    warnings,
    splitPreference,
    previewColorMode,
    coloredIsoPanels,
    runOptimize,
    setSplitPreference,
    setPreviewColorMode,
    setWarnings,
  };
}
