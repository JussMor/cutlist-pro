"use client";

import {
  Columns2,
  PanelLeft,
  PanelRight,
  PanelTop,
  Square,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  cellFront,
  cellInterior,
  type CellFront,
  type CellInterior,
} from "@/lib/studio/document";
import { cn } from "@/lib/utils";
import { useStudioStore } from "@/store/studioStore";

const INTERIORS: { value: CellInterior; label: string }[] = [
  { value: "empty", label: "empty" },
  { value: "shelf", label: "shelf" },
  { value: "drawer", label: "drawer" },
];

// 5-icon front-door picker: none · double · left · right · flip-up.
const FRONTS: { value: CellFront; label: string; Icon: typeof Square }[] = [
  { value: "none", label: "Ninguna", Icon: Square },
  { value: "double", label: "Doble", Icon: Columns2 },
  { value: "left", label: "Izquierda", Icon: PanelLeft },
  { value: "right", label: "Derecha", Icon: PanelRight },
  { value: "flip-up", label: "Abatible", Icon: PanelTop },
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

  const interiors = uniq(cells.map((c) => cellInterior(c)));
  const fronts = uniq(cells.map((c) => cellFront(c)));
  const heights = uniq(cells.map((c) => c.height));
  const widths = uniq(cols.map((c) => c.width));

  const interiorValue = interiors.length === 1 ? interiors[0] : undefined;
  const frontValue = fronts.length === 1 ? fronts[0] : undefined;
  const heightValue = heights.length === 1 ? heights[0] : undefined;
  const widthValue = widths.length === 1 ? widths[0] : undefined;
  const drawerCounts = uniq(cells.map((c) => c.drawerCount ?? 2));
  const shelfCounts = uniq(cells.map((c) => c.shelfCount ?? 1));
  const drawerCountValue = drawerCounts.length === 1 ? drawerCounts[0] : undefined;
  const shelfCountValue = shelfCounts.length === 1 ? shelfCounts[0] : undefined;

  return (
    <div className="rounded-xl border border-[#1f2735] bg-[#0d1119]/90 p-4 shadow-lg backdrop-blur">
      <div className="mb-3 text-xs font-semibold text-[#d7dde9]">
        {selection.length} selected
      </div>
      <div className="grid grid-cols-[64px_1fr] items-center gap-x-3 gap-y-2 text-xs">
        <label className="text-[#7d879a]">Inside</label>
        <Select
          value={interiorValue}
          onValueChange={(v) =>
            patch({
              interior: v as CellInterior,
              ...(v === "drawer" ? { drawerCount: 2 } : {}),
              ...(v === "shelf" ? { shelfCount: 1 } : {}),
            })
          }
        >
          <SelectTrigger className="border-[#f4b450]">
            <SelectValue placeholder="mixed" />
          </SelectTrigger>
          <SelectContent>
            {INTERIORS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label className="text-[#7d879a]">Door</label>
        <div className="flex gap-1">
          {FRONTS.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={frontValue === value}
              onClick={() => patch({ front: value })}
              className={cn(
                "flex flex-1 items-center justify-center rounded-md border py-1.5 transition-colors",
                frontValue === value
                  ? "border-[#f4b450] bg-[#f4b450]/15 text-[#f4b450]"
                  : "border-[#1f2735] text-[#7d879a] hover:border-[#3a4660] hover:text-[#d7dde9]",
              )}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>

        <label className="text-[#7d879a]">Width</label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            step={1}
            min={5}
            defaultValue={widthValue ?? ""}
            placeholder="mixed"
            key={`w-${selection.join(",")}`}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!Number.isNaN(v)) setWidth(v);
            }}
          />
          <span className="text-[#7d879a]">cm</span>
        </div>

        <label className="text-[#7d879a]">Height</label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            step={1}
            min={5}
            defaultValue={heightValue ?? ""}
            placeholder="mixed"
            key={`h-${selection.join(",")}`}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!Number.isNaN(v)) patch({ height: v });
            }}
          />
          <span className="text-[#7d879a]">cm</span>
        </div>

        {interiorValue === "drawer" && (
          <>
            <label className="text-[#7d879a]">Drawers</label>
            <Input
              type="number"
              step={1}
              min={1}
              defaultValue={drawerCountValue ?? ""}
              placeholder="mixed"
              key={`d-${selection.join(",")}`}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!Number.isNaN(v)) patch({ drawerCount: Math.max(1, v) });
              }}
            />
          </>
        )}

        {interiorValue === "shelf" && (
          <>
            <label className="text-[#7d879a]">Shelves</label>
            <Input
              type="number"
              step={1}
              min={0}
              defaultValue={shelfCountValue ?? ""}
              placeholder="mixed"
              key={`s-${selection.join(",")}`}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!Number.isNaN(v)) patch({ shelfCount: Math.max(0, v) });
              }}
            />
          </>
        )}
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
