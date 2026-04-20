import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  ArtifactInstance,
  DrawerArtifactParams,
  ModuleNode,
  StockSheet,
} from "@/lib/domain/types";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";

interface ArtifactsSectionProps {
  artifacts: ArtifactInstance[];
  modules: ModuleNode[];
  sheets: StockSheet[];
  collapsed: boolean;
  onToggleCollapse: () => void;
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
  collapsed,
  onToggleCollapse,
  onAddDrawerArtifact,
  onUpdateArtifactName,
  onRemoveArtifact,
  onUpdateArtifactModule,
  onUpdateArtifactMaterial,
  onUpdateArtifactNumericParam,
  onUpdateArtifactEnabled,
}: ArtifactsSectionProps) {
  const [pendingArtifactType, setPendingArtifactType] = useState<string | null>(
    null,
  );
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectValue, setSelectValue] = useState("");

  const getArtifactLabel = (artifactType: string | null) => {
    if (artifactType === "drawer") return "Cajon";
    return "artefacto";
  };

  const handleTypeSelection = (artifactType: string) => {
    setPendingArtifactType(artifactType);
    setSelectValue(artifactType);
    setIsConfirmOpen(true);
  };

  const handleConfirmCreate = () => {
    if (pendingArtifactType === "drawer") {
      onAddDrawerArtifact();
    }

    setIsConfirmOpen(false);
    setPendingArtifactType(null);
    setSelectValue("");
  };

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
        <button
          type="button"
          className="inline-flex items-center gap-1 text-left"
          onClick={onToggleCollapse}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          <span>Artefactos</span>
        </button>
        <Select value={selectValue} onValueChange={handleTypeSelection}>
          <SelectTrigger
            className="sidebar-add-btn h-auto w-auto border-0 bg-transparent p-0 text-inherit shadow-none focus-visible:ring-0 [&_svg.lucide-chevron-down]:hidden"
            aria-label="Elegir tipo de artefacto"
          >
            <Plus size={13} />
          </SelectTrigger>
          <SelectContent
            side="right"
            align="start"
            sideOffset={10}
            className="w-44 rounded-xl border border-[#2f3850] bg-[#0b1019] p-1.5 shadow-2xl"
          >
            <SelectItem value="drawer">Cajon</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <AlertDialog
        open={isConfirmOpen}
        onOpenChange={(open) => {
          setIsConfirmOpen(open);
          if (!open) setPendingArtifactType(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Crear artefacto</AlertDialogTitle>
            <AlertDialogDescription>
              Se agregara un {getArtifactLabel(pendingArtifactType)} al
              proyecto. Deseas continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCreate}>
              Crear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {!collapsed && (
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
                  <Input
                    value={artifact.name}
                    onChange={(e) =>
                      onUpdateArtifactName(artifact.id, e.target.value)
                    }
                    placeholder="Nombre artefacto"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onRemoveArtifact(artifact.id)}
                  >
                    Eliminar
                  </Button>
                </div>
                <div
                  style={{
                    display: "grid",
                    gap: 6,
                    gridTemplateColumns: "1fr 1fr",
                  }}
                >
                  <Select
                    value={artifact.moduleId}
                    onValueChange={(value) =>
                      onUpdateArtifactModule(artifact.id, value)
                    }
                  >
                    <SelectTrigger>
                      {modules.find((m) => m.id === artifact.moduleId)?.name ||
                        "Seleccionar"}
                    </SelectTrigger>
                    <SelectContent>
                      {modules.map((module) => (
                        <SelectItem key={module.id} value={module.id}>
                          {module.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={
                      artifact.params.materialSheetId?.toString() ?? "auto"
                    }
                    onValueChange={(value) => {
                      if (value === "auto") {
                        onUpdateArtifactMaterial(artifact.id, null);
                      } else {
                        const nextId = Number(value);
                        onUpdateArtifactMaterial(
                          artifact.id,
                          Number.isFinite(nextId) ? nextId : null,
                        );
                      }
                    }}
                  >
                    <SelectTrigger>
                      {(() => {
                        const sheet = sheets.find(
                          (s) => s.odooId === artifact.params.materialSheetId,
                        );
                        if (!sheet) return "Melamina auto";
                        return (
                          <div className="grid gap-0.5 flex-1">
                            <div>{sheet.name}</div>
                            <div className="text-[#989faa] text-xs">
                              {sheet.qty} plancha{sheet.qty !== 1 ? "s" : ""} ·
                              ${sheet.pricePerSheet.toFixed(2)}
                            </div>
                          </div>
                        );
                      })()}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Melamina auto</SelectItem>
                      {sheets.map((sheet) => (
                        <SelectItem
                          key={sheet.odooId}
                          value={sheet.odooId.toString()}
                        >
                          <div className="grid gap-0.5">
                            <div className="font-medium">{sheet.name}</div>
                            <div className="text-xs text-[#989faa]">
                              {sheet.qty} plancha{sheet.qty !== 1 ? "s" : ""} ·
                              ${sheet.pricePerSheet.toFixed(2)}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div
                  style={{
                    display: "grid",
                    gap: 6,
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  }}
                >
                  <Input
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
                  <Input
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
                  <Input
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
                  <Input
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
                  <Input
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
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`artifact-${artifact.id}-enabled`}
                      checked={artifact.enabled}
                      onCheckedChange={(checked: boolean | "indeterminate") =>
                        onUpdateArtifactEnabled(artifact.id, checked === true)
                      }
                    />
                    <label
                      htmlFor={`artifact-${artifact.id}-enabled`}
                      className="cursor-pointer text-xs text-[#7d879a]"
                    >
                      Activo
                    </label>
                  </div>
                </div>
                <small className="muted">
                  Artefacto {index + 1}: genera piezas de cajon y actualiza
                  preview/corte.
                </small>
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}
