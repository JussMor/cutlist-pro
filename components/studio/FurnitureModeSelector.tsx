"use client";

import { Columns, LayoutTemplate, Laptop, PanelLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { useStudioStore, type FurnitureMode } from "@/store/studioStore";

const FURNITURE_MODES: {
  id: FurnitureMode;
  icon: typeof LayoutTemplate;
  label: string;
}[] = [
  { id: "cabinet", icon: LayoutTemplate, label: "Cabinet" },
  { id: "desk",    icon: Laptop,         label: "Desk" },
  { id: "door",    icon: PanelLeft,      label: "Door" },
  { id: "column",  icon: Columns,        label: "Column" },
];

export function FurnitureModeSelector() {
  const mode    = useStudioStore((s) => s.furnitureMode);
  const setMode = useStudioStore((s) => s.setFurnitureMode);

  return (
    <div className="flex items-center gap-0.5 rounded-full bg-[#11151d] p-1">
      {FURNITURE_MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          title={m.label}
          onClick={() => setMode(m.id)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition",
            mode === m.id
              ? "bg-[#e8eaee] font-medium text-[#0b0e14]"
              : "text-[#9aa4b6] hover:text-[#d7dde9]",
          )}
        >
          <m.icon className="size-3.5 shrink-0" />
          <span className="hidden sm:inline">{m.label}</span>
        </button>
      ))}
    </div>
  );
}
