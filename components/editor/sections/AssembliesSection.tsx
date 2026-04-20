import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Assembly } from "@/lib/domain/types";
import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";

interface AssembliesSectionProps {
  customTemplates: Assembly[];
  activeAssemblyId: string;
  savingAssembly: boolean;
  showAssemblyForm: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  editablePanelsCount: number;
  onToggleAssemblyForm: () => void;
  onUpdateActiveAssembly: () => void;
  onLoadAssembly: (assemblyId: string) => void;
  onRemoveAssembly: (assemblyId: string) => void;
}

export function AssembliesSection({
  customTemplates,
  activeAssemblyId,
  savingAssembly,
  showAssemblyForm,
  collapsed,
  onToggleCollapse,
  editablePanelsCount,
  onToggleAssemblyForm,
  onUpdateActiveAssembly,
  onLoadAssembly,
  onRemoveAssembly,
}: AssembliesSectionProps) {
  function shortAssemblyName(name: string) {
    return name.length > 10 ? `${name.slice(0, 10)}...` : name;
  }

  return (
    <>
      <div className="panel-title flex items-center justify-between">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-left"
          onClick={onToggleCollapse}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          <span>Emsambles Guardados</span>
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className={`text-[#d7dde9] hover:bg-[#111723] hover:text-[#f4b450] ${
            showAssemblyForm ? "bg-[#111723] text-[#f4b450]" : ""
          }`}
          onClick={onToggleAssemblyForm}
          disabled={editablePanelsCount === 0 || savingAssembly}
          title={showAssemblyForm ? "Cerrar plantilla" : "Nueva plantilla"}
        >
          <Plus size={18} />
        </Button>
      </div>

      {!collapsed && (
        <div className="template-list max-h-104 overflow-y-auto pr-1">
          {customTemplates.length === 0 ? (
            <div className="muted">Sin emsambles guardados</div>
          ) : (
            customTemplates.map((assembly) => (
              <div
                key={assembly.id}
                className={`rounded-xl border px-3 py-2.5 transition-colors ${
                  activeAssemblyId === assembly.id
                    ? "border-[#f4b450] bg-[linear-gradient(180deg,rgba(244,180,80,0.08),rgba(244,180,80,0.03))]"
                    : "border-[#262d3d] bg-[#0b1019]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="truncate text-[15px] font-semibold leading-tight text-[#d7dde9]">
                          {shortAssemblyName(assembly.name)}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>{assembly.name}</TooltipContent>
                    </Tooltip>
                    <div className="mt-1 text-xs text-[#7d879a]">
                      {assembly.panels.length} piezas
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {activeAssemblyId === assembly.id && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon-xs"
                        className="rounded-lg bg-[#1d2a1c] text-[#b7e1ac] hover:bg-[#253523]"
                        onClick={onUpdateActiveAssembly}
                        disabled={savingAssembly || editablePanelsCount === 0}
                        title="Actualizar actual"
                      >
                        <RefreshCw size={14} />
                        <span className="sr-only">Actualizar actual</span>
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon-xs"
                      className="rounded-lg bg-[#13203a] text-[#a9c9f7] hover:bg-[#1a2b4b]"
                      onClick={() => onLoadAssembly(assembly.id)}
                      title="Cargar ensamble"
                    >
                      <FolderOpen size={14} />
                      <span className="sr-only">Cargar ensamble</span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon-xs"
                          className="rounded-lg bg-[#24131a] text-[#f1b0bf] hover:bg-[#321721]"
                          title="Eliminar ensamble"
                        >
                          <Trash2 size={14} />
                          <span className="sr-only">Eliminar ensamble</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Eliminar ensamble</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta accion no se puede deshacer. El ensamble{" "}
                            {assembly.name} se eliminara de forma permanente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-[#24131a] text-[#f1b0bf] hover:bg-[#321721]"
                            onClick={() => onRemoveAssembly(assembly.id)}
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}
