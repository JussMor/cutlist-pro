import { Project } from "@/lib/domain/types";

interface ProjectsSectionProps {
  savedProjects: Project[];
  activeProjectId: string;
  savingProject: boolean;
  showProjectForm: boolean;
  projectName: string;
  loadingProjects: boolean;
  onStartSaveProject: () => void;
  onSaveActiveProjectChanges: () => void;
  onSetProjectName: (v: string) => void;
  onSetShowProjectForm: (v: boolean) => void;
  onPersistProject: () => void;
  onLoadProject: (projectId: string) => void;
  onRemoveProject: (projectId: string) => void;
}

export function ProjectsSection({
  savedProjects,
  activeProjectId,
  savingProject,
  showProjectForm,
  projectName,
  loadingProjects,
  onStartSaveProject,
  onSaveActiveProjectChanges,
  onSetProjectName,
  onSetShowProjectForm,
  onPersistProject,
  onLoadProject,
  onRemoveProject,
}: ProjectsSectionProps) {
  return (
    <>
      <div className="panel-title">Proyectos Guardados</div>
      <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
        <button
          className="template-btn"
          type="button"
          onClick={onStartSaveProject}
          disabled={savingProject}
        >
          {savingProject ? "Guardando..." : "Guardar proyecto"}
        </button>
        <button
          className="template-btn"
          type="button"
          onClick={onSaveActiveProjectChanges}
          disabled={savingProject || !activeProjectId}
          title={
            activeProjectId
              ? "Guarda los cambios sobre el proyecto cargado"
              : "Carga un proyecto para actualizarlo"
          }
        >
          {savingProject ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      {showProjectForm && (
        <div
          className="module-form module-form-sidebar"
          style={{ marginBottom: 10 }}
        >
          <input
            className="table-input"
            placeholder="Nombre del proyecto"
            value={projectName}
            onChange={(e) => onSetProjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onPersistProject();
              if (e.key === "Escape") onSetShowProjectForm(false);
            }}
            autoFocus
          />
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className="template-btn"
              onClick={onPersistProject}
              disabled={savingProject || !projectName.trim()}
            >
              {savingProject ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              className="template-btn"
              onClick={() => onSetShowProjectForm(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="template-list" style={{ marginBottom: 14 }}>
        {loadingProjects ? (
          <div className="muted">Cargando proyectos...</div>
        ) : savedProjects.length === 0 ? (
          <div className="muted">Sin proyectos guardados</div>
        ) : (
          savedProjects.map((project) => (
            <div
              key={project.id}
              className={`template-btn saved-assembly-card ${
                activeProjectId === project.id ? "active" : ""
              }`}
            >
              <div className="saved-assembly-title">{project.name}</div>
              <small className="muted saved-assembly-meta">
                {new Date(project.updatedAt).toLocaleString()}
              </small>
              <div className="saved-assembly-actions">
                <button
                  type="button"
                  className="table-row-action preview-hide-toggle"
                  onClick={() => onLoadProject(project.id)}
                >
                  Cargar
                </button>
                <button
                  type="button"
                  className="table-row-action"
                  onClick={() => onRemoveProject(project.id)}
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

