import { ModuleNode } from "@/lib/domain/types";
import { Plus } from "lucide-react";
import { ROOT_MODULE } from "../workshopPanelHelpers";

interface ModulesSectionProps {
  modules: ModuleNode[];
  showModuleForm: boolean;
  newModuleName: string;
  newModuleParentId: string;
  onAddModule: () => void;
  onRemoveModule: (moduleId: string) => void;
  onConfirmAddModule: () => void;
  onSetNewModuleName: (v: string) => void;
  onSetNewModuleParentId: (v: string) => void;
  onSetShowModuleForm: (v: boolean) => void;
}

export function ModulesSection({
  modules,
  showModuleForm,
  newModuleName,
  newModuleParentId,
  onAddModule,
  onRemoveModule,
  onConfirmAddModule,
  onSetNewModuleName,
  onSetNewModuleParentId,
  onSetShowModuleForm,
}: ModulesSectionProps) {
  return (
    <>
      <div
        className="panel-title"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>M\u00f3dulos</span>
        <button
          type="button"
          className="sidebar-add-btn"
          onClick={onAddModule}
          title="Nuevo m\u00f3dulo"
        >
          <Plus size={13} />+ M\u00f3dulo
        </button>
      </div>
      <div className="module-list">
        {modules.map((m) => (
          <div
            key={m.id}
            className={`module-list-item ${
              m.id === ROOT_MODULE.id ? "module-list-root" : ""
            }`}
          >
            <span className="module-list-name">
              {m.id === ROOT_MODULE.id ? "Principal" : m.name}
            </span>
            {m.id !== ROOT_MODULE.id && (
              <button
                type="button"
                className="module-chip-remove"
                title="Eliminar m\u00f3dulo"
                onClick={() => onRemoveModule(m.id)}
              >
                \u00d7
              </button>
            )}
          </div>
        ))}
      </div>

      {showModuleForm && (
        <div className="module-form module-form-sidebar">
          <input
            className="table-input"
            placeholder="Nombre del m\u00f3dulo"
            value={newModuleName}
            onChange={(e) => onSetNewModuleName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onConfirmAddModule();
              if (e.key === "Escape") onSetShowModuleForm(false);
            }}
            autoFocus
          />
          {modules.length > 1 && (
            <select
              className="table-input"
              value={newModuleParentId}
              onChange={(e) => onSetNewModuleParentId(e.target.value)}
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
              onClick={onConfirmAddModule}
              disabled={!newModuleName.trim()}
            >
              Crear
            </button>
            <button
              type="button"
              className="template-btn"
              onClick={() => onSetShowModuleForm(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

