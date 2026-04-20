import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CircleHelp } from "lucide-react";

interface FieldHelpTooltipProps {
  content: string;
}

export function FieldHelpTooltip({ content }: FieldHelpTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[#7f8ba2] transition-colors hover:text-[#a9c9f7]"
          aria-label="Informacion del campo"
        >
          <CircleHelp size={14} />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs leading-relaxed">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
