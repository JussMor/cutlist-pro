"use client";

import { MAX_MODULE_HEIGHT_CM } from "@/lib/studio/document";
import type { StudioColumn } from "@/lib/studio/document";
import { useStudioStore } from "@/store/studioStore";

import { AddAffordance } from "./AddAffordance";
import { GridCell } from "./GridCell";

const LETTERS = "ABCDEFGHIJ";

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

export function FacadeGrid() {
  const doc = useStudioStore((s) => s.doc);
  const selection = useStudioStore((s) => s.selection);
  const colorMode = useStudioStore((s) => s.colorMode);
  const toggleSelect = useStudioStore((s) => s.toggleSelect);
  const addColumn = useStudioStore((s) => s.addColumn);
  const addCell = useStudioStore((s) => s.addCellToColumn);
  const clearSelection = useStudioStore((s) => s.clearSelection);

  const selSet = new Set(selection);

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
        return (
          <div key={col.id} className="flex flex-col items-center gap-2">
            <AddAffordance
              title="Agregar módulo encima"
              onClick={() => addCell(col.id)}
            />
            {/* cells[] is bottom -> top; flex-col-reverse stacks the first
                element on the floor so the column grows up from a shared base.
                The inline separator is inserted at the cumulative-height split
                point so it always sits at the module boundary within the stack. */}
            <div className="flex flex-col-reverse">
              {(() => {
                const elements: React.ReactNode[] = [];
                let cumH = 0;
                let mi = 0;
                col.cells.forEach((cell, idx) => {
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
                  elements.push(
                    <GridCell
                      key={cell.id}
                      cell={cell}
                      colorMode={colorMode}
                      selected={selSet.has(cell.id)}
                      onSelect={toggleSelect}
                    />,
                  );
                });
                return elements;
              })()}
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="flex size-6 items-center justify-center rounded-full bg-[#1a2230] text-[10px] font-semibold text-[#9aa4b6]">
                {LETTERS[ci] ?? ci + 1}
              </span>
              <span className="text-[11px] text-[#7d879a]">
                {col.width.toFixed(0)} cm
              </span>
              {/* Always reserve badge space so every column's label area has
                  the same height — keeping all cell stacks at the same bottom
                  baseline so module separators align across columns. */}
              <span
                className={`rounded-full bg-[#f4b450] px-1.5 py-0.5 text-[9px] font-bold text-[#17120a] ${mCount <= 1 ? "invisible" : ""}`}
              >
                {mCount}M
              </span>
            </div>
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
