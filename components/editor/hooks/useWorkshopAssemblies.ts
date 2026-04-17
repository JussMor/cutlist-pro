import {
  deleteAssembly,
  fetchAssemblies,
  saveAssembly,
} from "@/lib/api/client";
import {
  Assembly,
  Panel,
  TemplateCategory,
} from "@/lib/domain/types";
import { useState } from "react";
import React from "react";
import { normalizePanelsModule } from "../workshopPanelHelpers";

export interface UseWorkshopAssembliesReturn {
  customTemplates: Assembly[];
  activeAssemblyId: string;
  savingAssembly: boolean;
  showAssemblyForm: boolean;
  assemblyName: string;
  assemblyDescription: string;
  assemblyCategory: TemplateCategory;
  setShowAssemblyForm: React.Dispatch<React.SetStateAction<boolean>>;
  setAssemblyName: React.Dispatch<React.SetStateAction<string>>;
  setAssemblyDescription: React.Dispatch<React.SetStateAction<string>>;
  setAssemblyCategory: React.Dispatch<React.SetStateAction<TemplateCategory>>;
  setActiveAssemblyId: React.Dispatch<React.SetStateAction<string>>;
  loadCustomTemplates: () => Promise<void>;
  saveCurrentAsAssembly: (editablePanels: Panel[]) => Promise<void>;
  updateActiveAssembly: (editablePanels: Panel[]) => Promise<void>;
  removeAssembly: (assemblyId: string) => Promise<void>;
  loadAssembly: (args: {
    key: string;
    onLoaded: (panels: Panel[]) => void;
  }) => void;
}

export interface UseWorkshopAssembliesOptions {
  setError: (msg: string | null) => void;
  setResult: (val: null) => void;
}

export function useWorkshopAssemblies({
  setError,
  setResult,
}: UseWorkshopAssembliesOptions): UseWorkshopAssembliesReturn {
  const [customTemplates, setCustomTemplates] = useState<Assembly[]>([]);
  const [activeAssemblyId, setActiveAssemblyId] = useState("");
  const [savingAssembly, setSavingAssembly] = useState(false);
  const [showAssemblyForm, setShowAssemblyForm] = useState(false);
  const [assemblyName, setAssemblyName] = useState("");
  const [assemblyDescription, setAssemblyDescription] = useState("");
  const [assemblyCategory, setAssemblyCategory] =
    useState<TemplateCategory>("almacenaje");

  async function loadCustomTemplates() {
    try {
      const data = await fetchAssemblies();
      setCustomTemplates(data);
    } catch (err) {
      console.error("Failed to fetch custom templates:", err);
    }
  }

  async function saveCurrentAsAssembly(editablePanels: Panel[]) {
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

  async function updateActiveAssembly(editablePanels: Panel[]) {
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
    if (!window.confirm("\u00bfSeguro que deseas eliminar este ensamble?")) return;
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

  function loadAssembly({
    key,
    onLoaded,
  }: {
    key: string;
    onLoaded: (panels: Panel[]) => void;
  }) {
    const customTemplate = customTemplates.find((a) => a.id === key);
    if (customTemplate) {
      const normalized = normalizePanelsModule(customTemplate.panels);
      onLoaded(normalized);
      setActiveAssemblyId(customTemplate.id);
      setResult(null);
    }
  }

  return {
    customTemplates,
    activeAssemblyId,
    savingAssembly,
    showAssemblyForm,
    assemblyName,
    assemblyDescription,
    assemblyCategory,
    setShowAssemblyForm,
    setAssemblyName,
    setAssemblyDescription,
    setAssemblyCategory,
    setActiveAssemblyId,
    loadCustomTemplates,
    saveCurrentAsAssembly,
    updateActiveAssembly,
    removeAssembly,
    loadAssembly,
  };
}

