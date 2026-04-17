import {
  ArtifactInstance,
  DrawerArtifactParams,
  MaterialMode,
  ModuleNode,
  Panel,
  PanelRole,
} from "@/lib/domain/types";
import { useEffect, useMemo, useState } from "react";
import React from "react";
import {
  createDrawerArtifact,
  createManualPanel,
  generatePanelsFromArtifact,
  ROOT_MODULE,
} from "../workshopPanelHelpers";

export interface UseWorkshopPanelsOptions {
  primarySheetId: number | null;
  selectedSheetIds: number[];
  materialMode: MaterialMode;
  setResult: (val: null) => void;
  modules: ModuleNode[];
  setHiddenPreviewPanelIds?: React.Dispatch<React.SetStateAction<string[]>>;
}

export interface UseWorkshopPanelsReturn {
  editablePanels: Panel[];
  artifacts: ArtifactInstance[];
  derivedPanels: Panel[];
  allPanels: Panel[];
  derivedPanelGroupLabels: Record<string, string>;
  updatePanel: (
    panelId: string,
    field: "label" | "L" | "W" | "qty" | "role" | "stockSheetId" | "moduleId",
    value: string | number,
  ) => void;
  togglePanelBanding: (
    panelId: string,
    edge: "top" | "bottom" | "left" | "right",
  ) => void;
  removePanel: (panelId: string) => void;
  addPanel: () => void;
  addDrawerArtifact: () => void;
  updateArtifactName: (artifactId: string, name: string) => void;
  updateArtifactModule: (artifactId: string, moduleId: string) => void;
  updateArtifactEnabled: (artifactId: string, enabled: boolean) => void;
  updateArtifactNumericParam: (
    artifactId: string,
    key: keyof DrawerArtifactParams,
    value: number,
  ) => void;
  updateArtifactMaterial: (
    artifactId: string,
    materialSheetId: number | null,
  ) => void;
  removeArtifact: (artifactId: string) => void;
  setEditablePanels: React.Dispatch<React.SetStateAction<Panel[]>>;
  setArtifacts: React.Dispatch<React.SetStateAction<ArtifactInstance[]>>;
}

