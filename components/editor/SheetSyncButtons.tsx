import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Download, RotateCcw } from "lucide-react";

interface SheetSyncButtonsProps {
  loadingSheets: boolean;
  onLoadSheets: (forceRefresh: boolean) => void;
}

export function SheetSyncButtons({
  loadingSheets,
  onLoadSheets,
}: SheetSyncButtonsProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            size="icon-xs"
            className="rounded-lg bg-[#13203a] text-[#a9c9f7] hover:bg-[#1a2b4b]"
            onClick={() => onLoadSheets(false)}
            disabled={loadingSheets}
            aria-label="Cargar tableros Odoo"
          >
            <Download size={14} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {loadingSheets ? "Consultando Odoo..." : "Cargar tableros Odoo"}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            size="icon-xs"
            className="rounded-lg bg-[#13203a] text-[#a9c9f7] hover:bg-[#1a2b4b]"
            onClick={() => onLoadSheets(true)}
            disabled={loadingSheets}
            aria-label="Forzar actualizacion de tableros"
          >
            <RotateCcw size={14} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Forzar actualizacion</TooltipContent>
      </Tooltip>
    </div>
  );
}
