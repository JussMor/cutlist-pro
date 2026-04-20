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
import { Project } from "@/lib/domain/types";
import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Plus,
  Trash2,
} from "lucide-react";

interface ProjectsSectionProps {
  savedProjects: Project[];
  activeProjectId: string;
  loadingProjects: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onLoadProject: (projectId: string) => void;
  onRemoveProject: (projectId: string) => void;
  onNewProject: () => void;
}

export function ProjectsSection({
  savedProjects,
  activeProjectId,
  loadingProjects,
  collapsed,
  onToggleCollapse,
  onLoadProject,
  onRemoveProject,
  onNewProject,
}: ProjectsSectionProps) {
  function shortProjectName(name: string) {
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
          <span>Proyectos</span>
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-[#d7dde9] hover:bg-[#111723] hover:text-[#f4b450]"
          onClick={onNewProject}
          title="Crear un nuevo proyecto"
        >
          <Plus size={18} />
        </Button>
      </div>

      {!collapsed && (
        <div
          className="template-list max-h-104 overflow-y-auto pr-1"
          style={{ marginBottom: 14 }}
        >
          {loadingProjects ? (
            <div className="muted">Cargando proyectos...</div>
          ) : savedProjects.length === 0 ? (
            <div className="muted">Sin proyectos guardados</div>
          ) : (
            savedProjects.map((project) => (
              <div
                key={project.id}
                className={`rounded-xl border px-3 py-2.5 transition-colors ${
                  activeProjectId === project.id
                    ? "border-[#f4b450] bg-[linear-gradient(180deg,rgba(244,180,80,0.08),rgba(244,180,80,0.03))]"
                    : "border-[#262d3d] bg-[#0b1019]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="truncate text-[15px] font-semibold leading-tight text-[#d7dde9]">
                          {shortProjectName(project.name)}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>{project.name}</TooltipContent>
                    </Tooltip>
                    <div className="mt-1 text-xs text-[#7d879a]">
                      {new Date(project.updatedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon-xs"
                      className="rounded-lg bg-[#13203a] text-[#a9c9f7] hover:bg-[#1a2b4b]"
                      onClick={() => onLoadProject(project.id)}
                      title="Cargar proyecto"
                    >
                      <FolderOpen size={14} />
                      <span className="sr-only">Cargar proyecto</span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon-xs"
                          className="rounded-lg bg-[#24131a] text-[#f1b0bf] hover:bg-[#321721]"
                          title="Eliminar proyecto"
                        >
                          <Trash2 size={14} />
                          <span className="sr-only">Eliminar proyecto</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Eliminar proyecto</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. El proyecto{" "}
                            {project.name} se eliminará de forma permanente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-[#24131a] text-[#f1b0bf] hover:bg-[#321721]"
                            onClick={() => onRemoveProject(project.id)}
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
