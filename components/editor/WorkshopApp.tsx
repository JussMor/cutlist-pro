"use client";

import { StockSelector } from "@/components/cutlist/StockSelector";
import { IsoPreview } from "@/components/preview/IsoPreview";
import { saveProject } from "@/lib/api/client";
import {
  CostBreakdown as CostBreakdownType,
  CutResult,
  StockSheet,
} from "@/lib/domain/types";
import { usePricingStore } from "@/store/pricingStore";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CutlistTable } from "../cutlist/CutlistTable";
import { SheetLayouts } from "../cutlist/SheetLayouts";
import { CostBreakdown } from "../pricing/CostBreakdown";
import { ProjectBreadcrumb } from "./ProjectBreadcrumb";
import { WorkshopSidebar } from "./WorkshopSidebar";
import { useWorkshopAssemblies } from "./hooks/useWorkshopAssemblies";
import { useWorkshopModules } from "./hooks/useWorkshopModules";
import { useWorkshopPanels } from "./hooks/useWorkshopPanels";
import { useWorkshopPreview } from "./hooks/useWorkshopPreview";
import {
  buildProjectPayload,
  useWorkshopProjects,
} from "./hooks/useWorkshopProjects";
import { useWorkshopSheets } from "./hooks/useWorkshopSheets";
import { PricingSection } from "./sections/PricingSection";
import { ROOT_MODULE } from "./workshopPanelHelpers";
import {
  loadProjectIntoWorkshop,
  resetWorkshopForNewProject,
} from "./workshopProjectLifecycle";

