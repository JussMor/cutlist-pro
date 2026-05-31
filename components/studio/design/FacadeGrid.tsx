"use client";

import { ArrowUpDown, Link, Unlink } from "lucide-react";

import { cellFront, DEFAULT_CELL_HEIGHT, MAX_MODULE_HEIGHT_CM } from "@/lib/studio/document";
import type { StudioCell, StudioColumn } from "@/lib/studio/document";
import { cn } from "@/lib/utils";
import { useStudioStore } from "@/store/studioStore";

import { AddAffordance } from "./AddAffordance";
import { GridCell } from "./GridCell";

const LETTERS = "ABCDEFGHIJ";

const cellPx = (h: number) => Math.max(20, Math.round((h / DEFAULT_CELL_HEIGHT) * 40));

function moduleCount(col: StudioColumn): number {
  let count = 1;
  let cumH = 0;
  for (const cell of col.cells) {
    if (cumH > 0 && cumH + cell.height > MAX_MODULE_HEIGHT_CM) {
      count++;
      cumH = 0;
    }
    cumH += cell.height;
  }
  return count;
}

/**
 * Pixel offsets from the TOP of the cell stack for each cell (bottom→top order).
 * Used to position spanning-front overlays.
 */
function computeCellTopOffsets(cells: StudioCell[]): { topPx: number; heightPx: number }[] {
  const heights = cells.map((c) => cellPx(c.height));
  const totalPx = heights.reduce((a, b) => a + b, 0);
  const result: { topPx: number; heightPx: number }[] = [];
  let fromBottom = 0;
  for (const h of heights) {
    result.push({ topPx: totalPx - fromBottom - h, heightPx: h });
    fromBottom += h;
  }
  return result;
}

