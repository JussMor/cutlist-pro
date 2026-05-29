"use client";

import type { StudioCell } from "@/lib/studio/document";
import { cn } from "@/lib/utils";

export const SCALE = 260; // px per meter for the 2D facade

const STRIPES =
  "repeating-linear-gradient(45deg, rgba(244,180,80,0.9) 0 10px, rgba(20,20,20,0.9) 10px 20px)";

export function GridCell({
  cell,
  columnWidth,
  selected,
  onSelect,
}: {
  cell: StudioCell;
  columnWidth: number;
  selected: boolean;
  onSelect: (id: string, additive: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => onSelect(cell.id, e.shiftKey || e.metaKey || e.ctrlKey)}
      style={{
        width: Math.max(40, columnWidth * SCALE),
        height: Math.max(30, cell.height * SCALE),
        background: selected ? STRIPES : undefined,
      }}
      className={cn(
        "relative flex items-end border text-[10px] uppercase tracking-wide transition-colors",
        selected
          ? "border-[#f4b450] text-transparent"
          : "border-[#3a4660] text-[#7d879a] hover:border-[#4a5772]",
      )}
    >
      {!selected && (
        <span className="pointer-events-none absolute bottom-1 left-1.5 truncate">
          {cell.type}
        </span>
      )}
    </button>
  );
}
