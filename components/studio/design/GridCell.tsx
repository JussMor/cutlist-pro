"use client";

import {
  cellFront,
  cellInterior,
  DEFAULT_CELL_HEIGHT,
  type StudioCell,
} from "@/lib/studio/document";
import { cn } from "@/lib/utils";
import type { ColorMode } from "@/store/studioStore";

interface Palette {
  front: string; // door / drawer front fill
  knob: string; // hardware dot
  line: string; // shelf / divider line
}

// 2D facade colors track the 3D role colors so both render modes read the
// same: accent-yellow fronts when colored, neutral tan when uncolored.
const PALETTES: Record<ColorMode, Palette> = {
  colored: { front: "#f4b450", knob: "#151312", line: "#5b5a58" },
  uncolored: { front: "#d7d2c8", knob: "#2a2723", line: "#6d6865" },
};

export function GridCell({
  cell,
  colorMode,
  selected,
  onSelect,
}: {
  cell: StudioCell;
  colorMode: ColorMode;
  selected: boolean;
  onSelect: (id: string, additive: boolean) => void;
}) {
  const pal = PALETTES[colorMode];
  const drawerCount = Math.max(1, cell.drawerCount ?? 1);
  const shelfCount = Math.max(1, cell.shelfCount ?? 1);
  const interior = cellInterior(cell);
  const front = cellFront(cell);
  // When there are shelves/drawers behind a door we render the door slightly
  // translucent so the interior reads through — "you can tell what's inside".
  const doorOpacity = interior === "empty" ? 1 : 0.82;

  // All cell types grow proportionally. Base: DEFAULT_CELL_HEIGHT (30 cm) = 40 px.
  // 3 m = 400 px — fits on iPhone 13 Pro Max (926 px portrait) with room for UI.
  // Min 20 px keeps tiny cells clickable; DesignPane has overflow-auto for scroll.
  const cellHeightPx = Math.max(20, Math.round((cell.height / DEFAULT_CELL_HEIGHT) * 40));

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(cell.id, e.shiftKey || e.metaKey || e.ctrlKey);
      }}
      style={{ height: cellHeightPx }}
      className={cn(
        "relative w-20 border bg-[#12100f] transition-all",
        selected
          ? "z-10 border-[#f4b450] ring-2 ring-[#f4b450]/70"
          : "border-[#5b5a58] hover:border-[#8d8985]",
      )}
    >
      {/* ---- Interior (drawn first, behind any door) ---- */}
      {interior === "drawer" && (
        <div className="absolute inset-1.5 flex flex-col-reverse gap-1">
          {Array.from({ length: drawerCount }).map((_, i) => (
            <div
              key={i}
              className="relative flex-1 rounded-[1px] border border-black/30"
              style={{ background: pal.front }}
            >
              <span
                className="absolute left-1/2 top-1.5 size-1.5 -translate-x-1/2 rounded-full"
                style={{ background: pal.knob }}
              />
            </div>
          ))}
        </div>
      )}

      {interior === "shelf" && (
        <div className="absolute inset-x-2 inset-y-2 flex flex-col justify-evenly">
          {Array.from({ length: shelfCount }).map((_, i) => (
            <span
              key={i}
              className="h-1 rounded-full"
              style={{ background: pal.line }}
            />
          ))}
        </div>
      )}

      {/* ---- Front door (drawn on top; translucent if there's an interior) ---- */}
      {front === "left" && (
        <span
          className="absolute inset-2 rounded-[1px] border-r-4 border-black/40"
          style={{ background: pal.front, opacity: doorOpacity }}
        >
          <span
            className="absolute right-2 top-3 size-1.5 rounded-full"
            style={{ background: pal.knob }}
          />
        </span>
      )}

      {front === "right" && (
        <span
          className="absolute inset-2 rounded-[1px] border-l-4 border-black/40"
          style={{ background: pal.front, opacity: doorOpacity }}
        >
          <span
            className="absolute left-2 top-3 size-1.5 rounded-full"
            style={{ background: pal.knob }}
          />
        </span>
      )}

      {front === "double" && (
        <span className="absolute inset-2 grid grid-cols-2 gap-1" style={{ opacity: doorOpacity }}>
          <span className="relative rounded-[1px]" style={{ background: pal.front }}>
            <span
              className="absolute right-2 top-3 size-1.5 rounded-full"
              style={{ background: pal.knob }}
            />
          </span>
          <span className="relative rounded-[1px]" style={{ background: pal.front }}>
            <span
              className="absolute left-2 top-3 size-1.5 rounded-full"
              style={{ background: pal.knob }}
            />
          </span>
        </span>
      )}

      {front === "flip-up" && (
        <span
          className="absolute inset-2 rounded-[1px] border-t-4 border-black/40"
          style={{ background: pal.front, opacity: doorOpacity }}
        >
          {/* handle along the bottom edge for a lift-up door */}
          <span
            className="absolute bottom-2 left-1/2 size-1.5 -translate-x-1/2 rounded-full"
            style={{ background: pal.knob }}
          />
        </span>
      )}
    </button>
  );
}
