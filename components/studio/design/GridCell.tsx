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
  front: string;
  knob: string;
  line: string;
}

const PALETTES: Record<ColorMode, Palette> = {
  colored: { front: "#f4b450", knob: "#151312", line: "#5b5a58" },
  uncolored: { front: "#d7d2c8", knob: "#2a2723", line: "#6d6865" },
};

export function GridCell({
  cell,
  colorMode,
  selected,
  onSelect,
  hideFront,
  onToggleSubGridCell,
}: {
  cell: StudioCell;
  colorMode: ColorMode;
  selected: boolean;
  onSelect: (id: string, additive: boolean) => void;
  hideFront?: boolean;
  onToggleSubGridCell?: (cellId: string, row: number, col: number) => void;
}) {
  const pal = PALETTES[colorMode];
  const isVoid = cell.active === false;
  const drawerCount = Math.max(1, cell.drawerCount ?? 1);
  const shelfCount = Math.max(1, cell.shelfCount ?? 1);
  const dividerCount = Math.max(1, cell.dividerCount ?? 1);
  const interior = cellInterior(cell);
  const front = cellFront(cell);
  const doorOpacity = interior === "empty" ? 1 : 0.82;

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
        "relative w-20 border transition-all",
        isVoid
          ? selected
            ? "z-10 border-[#f4b450] bg-[#0a0e15] ring-2 ring-[#f4b450]/70"
            : "border-[#2a3450] bg-[#0a0e15] hover:border-[#3a4660]"
          : selected
            ? "z-10 border-[#f4b450] bg-[#12100f] ring-2 ring-[#f4b450]/70"
            : "border-[#5b5a58] bg-[#12100f] hover:border-[#8d8985]",
      )}
    >
      {/* ── Void indicator ── */}
      {isVoid && (
        <svg
          className="absolute inset-0 h-full w-full opacity-20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="void-hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="#7d879a" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#void-hatch)" />
        </svg>
      )}

      {/* ── Interior (only for active cells without subgrid) ── */}
      {!isVoid && !cell.subgrid && (
        <>
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
                <span key={i} className="h-1 rounded-full" style={{ background: pal.line }} />
              ))}
            </div>
          )}

          {interior === "hanging" && (
            <div className="absolute inset-1.5 flex flex-col">
              <div className="h-1.5 rounded-sm" style={{ background: pal.line, opacity: 0.9 }} />
              <div className="flex flex-1 items-start justify-evenly px-1 pt-1">
                {Array.from({ length: Math.max(3, Math.floor(cell.height / 10)) }).map((_, i) => (
                  <div
                    key={i}
                    className="w-0.5 rounded-b"
                    style={{ background: pal.line, height: "42%", opacity: 0.65 }}
                  />
                ))}
              </div>
            </div>
          )}

          {interior === "divider" && (
            <div className="absolute inset-1.5 flex items-stretch justify-evenly">
              {Array.from({ length: dividerCount }).map((_, i) => (
                <div
                  key={i}
                  className="w-0.5 self-stretch rounded-full"
                  style={{ background: pal.line }}
                />
              ))}
            </div>
          )}

          {interior === "appliance" && (
            <div
              className="absolute inset-2 flex items-center justify-center rounded border-2 border-dashed"
              style={{ borderColor: pal.line, opacity: 0.55 }}
            >
              <span className="select-none text-[10px]" style={{ color: pal.line }}>
                ⬜
              </span>
            </div>
          )}
        </>
      )}

      {/* ── Subgrid overlay ── */}
      {!isVoid && cell.subgrid && (
        <div
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${cell.subgrid.cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${cell.subgrid.rows}, minmax(0, 1fr))`,
          }}
        >
          {cell.subgrid.cells.map((sc) => {
            const scInactive = sc.active === false;
            return (
              <button
                key={sc.id}
                type="button"
                title={scInactive ? "Activar subceldilla" : "Vaciar subceldilla"}
                onClick={(e) => {
                  e.stopPropagation();
                  // Keep the parent cell selected so the inspector (subgrid /
                  // void / delete controls) stays available, then toggle the
                  // subcell active state.
                  onSelect(cell.id, e.shiftKey || e.metaKey || e.ctrlKey);
                  onToggleSubGridCell?.(cell.id, sc.row, sc.col);
                }}
                className={cn(
                  "relative border transition-colors hover:border-[#f4b450]/60",
                  scInactive
                    ? "border-[#2a3450] bg-[#0a0e15]"
                    : "border-[#2a3450]/40 bg-transparent hover:bg-[#f4b450]/5",
                )}
              >
                {scInactive && (
                  <svg className="absolute inset-0 h-full w-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id={`sg-hatch-${sc.id}`} patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
                        <line x1="0" y1="0" x2="0" y2="4" stroke="#7d879a" strokeWidth="0.8" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill={`url(#sg-hatch-${sc.id})`} />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Front door (only for active cells) ── */}
      {!isVoid && !cell.subgrid && !hideFront && front === "left" && (
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

      {!isVoid && !cell.subgrid && !hideFront && front === "right" && (
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

      {!isVoid && !cell.subgrid && !hideFront && front === "double" && (
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

      {!isVoid && !cell.subgrid && !hideFront && front === "flip-up" && (
        <span
          className="absolute inset-2 rounded-[1px] border-t-4 border-black/40"
          style={{ background: pal.front, opacity: doorOpacity }}
        >
          <span
            className="absolute bottom-2 left-1/2 size-1.5 -translate-x-1/2 rounded-full"
            style={{ background: pal.knob }}
          />
        </span>
      )}
    </button>
  );
}
