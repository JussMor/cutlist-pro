import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

interface ProjectBreadcrumbProps {
  activeProjectName: string | null;
  savingProject: boolean;
  onSaveName: (nextName: string) => Promise<void>;
  rootLabel: string;
}

function shortProjectName(name: string | null) {
  if (!name) return "Sin guardar";
  return name.length > 10 ? `${name.slice(0, 10)}...` : name;
}

export function ProjectBreadcrumb({
  activeProjectName,
  savingProject,
  onSaveName,
  rootLabel,
}: ProjectBreadcrumbProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState("");

  useEffect(() => {
    if (!isEditing) {
      setDraftName(activeProjectName ?? "");
    }
  }, [activeProjectName, isEditing]);

  const submitName = async () => {
    await onSaveName(draftName);
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setDraftName(activeProjectName ?? "");
    setIsEditing(false);
  };

  return (
    <div className="mb-3 flex items-center gap-2 border-b border-[#262d3d] pb-2">
      <RotateCcw size={14} className="text-[#7d879a]" />
      <span className="text-xs uppercase tracking-[0.16em] text-[#7d879a]">
        {rootLabel}
      </span>
      <span className="text-[#7d879a]">&gt;</span>
      {isEditing ? (
        <>
          <input
            className="h-8 w-full max-w-xs rounded-md border border-[#2f3850] bg-transparent px-2 text-sm text-[#d7dde9] outline-none focus:border-[#f4b450]"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !savingProject) void submitName();
              if (e.key === "Escape") cancelEdit();
            }}
            autoFocus
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 border-[#2f3850] bg-transparent px-2 text-xs text-[#d7dde9] hover:border-[#f4b450] hover:bg-[#121a28]"
            onClick={() => void submitName()}
            disabled={savingProject}
          >
            {savingProject ? "Guardando..." : "Guardar"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-[#7d879a] hover:bg-[#111723] hover:text-[#d7dde9]"
            onClick={cancelEdit}
          >
            Cancelar
          </Button>
        </>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-7 max-w-xs justify-start truncate px-2 text-left text-sm font-semibold text-[#d7dde9] hover:bg-[#111723] hover:text-[#f4b450]"
            >
              {shortProjectName(activeProjectName)}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{activeProjectName ?? "Sin guardar"}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
