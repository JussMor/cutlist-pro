import {
  ArtifactInstance,
  DrawerArtifactParams,
  MaterialMode,
  ModuleNode,
  Panel,
  PanelRole,
  StockSheet,
  TemplateParams,
} from "@/lib/domain/types";

export const MANUAL_DEFAULT_PARAMS: TemplateParams = {
  W: 120,
  H: 90,
  D: 55,
  thickness: 1.8,
  shelves: 0,
};

export const ROOT_MODULE: ModuleNode = { id: "main", name: "Modulo principal" };

export const DEFAULT_DRAWER_PARAMS: DrawerArtifactParams = {
  count: 1,
  frontWidth: 50,
  frontHeight: 20,
  boxDepth: 45,
  boxHeight: 12,
  sideThickness: 1.5,
  bottomThickness: 0.5,
  backThickness: 1.5,
  materialSheetId: null,
};

export function createManualPanel(index: number): Panel {
  return {
    id: `manual-${index}`,
    label: `Pieza ${index}`,
    role: "shelf",
    moduleId: ROOT_MODULE.id,
    qty: 1,
    L: 60,
    W: 30,
    banding: { top: false, bottom: false, left: false, right: true },
    stockSheetId: null,
    grainDirection: "none",
  };
}

export function createDrawerArtifact(
  index: number,
  moduleId: string,
): ArtifactInstance {
  return {
    id: `artifact-drawer-${Date.now()}-${index}`,
    name: `Cajon ${index}`,
    type: "drawer",
    moduleId,
    enabled: true,
    params: { ...DEFAULT_DRAWER_PARAMS },
  };
}

export function generatePanelsFromArtifact(artifact: ArtifactInstance): Panel[] {
  if (!artifact.enabled || artifact.type !== "drawer") return [];

  const params = artifact.params;
  const count = Math.max(1, Math.round(params.count));
  const frontWidth = Math.max(1, params.frontWidth);
  const frontHeight = Math.max(1, params.frontHeight);
  const boxDepth = Math.max(1, params.boxDepth);
  const boxHeight = Math.max(1, params.boxHeight);
  const sideThickness = Math.max(0.1, params.sideThickness);
  const backThickness = Math.max(0.1, params.backThickness);
  const innerWidth = Math.max(1, frontWidth - sideThickness * 2);
  const innerDepth = Math.max(1, boxDepth - backThickness);
  const stockSheetId = params.materialSheetId ?? null;

  const panels: Panel[] = [];
  for (let i = 0; i < count; i += 1) {
    const idx = i + 1;
    const baseId = `${artifact.id}-${idx}`;
    const baseLabel = `${artifact.name} ${idx}`;

    panels.push({
      id: `${baseId}-front`,
      label: `${baseLabel} frente`,
      role: "drawer-front",
      moduleId: artifact.moduleId,
      qty: 1,
      L: frontWidth,
      W: frontHeight,
      banding: { top: true, bottom: true, left: true, right: true },
      stockSheetId,
      grainDirection: "none",
    });

    panels.push({
      id: `${baseId}-side-l`,
      label: `${baseLabel} lateral izq`,
      role: "drawer-side",
      moduleId: artifact.moduleId,
      qty: 1,
      L: boxDepth,
      W: boxHeight,
      banding: { top: true, bottom: false, left: false, right: false },
      stockSheetId,
      grainDirection: "none",
    });

    panels.push({
      id: `${baseId}-side-r`,
      label: `${baseLabel} lateral der`,
      role: "drawer-side",
      moduleId: artifact.moduleId,
      qty: 1,
      L: boxDepth,
      W: boxHeight,
      banding: { top: true, bottom: false, left: false, right: false },
      stockSheetId,
      grainDirection: "none",
    });

    panels.push({
      id: `${baseId}-back`,
      label: `${baseLabel} trasera`,
      role: "drawer-back",
      moduleId: artifact.moduleId,
      qty: 1,
      L: innerWidth,
      W: boxHeight,
      banding: { top: false, bottom: false, left: false, right: false },
      stockSheetId,
      grainDirection: "none",
    });

    panels.push({
      id: `${baseId}-bottom`,
      label: `${baseLabel} fondo`,
      role: "drawer-bottom",
      moduleId: artifact.moduleId,
      qty: 1,
      L: innerWidth,
      W: innerDepth,
      banding: { top: false, bottom: false, left: false, right: false },
      stockSheetId,
      grainDirection: "none",
    });
  }

  return panels;
}

export function normalizePanelsModule(panels: Panel[]): Panel[] {
  return panels.map((panel) => ({
    ...panel,
    moduleId: panel.moduleId || ROOT_MODULE.id,
  }));
}

export function deriveModulesFromPanels(panels: Panel[]): ModuleNode[] {
  const ids = new Set<string>([ROOT_MODULE.id]);
  for (const panel of panels) {
    ids.add(panel.moduleId || ROOT_MODULE.id);
  }

  return Array.from(ids).map((id) =>
    id === ROOT_MODULE.id
      ? ROOT_MODULE
      : {
          id,
          name: id,
          parentId: ROOT_MODULE.id,
        },
  );
}

export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function expandPanels(panels: Panel[]): Panel[] {
  return panels.flatMap((panel) =>
    Array.from({ length: Math.max(1, panel.qty) }, () => ({ ...panel })),
  );
}

export function resolvePanelForIso(
  isoPanel: { role: PanelRole; label: string },
  panels: Panel[],
): Panel | undefined {
  const normalizedIso = normalizeName(isoPanel.label);
  const exact = panels.find(
    (panel) =>
      panel.role === isoPanel.role &&
      normalizeName(panel.label) === normalizedIso,
  );
  if (exact) return exact;

  const startsWith = panels.find((panel) => {
    const normalizedPanel = normalizeName(panel.label);
    return (
      panel.role === isoPanel.role &&
      (normalizedIso.startsWith(normalizedPanel) ||
        normalizedPanel.startsWith(normalizedIso))
    );
  });
  if (startsWith) return startsWith;

  return panels.find((panel) => panel.role === isoPanel.role);
}

export function sheetMaterialKey(sheet: StockSheet): string {
  const name = normalizeName(sheet.name || "");
  const material = normalizeName(sheet.material || "");
  return name || material;
}

export function sheetGroupKey(sheet: StockSheet): string {
  return `${sheetMaterialKey(sheet)}|${sheet.L}x${sheet.W}`;
}

// Re-export MaterialMode so consumers don't need a separate import for this util
export type { MaterialMode };

