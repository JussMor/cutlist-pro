"use client";

import {
  MaterialMode,
  ModuleNode,
  Panel,
  PanelRole,
  StockSheet,
} from "@/lib/domain/types";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";

interface Props {
  panels: Panel[];
  modules: ModuleNode[];
  hiddenPreviewPanelIds: string[];
  availableSheets: StockSheet[];
  materialMode: MaterialMode;
  onPanelChange: (
    panelId: string,
    field: "label" | "L" | "W" | "qty" | "role" | "stockSheetId" | "moduleId",
    value: string | number,
  ) => void;
  onBandingToggle: (
    panelId: string,
    edge: "top" | "bottom" | "left" | "right",
  ) => void;
  onRemovePanel: (panelId: string) => void;
  onTogglePreviewVisibility: (panelId: string) => void;
  onAddPanel: () => void;
  onAddModule: () => void;
}

const roles: PanelRole[] = [
  "side",
  "top",
  "bottom",
  "back",
  "shelf",
  "door",
  "divider",
  "drawer-front",
  "drawer-side",
  "drawer-back",
  "drawer-bottom",
];

export function CutlistTable({
  panels,
  modules,
  hiddenPreviewPanelIds,
  availableSheets,
  materialMode,
  onPanelChange,
  onBandingToggle,
  onRemovePanel,
  onTogglePreviewVisibility,
  onAddPanel,
  onAddModule,
}: Props) {
  return (
    <div className="cutlist-editor">
      <div className="cutlist-toolbar">
        <button type="button" className="template-btn" onClick={onAddPanel}>
          <Plus size={14} />
          Agregar pieza
        </button>
        <button type="button" className="template-btn" onClick={onAddModule}>
          <Plus size={14} />
          Nuevo modulo
        </button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Pieza</th>
            <th>Largo</th>
            <th>Ancho</th>
            <th>Qty</th>
            <th>Rol</th>
            <th>Modulo</th>
            <th>Melamina</th>
            <th>Canto</th>
            <th>Preview</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {panels.map((panel) => {
            const isHiddenInPreview = hiddenPreviewPanelIds.includes(panel.id);

            return (
              <tr key={panel.id}>
                <td>
                  <input
                    className="table-input"
                    value={panel.label}
                    onChange={(event) =>
                      onPanelChange(panel.id, "label", event.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    className="table-input"
                    type="number"
                    min="1"
                    step="0.1"
                    value={panel.L}
                    onChange={(event) =>
                      onPanelChange(panel.id, "L", Number(event.target.value))
                    }
                  />
                </td>
                <td>
                  <input
                    className="table-input"
                    type="number"
                    min="1"
                    step="0.1"
                    value={panel.W}
                    onChange={(event) =>
                      onPanelChange(panel.id, "W", Number(event.target.value))
                    }
                  />
                </td>
                <td>
                  <input
                    className="table-input"
                    type="number"
                    min="1"
                    step="1"
                    value={panel.qty}
                    onChange={(event) =>
                      onPanelChange(panel.id, "qty", Number(event.target.value))
                    }
                  />
                </td>
                <td>
                  <select
                    className="table-input"
                    value={panel.role}
                    onChange={(event) =>
                      onPanelChange(panel.id, "role", event.target.value)
                    }
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    className="table-input"
                    value={panel.moduleId ?? "main"}
                    onChange={(event) =>
                      onPanelChange(panel.id, "moduleId", event.target.value)
                    }
                  >
                    {modules.map((module) => (
                      <option key={module.id} value={module.id}>
                        {module.parentId ? `- ${module.name}` : module.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    className="table-input"
                    value={panel.stockSheetId ?? ""}
                    disabled={
                      materialMode === "single" || availableSheets.length === 0
                    }
                    onChange={(event) =>
                      onPanelChange(
                        panel.id,
                        "stockSheetId",
                        Number(event.target.value),
                      )
                    }
                  >
                    {materialMode === "mixed" &&
                      availableSheets.length === 0 && (
                        <option value="">Sin tableros</option>
                      )}
                    {materialMode === "mixed" && availableSheets.length > 0 && (
                      <option value="">Sin asignar</option>
                    )}
                    {availableSheets.map((sheet) => (
                      <option key={sheet.odooId} value={sheet.odooId}>
                        {sheet.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <div className="banding-grid">
                    <button
                      type="button"
                      className={`banding-toggle ${panel.banding.top ? "active" : ""}`}
                      onClick={() => onBandingToggle(panel.id, "top")}
                    >
                      Arr
                    </button>
                    <button
                      type="button"
                      className={`banding-toggle ${panel.banding.bottom ? "active" : ""}`}
                      onClick={() => onBandingToggle(panel.id, "bottom")}
                    >
                      Aba
                    </button>
                    <button
                      type="button"
                      className={`banding-toggle ${panel.banding.left ? "active" : ""}`}
                      onClick={() => onBandingToggle(panel.id, "left")}
                    >
                      Izq
                    </button>
                    <button
                      type="button"
                      className={`banding-toggle ${panel.banding.right ? "active" : ""}`}
                      onClick={() => onBandingToggle(panel.id, "right")}
                    >
                      Der
                    </button>
                  </div>
                </td>
                <td>
                  <button
                    type="button"
                    className={`table-row-action preview-hide-toggle ${isHiddenInPreview ? "is-hidden" : ""}`}
                    onClick={() => onTogglePreviewVisibility(panel.id)}
                  >
                    {isHiddenInPreview ? (
                      <Eye size={14} />
                    ) : (
                      <EyeOff size={14} />
                    )}
                    {isHiddenInPreview ? "Mostrar" : "Ocultar"}
                  </button>
                </td>
                <td>
                  <button
                    type="button"
                    className="table-row-action"
                    onClick={() => onRemovePanel(panel.id)}
                  >
                    <Trash2 size={14} />
                    Eliminar
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
