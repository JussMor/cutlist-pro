import { fetchSheets, optimize } from "@/lib/api/client";
import { preparePanelsByRole } from "@/lib/domain/roleRules";
import {
  CutResult,
  MaterialMode,
  ModuleNode,
  Panel,
  PricingConfig,
  StockSheet,
  ArtifactInstance,
} from "@/lib/domain/types";
import { useMemo, useState } from "react";
import React from "react";
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
  previewColorMode: PreviewColorMode;
  coloredIsoPanels: ReturnType<typeof buildManualIsoLayout>;
  runOptimize: () => Promise<void>;
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

  async function runOptimize() {
    try {
      setOptimizing(true);
      setError(null);
      setOpsSummary(null);
      setWarnings([]);

      const prepared = preparePanelsByRole(allPanels, pricing, modules);
      if (prepared.warnings.length > 0) setWarnings(prepared.warnings);
      if (prepared.issues.length > 0) throw new Error(prepared.issues.join(" "));

      const opsByType = prepared.ops.reduce<Record<string, number>>(
        (acc, op) => { acc[op.type] = (acc[op.type] ?? 0) + 1; return acc; },
        {},
      );
      if (prepared.ops.length > 0) {
        setOpsSummary(
          Object.entries(opsByType).map(([t, c]) => `${t}: ${c}`).join(" | "),
        );
      }

      let source = assignableSheets;
      let optimizePanels = prepared.panels;
      if (sheets.length === 0) {
        const loaded = await fetchSheets();
        setSheets(loaded);
        source =
          materialMode === "single"
            ? loaded.filter((s) => s.odooId === (primarySheetId ?? loaded[0]?.odooId))
            : loaded;
      }

      if (source.length === 0) throw new Error("Selecciona al menos un tablero para optimizar");

      if (materialMode === "mixed") {
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
        optimizePanels = prepared.panels.map((panel) => {
          if (!panel.stockSheetId) return panel;
          const cId = canonicalBySheetId.get(panel.stockSheetId) ?? panel.stockSheetId;
          return cId === panel.stockSheetId ? panel : { ...panel, stockSheetId: cId };
        });
      }

      const opt = await optimize(optimizePanels, source, pricing);
      setResult(opt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error optimizando");
    } finally {
      setOptimizing(false);
    }
  }

  return {
    optimizing,
    opsSummary,
    warnings,
    previewColorMode,
    coloredIsoPanels,
    runOptimize,
    setPreviewColorMode,
    setWarnings,
  };
}

