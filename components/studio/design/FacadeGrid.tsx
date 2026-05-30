"use client";

import { DEFAULT_CELL_HEIGHT, MAX_MODULE_HEIGHT_CM } from "@/lib/studio/document";
import type { StudioColumn } from "@/lib/studio/document";
import { useStudioStore } from "@/store/studioStore";

import { AddAffordance } from "./AddAffordance";
import { GridCell } from "./GridCell";

const LETTERS = "ABCDEFGHIJ";

// Pixel distance from the column floor to the module-boundary line.
// Mirrors GridCell's scale: 40 px per DEFAULT_CELL_HEIGHT cm.
const MODULE_LINE_PX = Math.round((MAX_MODULE_HEIGHT_CM / DEFAULT_CELL_HEIGHT) * 40);

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

  // True when at least one column overflows the first module height.
  const hasModuleSplit = doc.columns.some(
    (col) => col.cells.reduce((s, c) => s + c.height, 0) > MAX_MODULE_HEIGHT_CM,
  );

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
            {/*
              The cell stack is position:relative so the module boundary line
              can be anchored with position:absolute; bottom:MODULE_LINE_PX.
              Because every stack shares the same bottom baseline (items-end on
              the parent), that resolves to the *same absolute screen Y* for all
              columns — even columns shorter than 240 cm, where the line appears
              above the cells (overflow:visible, the default).
            */}
            <div className="relative flex flex-col-reverse">
              {hasModuleSplit && (
                <div
                  className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-[#f4b450]"
                  style={{ bottom: `${MODULE_LINE_PX}px` }}
                >
                  <span className="absolute right-0 top-0 -translate-y-full rounded bg-[#0f1520] px-1 text-[9px] font-semibold text-[#f4b450]">
                    M2
                  </span>
                </div>
              )}
              {col.cells.map((cell) => (
                <GridCell
                  key={cell.id}
                  cell={cell}
                  colorMode={colorMode}
                  selected={selSet.has(cell.id)}
                  onSelect={toggleSelect}
                />
              ))}
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="flex size-6 items-center justify-center rounded-full bg-[#1a2230] text-[10px] font-semibold text-[#9aa4b6]">
                {LETTERS[ci] ?? ci + 1}
              </span>
              <span className="text-[11px] text-[#7d879a]">
                {col.width.toFixed(0)} cm
              </span>
              {mCount > 1 && (
                <span className="rounded-full bg-[#f4b450] px-1.5 py-0.5 text-[9px] font-bold text-[#17120a]">
                  {mCount}M
                </span>
              )}
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
