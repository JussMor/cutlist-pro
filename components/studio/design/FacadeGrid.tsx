"use client";

import { useStudioStore } from "@/store/studioStore";

import { AddAffordance } from "./AddAffordance";
import { GridCell } from "./GridCell";

const LETTERS = "ABCDEFGHIJ";

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
        <AddAffordance
          title="Agregar primera columna"
          onClick={() => addColumn(0)}
        />
        <span className="text-sm text-[#817c78]">No columns yet</span>
        <AddAffordance
          title="Agregar primera columna"
          onClick={() => addColumn(0)}
        />
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
      {doc.columns.map((col, ci) => (
        <div key={col.id} className="flex flex-col items-center gap-2">
          <AddAffordance
            title="Agregar módulo encima"
            onClick={() => addCell(col.id)}
          />
          {/* cells[] is bottom -> top; flex-col-reverse stacks the first
              element on the floor so the column grows up from a shared base. */}
          <div className="flex flex-col-reverse">
            {col.cells.map((cell) => (
              <GridCell
                key={cell.id}
                cell={cell}
                columnWidth={col.width}
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
          </div>
        </div>
      ))}
      <AddAffordance
        title="Agregar columna al final"
        onClick={() => addColumn(doc.columns.length)}
        className="mb-12"
      />
    </div>
  );
}
