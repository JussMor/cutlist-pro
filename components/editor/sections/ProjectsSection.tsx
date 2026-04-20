import { Button } from "@/components/ui/button";
import { Project } from "@/lib/domain/types";
import { FolderOpen, Plus, Trash2 } from "lucide-react";

interface ProjectsSectionProps {
  savedProjects: Project[];
  activeProjectId: string;
  loadingProjects: boolean;
  onLoadProject: (projectId: string) => void;
  onRemoveProject: (projectId: string) => void;
  onNewProject: () => void;
}

export function ProjectsSection({
  savedProjects,
  activeProjectId,
  loadingProjects,
  onLoadProject,
  onRemoveProject,
  onNewProject,
}: ProjectsSectionProps) {
  return (
    <>
      <div className="panel-title flex items-center justify-between">
        Proyectos
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
                  <div className="truncate text-[15px] font-semibold leading-tight text-[#d7dde9]">
                    {project.name}
                  </div>
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
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon-xs"
                    className="rounded-lg bg-[#24131a] text-[#f1b0bf] hover:bg-[#321721]"
                    onClick={() => onRemoveProject(project.id)}
                    title="Eliminar proyecto"
                  >
                    <Trash2 size={14} />
                    <span className="sr-only">Eliminar proyecto</span>
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
