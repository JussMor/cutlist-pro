"use client";

import {
  ArrowUpDown,
  Columns2,
  PanelLeft,
  PanelRight,
  PanelTop,
  Square,
  Trash2,
  Unlink,
  Link,
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
  { value: "empty", label: "Empty" },
  { value: "shelf", label: "Shelves" },
  { value: "drawer", label: "Drawers" },
  { value: "hanging", label: "Hanging" },
  { value: "divider", label: "Divider" },
  { value: "appliance", label: "Appliance" },
];

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
  const toggleSpanningFront = useStudioStore((s) => s.toggleSpanningFront);
  const toggleOpenJoint = useStudioStore((s) => s.toggleOpenJoint);

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
  const dividerCounts = uniq(cells.map((c) => c.dividerCount ?? 1));
  const drawerCountValue = drawerCounts.length === 1 ? drawerCounts[0] : undefined;
  const shelfCountValue = shelfCounts.length === 1 ? shelfCounts[0] : undefined;
  const dividerCountValue = dividerCounts.length === 1 ? dividerCounts[0] : undefined;

  // ── Spanning front detection ──────────────────────────────────────────────
  // Eligible when exactly 2 vertically adjacent cells from the same column selected
  const spanEligible = (() => {
    if (cols.length !== 1 || cells.length !== 2) return null;
    const col = cols[0];
    const i0 = col.cells.findIndex((c) => c.id === cells[0].id);
    const i1 = col.cells.findIndex((c) => c.id === cells[1].id);
    if (i0 < 0 || i1 < 0 || Math.abs(i0 - i1) !== 1) return null;
    const bottomIdx = Math.min(i0, i1);
    const topIdx = Math.max(i0, i1);
    return {
      colId: col.id,
      bottomCellId: col.cells[bottomIdx].id,
      topCellId: col.cells[topIdx].id,
    };
  })();
  const spanKey = spanEligible
    ? `${spanEligible.colId}/${spanEligible.bottomCellId}/${spanEligible.topCellId}`
    : null;
  const isSpanning = spanKey ? (doc.globals.spanningFronts ?? []).includes(spanKey) : false;

  // ── Open joint detection ─────────────────────────────────────────────────
  // Eligible when cells from exactly 2 adjacent columns are selected
  const jointEligible = (() => {
    if (cols.length !== 2) return null;
    const ci0 = doc.columns.findIndex((c) => c.id === cols[0].id);
    const ci1 = doc.columns.findIndex((c) => c.id === cols[1].id);
    if (Math.abs(ci0 - ci1) !== 1) return null;
    const leftColId = ci0 < ci1 ? cols[0].id : cols[1].id;
    const rightColId = ci0 < ci1 ? cols[1].id : cols[0].id;
    return { leftColId, rightColId };
  })();
  const jointKey = jointEligible
    ? `${jointEligible.leftColId}:${jointEligible.rightColId}`
    : null;
  const isGrouped = jointKey ? (doc.globals.openJoints ?? []).includes(jointKey) : false;

  return (
    <div className="rounded-xl border border-[#1f2735] bg-[#0d1119]/90 p-4 shadow-lg backdrop-blur">
      <div className="mb-3 text-xs font-semibold text-[#d7dde9]">
        {selection.length} selected
      </div>
      <div className="grid grid-cols-[64px_1fr] items-center gap-x-3 gap-y-2 text-xs">
        {/* Interior type */}
        <label className="text-[#7d879a]">Inside</label>
        <Select
          value={interiorValue}
          onValueChange={(v) =>
            patch({
              interior: v as CellInterior,
              ...(v === "drawer" ? { drawerCount: 2 } : {}),
              ...(v === "shelf" ? { shelfCount: 1 } : {}),
              ...(v === "divider" ? { dividerCount: 1 } : {}),
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

        {/* Door type */}
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

        {/* Width */}
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

        {/* Height */}
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

        {/* Drawer count */}
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

        {/* Shelf count */}
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

        {/* Divider count */}
        {interiorValue === "divider" && (
          <>
            <label className="text-[#7d879a]">Dividers</label>
            <Input
              type="number"
              step={1}
              min={1}
              defaultValue={dividerCountValue ?? ""}
              placeholder="mixed"
              key={`div-${selection.join(",")}`}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!Number.isNaN(v)) patch({ dividerCount: Math.max(1, v) });
              }}
            />
          </>
        )}

        {/* Shared front — only when 2 vertically adjacent cells in same column selected */}
        {spanEligible && (
          <>
            <label className="text-[#7d879a]">Shared door</label>
            <button
              type="button"
              title={isSpanning ? "Remove shared door" : "Make a single door spanning both cells"}
              onClick={() =>
                toggleSpanningFront(
                  spanEligible.colId,
                  spanEligible.bottomCellId,
                  spanEligible.topCellId,
                )
              }
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md border py-1.5 text-xs transition-colors",
                isSpanning
                  ? "border-[#f4b450] bg-[#f4b450]/15 text-[#f4b450]"
                  : "border-[#1f2735] text-[#7d879a] hover:border-[#3a4660] hover:text-[#d7dde9]",
              )}
            >
              <ArrowUpDown className="size-3.5" />
              {isSpanning ? "Shared" : "Share"}
            </button>
          </>
        )}

        {/* Group / open joint — only when cells from 2 adjacent columns selected */}
        {jointEligible && (
          <>
            <label className="text-[#7d879a]">Columns</label>
            <button
              type="button"
              title={
                isGrouped
                  ? "Restore separator panel between columns"
                  : "Remove separator panel — open the columns into one space"
              }
              onClick={() =>
                toggleOpenJoint(jointEligible.leftColId, jointEligible.rightColId)
              }
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md border py-1.5 text-xs transition-colors",
                isGrouped
                  ? "border-[#f4b450] bg-[#f4b450]/15 text-[#f4b450]"
                  : "border-[#1f2735] text-[#7d879a] hover:border-[#3a4660] hover:text-[#d7dde9]",
              )}
            >
              {isGrouped ? <Unlink className="size-3.5" /> : <Link className="size-3.5" />}
              {isGrouped ? "Ungroup" : "Group"}
            </button>
          </>
        )}
      </div>

      <Button variant="destructive" className="mt-3 w-full" onClick={remove}>
        <Trash2 className="size-3.5" />
        Delete module
      </Button>
    </div>
  );
}
