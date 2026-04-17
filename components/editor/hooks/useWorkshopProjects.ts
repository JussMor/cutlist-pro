import { deleteProject, fetchProjects, saveProject } from "@/lib/api/client";
import {
  ArtifactInstance,
  CutResult,
  MaterialMode,
  ModuleNode,
  Panel,
  PricingConfig,
  Project,
} from "@/lib/domain/types";
import { useState } from "react";
import { MANUAL_DEFAULT_PARAMS } from "../workshopPanelHelpers";

type PreviewColorMode = "material" | "piece";

export interface UseWorkshopProjectsOptions {
  setError: (msg: string | null) => void;
}

export interface UseWorkshopProjectsReturn {
  savedProjects: Project[];
  activeProjectId: string;
  savingProject: boolean;
  showProjectForm: boolean;
  projectName: string;
  loadingProjects: boolean;
  setProjectName: (v: string) => void;
  setShowProjectForm: (v: boolean) => void;
  setActiveProjectId: (v: string) => void;
  setSavedProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  loadProjects: () => Promise<void>;
  startSaveProject: (activeId: string, currentName: string) => void;
  persistProject: (args: {
    activeProjectId: string;
    savedProjects: Project[];
    projectName: string;
    saveSnapshot: (payload: { id: string; name: string; createdAt: number }) => Promise<void>;
  }) => Promise<void>;
  saveActiveProjectChanges: (args: {
    activeProjectId: string;
    savedProjects: Project[];
    saveSnapshot: (payload: { id: string; name: string; createdAt: number }) => Promise<void>;
  }) => Promise<void>;
  removeProject: (projectId: string, activeProjectId: string) => Promise<void>;
}

import React from "react";

export function useWorkshopProjects({
  setError,
}: UseWorkshopProjectsOptions): UseWorkshopProjectsReturn {
  const [savedProjects, setSavedProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [savingProject, setSavingProject] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [loadingProjects, setLoadingProjects] = useState(false);

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

  function startSaveProject(activeId: string, currentName: string) {
    const current = savedProjects.find((p) => p.id === activeId);
    setProjectName(current?.name ?? (currentName || "Proyecto manual"));
    setShowProjectForm(true);
    setError(null);
  }

  async function persistProject({
    activeProjectId: activeId,
    savedProjects: projects,
    projectName: name,
    saveSnapshot,
  }: {
    activeProjectId: string;
    savedProjects: Project[];
    projectName: string;
    saveSnapshot: (payload: { id: string; name: string; createdAt: number }) => Promise<void>;
  }) {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const current = projects.find((p) => p.id === activeId);
    try {
      setSavingProject(true);
      setError(null);
      await saveSnapshot({
        id: current?.id ?? crypto.randomUUID(),
        name: trimmedName,
        createdAt: current?.createdAt ?? Date.now(),
      });
      setShowProjectForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error guardando proyecto");
    } finally {
      setSavingProject(false);
    }
  }

  async function saveActiveProjectChanges({
    activeProjectId: activeId,
    savedProjects: projects,
    saveSnapshot,
  }: {
    activeProjectId: string;
    savedProjects: Project[];
    saveSnapshot: (payload: { id: string; name: string; createdAt: number }) => Promise<void>;
  }) {
    const current = projects.find((p) => p.id === activeId);
    if (!current) {
      setError("Carga un proyecto guardado para actualizarlo.");
      return;
    }
    try {
      setSavingProject(true);
      setError(null);
      await saveSnapshot({
        id: current.id,
        name: current.name,
        createdAt: current.createdAt,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error guardando cambios del proyecto");
    } finally {
      setSavingProject(false);
    }
  }

  async function removeProject(projectId: string, activeId: string) {
    if (!window.confirm("\u00bfSeguro que deseas eliminar este proyecto?")) return;
    try {
      setError(null);
      await deleteProject(projectId);
      await loadProjects();
      if (activeId === projectId) {
        setActiveProjectId("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error eliminando proyecto");
    }
  }

  return {
    savedProjects,
    activeProjectId,
    savingProject,
    showProjectForm,
    projectName,
    loadingProjects,
    setProjectName,
    setShowProjectForm,
    setActiveProjectId,
    setSavedProjects,
    loadProjects,
    startSaveProject,
    persistProject,
    saveActiveProjectChanges,
    removeProject,
  };
}

// Helper used by root to build saveProjectSnapshot payload
export function buildProjectPayload({
  id,
  name,
  createdAt,
  result,
  pricing,
  editablePanels,
  modules,
  hiddenPreviewPanelIds,
  selectedSheetIds,
  primarySheetId,
  materialMode,
  previewColorMode,
  globalDims,
  artifacts,
}: {
  id: string;
  name: string;
  createdAt: number;
  result: CutResult | null;
  pricing: PricingConfig;
  editablePanels: Panel[];
  modules: ModuleNode[];
  hiddenPreviewPanelIds: string[];
  selectedSheetIds: number[];
  primarySheetId: number | null;
  materialMode: MaterialMode;
  previewColorMode: PreviewColorMode;
  globalDims: { L: number; W: number };
  artifacts: ArtifactInstance[];
}): Project {
  const now = Date.now();
  return {
    id,
    name,
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
      artifacts,
    },
    createdAt,
    updatedAt: now,
  };
}

export async function saveProjectToApi(
  project: Project,
  loadProjects: () => Promise<void>,
  setActiveProjectId: (id: string) => void,
) {
  await saveProject(project);
  await loadProjects();
  setActiveProjectId(project.id);
}

