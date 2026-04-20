"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import * as React from "react";

interface MultiSelectOption {
  id: string | number;
  label: string;
  subtitle?: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selectedIds: (string | number)[];
  onToggle: (id: string | number) => void;
  placeholder?: string;
}

export function MultiSelect({
  options,
  selectedIds,
  onToggle,
  placeholder = "Seleccionar",
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filtered = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase()),
  );

  const selectedCount = selectedIds.length;
  const displayLabel =
    selectedCount === 0
      ? placeholder
      : `${selectedCount} seleccionado${selectedCount !== 1 ? "s" : ""}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-7 w-full min-w-32 items-center gap-2 rounded-lg border border-[#2f3850] bg-transparent px-2.5 text-xs text-[#d7dde9] shadow-sm transition-all outline-none focus-visible:border-[#f4b450] focus-visible:ring-2 focus-visible:ring-[#f4b450]/40 hover:border-[#3f4a5f]"
        >
          <span className="flex-1 text-left truncate">{displayLabel}</span>
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 text-[#7d879a] transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto border-[#2f3850] bg-[#0b1019] p-0"
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <div className="sticky top-0 p-2 border-b border-[#2f3850] bg-[#0b1019]">
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 w-full rounded-md border border-[#2f3850] bg-transparent px-2.5 text-xs text-[#d7dde9] outline-none focus-visible:border-[#f4b450] focus-visible:ring-1 focus-visible:ring-[#f4b450]/30 placeholder:text-[#7d879a]"
            autoFocus
          />
        </div>

        <div className="max-h-64 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <div className="px-2.5 py-4 text-xs text-[#7d879a] text-center">
              No hay resultados
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((option) => (
                <div
                  key={option.id}
                  onClick={() => onToggle(option.id)}
                  className="flex items-center gap-2 cursor-pointer hover:bg-[#111723] p-2 rounded transition-colors select-none"
                >
                  <Checkbox
                    checked={selectedIds.includes(option.id)}
                    onCheckedChange={(checked) => {
                      onToggle(option.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[#d7dde9] text-xs">
                      {option.label}
                    </div>
                    {option.subtitle && (
                      <div className="text-xs text-[#989faa]">
                        {option.subtitle}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
