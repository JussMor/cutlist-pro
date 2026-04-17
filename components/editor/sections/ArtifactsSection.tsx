import {
  ArtifactInstance,
  DrawerArtifactParams,
  ModuleNode,
  StockSheet,
} from "@/lib/domain/types";
import { Plus } from "lucide-react";

interface ArtifactsSectionProps {
  artifacts: ArtifactInstance[];
  modules: ModuleNode[];
  sheets: StockSheet[];
  onAddDrawerArtifact: () => void;
  onUpdateArtifactName: (artifactId: string, name: string) => void;
  onRemoveArtifact: (artifactId: string) => void;
  onUpdateArtifactModule: (artifactId: string, moduleId: string) => void;
  onUpdateArtifactMaterial: (
    artifactId: string,
    materialSheetId: number | null,
  ) => void;
  onUpdateArtifactNumericParam: (
    artifactId: string,
    key: keyof DrawerArtifactParams,
    value: number,
  ) => void;
  onUpdateArtifactEnabled: (artifactId: string, enabled: boolean) => void;
}

export function ArtifactsSection({
  artifacts,
  modules,
  sheets,
  onAddDrawerArtifact,
  onUpdateArtifactName,
  onRemoveArtifact,
  onUpdateArtifactModule,
  onUpdateArtifactMaterial,
  onUpdateArtifactNumericParam,
  onUpdateArtifactEnabled,
}: ArtifactsSectionProps) {
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
        <span>Artefactos</span>
        <button
          type="button"
          className="sidebar-add-btn"
          onClick={onAddDrawerArtifact}
          title="Agregar cajon parametrico"
        >
          <Plus size={13} />+ Cajon
        </button>
      </div>
      <div className="template-list" style={{ marginBottom: 12 }}>
        {artifacts.length === 0 ? (
          <div className="muted">
            Sin artefactos. Agrega cajones parametrizados.
          </div>
        ) : (
          artifacts.map((artifact, index) => (
            <div
              key={artifact.id}
              className="saved-assembly-card"
              style={{ display: "grid", gap: 6 }}
            >
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  className="table-input"
                  value={artifact.name}
                  onChange={(e) =>
                    onUpdateArtifactName(artifact.id, e.target.value)
                  }
                  placeholder="Nombre artefacto"
                />
                <button
                  type="button"
                  className="table-row-action"
                  onClick={() => onRemoveArtifact(artifact.id)}
                >
                  Eliminar
                </button>
              </div>
              <div
                style={{
                  display: "grid",
                  gap: 6,
                  gridTemplateColumns: "1fr 1fr",
                }}
              >
                <select
                  className="table-input"
                  value={artifact.moduleId}
                  onChange={(e) =>
                    onUpdateArtifactModule(artifact.id, e.target.value)
                  }
                >
                  {modules.map((module) => (
                    <option key={module.id} value={module.id}>
                      {module.name}
                    </option>
                  ))}
                </select>
                <select
                  className="table-input"
                  value={artifact.params.materialSheetId ?? ""}
                  onChange={(e) => {
                    const nextId = Number(e.target.value);
                    onUpdateArtifactMaterial(
                      artifact.id,
                      Number.isFinite(nextId) && nextId !== 0 ? nextId : null,
                    );
                  }}
                >
                  <option value="">Melamina auto</option>
                  {sheets.map((sheet) => (
                    <option key={sheet.odooId} value={sheet.odooId}>
                      {sheet.name}
                    </option>
                  ))}
                </select>
              </div>
              <div
                style={{
                  display: "grid",
                  gap: 6,
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                }}
              >
                <input
                  className="table-input"
                  type="number"
                  min="1"
                  step="1"
                  value={artifact.params.count}
                  onChange={(e) =>
                    onUpdateArtifactNumericParam(
                      artifact.id,
                      "count",
                      Number(e.target.value),
                    )
                  }
                  title="Cantidad"
                />
                <input
                  className="table-input"
                  type="number"
                  min="1"
                  step="0.1"
                  value={artifact.params.frontWidth}
                  onChange={(e) =>
                    onUpdateArtifactNumericParam(
                      artifact.id,
                      "frontWidth",
                      Number(e.target.value),
                    )
                  }
                  title="Frente ancho"
                />
                <input
                  className="table-input"
                  type="number"
                  min="1"
                  step="0.1"
                  value={artifact.params.frontHeight}
                  onChange={(e) =>
                    onUpdateArtifactNumericParam(
                      artifact.id,
                      "frontHeight",
                      Number(e.target.value),
                    )
                  }
                  title="Frente alto"
                />
                <input
                  className="table-input"
                  type="number"
                  min="1"
                  step="0.1"
                  value={artifact.params.boxDepth}
                  onChange={(e) =>
                    onUpdateArtifactNumericParam(
                      artifact.id,
                      "boxDepth",
                      Number(e.target.value),
                    )
                  }
                  title="Fondo caja"
                />
                <input
                  className="table-input"
                  type="number"
                  min="1"
                  step="0.1"
                  value={artifact.params.boxHeight}
                  onChange={(e) =>
                    onUpdateArtifactNumericParam(
                      artifact.id,
                      "boxHeight",
                      Number(e.target.value),
                    )
                  }
                  title="Alto caja"
                />
                <label
                  className="muted"
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <input
                    type="checkbox"
                    checked={artifact.enabled}
                    onChange={(e) =>
                      onUpdateArtifactEnabled(artifact.id, e.target.checked)
                    }
                  />
                  Activo
                </label>
              </div>
              <small className="muted">
                Artefacto {index + 1}: genera piezas de cajon y actualiza
                preview/corte.
              </small>
            </div>
          ))
        )}
      </div>
    </>
  );
}

