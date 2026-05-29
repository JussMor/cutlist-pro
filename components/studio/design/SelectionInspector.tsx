"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CellType } from "@/lib/studio/document";
import { useStudioStore } from "@/store/studioStore";

const TYPES: CellType[] = [
  "multiple",
  "shelf",
  "drawer",
  "doors",
  "left-door",
  "right-door",
];

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function SelectionInspector() {
  const doc = useStudioStore((s) => s.doc);
  const selection = useStudioStore((s) => s.selection);
  const patch = useStudioStore((s) => s.patchSelection);
  const setWidth = useStudioStore((s) => s.setSelectionWidth);
  const remove = useStudioStore((s) => s.deleteSelection);

  if (selection.length === 0) return null;

  const cells = doc.columns
    .flatMap((c) => c.cells)
    .filter((c) => selection.includes(c.id));
  const cols = doc.columns.filter((c) =>
    c.cells.some((cell) => selection.includes(cell.id)),
  );

  const types = uniq(cells.map((c) => c.type));
  const heights = uniq(cells.map((c) => c.height));
  const widths = uniq(cols.map((c) => c.width));

  const typeValue = types.length === 1 ? types[0] : undefined;
  const heightValue = heights.length === 1 ? heights[0] : undefined;
  const widthValue = widths.length === 1 ? widths[0] : undefined;

  return (
    <div className="rounded-xl border border-[#1f2735] bg-[#0d1119]/90 p-4 shadow-lg backdrop-blur">
      <div className="mb-3 text-xs font-semibold text-[#d7dde9]">
        {selection.length} selected
      </div>
      <div className="grid grid-cols-[64px_1fr] items-center gap-x-3 gap-y-2 text-xs">
        <label className="text-[#7d879a]">Type</label>
        <Select
          value={typeValue}
          onValueChange={(v) => patch({ type: v as CellType })}
        >
          <SelectTrigger className="border-[#f4b450]">
            <SelectValue placeholder="multiple" />
          </SelectTrigger>
          <SelectContent>
            {TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label className="text-[#7d879a]">Width</label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            step={0.01}
            min={0.05}
            defaultValue={widthValue ?? ""}
            placeholder="mixed"
            key={`w-${widthValue ?? "mixed"}`}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!Number.isNaN(v)) setWidth(v);
            }}
          />
          <span className="text-[#7d879a]">m</span>
        </div>

        <label className="text-[#7d879a]">Height</label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            step={0.01}
            min={0.05}
            defaultValue={heightValue ?? ""}
            placeholder="mixed"
            key={`h-${heightValue ?? "mixed"}`}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!Number.isNaN(v)) patch({ height: v });
            }}
          />
          <span className="text-[#7d879a]">m</span>
        </div>
      </div>
      <Button
        variant="destructive"
        className="mt-3 w-full"
        onClick={remove}
      >
        <Trash2 className="size-3.5" />
        Delete module
      </Button>
    </div>
  );
}
