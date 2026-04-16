"use client";

import {
  deleteAssembly,
  fetchAssemblies,
  saveAssembly,
} from "@/lib/api/client";
import { Assembly, Panel, TemplateCategory } from "@/lib/domain/types";
import { useEffect, useState } from "react";

interface AssemblyManagerProps {
  currentPanels: Panel[];
  activeAssemblyId?: string;
  onLoadTemplate: (assembly: Assembly) => void;
  onTemplatesChanged?: () => void;
}

export default function AssemblyManager({
  currentPanels,
  activeAssemblyId,
  onLoadTemplate,
  onTemplatesChanged,
}: AssemblyManagerProps) {
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [assemblyName, setAssemblyName] = useState("");
  const [assemblyDescription, setAssemblyDescription] = useState("");
  const [category, setCategory] = useState<TemplateCategory>("almacenaje");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAssemblies();
  }, []);

  const loadAssemblies = async () => {
    try {
      const data = await fetchAssemblies();
      setAssemblies(data);
    } catch (error) {
      console.error("Failed to fetch assemblies:", error);
    }
  };

  const handleSaveAssembly = async () => {
    if (!assemblyName.trim()) return;

    setLoading(true);
    try {
      const newAssembly: Assembly = {
        id: `asm_${Date.now()}`,
        name: assemblyName,
        description: assemblyDescription,
        panels: currentPanels,
        isCustom: true,
        category,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await saveAssembly(newAssembly);
      setAssemblies([newAssembly, ...assemblies]);
      setAssemblyName("");
      setAssemblyDescription("");
      setShowSaveForm(false);
      onTemplatesChanged?.();
    } catch (error) {
      alert(`Error saving assembly: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCurrentAssembly = async () => {
    if (!activeAssemblyId) return;

    const target = assemblies.find(
      (assembly) => assembly.id === activeAssemblyId,
    );
    if (!target) {
      alert("No se encontro el ensamble activo para actualizar.");
      return;
    }

    setLoading(true);
    try {
      const updatedAssembly: Assembly = {
        ...target,
        panels: currentPanels,
        updatedAt: Date.now(),
      };

      await saveAssembly(updatedAssembly);
      setAssemblies((current) =>
        current.map((assembly) =>
          assembly.id === updatedAssembly.id ? updatedAssembly : assembly,
        ),
      );
      onTemplatesChanged?.();
      alert("Ensamble actualizado");
    } catch (error) {
      alert(`Error updating assembly: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadAssembly = (assembly: Assembly) => {
    onLoadTemplate(assembly);
  };

  const handleDeleteAssembly = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta plantilla?")) return;

    try {
      await deleteAssembly(id);
      setAssemblies(assemblies.filter((a) => a.id !== id));
      onTemplatesChanged?.();
    } catch (error) {
      alert(`Error deleting assembly: ${error}`);
    }
  };

  return (
    <div className="assembly-manager">
      <div className="assembly-header">
        <h3>Plantillas Personalizadas</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn btn-primary"
            onClick={() => setShowSaveForm(!showSaveForm)}
            disabled={currentPanels.length === 0 || loading}
          >
            {showSaveForm ? "Cancelar" : "Guardar como Plantilla"}
          </button>
          <button
            className="btn btn-success"
            onClick={handleUpdateCurrentAssembly}
            disabled={
              !activeAssemblyId || currentPanels.length === 0 || loading
            }
            title={
              activeAssemblyId
                ? "Sobrescribe el ensamble cargado"
                : "Carga un ensamble para poder actualizarlo"
            }
          >
            {loading ? "Guardando..." : "Actualizar actual"}
          </button>
        </div>
      </div>

      {showSaveForm && (
        <div className="assembly-form">
          <input
            type="text"
            placeholder="Nombre de la plantilla"
            value={assemblyName}
            onChange={(e) => setAssemblyName(e.target.value)}
            className="input"
          />
          <textarea
            placeholder="Descripción (opcional)"
            value={assemblyDescription}
            onChange={(e) => setAssemblyDescription(e.target.value)}
            className="input"
            rows={2}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as TemplateCategory)}
            className="input"
          >
            <option value="cocina">Cocina</option>
            <option value="dormitorio">Dormitorio</option>
            <option value="almacenaje">Almacenaje</option>
            <option value="oficina">Oficina</option>
          </select>
          <button
            className="btn btn-success"
            onClick={handleSaveAssembly}
            disabled={loading || !assemblyName.trim()}
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      )}

      <div className="assembly-list">
        {assemblies.length === 0 ? (
          <p className="empty-state">No hay plantillas guardadas aun</p>
        ) : (
          assemblies.map((assembly) => (
            <div key={assembly.id} className="assembly-item">
              <div className="assembly-info">
                <h4>{assembly.name}</h4>
                {assembly.description && <p>{assembly.description}</p>}
                <small>
                  {assembly.panels.length} piezas • {assembly.category}
                </small>
              </div>
              <div className="assembly-actions">
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleLoadAssembly(assembly)}
                >
                  Cargar
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDeleteAssembly(assembly.id)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