export function FacadeGrid() {
  const doc = useStudioStore((s) => s.doc);
  const selection = useStudioStore((s) => s.selection);
  const colorMode = useStudioStore((s) => s.colorMode);
  const toggleSelect = useStudioStore((s) => s.toggleSelect);
  const addColumn = useStudioStore((s) => s.addColumn);
  const addCell = useStudioStore((s) => s.addCellToColumn);
  const clearSelection = useStudioStore((s) => s.clearSelection);
  const toggleMergedDeck = useStudioStore((s) => s.toggleMergedDeck);
  const toggleOpenJoint = useStudioStore((s) => s.toggleOpenJoint);
  const toggleSpanningFront = useStudioStore((s) => s.toggleSpanningFront);

  const selSet = new Set(selection);
  const spanningFronts = doc.globals.spanningFronts ?? [];
  const mergedDecks = doc.globals.mergedDecks ?? [];
  const openJoints = doc.globals.openJoints ?? [];

  if (doc.columns.length === 0) {
    return (
      <div
        className="flex min-h-full items-center justify-center gap-24 p-6"
        onClick={clearSelection}
      >
        <AddAffordance title="Agregar primera columna" onClick={() => addColumn(0)} />
        <span className="text-sm text-[#817c78]">No columns yet</span>
        <AddAffordance title="Agregar primera columna" onClick={() => addColumn(0)} />
      </div>
    );
  }

  return (
    <div
      className="flex min-h-full items-end justify-center gap-3 p-6"
      onClick={clearSelection}
    >
      <AddAffordance
        title="Agregar columna al inicio"
        onClick={() => addColumn(0)}
        className="mb-12"
      />
      {doc.columns.map((col, ci) => {
        const mCount = moduleCount(col);
        const isLast = ci === doc.columns.length - 1;
        const nextCol = doc.columns[ci + 1];

        // ── Spanning front state for this column ──────────────────────────
        const spanHideSet = new Set<string>();
        const spanOverlays: { bottomIdx: number; topIdx: number; front: string }[] = [];
        for (const key of spanningFronts) {
          const parts = key.split("/");
          if (parts.length !== 3 || parts[0] !== col.id) continue;
          const [, bottomCellId, topCellId] = parts;
          const bi = col.cells.findIndex((c) => c.id === bottomCellId);
          const ti = col.cells.findIndex((c) => c.id === topCellId);
          if (bi < 0 || ti < 0 || Math.abs(bi - ti) !== 1) continue;
          spanHideSet.add(bottomCellId);
          spanHideSet.add(topCellId);
          const bottomCell = col.cells[Math.min(bi, ti)];
          spanOverlays.push({
            bottomIdx: Math.min(bi, ti),
            topIdx: Math.max(bi, ti),
            front: cellFront(bottomCell),
          });
        }

        // ── Adjacent-column controls ──────────────────────────────────────
        const jointKey = nextCol ? `${col.id}:${nextCol.id}` : null;
        const isGrouped = jointKey ? openJoints.includes(jointKey) : false;

        // Manual floor-deck merge (only show when columns are NOT grouped;
        // grouping auto-spans floor + ceiling)
        const floorMergeKey = nextCol ? `${col.id}:${nextCol.id}/0/0` : null;
        const isFloorMerged = floorMergeKey ? mergedDecks.includes(floorMergeKey) : false;

        // Pixel offsets for spanning-front overlay
        const cellOffsets = computeCellTopOffsets(col.cells);

        return (
          <div key={col.id} className="relative flex flex-col items-center gap-2">
            <AddAffordance
              title="Agregar módulo encima"
              onClick={() => addCell(col.id)}
            />

            {/* ── Cell stack ── */}
            <div className="relative flex flex-col-reverse">
              {(() => {
                const elements: React.ReactNode[] = [];
                let cumH = 0;
                let mi = 0;
                col.cells.forEach((cell, idx) => {
                  // Module separator
                  if (idx > 0 && cumH + cell.height > MAX_MODULE_HEIGHT_CM) {
                    mi++;
                    cumH = 0;
                    elements.push(
                      <div
                        key={`sep-m${mi}`}
                        className="relative my-0.5 w-full border-t-2 border-dashed border-[#f4b450]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="absolute -top-3 right-0 rounded bg-[#0f1520] px-1 text-[9px] font-semibold text-[#f4b450]">
                          M{mi + 1}
                        </span>
                      </div>,
                    );
                  }
                  cumH += cell.height;

                  // Span-door button between this cell and the next (mobile-friendly)
                  // Placed BEFORE the cell so in flex-col-reverse it renders ABOVE it
                  if (idx < col.cells.length - 1) {
                    const nextCell = col.cells[idx + 1];
                    const spanKey = `${col.id}/${cell.id}/${nextCell.id}`;
                    const isSpanned = spanningFronts.includes(spanKey);
                    elements.push(
                      <button
                        key={`span-btn-${idx}`}
                        type="button"
                        title={isSpanned ? "Quitar puerta compartida" : "Crear puerta compartida entre estas dos secciones"}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSpanningFront(col.id, cell.id, nextCell.id);
                        }}
                        className={cn(
                          "relative z-10 -my-px flex h-3 w-full items-center justify-center transition-all",
                          isSpanned
                            ? "opacity-100"
                            : "opacity-0 hover:opacity-100 focus:opacity-100",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-3.5 w-8 items-center justify-center rounded-full border text-[7px] transition-all",
                            isSpanned
                              ? "border-[#f4b450] bg-[#f4b450]/20 text-[#f4b450]"
                              : "border-[#3a4250] bg-[#0d1117] text-[#5a6575]",
                          )}
                        >
                          <ArrowUpDown className="size-2" />
                        </span>
                      </button>,
                    );
                  }

                  elements.push(
                    <GridCell
                      key={cell.id}
                      cell={cell}
                      colorMode={colorMode}
                      selected={selSet.has(cell.id)}
                      onSelect={toggleSelect}
                      hideFront={spanHideSet.has(cell.id)}
                    />,
                  );
                });
                return elements;
              })()}

              {/* ── Spanning-front overlays ── */}
              {spanOverlays.map(({ bottomIdx, topIdx, front }) => {
                const bOff = cellOffsets[bottomIdx];
                const tOff = cellOffsets[topIdx];
                if (!bOff || !tOff) return null;
                const overTop = Math.min(bOff.topPx, tOff.topPx);
                const overH = bOff.heightPx + tOff.heightPx;
                const pal =
                  colorMode === "colored"
                    ? { front: "#f4b450", knob: "#151312" }
                    : { front: "#d7d2c8", knob: "#2a2723" };
                return (
                  <div
                    key={`span-${bottomIdx}-${topIdx}`}
                    className="pointer-events-none absolute inset-x-0"
                    style={{ top: overTop, height: overH }}
                  >
                    {(front === "left" ||
                      front === "right" ||
                      front === "double" ||
                      front === "flip-up") && (
                      <div
                        className={cn(
                          "absolute inset-2 rounded-[1px]",
                          front === "left" && "border-r-4 border-black/40",
                          front === "right" && "border-l-4 border-black/40",
                          front === "flip-up" && "border-t-4 border-black/40",
                        )}
                        style={{ background: pal.front, opacity: 0.9 }}
                      >
                        {front === "left" && (
                          <span
                            className="absolute right-2 top-1/2 size-1.5 -translate-y-1/2 rounded-full"
                            style={{ background: pal.knob }}
                          />
                        )}
                        {front === "right" && (
                          <span
                            className="absolute left-2 top-1/2 size-1.5 -translate-y-1/2 rounded-full"
                            style={{ background: pal.knob }}
                          />
                        )}
                        {front === "flip-up" && (
                          <span
                            className="absolute bottom-2 left-1/2 size-1.5 -translate-x-1/2 rounded-full"
                            style={{ background: pal.knob }}
                          />
                        )}
                      </div>
                    )}
                    {front === "double" && (
                      <div
                        className="absolute inset-2 grid grid-cols-2 gap-1"
                        style={{ opacity: 0.9 }}
                      >
                        <div
                          className="relative rounded-[1px]"
                          style={{ background: pal.front }}
                        >
                          <span
                            className="absolute right-2 top-1/2 size-1.5 -translate-y-1/2 rounded-full"
                            style={{ background: pal.knob }}
                          />
                        </div>
                        <div
                          className="relative rounded-[1px]"
                          style={{ background: pal.front }}
                        >
                          <span
                            className="absolute left-2 top-1/2 size-1.5 -translate-y-1/2 rounded-full"
                            style={{ background: pal.knob }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Column footer ── */}
            <div className="flex flex-col items-center gap-1">
              <span className="flex size-6 items-center justify-center rounded-full bg-[#1a2230] text-[10px] font-semibold text-[#9aa4b6]">
                {LETTERS[ci] ?? ci + 1}
              </span>
              <span className="text-[11px] text-[#7d879a]">
                {col.width.toFixed(0)} cm
              </span>
              <span
                className={`rounded-full bg-[#f4b450] px-1.5 py-0.5 text-[9px] font-bold text-[#17120a] ${mCount <= 1 ? "invisible" : ""}`}
              >
                {mCount}M
              </span>
            </div>

            {/* ── Right-boundary controls ── */}
            {!isLast && nextCol && (
              <div className="absolute -right-5 bottom-6 flex flex-col gap-1">
                {/* Group / single body button — main action */}
                <button
                  type="button"
                  title={
                    isGrouped
                      ? "Desagrupar — restaurar piso, techo y fondo individuales"
                      : "Agrupar — une piso, techo y fondo en una sola pieza (el separador lateral se mantiene)"
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleOpenJoint(col.id, nextCol.id);
                  }}
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full border transition-all",
                    isGrouped
                      ? "border-[#f4b450] bg-[#f4b450]/25 text-[#f4b450]"
                      : "border-[#1a2230] text-[#2a3450] hover:border-[#f4b450]/50 hover:text-[#f4b450]/70",
                  )}
                >
                  {isGrouped ? (
                    <Unlink className="size-3" />
                  ) : (
                    <Link className="size-3" />
                  )}
                </button>

                {/* Manual floor-deck merge — only shown when NOT grouped */}
                {!isGrouped && (
                  <button
                    type="button"
                    title={isFloorMerged ? "Separar tablero de piso" : "Unir tablero de piso"}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMergedDeck(col.id, nextCol.id, 0, 0);
                    }}
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full border text-[9px] font-bold transition-all",
                      isFloorMerged
                        ? "border-[#5a9a8e] bg-[#5a9a8e]/25 text-[#5a9a8e]"
                        : "border-[#1a2230] text-[#2a3450] hover:border-[#5a9a8e]/60 hover:text-[#5a9a8e]/80",
                    )}
                  >
                    ═
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
      <AddAffordance
        title="Agregar columna al final"
        onClick={() => addColumn(doc.columns.length)}
        className="mb-12"
      />
    </div>
  );
}
