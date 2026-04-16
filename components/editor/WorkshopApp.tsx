"use client";

import { StockSelector } from "@/components/cutlist/StockSelector";
import { IsoPreview } from "@/components/preview/IsoPreview";
import {
  deleteAssembly,
  deleteProject,
  fetchAssemblies,
  fetchProjects,
  fetchSheets,
  optimize,
  saveAssembly,
  saveProject,
} from "@/lib/api/client";
import { preparePanelsByRole } from "@/lib/domain/roleRules";
import {
  Assembly,
  CostBreakdown as CostBreakdownType,
  CutResult,
  IsoPanel,
  MaterialMode,
  ModuleNode,
  Panel,
  PanelRole,
  Project,
  StockSheet,
  TemplateCategory,
  TemplateParams,
} from "@/lib/domain/types";
import { usePricingStore } from "@/store/pricingStore";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CutlistTable } from "../cutlist/CutlistTable";
import { SheetLayouts } from "../cutlist/SheetLayouts";
import { CostBreakdown } from "../pricing/CostBreakdown";

type PreviewColorMode = "material" | "piece";
type PreviewSourceMode = "custom-template" | "manual";

const MANUAL_DEFAULT_PARAMS: TemplateParams = {
  W: 120,
  H: 90,
  D: 55,
  thickness: 1.8,
  shelves: 0,
};

const rolePreviewColors: Record<PanelRole, string> = {
  side: "#c6cfdb",
  top: "#f0d8a6",
  bottom: "#bba07d",
  back: "#88a9c4",
  shelf: "#8fb89e",
  door: "#d79f9b",
  divider: "#a99bd0",
  "drawer-front": "#c0877f",
  "drawer-side": "#85a8be",
  "drawer-back": "#6f8ea2",
  "drawer-bottom": "#b9c7d4",
};

const ROOT_MODULE: ModuleNode = { id: "main", name: "Modulo principal" };