export function useWorkshopPanels({
  primarySheetId,
  selectedSheetIds,
  materialMode,
  setResult,
  modules,
  setHiddenPreviewPanelIds: externalSetHiddenIds,
}: UseWorkshopPanelsOptions): UseWorkshopPanelsReturn {
  const [editablePanels, setEditablePanels] = useState<Panel[]>([]);
  const [artifacts, setArtifacts] = useState<ArtifactInstance[]>([]);

  // useEffect: material sync (3rd effect in original, must stay after sheets effect)
  useEffect(() => {
    setEditablePanels((current) =>
      current.map((panel) => {
        const nextStockSheetId =
          materialMode === "single"
            ? primarySheetId
            : panel.stockSheetId &&
                selectedSheetIds.includes(panel.stockSheetId)
              ? panel.stockSheetId
              : null;

        return panel.stockSheetId === nextStockSheetId
          ? panel
          : { ...panel, stockSheetId: nextStockSheetId };
      }),
    );
    setResult(null);
  }, [materialMode, primarySheetId, selectedSheetIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const derivedPanels = useMemo(
    () => artifacts.flatMap((artifact) => generatePanelsFromArtifact(artifact)),
    [artifacts],
  );

  const allPanels = useMemo(
    () => [...editablePanels, ...derivedPanels],
    [editablePanels, derivedPanels],
  );

  const derivedPanelGroupLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const artifact of artifacts) {
      const generated = generatePanelsFromArtifact(artifact);
      for (const panel of generated) {
        const suffix = panel.id.slice(artifact.id.length + 1);
        const unitIndex = Number(suffix.split("-")[0]);
        labels[panel.id] = Number.isFinite(unitIndex)
          ? `${artifact.name} ${unitIndex}`
          : artifact.name;
      }
    }
    return labels;
  }, [artifacts]);

  function updatePanel(
    panelId: string,
    field: "label" | "L" | "W" | "qty" | "role" | "stockSheetId" | "moduleId",
    value: string | number,
  ) {
    setEditablePanels((current) =>
      current.map((panel) => {
        if (panel.id !== panelId) return panel;

        if (field === "role") {
          return { ...panel, role: value as PanelRole };
        }

        if (field === "label") {
          return { ...panel, label: String(value) };
        }

        if (field === "stockSheetId") {
          const stockSheetId = Number(value);
          return {
            ...panel,
            stockSheetId: Number.isFinite(stockSheetId) ? stockSheetId : null,
          };
        }

        if (field === "moduleId") {
          return {
            ...panel,
            moduleId: String(value),
          };
        }

        const numericValue = Number(value);
        return {
          ...panel,
          [field]: Number.isFinite(numericValue)
            ? field === "qty"
              ? Math.max(1, Math.round(numericValue))
              : Math.max(1, numericValue)
            : panel[field as keyof Panel],
        };
      }),
    );
    setResult(null);
  }

  function togglePanelBanding(
    panelId: string,
    edge: "top" | "bottom" | "left" | "right",
  ) {
    setEditablePanels((current) =>
      current.map((panel) =>
        panel.id === panelId
          ? {
              ...panel,
              banding: {
                ...panel.banding,
                [edge]: !panel.banding[edge],
              },
            }
          : panel,
      ),
    );
    setResult(null);
  }

  function removePanel(panelId: string) {
    setEditablePanels((current) =>
      current.filter((panel) => panel.id !== panelId),
    );
    if (externalSetHiddenIds) {
      externalSetHiddenIds((current) => current.filter((id) => id !== panelId));
    }
    setResult(null);
  }

  function addPanel() {
    setEditablePanels((current) => [
      ...current,
      createManualPanel(current.length + 1),
    ]);
    setResult(null);
  }

  function addDrawerArtifact() {
    const index =
      artifacts.filter((artifact) => artifact.type === "drawer").length + 1;
    const moduleId = modules[0]?.id ?? ROOT_MODULE.id;
    setArtifacts((current) => [
      ...current,
      createDrawerArtifact(index, moduleId),
    ]);
    setResult(null);
  }

  function updateArtifactName(artifactId: string, name: string) {
    setArtifacts((current) =>
      current.map((artifact) =>
        artifact.id === artifactId ? { ...artifact, name } : artifact,
      ),
    );
    setResult(null);
  }

  function updateArtifactModule(artifactId: string, moduleId: string) {
    setArtifacts((current) =>
      current.map((artifact) =>
        artifact.id === artifactId ? { ...artifact, moduleId } : artifact,
      ),
    );
    setResult(null);
  }

  function updateArtifactEnabled(artifactId: string, enabled: boolean) {
    setArtifacts((current) =>
      current.map((artifact) =>
        artifact.id === artifactId ? { ...artifact, enabled } : artifact,
      ),
    );
    setResult(null);
  }

  function updateArtifactNumericParam(
    artifactId: string,
    key: keyof DrawerArtifactParams,
    value: number,
  ) {
    setArtifacts((current) =>
      current.map((artifact) => {
        if (artifact.id !== artifactId || artifact.type !== "drawer")
          return artifact;
        return {
          ...artifact,
          params: {
            ...artifact.params,
            [key]: Number.isFinite(value) ? value : artifact.params[key],
          },
        };
      }),
    );
    setResult(null);
  }

  function updateArtifactMaterial(
    artifactId: string,
    materialSheetId: number | null,
  ) {
    setArtifacts((current) =>
      current.map((artifact) => {
        if (artifact.id !== artifactId || artifact.type !== "drawer")
          return artifact;
        return {
          ...artifact,
          params: {
            ...artifact.params,
            materialSheetId,
          },
        };
      }),
    );
    setResult(null);
  }

  function removeArtifact(artifactId: string) {
    setArtifacts((current) =>
      current.filter((artifact) => artifact.id !== artifactId),
    );
    setResult(null);
  }

  return {
    editablePanels,
    artifacts,
    derivedPanels,
    allPanels,
    derivedPanelGroupLabels,
    updatePanel,
    togglePanelBanding,
    removePanel,
    addPanel,
    addDrawerArtifact,
    updateArtifactName,
    updateArtifactModule,
    updateArtifactEnabled,
    updateArtifactNumericParam,
    updateArtifactMaterial,
    removeArtifact,
    setEditablePanels,
    setArtifacts,
  };
}


