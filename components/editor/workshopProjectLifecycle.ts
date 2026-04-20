import { fetchSheets } from "@/lib/api/client";
import {
  ArtifactInstance,
  CutResult,
  MaterialMode,
  ModuleNode,
  Panel,
  Project,
  StockSheet,
} from "@/lib/domain/types";
import {
  ROOT_MODULE,
  deriveModulesFromPanels,
  normalizePanelsModule,
} from "./workshopPanelHelpers";

type PreviewColorMode = "material" | "piece";

interface LoadProjectIntoWorkshopArgs {
  projectId: string;
  savedProjects: Project[];
  sheets: StockSheet[];
  setSheets: React.Dispatch<React.SetStateAction<StockSheet[]>>;
  setEditablePanels: (panels: Panel[]) => void;
  setModules: (modules: ModuleNode[]) => void;
  setHiddenPreviewPanelIds: (ids: string[]) => void;
  setSelectedSheetIds: (ids: number[]) => void;
  setPrimarySheetId: (id: number | null) => void;
  setMaterialMode: (mode: MaterialMode) => void;
  setPreviewColorMode: (mode: PreviewColorMode) => void;
  setGlobalDims: (dims: { L: number; W: number }) => void;
  setArtifacts: (artifacts: ArtifactInstance[]) => void;
  setActiveAssemblyId: (id: string) => void;
  setResult: (result: CutResult | null) => void;
  setWarnings: (warnings: string[]) => void;
  setActiveProjectId: (id: string) => void;
}

interface ResetWorkshopForNewProjectArgs {
  setEditablePanels: (panels: Panel[]) => void;
  setArtifacts: (artifacts: ArtifactInstance[]) => void;
  setModules: (modules: ModuleNode[]) => void;
  setHiddenPreviewPanelIds: (ids: string[]) => void;
  setResult: (result: CutResult | null) => void;
  setSelectedSheetIds: (ids: number[]) => void;
  setPrimarySheetId: (id: number | null) => void;
  setMaterialMode: (mode: MaterialMode) => void;
  setPreviewColorMode: (mode: PreviewColorMode) => void;
  setIsPreviewOpen: (open: boolean) => void;
  setIsCutlistOpen: (open: boolean) => void;
  setIsQuoteOpen: (open: boolean) => void;
  setActiveProjectId: (id: string) => void;
  setActiveAssemblyId: (id: string) => void;
  setShowAssemblyForm: (show: boolean) => void;
  setWarnings: (warnings: string[]) => void;
  setShowModuleForm: (show: boolean) => void;
}

export async function loadProjectIntoWorkshop({
  projectId,
  savedProjects,
  sheets,
  setSheets,
  setEditablePanels,
  setModules,
  setHiddenPreviewPanelIds,
  setSelectedSheetIds,
  setPrimarySheetId,
  setMaterialMode,
  setPreviewColorMode,
  setGlobalDims,
  setArtifacts,
  setActiveAssemblyId,
  setResult,
  setWarnings,
  setActiveProjectId,
}: LoadProjectIntoWorkshopArgs) {
  const project = savedProjects.find((item) => item.id === projectId);
  if (!project) return;

  if (sheets.length === 0) {
    try {
      setSheets(await fetchSheets());
    } catch {
      // fallback to cutResult if sheets fetch fails
    }
  }

  if (project.cutResult?.sheets?.length) {
    setSheets((current) => {
      const byId = new Map<number, StockSheet>(
        current.map((sheet) => [sheet.odooId, sheet]),
      );
      project.cutResult!.sheets.forEach(({ sheet }) => {
        if (!byId.has(sheet.odooId)) byId.set(sheet.odooId, sheet);
      });
      return Array.from(byId.values());
    });
  }

  const ws = project.workspace;
  if (ws) {
    const normalized = normalizePanelsModule(ws.panels ?? []);
    setEditablePanels(normalized);
    setModules(
      ws.modules?.length ? ws.modules : deriveModulesFromPanels(normalized),
    );
    setHiddenPreviewPanelIds(ws.hiddenPreviewPanelIds ?? []);
    setSelectedSheetIds(ws.selectedSheetIds ?? []);
    setPrimarySheetId(ws.primarySheetId ?? null);
    setMaterialMode(ws.materialMode ?? "single");
    setPreviewColorMode(ws.previewColorMode ?? "material");
    setGlobalDims(ws.globalDims ?? { L: 244, W: 215 });
    setArtifacts(ws.artifacts ?? []);
    setActiveAssemblyId("");
  } else if (project.cutResult?.sheets?.length) {
    const ids = project.cutResult.sheets.map((entry) => entry.sheet.odooId);
    // For new projects: set primary sheet for single mode, but leave selectedSheetIds empty
    // User should explicitly select sheets in mixed mode
    setPrimarySheetId(ids[0] ?? null);
    setMaterialMode("single");
    setArtifacts([]);
    setActiveAssemblyId("");
  } else {
    setArtifacts([]);
  }

  setResult(project.cutResult ?? null);
  setWarnings([]);
  setActiveProjectId(project.id);
}

export function resetWorkshopForNewProject({
  setEditablePanels,
  setArtifacts,
  setModules,
  setHiddenPreviewPanelIds,
  setResult,
  setSelectedSheetIds,
  setPrimarySheetId,
  setMaterialMode,
  setPreviewColorMode,
  setIsPreviewOpen,
  setIsCutlistOpen,
  setIsQuoteOpen,
  setActiveProjectId,
  setActiveAssemblyId,
  setShowAssemblyForm,
  setWarnings,
  setShowModuleForm,
}: ResetWorkshopForNewProjectArgs) {
  setEditablePanels([]);
  setArtifacts([]);
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
  setActiveProjectId("");
  setActiveAssemblyId("");
  setShowAssemblyForm(false);
  setWarnings([]);
  setShowModuleForm(false);
}
