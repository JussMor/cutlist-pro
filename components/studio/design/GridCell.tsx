"use client";

import type { StudioCell } from "@/lib/studio/document";
import { cn } from "@/lib/utils";

export const SCALE = 260; // px per meter for the 2D facade

const STRIPES =
  "repeating-linear-gradient(45deg, rgba(244,180,80,0.9) 0 10px, rgba(20,20,20,0.9) 10px 20px)";

function selectedBackground(cell: StudioCell): string | undefined {
  if (!["shelf", "multiple"].includes(cell.type)) return undefined;
  return STRIPES;
}

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
  const drawerCount = Math.max(1, cell.drawerCount ?? 1);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(cell.id, e.shiftKey || e.metaKey || e.ctrlKey);
      }}
      style={{
        width: Math.max(40, columnWidth * SCALE),
        height: Math.max(30, cell.height * SCALE),
        background: selected ? selectedBackground(cell) : undefined,
      }}
      className={cn(
        "relative border bg-[#12100f] transition-colors",
        selected
          ? "border-[#f4b450]"
          : "border-[#5b5a58] hover:border-[#8d8985]",
      )}
    >
      {cell.type === "drawer" && (
        <div className="absolute inset-2 flex flex-col-reverse gap-0.5">
          {Array.from({ length: drawerCount }).map((_, i) => (
            <div
              key={i}
              className="relative flex-1 border border-[#14110f] bg-[#f4b450]"
            >
              <span className="absolute left-1/2 top-2 size-1.5 rounded-full bg-[#22201d]" />
              <span className="absolute left-[58%] top-2 size-1.5 rounded-full bg-[#22201d]" />
            </div>
          ))}
        </div>
      )}
      {cell.type === "left-door" && (
        <span className="absolute inset-2 border-r-4 border-[#1a1715] bg-[#2f2d2a]">
          <span className="absolute right-2 top-3 size-1.5 rounded-full bg-[#151312]" />
        </span>
      )}
      {cell.type === "right-door" && (
        <span className="absolute inset-2 border-l-4 border-[#1a1715] bg-[#2f2d2a]">
          <span className="absolute left-2 top-3 size-1.5 rounded-full bg-[#151312]" />
        </span>
      )}
      {cell.type === "shelf" && (
        <span className="absolute inset-x-2 top-1/2 h-1 -translate-y-1/2 bg-[#5b5a58]" />
      )}
      {cell.type === "doors" && (
        <span className="absolute inset-2 grid grid-cols-2 gap-1">
          <span className="relative bg-[#2f2d2a]">
            <span className="absolute right-2 top-3 size-1.5 rounded-full bg-[#151312]" />
          </span>
          <span className="relative bg-[#2f2d2a]">
            <span className="absolute left-2 top-3 size-1.5 rounded-full bg-[#151312]" />
          </span>
        </span>
      )}
    </button>
  );
}
