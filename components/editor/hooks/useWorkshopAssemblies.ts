import {
  deleteAssembly,
  fetchAssemblies,
  saveAssembly,
} from "@/lib/api/client";
import { Assembly, Panel } from "@/lib/domain/types";
import React, { useState } from "react";
import { normalizePanelsModule } from "../workshopPanelHelpers";

export interface UseWorkshopAssembliesReturn {
  customTemplates: Assembly[];
  activeAssemblyId: string;
  savingAssembly: boolean;
  showAssemblyForm: boolean;
  setShowAssemblyForm: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveAssemblyId: React.Dispatch<React.SetStateAction<string>>;
  loadCustomTemplates: () => Promise<void>;
  persistAssembly: (args: {
    editablePanels: Panel[];
    customTemplates: Assembly[];
    activeAssemblyId: string;
    assemblyName: string;
  }) => Promise<void>;
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

  function buildAutoAssemblyName(date = new Date()) {
    const datePart = new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
    const timePart = new Intl.DateTimeFormat("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
    return `Plantilla ${datePart} ${timePart}`;
  }

  async function loadCustomTemplates() {
    try {
      const data = await fetchAssemblies();
      setCustomTemplates(data);
    } catch (err) {
      console.error("Failed to fetch custom templates:", err);
    }
  }

  async function persistAssembly({
    editablePanels,
    customTemplates: templates,
    activeAssemblyId: activeId,
    assemblyName,
  }: {
    editablePanels: Panel[];
    customTemplates: Assembly[];
    activeAssemblyId: string;
    assemblyName: string;
  }) {
    if (editablePanels.length === 0) return;

    const current = templates.find((t) => t.id === activeId);
    const name =
      assemblyName.trim() || current?.name || buildAutoAssemblyName();

    setSavingAssembly(true);
    try {
      const now = Date.now();
      const payload: Assembly = {
        id: current?.id ?? `asm_${now}`,
        name,
        description: current?.description,
        panels: editablePanels,
        isCustom: true,
        category: current?.category ?? "almacenaje",
        createdAt: current?.createdAt ?? now,
        updatedAt: now,
      };
      await saveAssembly(payload);
      await loadCustomTemplates();
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
    setShowAssemblyForm,
    setActiveAssemblyId,
    loadCustomTemplates,
    persistAssembly,
    updateActiveAssembly,
    removeAssembly,
    loadAssembly,
  };
}