export function WorkshopApp() {
  const { pricing, setPricingField } = usePricingStore();

  const [result, setResult] = useState<CutResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hiddenPreviewPanelIds, setHiddenPreviewPanelIds] = useState<string[]>(
    [],
  );

  // UI collapse state
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);
  const [isCutlistOpen, setIsCutlistOpen] = useState(true);
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(true);
  const [isPricingOpen, setIsPricingOpen] = useState(true);
  const [isSheetsOpen, setIsSheetsOpen] = useState(true);

  // ── Hooks (order preserved: sheets → panels → modules → preview → projects → assemblies)
  const sh = useWorkshopSheets({ setResult: () => setResult(null), setError });
  const pa = useWorkshopPanels({
    primarySheetId: sh.primarySheetId,
    selectedSheetIds: sh.selectedSheetIds,
    materialMode: sh.materialMode,
    setResult: () => setResult(null),
    modules: [],
  });
  const mo = useWorkshopModules({
    onOrphanPanels: (moduleId) =>
      pa.setEditablePanels((cur) =>
        cur.map((p) =>
          p.moduleId === moduleId ? { ...p, moduleId: ROOT_MODULE.id } : p,
        ),
      ),
  });
  const pv = useWorkshopPreview({
    setResult,
    allPanels: pa.allPanels,
    editablePanels: pa.editablePanels,
    artifacts: pa.artifacts,
    modules: mo.modules,
    pricing,
    assignableSheets: sh.assignableSheets,
    sheets: sh.sheets,
    materialMode: sh.materialMode,
    primarySheetId: sh.primarySheetId,
    hiddenPreviewPanelIds,
    setSheets: sh.setSheets,
    setError,
  });
  const pr = useWorkshopProjects({ setError });
  const as = useWorkshopAssemblies({
    setError,
    setResult: () => setResult(null),
  });

  // ── useEffect #1: init ──
  useEffect(() => {
    as.loadCustomTemplates();
    pr.loadProjects();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── useEffect #2: sheets validation (preserves original order) ──
  useEffect(() => {
    if (sh.sheets.length === 0) return;
    sh.setSelectedSheetIds((cur) => {
      const valid = cur.filter((id) =>
        sh.sheets.some((s: StockSheet) => s.odooId === id),
      );
      return valid.length > 0
        ? valid
        : sh.sheets.map((s: StockSheet) => s.odooId);
    });
    sh.setPrimarySheetId((cur) => {
      if (cur && sh.sheets.some((s: StockSheet) => s.odooId === cur))
        return cur;
      return sh.sheets[0]?.odooId ?? null;
    });
  }, [sh.sheets]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived ──
  const breakdown: CostBreakdownType | undefined = result?.totalCost;
  const totals = useMemo(
    () => ({
      pieces: pa.allPanels.reduce((sum, p) => sum + p.qty, 0),
      types: pa.allPanels.length,
      area: pa.allPanels.reduce(
        (sum, p) => sum + p.qty * ((p.L * p.W) / 10000),
        0,
      ),
    }),
    [pa.allPanels],
  );
  const activeProject = useMemo(
    () =>
      pr.savedProjects.find((project) => project.id === pr.activeProjectId) ??
      null,
    [pr.savedProjects, pr.activeProjectId],
  );

  // ── Orchestrators (cross-hook) ──
  async function saveProjectSnapshot(payload: {
    id: string;
    name: string;
    createdAt: number;
  }) {
    const project = buildProjectPayload({
      ...payload,
      result,
      pricing,
      editablePanels: pa.editablePanels,
      modules: mo.modules,
      hiddenPreviewPanelIds,
      selectedSheetIds: sh.selectedSheetIds,
      primarySheetId: sh.primarySheetId,
      materialMode: sh.materialMode,
      previewColorMode: pv.previewColorMode,
      globalDims: sh.globalDims,
      artifacts: pa.artifacts,
    });
    await saveProject(project);
    await pr.loadProjects();
    pr.setActiveProjectId(project.id);
  }

  async function loadProject(projectId: string) {
    await loadProjectIntoWorkshop({
      projectId,
      savedProjects: pr.savedProjects,
      sheets: sh.sheets,
      setSheets: sh.setSheets,
      setEditablePanels: pa.setEditablePanels,
      setModules: mo.setModules,
      setHiddenPreviewPanelIds,
      setSelectedSheetIds: sh.setSelectedSheetIds,
      setPrimarySheetId: sh.setPrimarySheetId,
      setMaterialMode: sh.setMaterialMode,
      setPreviewColorMode: pv.setPreviewColorMode,
      setGlobalDims: sh.setGlobalDims,
      setArtifacts: pa.setArtifacts,
      setActiveAssemblyId: as.setActiveAssemblyId,
      setResult,
      setWarnings: pv.setWarnings,
      setActiveProjectId: pr.setActiveProjectId,
    });
  }

  const startNewProject = () => {
    resetWorkshopForNewProject({
      setEditablePanels: pa.setEditablePanels,
      setArtifacts: pa.setArtifacts,
      setModules: mo.setModules,
      setHiddenPreviewPanelIds,
      setResult,
      setSelectedSheetIds: sh.setSelectedSheetIds,
      setPrimarySheetId: sh.setPrimarySheetId,
      setMaterialMode: sh.setMaterialMode,
      setPreviewColorMode: pv.setPreviewColorMode,
      setIsPreviewOpen,
      setIsCutlistOpen,
      setIsQuoteOpen,
      setActiveProjectId: pr.setActiveProjectId,
      setActiveAssemblyId: as.setActiveAssemblyId,
      setWarnings: pv.setWarnings,
      setShowModuleForm: mo.setShowModuleForm,
    });
  };

  const togglePreviewVisibility = (panelId: string) =>
    setHiddenPreviewPanelIds((cur) =>
      cur.includes(panelId)
        ? cur.filter((id) => id !== panelId)
        : [...cur, panelId],
    );

  const handleRemovePanel = (panelId: string) => {
    pa.removePanel(panelId);
    setHiddenPreviewPanelIds((cur) => cur.filter((id) => id !== panelId));
  };

  async function saveProjectNameInline(nextName: string) {
    await pr.persistProject({
      activeProjectId: pr.activeProjectId,
      savedProjects: pr.savedProjects,
      projectName: nextName,
      saveSnapshot: saveProjectSnapshot,
    });
  }

  const C = ({ open }: { open: boolean }) =>
    open ? (
      <ChevronDown className="collapse-icon" size={18} />
    ) : (
      <ChevronRight className="collapse-icon" size={18} />
    );

  return (
    <div className="app-shell">
      <WorkshopSidebar
        pr={pr}
        as={as}
        pa={pa}
        mo={mo}
        sh={sh}
        totals={totals}
        setHiddenPreviewPanelIds={setHiddenPreviewPanelIds}
        onLoadProject={loadProject}
        onStartNewProject={startNewProject}
      />

      <main className="main">
        <ProjectBreadcrumb
          activeProjectName={activeProject?.name ?? null}
          savingProject={pr.savingProject}
          onSaveName={saveProjectNameInline}
        />
        <div className="content-grid">
          <section className="card preview-card">
            <button
              type="button"
              className="collapse-toggle"
              onClick={() => setIsPreviewOpen((v) => !v)}
            >
              <span>Vista Isometrica</span>
              <C open={isPreviewOpen} />
            </button>
            {isPreviewOpen && (
              <>
                <div className="preview-toolbar">
                  <button
                    type="button"
                    className={`mode-chip ${pv.previewColorMode === "material" ? "active" : ""}`}
                    onClick={() => pv.setPreviewColorMode("material")}
                  >
                    Por melamina
                  </button>
                  <button
                    type="button"
                    className={`mode-chip ${pv.previewColorMode === "piece" ? "active" : ""}`}
                    onClick={() => pv.setPreviewColorMode("piece")}
                  >
                    Por pieza
                  </button>
                </div>
                <div className="preview-stage">
                  <IsoPreview panels={pv.coloredIsoPanels} />
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
              <C open={isActionsOpen} />
            </button>
            {isActionsOpen && (
              <div style={{ display: "grid", gap: "10px" }}>
                <button
                  className="template-btn"
                  type="button"
                  onClick={() => sh.loadSheets(false)}
                >
                  {sh.loadingSheets
                    ? "Consultando Odoo..."
                    : "Cargar tableros Odoo"}
                </button>
                <button
                  className="template-btn"
                  type="button"
                  onClick={() => sh.loadSheets(true)}
                  style={{ opacity: 0.7, fontSize: 12 }}
                >
                  ↺ Forzar actualización
                </button>
                <button
                  className="template-btn"
                  type="button"
                  onClick={pv.runOptimize}
                >
                  {pv.optimizing ? "Optimizando..." : "Optimizar corte"}
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
              <C open={isPricingOpen} />
            </button>
            {isPricingOpen && (
              <PricingSection
                pricing={pricing}
                setPricingField={setPricingField}
              />
            )}

            <button
              type="button"
              className="collapse-toggle"
              onClick={() => setIsSheetsOpen((v) => !v)}
              style={{ marginTop: 18 }}
            >
              <span>Tableros a usar</span>
              <C open={isSheetsOpen} />
            </button>
            {isSheetsOpen && (
              <>
                <StockSelector
                  sheets={sh.sheets}
                  selectedSheetIds={sh.selectedSheetIds}
                  materialMode={sh.materialMode}
                  primarySheetId={sh.primarySheetId}
                  globalDims={sh.globalDims}
                  onToggleSheet={sh.toggleSheetSelection}
                  onMaterialModeChange={sh.changeMaterialMode}
                  onPrimarySheetChange={sh.changePrimarySheet}
                  onGlobalDimsChange={sh.changeGlobalDims}
                />
                {pv.opsSummary && (
                  <p style={{ color: "#9ac7ff", marginTop: 8, fontSize: 12 }}>
                    Ops sugeridas: {pv.opsSummary}
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
            <C open={isCutlistOpen} />
          </button>
          {isCutlistOpen && (
            <div className="despiece-stack">
              {pv.warnings.length > 0 && (
                <div className="role-warnings">
                  {pv.warnings.map((w, i) => (
                    <p key={i} className="role-warning">
                      ⚠ {w}
                    </p>
                  ))}
                </div>
              )}
              <CutlistTable
                panels={pa.allPanels}
                derivedPanelIds={pa.derivedPanels.map((p) => p.id)}
                derivedPanelGroupLabels={pa.derivedPanelGroupLabels}
                modules={mo.modules}
                hiddenPreviewPanelIds={hiddenPreviewPanelIds}
                availableSheets={sh.assignableSheets}
                materialMode={sh.materialMode}
                onPanelChange={pa.updatePanel}
                onBandingToggle={pa.togglePanelBanding}
                onRemovePanel={handleRemovePanel}
                onTogglePreviewVisibility={togglePreviewVisibility}
                onAddPanel={pa.addPanel}
                onAddModule={mo.addModule}
              />
              <div className="sheet-layouts-block">
                <h3>Planchas y posiciones de corte</h3>
                <SheetLayouts panels={pa.allPanels} result={result} />
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
            <C open={isQuoteOpen} />
          </button>
          {isQuoteOpen && <CostBreakdown breakdown={breakdown} />}
        </section>
      </main>
    </div>
  );
}
