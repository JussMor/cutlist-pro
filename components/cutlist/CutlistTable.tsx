"use client";

import {
  MaterialMode,
  ModuleNode,
  Panel,
  PanelRole,
  StockSheet,
} from "@/lib/domain/types";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { Fragment, useState } from "react";

interface Props {
  panels: Panel[];
  derivedPanelIds?: string[];
  derivedPanelGroupLabels?: Record<string, string>;
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

const roleLabels: Record<PanelRole, string> = {
  side: "Lateral",
  top: "Tapa",
  bottom: "Base",
  back: "Fondo",
  shelf: "Entrepanio",
  door: "Puerta",
  divider: "Divisor",
  "drawer-front": "Frente de cajon",
  "drawer-side": "Lateral de cajon",
  "drawer-back": "Trasera de cajon",
  "drawer-bottom": "Fondo de cajon",
};

export function CutlistTable({
  panels,
  derivedPanelIds = [],
  derivedPanelGroupLabels = {},
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
  const derivedSet = new Set(derivedPanelIds);
  const manualPanels = panels.filter((panel) => !derivedSet.has(panel.id));
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});

  const groupedDerivedPanels = panels.reduce<
    Array<{ groupLabel: string; panels: Panel[] }>
  >((acc, panel) => {
    if (!derivedSet.has(panel.id)) return acc;
    const groupLabel = derivedPanelGroupLabels[panel.id] || "Artefacto";
    const existing = acc.find((group) => group.groupLabel === groupLabel);
    if (existing) {
      existing.panels.push(panel);
      return acc;
    }
    acc.push({ groupLabel, panels: [panel] });
    return acc;
  }, []);

  function renderPanelRow(panel: Panel) {
    const isHiddenInPreview = hiddenPreviewPanelIds.includes(panel.id);
    const isDerived = derivedSet.has(panel.id);

    return (
      <tr key={panel.id}>
        <td>
          <div style={{ display: "grid", gap: 4 }}>
            <input
              className="table-input"
              value={panel.label}
              disabled={isDerived}
              onChange={(event) =>
                onPanelChange(panel.id, "label", event.target.value)
              }
            />
            <span className="muted" style={{ fontSize: 11 }}>
              {isDerived ? "Derivado (artefacto)" : "Manual"}
            </span>
          </div>
        </td>
        <td>
          <input
            className="table-input"
            type="number"
            min="1"
            step="0.1"
            value={panel.L}
            disabled={isDerived}
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
            disabled={isDerived}
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
            disabled={isDerived}
            onChange={(event) =>
              onPanelChange(panel.id, "qty", Number(event.target.value))
            }
          />
        </td>
        <td>
          <select
            className="table-input"
            value={panel.role}
            disabled={isDerived}
            onChange={(event) =>
              onPanelChange(panel.id, "role", event.target.value)
            }
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {roleLabels[role]}
              </option>
            ))}
          </select>
        </td>
        <td>
          <select
            className="table-input"
            value={panel.moduleId ?? "main"}
            disabled={isDerived}
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
              isDerived ||
              materialMode === "single" ||
              availableSheets.length === 0
            }
            onChange={(event) =>
              onPanelChange(
                panel.id,
                "stockSheetId",
                Number(event.target.value),
              )
            }
          >
            {materialMode === "mixed" && availableSheets.length === 0 && (
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
              disabled={isDerived}
              onClick={() => onBandingToggle(panel.id, "top")}
            >
              Arr
            </button>
            <button
              type="button"
              className={`banding-toggle ${panel.banding.bottom ? "active" : ""}`}
              disabled={isDerived}
              onClick={() => onBandingToggle(panel.id, "bottom")}
            >
              Aba
            </button>
            <button
              type="button"
              className={`banding-toggle ${panel.banding.left ? "active" : ""}`}
              disabled={isDerived}
              onClick={() => onBandingToggle(panel.id, "left")}
            >
              Izq
            </button>
            <button
              type="button"
              className={`banding-toggle ${panel.banding.right ? "active" : ""}`}
              disabled={isDerived}
              onClick={() => onBandingToggle(panel.id, "right")}
            >
              Der
            </button>
          </div>
        </td>
        <td>
          <button
            type="button"
            className="table-row-action"
            onClick={() => onTogglePreviewVisibility(panel.id)}
            aria-label={
              isHiddenInPreview
                ? "Mostrar en vista previa"
                : "Ocultar en vista previa"
            }
            title={
              isHiddenInPreview
                ? "Mostrar en vista previa"
                : "Ocultar en vista previa"
            }
            style={
              isHiddenInPreview
                ? {
                    borderColor: "#6b5a2d",
                    background: "#211a10",
                    color: "#f4d28e",
                  }
                : {
                    borderColor: "#2d3f5a",
                    background: "#111b2b",
                    color: "#a8c8ee",
                  }
            }
          >
            {isHiddenInPreview ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
        </td>
        <td>
          <button
            type="button"
            className="table-row-action"
            disabled={isDerived}
            onClick={() => onRemovePanel(panel.id)}
          >
            <Trash2 size={14} />
          </button>
        </td>
      </tr>
    );
  }

  function toggleGroup(groupLabel: string) {
    setCollapsedGroups((current) => ({
      ...current,
      [groupLabel]: !(current[groupLabel] ?? true),
    }));
  }

  function isGroupCollapsed(groupLabel: string) {
    return collapsedGroups[groupLabel] ?? true;
  }

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
            <th>Cantidad</th>
            <th>Rol</th>
            <th>Modulo</th>
            <th>Melamina</th>
            <th>Canto</th>
            <th>Vista previa</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {manualPanels.length > 0 && (
            <tr>
              <td
                colSpan={10}
                className="muted"
                style={{ fontSize: 12, padding: "10px 12px" }}
              >
                Piezas manuales
              </td>
            </tr>
          )}
          {manualPanels.map((panel) => renderPanelRow(panel))}

          {groupedDerivedPanels.map((group) => (
            <Fragment key={group.groupLabel}>
              <tr>
                <td
                  colSpan={10}
                  className="muted"
                  style={{ fontSize: 12, padding: "10px 12px" }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <span>Artefacto: {group.groupLabel}</span>
                    <button
                      type="button"
                      className="table-row-action preview-hide-toggle"
                      onClick={() => toggleGroup(group.groupLabel)}
                    >
                      {isGroupCollapsed(group.groupLabel)
                        ? "Expandir"
                        : "Colapsar"}
                    </button>
                  </div>
                </td>
              </tr>
              {!isGroupCollapsed(group.groupLabel) &&
                group.panels.map((panel) => renderPanelRow(panel))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
