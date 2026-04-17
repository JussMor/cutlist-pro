import { Assembly, TemplateCategory } from "@/lib/domain/types";
import React from "react";

interface AssembliesSectionProps {
  customTemplates: Assembly[];
  activeAssemblyId: string;
  savingAssembly: boolean;
  showAssemblyForm: boolean;
  assemblyName: string;
  assemblyDescription: string;
  assemblyCategory: TemplateCategory;
  editablePanelsCount: number;
  onToggleAssemblyForm: () => void;
  onUpdateActiveAssembly: () => void;
  onSetAssemblyName: (v: string) => void;
  onSetAssemblyDescription: (v: string) => void;
  onSetAssemblyCategory: (v: TemplateCategory) => void;
  onSaveCurrentAsAssembly: () => void;
  onLoadAssembly: (assemblyId: string) => void;
  onRemoveAssembly: (assemblyId: string) => void;
}

export function AssembliesSection({
  customTemplates,
  activeAssemblyId,
  savingAssembly,
  showAssemblyForm,
  assemblyName,
  assemblyDescription,
  assemblyCategory,
  editablePanelsCount,
  onToggleAssemblyForm,
  onUpdateActiveAssembly,
  onSetAssemblyName,
  onSetAssemblyDescription,
  onSetAssemblyCategory,
  onSaveCurrentAsAssembly,
  onLoadAssembly,
  onRemoveAssembly,
}: AssembliesSectionProps) {
  return (
    <>
      <div className="panel-title">Emsambles Guardados</div>
      <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
        <button
          className="template-btn"
          type="button"
          onClick={onToggleAssemblyForm}
          disabled={editablePanelsCount === 0 || savingAssembly}
        >
          {showAssemblyForm ? "Cancelar" : "Guardar como plantilla"}
        </button>
        <button
          className="template-btn"
          type="button"
          onClick={onUpdateActiveAssembly}
          disabled={
            !activeAssemblyId || editablePanelsCount === 0 || savingAssembly
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
            onChange={(e) => onSetAssemblyName(e.target.value)}
          />
          <input
            className="table-input"
            placeholder="Descripcion (opcional)"
            value={assemblyDescription}
            onChange={(e) => onSetAssemblyDescription(e.target.value)}
          />
          <select
            className="table-input"
            value={assemblyCategory}
            onChange={(e) =>
              onSetAssemblyCategory(e.target.value as TemplateCategory)
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
            onClick={onSaveCurrentAsAssembly}
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
              className={`template-btn saved-assembly-card ${
                activeAssemblyId === assembly.id ? "active" : ""
              }`}
            >
              <div className="saved-assembly-title">{assembly.name}</div>
              <small className="muted saved-assembly-meta">
                {assembly.panels.length} piezas
              </small>
              <div className="saved-assembly-actions">
                <button
                  type="button"
                  className="table-row-action preview-hide-toggle"
                  onClick={() => onLoadAssembly(assembly.id)}
                >
                  Cargar
                </button>
                <button
                  type="button"
                  className="table-row-action"
                  onClick={() => onRemoveAssembly(assembly.id)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

