import { ModuleNode } from "@/lib/domain/types";
import { useState } from "react";
import { normalizeName, ROOT_MODULE } from "../workshopPanelHelpers";

export interface UseWorkshopModulesReturn {
  modules: ModuleNode[];
  showModuleForm: boolean;
  newModuleName: string;
  newModuleParentId: string;
  setNewModuleName: (v: string) => void;
  setNewModuleParentId: (v: string) => void;
  setShowModuleForm: (v: boolean) => void;
  addModule: () => void;
  confirmAddModule: () => void;
  removeModule: (moduleId: string) => void;
  setModules: React.Dispatch<React.SetStateAction<ModuleNode[]>>;
  setEditablePanelsModuleReset: (
    fn: (moduleId: string) => void,
  ) => void;
}

import React from "react";

export interface UseWorkshopModulesOptions {
  onOrphanPanels: (moduleId: string) => void;
}

export function useWorkshopModules({
  onOrphanPanels,
}: UseWorkshopModulesOptions): UseWorkshopModulesReturn {
  const [modules, setModules] = useState<ModuleNode[]>([ROOT_MODULE]);
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [newModuleName, setNewModuleName] = useState("");
  const [newModuleParentId, setNewModuleParentId] = useState(ROOT_MODULE.id);

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
    // Reassign orphaned panels to root — caller provides the side-effect
    onOrphanPanels(moduleId);
  }

  return {
    modules,
    showModuleForm,
    newModuleName,
    newModuleParentId,
    setNewModuleName,
    setNewModuleParentId,
    setShowModuleForm,
    addModule,
    confirmAddModule,
    removeModule,
    setModules,
    setEditablePanelsModuleReset: () => {},
  };
}

