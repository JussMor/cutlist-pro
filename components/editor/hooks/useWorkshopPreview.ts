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