function createManualPanel(index: number): Panel {
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

function normalizePanelsModule(panels: Panel[]): Panel[] {
  return panels.map((panel) => ({
    ...panel,
    moduleId: panel.moduleId || ROOT_MODULE.id,
  }));
}

function deriveModulesFromPanels(panels: Panel[]): ModuleNode[] {
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

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function expandPanels(panels: Panel[]): Panel[] {
  return panels.flatMap((panel) =>
    Array.from({ length: Math.max(1, panel.qty) }, () => ({ ...panel })),
  );
}

function resolvePanelForIso(
  isoPanel: IsoPanel,
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

function materialPreviewColor(sheet?: StockSheet | null): string {
  const name = normalizeName(sheet?.name ?? sheet?.material ?? "");

  if (name.includes("blanco") || name.includes("nevada")) return "#e8dec8";
  if (name.includes("negra") || name.includes("negro")) return "#4e535c";
  if (name.includes("wengue")) return "#6a4b3d";
  if (name.includes("cerezo")) return "#9d5f46";
  if (name.includes("croma") || name.includes("cromo")) return "#9b9385";
  if (name.includes("habana")) return "#8b694d";
  if (name.includes("gris") || name.includes("olmo")) return "#8d9196";
  if (name.includes("marmol")) return "#d7d4cd";
  if (name.includes("mdf")) return "#b69d7f";
  if (name.includes("triplex")) return "#a68b61";

  return "#cfc2ab";
}

function sheetMaterialKey(sheet: StockSheet): string {
  const name = normalizeName(sheet.name || "");
  const material = normalizeName(sheet.material || "");
  return name || material;
}

function sheetGroupKey(sheet: StockSheet): string {
  return `${sheetMaterialKey(sheet)}|${sheet.L}x${sheet.W}`;
}

function buildManualIsoLayout(
  panels: Panel[],
  modules: ModuleNode[],
): IsoPanel[] {
  const expanded = expandPanels(normalizePanelsModule(panels));
  if (expanded.length === 0) return [];

  const thickness = 1.8;
  const moduleOrder = modules.length > 0 ? modules : [ROOT_MODULE];

  const result: IsoPanel[] = [];
  const moduleWidthHints: number[] = [];

  moduleOrder.forEach((module, moduleIndex) => {
    const modulePanels = expanded.filter(
      (panel) => (panel.moduleId || ROOT_MODULE.id) === module.id,
    );
    if (modulePanels.length === 0) return;

    const sides = modulePanels.filter((p) => p.role === "side");
    const tops = modulePanels.filter((p) => p.role === "top");
    const bottoms = modulePanels.filter((p) => p.role === "bottom");
    const backs = modulePanels.filter((p) => p.role === "back");
    const shelves = modulePanels.filter((p) => p.role === "shelf");
    const doors = modulePanels.filter((p) => p.role === "door");
    const dividers = modulePanels.filter((p) => p.role === "divider");
    const drawerFronts = modulePanels.filter((p) => p.role === "drawer-front");
    const drawerSides = modulePanels.filter((p) => p.role === "drawer-side");
    const drawerBacks = modulePanels.filter((p) => p.role === "drawer-back");
    const drawerBottoms = modulePanels.filter(
      (p) => p.role === "drawer-bottom",
    );

    // ── Infer module bounding box (for positioning only, not panel sizes) ──
    // Width = L of horizontal spanning panels (top, bottom, shelf, door, drawer-front)
    const widthCandidates = [
      ...tops,
      ...bottoms,
      ...shelves,
      ...doors,
      ...drawerFronts,
    ].map((p) => p.L);
    const width = Math.max(
      30,
      ...(widthCandidates.length
        ? widthCandidates
        : modulePanels.map((p) => p.L)),
    );

    // Depth = W of depth-spanning panels (top, bottom, shelf, side)
    const depthCandidates = [...tops, ...bottoms, ...shelves, ...sides].map(
      (p) => p.W,
    );
    const depth = Math.max(
      20,
      ...(depthCandidates.length
        ? depthCandidates
        : modulePanels.map((p) => p.W)),
    );

    // Height = L of vertical panels.
    // Priority: sides > backs (their longest dim) > doors > fallback.
    // Backs define the cabinet height more reliably than doors (doors can be partial-height).
    const height =
      sides.length > 0
        ? Math.max(...sides.map((p) => p.L))
        : backs.length > 0
          ? Math.max(...backs.map((p) => Math.max(p.L, p.W)))
          : doors.length > 0
            ? Math.max(...doors.map((p) => p.L))
            : Math.max(45, width * 0.75);

    moduleWidthHints[moduleIndex] = width;
    const previousModulesWidth = moduleWidthHints
      .slice(0, moduleIndex)
      .reduce((sum, currentWidth) => sum + (currentWidth || 60) + 12, 0);

    const depthLevel =
      module.parentId && module.parentId !== ROOT_MODULE.id ? 1 : 0;
    const offsetX = previousModulesWidth + depthLevel * 8;
    const offsetY = depthLevel * 6;

    const pushPanel = (
      panel: Panel,
      index: number,
      pos: { x: number; y: number; z: number },
      size: { w: number; d: number; h: number },
    ) => {
      result.push({
        id: `${module.id}-${panel.id}-${index}`,
        label: `${module.name}: ${panel.label}`,
        role: panel.role,
        pos: {
          x: offsetX + pos.x,
          y: offsetY + pos.y,
          z: pos.z,
        },
        size,
        color: "#cfc2ab",
      });
    };

    // ── Each panel rendered at its own L×W size, oriented by role ──

    // Sides: vertical, L = cabinet height, W = cabinet depth
    sides.forEach((panel, i) => {
      const x =
        i === 0
          ? 0
          : i === 1
            ? width - thickness
            : Math.min(width - thickness * 2, (width / (sides.length + 1)) * i);
      pushPanel(
        panel,
        i,
        { x, y: 0, z: 0 },
        { w: thickness, d: panel.W, h: panel.L },
      );
    });

    // Bottom: caps the base — span the full inferred module width × depth.
    // Use panel.L / panel.W when they are the widest candidates (they defined width/depth),
    // otherwise clamp to the module box so the cap always looks correct.
    bottoms.forEach((panel, i) => {
      pushPanel(
        panel,
        i,
        { x: 0, y: 0, z: 0 },
        { w: width, d: depth, h: thickness },
      );
    });

    // Top: same as bottom but at z = height - thickness.
    tops.forEach((panel, i) => {
      pushPanel(
        panel,
        i,
        { x: 0, y: 0, z: height - thickness },
        { w: width, d: depth, h: thickness },
      );
    });

    // Shelves: horizontal, L = inner width, W = depth, distributed vertically
    shelves.forEach((panel, i) => {
      const z = (height / (shelves.length + 1)) * (i + 1);
      pushPanel(
        panel,
        i,
        { x: thickness, y: 0.6, z },
        { w: panel.L, d: panel.W, h: thickness },
      );
    });

    // Dividers: vertical, L = height, W = depth
    dividers.forEach((panel, i) => {
      const x = (width / (dividers.length + 1)) * (i + 1) - thickness / 2;
      pushPanel(
        panel,
        i,
        { x, y: 0.6, z: thickness },
        { w: thickness, d: panel.W, h: panel.L },
      );
    });

    // Back: vertical panel anchored to rear.
    // Pick the back dimension closest to module height as visual height,
    // and use the other as horizontal span.
    backs.forEach((panel, i) => {
      const lDelta = Math.abs(panel.L - height);
      const wDelta = Math.abs(panel.W - height);
      const backH = lDelta <= wDelta ? panel.L : panel.W;
      const backW = lDelta <= wDelta ? panel.W : panel.L;
      pushPanel(
        panel,
        i,
        { x: 0, y: depth - 0.8, z: 0 },
        { w: backW, d: 0.8, h: backH },
      );
    });

    // Drawers: use actual panel dimensions and respect real piece count.
    // A single drawer-side piece must render as one side, not mirrored automatically.
    const drawerRows = Math.max(
      drawerFronts.length,
      drawerBottoms.length,
      drawerBacks.length,
      Math.ceil(drawerSides.length / 2),
      0,
    );

    // Estimate occupied drawer-front stack height so doors can start above it.
    const drawerGap = 1.2;
    const drawerBaseZ = thickness + 1;
    const estimatedDrawerStackHeight =
      drawerRows === 0
        ? 0
        : drawerFronts.slice(0, drawerRows).reduce<number>((sum, front) => {
            const frontH = Math.max(4, front?.W ?? height * 0.12);
            return sum + frontH;
          }, 0) +
          drawerGap * Math.max(0, drawerRows - 1);

    const openingX = thickness;
    const openingW = Math.max(8, width - thickness * 2);

    // Doors: vertical, L = height, W = door width.
    // If drawers exist, start doors above the drawer stack instead of z=0.
    doors.forEach((panel, i) => {
      const perLeafOpening = openingW / Math.max(doors.length, 1);
      const doorW = Math.min(panel.W, perLeafOpening);
      const x = openingX + i * perLeafOpening + (perLeafOpening - doorW) / 2;
      const maxStart = Math.max(0, height - panel.L);
      const desiredStart =
        drawerRows > 0 ? drawerBaseZ + estimatedDrawerStackHeight + 1 : 0;
      const z = Math.min(maxStart, Math.max(0, desiredStart));
      pushPanel(panel, i, { x, y: -1.8, z }, { w: doorW, d: 0.9, h: panel.L });
    });

    let nextDrawerZ = drawerBaseZ;
    for (let i = 0; i < drawerRows; i += 1) {
      const drawerFront = drawerFronts[i];
      const drawerBottom = drawerBottoms[i];
      const drawerBack = drawerBacks[i];
      const leftDrawerSide = drawerSides[i * 2];
      const rightDrawerSide = drawerSides[i * 2 + 1];

      const frontH = Math.max(4, drawerFront?.W ?? height * 0.12);
      const z = nextDrawerZ;
      // drawer-front: L = panel width, W = panel height
      const frontW = Math.max(8, drawerFront?.L ?? width * 0.6);
      // drawer-side: L = box depth, W = box height
      const sideRef = leftDrawerSide ?? rightDrawerSide;
      const boxDepth = Math.max(
        10,
        sideRef?.L ?? drawerBottom?.W ?? depth * 0.6,
      );
      const boxH = Math.max(4, sideRef?.W ?? frontH * 0.7);
      // drawer-bottom: L = box width, W = box depth
      const boxWidth = Math.max(
        8,
        drawerBottom?.L ?? drawerBack?.L ?? frontW * 0.9,
      );

      if (drawerFront) {
        const frontWidth = Math.min(frontW, openingW);
        pushPanel(
          drawerFront,
          i,
          { x: openingX + (openingW - frontWidth) / 2, y: -2.1, z },
          { w: frontWidth, d: 1, h: frontH },
        );
      }

      if (drawerBottom) {
        pushPanel(
          drawerBottom,
          i,
          { x: (width - boxWidth) / 2, y: 1.2, z: z + 0.5 },
          { w: drawerBottom.L, d: drawerBottom.W, h: 0.8 },
        );
      }

      if (leftDrawerSide) {
        pushPanel(
          leftDrawerSide,
          i,
          { x: (width - boxWidth) / 2, y: 1.2, z: z + 0.5 },
          { w: 0.8, d: boxDepth, h: boxH },
        );
      }

      if (rightDrawerSide) {
        pushPanel(
          rightDrawerSide,
          i + 100,
          { x: (width - boxWidth) / 2 + boxWidth - 0.8, y: 1.2, z: z + 0.5 },
          { w: 0.8, d: boxDepth, h: boxH },
        );
      }

      if (drawerBack) {
        pushPanel(
          drawerBack,
          i,
          { x: (width - boxWidth) / 2, y: 1.2 + boxDepth - 0.8, z: z + 0.5 },
          { w: drawerBack.L, d: 0.8, h: drawerBack.W },
        );
      }

      nextDrawerZ += frontH + drawerGap;
    }
  });

  return result;
}

export function WorkshopApp() {
  const { pricing, setPricingField } = usePricingStore();
  const [sheets, setSheets] = useState<StockSheet[]>([]);
  const [selectedSheetIds, setSelectedSheetIds] = useState<number[]>([]);
  const [primarySheetId, setPrimarySheetId] = useState<number | null>(null);
  const [materialMode, setMaterialMode] = useState<MaterialMode>("single");
  const [previewColorMode, setPreviewColorMode] =
    useState<PreviewColorMode>("material");
  const [result, setResult] = useState<CutResult | null>(null);
  const [editablePanels, setEditablePanels] = useState<Panel[]>([]);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opsSummary, setOpsSummary] = useState<string | null>(null);
  const [customTemplates, setCustomTemplates] = useState<Assembly[]>([]);
  const [savedProjects, setSavedProjects] = useState<Project[]>([]);
  const [modules, setModules] = useState<ModuleNode[]>([ROOT_MODULE]);
  const [, setPreviewSourceMode] = useState<PreviewSourceMode>("manual");
  const [activeProjectId, setActiveProjectId] = useState("");
  const [activeAssemblyId, setActiveAssemblyId] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [hiddenPreviewPanelIds, setHiddenPreviewPanelIds] = useState<string[]>(
    [],
  );
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [newModuleName, setNewModuleName] = useState("");
  const [newModuleParentId, setNewModuleParentId] = useState(ROOT_MODULE.id);
  const [showAssemblyForm, setShowAssemblyForm] = useState(false);
  const [assemblyName, setAssemblyName] = useState("");
  const [assemblyDescription, setAssemblyDescription] = useState("");
  const [assemblyCategory, setAssemblyCategory] =
    useState<TemplateCategory>("almacenaje");
  const [savingAssembly, setSavingAssembly] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);
  const [isCutlistOpen, setIsCutlistOpen] = useState(true);
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(true);
  const [isPricingOpen, setIsPricingOpen] = useState(true);
  const [isSheetsOpen, setIsSheetsOpen] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [globalDims, setGlobalDims] = useState<{ L: number; W: number }>({
    L: 244,
    W: 244,
  });

  async function loadCustomTemplates() {
    try {
      const data = await fetchAssemblies();
      setCustomTemplates(data);
    } catch (err) {
      console.error("Failed to fetch custom templates:", err);
    }
  }

  async function loadProjects() {
    try {
      setLoadingProjects(true);
      const data = await fetchProjects();
      setSavedProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando proyectos");
    } finally {
      setLoadingProjects(false);
    }
  }

  async function saveCurrentAsAssembly() {
    const name = assemblyName.trim();
    if (!name || editablePanels.length === 0) return;

    setSavingAssembly(true);
    try {
      const now = Date.now();
      const payload: Assembly = {
        id: `asm_${now}`,
        name,
        description: assemblyDescription.trim() || undefined,
        panels: editablePanels,
        isCustom: true,
        category: assemblyCategory,
        createdAt: now,
        updatedAt: now,
      };
      await saveAssembly(payload);
      await loadCustomTemplates();
      setAssemblyName("");
      setAssemblyDescription("");
      setShowAssemblyForm(false);
      setActiveAssemblyId(payload.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error guardando ensamble");
    } finally {
      setSavingAssembly(false);
    }
  }

  async function updateActiveAssembly() {
    if (!activeAssemblyId || editablePanels.length === 0) return;

    const current = customTemplates.find((t) => t.id === activeAssemblyId);
    if (!current) {
      setError("No se encontro el ensamble activo para actualizar.");
      return;
    }

    setSavingAssembly(true);
    try {
      const payload: Assembly = {
        ...current,
        panels: editablePanels,
        updatedAt: Date.now(),
      };
      await saveAssembly(payload);
      await loadCustomTemplates();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error actualizando ensamble",
      );
    } finally {
      setSavingAssembly(false);
    }
  }

  async function removeAssembly(assemblyId: string) {
    if (!window.confirm("¿Seguro que deseas eliminar este ensamble?")) return;
    try {
      await deleteAssembly(assemblyId);
      await loadCustomTemplates();
      if (activeAssemblyId === assemblyId) {
        setActiveAssemblyId("");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error eliminando ensamble",
      );
    }
  }

  useEffect(() => {
    loadCustomTemplates();
    loadProjects();
  }, []);

  useEffect(() => {
    if (sheets.length === 0) return;

    setSelectedSheetIds((current) => {
      const valid = current.filter((id) =>
        sheets.some((sheet) => sheet.odooId === id),
      );
      return valid.length > 0 ? valid : sheets.map((sheet) => sheet.odooId);
    });

    setPrimarySheetId((current) => {
      if (current && sheets.some((sheet) => sheet.odooId === current)) {
        return current;
      }
      return sheets[0]?.odooId ?? null;
    });
  }, [sheets]);

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
  }, [materialMode, primarySheetId, selectedSheetIds]);

  const previewSourcePanels = useMemo(
    () =>
      editablePanels.filter(
        (panel) => !hiddenPreviewPanelIds.includes(panel.id),
      ),
    [editablePanels, hiddenPreviewPanelIds],
  );

  const previewPanels = useMemo(() => {
    const prepared = preparePanelsByRole(previewSourcePanels, pricing, modules);
    return prepared.panels;
  }, [modules, previewSourcePanels, pricing]);

  const isoPanels = useMemo(
    () => buildManualIsoLayout(previewPanels, modules),
    [modules, previewPanels],
  );

  const coloredIsoPanels = useMemo(() => {
    if (isoPanels.length === 0) {
      return [];
    }

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
  const totals = useMemo(
    () => ({
      pieces: editablePanels.reduce((sum, panel) => sum + panel.qty, 0),
      types: editablePanels.length,
      area: editablePanels.reduce(
        (sum, panel) => sum + panel.qty * ((panel.L * panel.W) / 10000),
        0,
      ),
    }),
    [editablePanels],
  );

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
  }, [materialMode, primarySheetId, selectedSheetIds, sheets, globalDims]);

  function updatePanel(
    panelId: string,
    field: "label" | "L" | "W" | "qty" | "role" | "stockSheetId" | "moduleId",
    value: string | number,
  ) {
    setPreviewSourceMode("manual");
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
            : panel[field],
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
    setPreviewSourceMode("manual");
    setEditablePanels((current) =>
      current.filter((panel) => panel.id !== panelId),
    );
    setHiddenPreviewPanelIds((current) =>
      current.filter((id) => id !== panelId),
    );
    setResult(null);
  }

  function togglePreviewVisibility(panelId: string) {
    setHiddenPreviewPanelIds((current) =>
      current.includes(panelId)
        ? current.filter((id) => id !== panelId)
        : [...current, panelId],
    );
  }

  function addPanel() {
    setPreviewSourceMode("manual");
    setEditablePanels((current) => [
      ...current,
      createManualPanel(current.length + 1),
    ]);
    setResult(null);
  }

  function addModule() {
    setNewModuleName("");
    setNewModuleParentId(ROOT_MODULE.id);
    setShowModuleForm(true);
  }

  function confirmAddModule() {
    const name = newModuleName.trim();
    if (!name) return;
    const moduleId =
      normalizeName(name).replace(/\s+/g, "-") || `mod-${Date.now()}`;
    setModules((current) => {
      if (current.some((m) => m.id === moduleId)) return current;
      const parentId = current.some((m) => m.id === newModuleParentId)
        ? newModuleParentId
        : ROOT_MODULE.id;
      return [...current, { id: moduleId, name, parentId }];
    });
    setShowModuleForm(false);
  }

  function removeModule(moduleId: string) {
    if (moduleId === ROOT_MODULE.id) return;
    setModules((current) => current.filter((m) => m.id !== moduleId));
    // Reassign orphaned panels to root
    setEditablePanels((current) =>
      current.map((p) =>
        p.moduleId === moduleId ? { ...p, moduleId: ROOT_MODULE.id } : p,
      ),
    );
  }

  function toggleSheetSelection(sheetId: number) {
    setSelectedSheetIds((current) => {
      const exists = current.includes(sheetId);
      const next = exists
        ? current.filter((id) => id !== sheetId)
        : [...current, sheetId];
      return next;
    });
    setResult(null);
  }

  function changeMaterialMode(mode: MaterialMode) {
    setMaterialMode(mode);
    setResult(null);
  }

  function changeGlobalDims(L: number, W: number) {
    setGlobalDims({ L, W });
    setResult(null);
  }

  function changePrimarySheet(sheetId: number) {
    setPrimarySheetId(sheetId);
    if (!selectedSheetIds.includes(sheetId)) {
      setSelectedSheetIds((current) => [...current, sheetId]);
    }
    setResult(null);
  }

  async function loadSheets(forceRefresh = false) {
    try {
      setLoadingSheets(true);
      setError(null);
      const data = await fetchSheets(forceRefresh);
      setSheets(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando tableros");
    } finally {
      setLoadingSheets(false);
    }
  }

  async function runOptimize() {
    try {
      setOptimizing(true);
      setError(null);
      setOpsSummary(null);
      setWarnings([]);

      const prepared = preparePanelsByRole(editablePanels, pricing, modules);
      if (prepared.warnings.length > 0) {
        setWarnings(prepared.warnings);
      }
      if (prepared.issues.length > 0) {
        throw new Error(prepared.issues.join(" "));
      }

      const opsByType = prepared.ops.reduce<Record<string, number>>(
        (acc, op) => {
          acc[op.type] = (acc[op.type] ?? 0) + 1;
          return acc;
        },
        {},
      );
      if (prepared.ops.length > 0) {
        const summary = Object.entries(opsByType)
          .map(([type, count]) => `${type}: ${count}`)
          .join(" | ");
        setOpsSummary(summary);
      }

      let source = assignableSheets;
      let optimizePanels = prepared.panels;
      if (sheets.length === 0) {
        const loaded = await fetchSheets();
        setSheets(loaded);
        source =
          materialMode === "single"
            ? loaded.filter(
                (sheet) =>
                  sheet.odooId === (primarySheetId ?? loaded[0]?.odooId),
              )
            : loaded;
      }

      if (source.length === 0) {
        throw new Error("Selecciona al menos un tablero para optimizar");
      }

      if (materialMode === "mixed") {
        const canonicalByGroup = new Map<string, number>();
        const canonicalBySheetId = new Map<number, number>();

        for (const sheet of source) {
          const groupKey = sheetGroupKey(sheet);
          const canonicalId = canonicalByGroup.get(groupKey) ?? sheet.odooId;
          if (!canonicalByGroup.has(groupKey)) {
            canonicalByGroup.set(groupKey, canonicalId);
          }
          canonicalBySheetId.set(sheet.odooId, canonicalId);
        }

        const seenCanonicalIds = new Set<number>();
        source = source.filter((sheet) => {
          const canonicalId =
            canonicalBySheetId.get(sheet.odooId) ?? sheet.odooId;
          if (seenCanonicalIds.has(canonicalId)) return false;
          seenCanonicalIds.add(canonicalId);
          return true;
        });

        optimizePanels = prepared.panels.map((panel) => {
          if (!panel.stockSheetId) return panel;
          const canonicalId =
            canonicalBySheetId.get(panel.stockSheetId) ?? panel.stockSheetId;
          if (canonicalId === panel.stockSheetId) return panel;
          return { ...panel, stockSheetId: canonicalId };
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

  async function saveProjectSnapshot(payload: {
    id: string;
    name: string;
    createdAt: number;
  }) {
    const now = Date.now();
    const project: Project = {
      id: payload.id,
      name: payload.name,
      templateKey: "manual",
      params: MANUAL_DEFAULT_PARAMS,
      cutResult: result ?? undefined,
      pricingConfig: pricing,
      workspace: {
        panels: editablePanels,
        modules,
        hiddenPreviewPanelIds,
        selectedSheetIds,
        primarySheetId,
        materialMode,
        previewColorMode,
        globalDims,
      },
      createdAt: payload.createdAt,
      updatedAt: now,
    };

    await saveProject(project);
    await loadProjects();
    setActiveProjectId(project.id);
  }

  async function persistProject() {
    const current = savedProjects.find(
      (project) => project.id === activeProjectId,
    );
    const name = projectName.trim();
    if (!name) return;

    try {
      setSavingProject(true);
      setError(null);
      await saveProjectSnapshot({
        id: current?.id ?? crypto.randomUUID(),
        name,
        createdAt: current?.createdAt ?? Date.now(),
      });
      setShowProjectForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error guardando proyecto");
    } finally {
      setSavingProject(false);
    }
  }

  async function saveActiveProjectChanges() {
    const current = savedProjects.find(
      (project) => project.id === activeProjectId,
    );
    if (!current) {
      setError("Carga un proyecto guardado para actualizarlo.");
      return;
    }

    try {
      setSavingProject(true);
      setError(null);
      await saveProjectSnapshot({
        id: current.id,
        name: current.name,
        createdAt: current.createdAt,
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Error guardando cambios del proyecto",
      );
    } finally {
      setSavingProject(false);
    }
  }

  function startSaveProject() {
    const current = savedProjects.find(
      (project) => project.id === activeProjectId,
    );
    setProjectName(current?.name ?? (projectName || "Proyecto manual"));
    setShowProjectForm(true);
    setError(null);
  }

  async function removeProject(projectId: string) {
    if (!window.confirm("¿Seguro que deseas eliminar este proyecto?")) return;
    try {
      setError(null);
      await deleteProject(projectId);
      await loadProjects();
      if (activeProjectId === projectId) {
        setActiveProjectId("");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error eliminando proyecto",
      );
    }
  }

  async function loadProject(projectId: string) {
    const project = savedProjects.find((item) => item.id === projectId);
    if (!project) return;

    // Ensure sheet catalog is available so material selectors remain editable.
    if (sheets.length === 0) {
      try {
        const loaded = await fetchSheets();
        setSheets(loaded);
      } catch {
        // If Odoo fetch fails, fallback to sheets embedded in last cut result.
      }
    }

    if (project.cutResult?.sheets?.length) {
      const fromCutResult = project.cutResult.sheets.map(
        (entry) => entry.sheet,
      );
      setSheets((current) => {
        const byId = new Map<number, StockSheet>();
        for (const sheet of current) byId.set(sheet.odooId, sheet);
        for (const sheet of fromCutResult) {
          if (!byId.has(sheet.odooId)) {
            byId.set(sheet.odooId, sheet);
          }
        }
        return Array.from(byId.values());
      });
    }

    const workspace = project.workspace;
    if (workspace) {
      const normalizedPanels = normalizePanelsModule(workspace.panels ?? []);
      const restoredModules =
        workspace.modules && workspace.modules.length > 0
          ? workspace.modules
          : deriveModulesFromPanels(normalizedPanels);

      setEditablePanels(normalizedPanels);
      setModules(restoredModules);
      setHiddenPreviewPanelIds(workspace.hiddenPreviewPanelIds ?? []);
      setSelectedSheetIds(workspace.selectedSheetIds ?? []);
      setPrimarySheetId(workspace.primarySheetId ?? null);
      setMaterialMode(workspace.materialMode ?? "single");
      setPreviewColorMode(workspace.previewColorMode ?? "material");
      setGlobalDims(workspace.globalDims ?? { L: 244, W: 244 });
      setActiveAssemblyId("");
      setPreviewSourceMode("manual");
    } else if (project.cutResult?.sheets?.length) {
      const fallbackSelectedIds = project.cutResult.sheets.map(
        (entry) => entry.sheet.odooId,
      );
      setSelectedSheetIds(Array.from(new Set(fallbackSelectedIds)));
      setPrimarySheetId(fallbackSelectedIds[0] ?? null);
      setActiveAssemblyId("");
    }

    setResult(project.cutResult ?? null);
    setWarnings([]);
    setActiveProjectId(project.id);
  }

  const breakdown: CostBreakdownType | undefined = result?.totalCost;

  const startNewProject = () => {
    setEditablePanels([]);
    setModules([ROOT_MODULE]);
    setHiddenPreviewPanelIds([]);
    setResult(null);
    setSelectedSheetIds([]);
    setPrimarySheetId(null);
    setMaterialMode("single");
    setPreviewColorMode("material");
    setIsPreviewOpen(true);
    setIsCutlistOpen(true);
    setIsQuoteOpen(false);
    setPreviewSourceMode("manual");
    setActiveProjectId("");
    setActiveAssemblyId("");
    setWarnings([]);
    setShowModuleForm(false);
    setShowProjectForm(false);
    setProjectName("");
  };

  const loadAssembly = (key: string) => {
    const customTemplate = customTemplates.find((a) => a.id === key);
    if (customTemplate) {
      const normalized = normalizePanelsModule(customTemplate.panels);
      setEditablePanels(normalized);
      setModules(deriveModulesFromPanels(normalized));
      setHiddenPreviewPanelIds([]);
      setPreviewSourceMode("custom-template");
      setActiveAssemblyId(customTemplate.id);
      setResult(null);
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          CutList <strong>Pro</strong>
        </div>

        <button
          className="new-project-btn"
          type="button"
          onClick={startNewProject}
          title="Limpiar todo y empezar desde cero"
        >
          ✕ Nuevo proyecto
        </button>

        <div className="panel-title">Proyectos Guardados</div>
        <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
          <button
            className="template-btn"
            type="button"
            onClick={startSaveProject}
            disabled={savingProject}
          >
            {savingProject ? "Guardando..." : "Guardar proyecto"}
          </button>
          <button
            className="template-btn"
            type="button"
            onClick={saveActiveProjectChanges}
            disabled={savingProject || !activeProjectId}
            title={
              activeProjectId
                ? "Guarda los cambios sobre el proyecto cargado"
                : "Carga un proyecto para actualizarlo"
            }
          >
            {savingProject ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>

        {showProjectForm && (
          <div
            className="module-form module-form-sidebar"
            style={{ marginBottom: 10 }}
          >
            <input
              className="table-input"
              placeholder="Nombre del proyecto"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") persistProject();
                if (e.key === "Escape") setShowProjectForm(false);
              }}
              autoFocus
            />
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                className="template-btn"
                onClick={persistProject}
                disabled={savingProject || !projectName.trim()}
              >
                {savingProject ? "Guardando..." : "Guardar"}
              </button>
              <button
                type="button"
                className="template-btn"
                onClick={() => setShowProjectForm(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="template-list" style={{ marginBottom: 14 }}>
          {loadingProjects ? (
            <div className="muted">Cargando proyectos...</div>
          ) : savedProjects.length === 0 ? (
            <div className="muted">Sin proyectos guardados</div>
          ) : (
            savedProjects.map((project) => (
              <div
                key={project.id}
                className={`template-btn saved-assembly-card ${activeProjectId === project.id ? "active" : ""}`}
              >
                <div className="saved-assembly-title">{project.name}</div>
                <small className="muted saved-assembly-meta">
                  {new Date(project.updatedAt).toLocaleString()}
                </small>
                <div className="saved-assembly-actions">
                  <button
                    type="button"
                    className="table-row-action preview-hide-toggle"
                    onClick={() => loadProject(project.id)}
                  >
                    Cargar
                  </button>
                  <button
                    type="button"
                    className="table-row-action"
                    onClick={() => removeProject(project.id)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="panel-title">Emsambles Guardados</div>
        <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
          <button
            className="template-btn"
            type="button"
            onClick={() => setShowAssemblyForm((v) => !v)}
            disabled={editablePanels.length === 0 || savingAssembly}
          >
            {showAssemblyForm ? "Cancelar" : "Guardar como plantilla"}
          </button>
          <button
            className="template-btn"
            type="button"
            onClick={updateActiveAssembly}
            disabled={
              !activeAssemblyId || editablePanels.length === 0 || savingAssembly
            }
            title={
              activeAssemblyId
                ? "Sobrescribe el ensamble cargado"
                : "Carga un ensamble para poder actualizarlo"
            }
          >
            {savingAssembly ? "Guardando..." : "Actualizar actual"}
          </button>
        </div>

        {showAssemblyForm && (
          <div
            className="module-form module-form-sidebar"
            style={{ marginBottom: 10 }}
          >
            <input
              className="table-input"
              placeholder="Nombre de plantilla"
              value={assemblyName}
              onChange={(e) => setAssemblyName(e.target.value)}
            />
            <input
              className="table-input"
              placeholder="Descripcion (opcional)"
              value={assemblyDescription}
              onChange={(e) => setAssemblyDescription(e.target.value)}
            />
            <select
              className="table-input"
              value={assemblyCategory}
              onChange={(e) =>
                setAssemblyCategory(e.target.value as TemplateCategory)
              }
            >
              <option value="cocina">Cocina</option>
              <option value="dormitorio">Dormitorio</option>
              <option value="almacenaje">Almacenaje</option>
              <option value="oficina">Oficina</option>
            </select>
            <button
              type="button"
              className="template-btn"
              onClick={saveCurrentAsAssembly}
              disabled={savingAssembly || !assemblyName.trim()}
            >
              Guardar
            </button>
          </div>
        )}

        <div className="template-list">
          {customTemplates.length === 0 ? (
            <div className="muted">Sin emsambles guardados</div>
          ) : (
            customTemplates.map((assembly) => (
              <div
                key={assembly.id}
                className={`template-btn saved-assembly-card ${activeAssemblyId === assembly.id ? "active" : ""}`}
              >
                <div className="saved-assembly-title">{assembly.name}</div>
                <small className="muted saved-assembly-meta">
                  {assembly.panels.length} piezas
                </small>
                <div className="saved-assembly-actions">
                  <button
                    type="button"
                    className="table-row-action preview-hide-toggle"
                    onClick={() => loadAssembly(assembly.id)}
                  >
                    Cargar
                  </button>
                  <button
                    type="button"
                    className="table-row-action"
                    onClick={() => removeAssembly(assembly.id)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div
          className="panel-title"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>Módulos</span>
          <button
            type="button"
            className="sidebar-add-btn"
            onClick={addModule}
            title="Nuevo módulo"
          >
            <Plus size={13} />+ Módulo
          </button>
        </div>
        <div className="module-list">
          {modules.map((m) => (
            <div
              key={m.id}
              className={`module-list-item ${m.id === ROOT_MODULE.id ? "module-list-root" : ""}`}
            >
              <span className="module-list-name">
                {m.id === ROOT_MODULE.id ? "Principal" : m.name}
              </span>
              {m.id !== ROOT_MODULE.id && (
                <button
                  type="button"
                  className="module-chip-remove"
                  title="Eliminar módulo"
                  onClick={() => removeModule(m.id)}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        {showModuleForm && (
          <div className="module-form module-form-sidebar">
            <input
              className="table-input"
              placeholder="Nombre del módulo"
              value={newModuleName}
              onChange={(e) => setNewModuleName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmAddModule();
                if (e.key === "Escape") setShowModuleForm(false);
              }}
              autoFocus
            />
            {modules.length > 1 && (
              <select
                className="table-input"
                value={newModuleParentId}
                onChange={(e) => setNewModuleParentId(e.target.value)}
              >
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id === ROOT_MODULE.id ? "Principal" : m.name}
                  </option>
                ))}
              </select>
            )}
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                className="template-btn"
                onClick={confirmAddModule}
                disabled={!newModuleName.trim()}
              >
                Crear
              </button>
              <button
                type="button"
                className="template-btn"
                onClick={() => setShowModuleForm(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="panel-title">Resumen</div>
        <div className="stat-list">
          <div className="metric">
            <span className="muted">Piezas</span>
            <strong>{totals.pieces}</strong>
          </div>
          <div className="metric">
            <span className="muted">Tipos</span>
            <strong>{totals.types}</strong>
          </div>
          <div className="metric">
            <span className="muted">Area total</span>
            <strong>{totals.area.toFixed(2)} m2</strong>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="content-grid">
          <section className="card preview-card">
            <button
              type="button"
              className="collapse-toggle"
              onClick={() => setIsPreviewOpen((v) => !v)}
            >
              <span>Vista Isometrica</span>
              {isPreviewOpen ? (
                <ChevronDown className="collapse-icon" size={18} />
              ) : (
                <ChevronRight className="collapse-icon" size={18} />
              )}
            </button>
            {isPreviewOpen && (
              <>
                <div className="preview-toolbar">
                  <button
                    type="button"
                    className={`mode-chip ${previewColorMode === "material" ? "active" : ""}`}
                    onClick={() => setPreviewColorMode("material")}
                  >
                    Por melamina
                  </button>
                  <button
                    type="button"
                    className={`mode-chip ${previewColorMode === "piece" ? "active" : ""}`}
                    onClick={() => setPreviewColorMode("piece")}
                  >
                    Por pieza
                  </button>
                </div>
                <div className="preview-stage">
                  <IsoPreview panels={coloredIsoPanels} />
                </div>
              </>
            )}
          </section>

          <section className="card acciones-card">
            <button
              type="button"
              className="collapse-toggle"
              onClick={() => setIsActionsOpen((v) => !v)}
            >
              <span>Acciones</span>
              {isActionsOpen ? (
                <ChevronDown className="collapse-icon" size={18} />
              ) : (
                <ChevronRight className="collapse-icon" size={18} />
              )}
            </button>
            {isActionsOpen && (
              <div style={{ display: "grid", gap: "10px" }}>
                <button
                  className="template-btn"
                  type="button"
                  onClick={() => loadSheets(false)}
                >
                  {loadingSheets
                    ? "Consultando Odoo..."
                    : "Cargar tableros Odoo"}
                </button>

                <button
                  className="template-btn"
                  type="button"
                  onClick={() => loadSheets(true)}
                  style={{ opacity: 0.7, fontSize: 12 }}
                >
                  ↺ Forzar actualización
                </button>

                <button
                  className="template-btn"
                  type="button"
                  onClick={runOptimize}
                >
                  {optimizing ? "Optimizando..." : "Optimizar corte"}
                </button>

                <button
                  className="template-btn"
                  type="button"
                  onClick={startSaveProject}
                  disabled={savingProject}
                >
                  {savingProject ? "Guardando..." : "Guardar proyecto"}
                </button>
              </div>
            )}

            <button
              type="button"
              className="collapse-toggle"
              onClick={() => setIsPricingOpen((v) => !v)}
              style={{ marginTop: 18 }}
            >
              <span>Tarifas</span>
              {isPricingOpen ? (
                <ChevronDown className="collapse-icon" size={18} />
              ) : (
                <ChevronRight className="collapse-icon" size={18} />
              )}
            </button>
            {isPricingOpen && (
              <div className="field-grid">
                <div className="field">
                  <label htmlFor="costPerCut">Costo por corte</label>
                  <input
                    id="costPerCut"
                    type="number"
                    step="0.1"
                    value={pricing.costPerCut}
                    onChange={(e) =>
                      setPricingField("costPerCut", Number(e.target.value))
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="costPerBanding">Costo por canto (m)</label>
                  <input
                    id="costPerBanding"
                    type="number"
                    step="0.1"
                    value={pricing.costPerBandingMeter}
                    onChange={(e) =>
                      setPricingField(
                        "costPerBandingMeter",
                        Number(e.target.value),
                      )
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="kerfCm">Kerf (cm)</label>
                  <input
                    id="kerfCm"
                    type="number"
                    step="0.01"
                    value={pricing.kerfCm}
                    onChange={(e) =>
                      setPricingField("kerfCm", Number(e.target.value))
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="fitClearanceCm">Holgura de ajuste (cm)</label>
                  <input
                    id="fitClearanceCm"
                    type="number"
                    step="0.01"
                    value={pricing.fitClearanceCm}
                    onChange={(e) =>
                      setPricingField("fitClearanceCm", Number(e.target.value))
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="trimAllowanceCm">Margen de trim (cm)</label>
                  <input
                    id="trimAllowanceCm"
                    type="number"
                    step="0.01"
                    value={pricing.trimAllowanceCm}
                    onChange={(e) =>
                      setPricingField("trimAllowanceCm", Number(e.target.value))
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="backInsetCm">Inset de fondo (cm)</label>
                  <input
                    id="backInsetCm"
                    type="number"
                    step="0.01"
                    value={pricing.backInsetCm}
                    onChange={(e) =>
                      setPricingField("backInsetCm", Number(e.target.value))
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="doorSystem">Sistema de puerta</label>
                  <select
                    id="doorSystem"
                    value={pricing.doorSystem}
                    onChange={(e) =>
                      setPricingField(
                        "doorSystem",
                        e.target.value as "overlay" | "inset",
                      )
                    }
                  >
                    <option value="overlay">Overlay</option>
                    <option value="inset">Inset</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="doorRevealCm">Revelado puerta (cm)</label>
                  <input
                    id="doorRevealCm"
                    type="number"
                    step="0.01"
                    value={pricing.doorRevealCm}
                    onChange={(e) =>
                      setPricingField("doorRevealCm", Number(e.target.value))
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="hingeCupDiameterMm">
                    Cazoleta bisagra (mm)
                  </label>
                  <select
                    id="hingeCupDiameterMm"
                    value={pricing.hingeCupDiameterMm}
                    onChange={(e) =>
                      setPricingField(
                        "hingeCupDiameterMm",
                        Number(e.target.value) as 35 | 26,
                      )
                    }
                  >
                    <option value={35}>35</option>
                    <option value={26}>26</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="drawerSystem">Sistema de cajon</label>
                  <select
                    id="drawerSystem"
                    value={pricing.drawerSystem}
                    onChange={(e) =>
                      setPricingField(
                        "drawerSystem",
                        e.target.value as "side-mount" | "undermount",
                      )
                    }
                  >
                    <option value="side-mount">Side mount</option>
                    <option value="undermount">Undermount</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="drawerSideClearanceCm">
                    Holgura lateral cajon (cm)
                  </label>
                  <input
                    id="drawerSideClearanceCm"
                    type="number"
                    step="0.01"
                    value={pricing.drawerSideClearanceCm}
                    onChange={(e) =>
                      setPricingField(
                        "drawerSideClearanceCm",
                        Number(e.target.value),
                      )
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="bandingType">Tipo de canto</label>
                  <input
                    id="bandingType"
                    value={pricing.bandingType}
                    onChange={(e) =>
                      setPricingField("bandingType", e.target.value)
                    }
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              className="collapse-toggle"
              onClick={() => setIsSheetsOpen((v) => !v)}
              style={{ marginTop: 18 }}
            >
              <span>Tableros a usar</span>
              {isSheetsOpen ? (
                <ChevronDown className="collapse-icon" size={18} />
              ) : (
                <ChevronRight className="collapse-icon" size={18} />
              )}
            </button>
            {isSheetsOpen && (
              <>
                <StockSelector
                  sheets={sheets}
                  selectedSheetIds={selectedSheetIds}
                  materialMode={materialMode}
                  primarySheetId={primarySheetId}
                  globalDims={globalDims}
                  onToggleSheet={toggleSheetSelection}
                  onMaterialModeChange={changeMaterialMode}
                  onPrimarySheetChange={changePrimarySheet}
                  onGlobalDimsChange={changeGlobalDims}
                />
                {opsSummary && (
                  <p style={{ color: "#9ac7ff", marginTop: 8, fontSize: 12 }}>
                    Ops sugeridas: {opsSummary}
                  </p>
                )}
              </>
            )}
            {error && <p style={{ color: "#ff8e8e", marginTop: 4 }}>{error}</p>}
          </section>
        </div>

        <section className="card cutlist-card">
          <button
            type="button"
            className="collapse-toggle"
            onClick={() => setIsCutlistOpen((v) => !v)}
          >
            <span>Lista de corte</span>
            {isCutlistOpen ? (
              <ChevronDown className="collapse-icon" size={18} />
            ) : (
              <ChevronRight className="collapse-icon" size={18} />
            )}
          </button>
          {isCutlistOpen && (
            <div className="despiece-stack">
              {warnings.length > 0 && (
                <div className="role-warnings">
                  {warnings.map((w, i) => (
                    <p key={i} className="role-warning">
                      ⚠ {w}
                    </p>
                  ))}
                </div>
              )}

              <CutlistTable
                panels={editablePanels}
                modules={modules}
                hiddenPreviewPanelIds={hiddenPreviewPanelIds}
                availableSheets={assignableSheets}
                materialMode={materialMode}
                onPanelChange={updatePanel}
                onBandingToggle={togglePanelBanding}
                onRemovePanel={removePanel}
                onTogglePreviewVisibility={togglePreviewVisibility}
                onAddPanel={addPanel}
                onAddModule={addModule}
              />
              <div className="sheet-layouts-block">
                <h3>Planchas y posiciones de corte</h3>
                <SheetLayouts panels={editablePanels} result={result} />
              </div>
            </div>
          )}

          <button
            type="button"
            className="collapse-toggle"
            onClick={() => setIsQuoteOpen((v) => !v)}
            style={{ marginTop: 14 }}
          >
            <span>Cotizacion</span>
            {isQuoteOpen ? (
              <ChevronDown className="collapse-icon" size={18} />
            ) : (
              <ChevronRight className="collapse-icon" size={18} />
            )}
          </button>
          {isQuoteOpen && <CostBreakdown breakdown={breakdown} />}
        </section>
      </main>
    </div>
  );
}
