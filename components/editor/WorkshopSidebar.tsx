"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useWorkshopAssemblies } from "./hooks/useWorkshopAssemblies";
import { useWorkshopModules } from "./hooks/useWorkshopModules";
import { useWorkshopPanels } from "./hooks/useWorkshopPanels";
import { usePersistentState } from "./hooks/usePersistentState";
import { useWorkshopProjects } from "./hooks/useWorkshopProjects";
import { useWorkshopSheets } from "./hooks/useWorkshopSheets";
import { ArtifactsSection } from "./sections/ArtifactsSection";
import { AssembliesSection } from "./sections/AssembliesSection";
import { ModulesSection } from "./sections/ModulesSection";
import { ProjectsSection } from "./sections/ProjectsSection";
import { deriveModulesFromPanels } from "./workshopPanelHelpers";

interface WorkshopSidebarProps {
  pr: ReturnType<typeof useWorkshopProjects>;
  as: ReturnType<typeof useWorkshopAssemblies>;
  pa: ReturnType<typeof useWorkshopPanels>;
  mo: ReturnType<typeof useWorkshopModules>;
  sh: ReturnType<typeof useWorkshopSheets>;
  totals: { pieces: number; types: number; area: number };
  setHiddenPreviewPanelIds: React.Dispatch<React.SetStateAction<string[]>>;
  onLoadProject: (projectId: string) => void;
  onStartNewProject: () => void;
}

export function WorkshopSidebar({
  pr,
  as,
  pa,
  mo,
  sh,
  totals,
  setHiddenPreviewPanelIds,
  onLoadProject,
  onStartNewProject,
}: WorkshopSidebarProps) {
  const [collapsed, setCollapsed] = usePersistentState(
    "workshop:sidebar-collapse-v1",
    {
      projects: false,
      assemblies: false,
      modules: false,
      artifacts: false,
      summary: false,
    },
  );

  const toggleCollapsed = (section: keyof typeof collapsed) => {
    setCollapsed((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        Panelex<strong>Pro</strong>
      </div>

      <ProjectsSection
        savedProjects={pr.savedProjects}
        activeProjectId={pr.activeProjectId}
        loadingProjects={pr.loadingProjects}
        collapsed={collapsed.projects}
        onToggleCollapse={() => toggleCollapsed("projects")}
        onLoadProject={onLoadProject}
        onRemoveProject={(id) => pr.removeProject(id, pr.activeProjectId)}
        onNewProject={onStartNewProject}
      />

      <AssembliesSection
        customTemplates={as.customTemplates}
        activeAssemblyId={as.activeAssemblyId}
        savingAssembly={as.savingAssembly}
        showAssemblyForm={as.showAssemblyForm}
        collapsed={collapsed.assemblies}
        onToggleCollapse={() => toggleCollapsed("assemblies")}
        editablePanelsCount={pa.editablePanels.length}
        onToggleAssemblyForm={() => {
          if (as.showAssemblyForm) {
            as.setShowAssemblyForm(false);
            return;
          }
          as.setActiveAssemblyId("");
          as.setShowAssemblyForm(true);
        }}
        onUpdateActiveAssembly={() =>
          as.updateActiveAssembly(pa.editablePanels)
        }
        onLoadAssembly={(key) =>
          as.loadAssembly({
            key,
            onLoaded: (normalized) => {
              pa.setEditablePanels(normalized);
              pa.setArtifacts([]);
              mo.setModules(deriveModulesFromPanels(normalized));
              setHiddenPreviewPanelIds([]);
              as.setShowAssemblyForm(false);
            },
          })
        }
        onRemoveAssembly={as.removeAssembly}
      />

      <ModulesSection
        modules={mo.modules}
        showModuleForm={mo.showModuleForm}
        newModuleName={mo.newModuleName}
        newModuleParentId={mo.newModuleParentId}
        collapsed={collapsed.modules}
        onToggleCollapse={() => toggleCollapsed("modules")}
        onAddModule={mo.addModule}
        onRemoveModule={mo.removeModule}
        onConfirmAddModule={mo.confirmAddModule}
        onSetNewModuleName={mo.setNewModuleName}
        onSetNewModuleParentId={mo.setNewModuleParentId}
        onSetShowModuleForm={mo.setShowModuleForm}
      />

      <ArtifactsSection
        artifacts={pa.artifacts}
        modules={mo.modules}
        sheets={sh.sheets}
        collapsed={collapsed.artifacts}
        onToggleCollapse={() => toggleCollapsed("artifacts")}
        onAddDrawerArtifact={pa.addDrawerArtifact}
        onUpdateArtifactName={pa.updateArtifactName}
        onRemoveArtifact={pa.removeArtifact}
        onUpdateArtifactModule={pa.updateArtifactModule}
        onUpdateArtifactMaterial={pa.updateArtifactMaterial}
        onUpdateArtifactNumericParam={pa.updateArtifactNumericParam}
        onUpdateArtifactEnabled={pa.updateArtifactEnabled}
      />

      <div className="panel-title flex items-center justify-between">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-left"
          onClick={() => toggleCollapsed("summary")}
        >
          {collapsed.summary ? (
            <ChevronRight size={16} />
          ) : (
            <ChevronDown size={16} />
          )}
          <span>Resumen</span>
        </button>
      </div>
      {!collapsed.summary && (
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
      )}
    </aside>
  );
}
