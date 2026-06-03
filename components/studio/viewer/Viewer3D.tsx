"use client";

import { Eye, EyeOff, Layers } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useMemo } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MAX_MODULE_HEIGHT_CM } from "@/lib/studio/document";
import type { StudioColumn } from "@/lib/studio/document";
import type { Box3D } from "@/lib/studio/geometry";
import { cn } from "@/lib/utils";
import { useStudioStore } from "@/store/studioStore";

const LETTERS = "ABCDEFGHIJ";

function colModuleCount(col: StudioColumn): number {
  let count = 1;
  let cumH = 0;
  for (const cell of col.cells) {
    if (cumH > 0 && cumH + cell.height > MAX_MODULE_HEIGHT_CM) { count++; cumH = 0; }
    cumH += cell.height;
  }
  return count;
}

const Scene = dynamic(() => import("./Scene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-xs text-[#7d879a]">
      Cargando vista 3D…
    </div>
  ),
});

export function Viewer3D({ overrideBoxes }: { overrideBoxes?: Box3D[] } = {}) {
  const doc = useStudioStore((s) => s.doc);
  const mode = useStudioStore((s) => s.renderMode);
  const colorMode = useStudioStore((s) => s.colorMode);
  const setGlobals = useStudioStore((s) => s.setGlobals);

  const hiddenPanels = useMemo(
    () => doc.globals.hiddenBackPanels ?? [],
    [doc.globals.hiddenBackPanels],
  );
  const hiddenSet = useMemo(() => new Set(hiddenPanels), [hiddenPanels]);
  const hiddenCount = hiddenPanels.length;

  // ── Back panel visibility helpers ─────────────────────────────────────────
  const backPanelItems = useMemo(() => {
    // Columns whose individual back panels are replaced by a grouped spanning back
    const groupedColIds = new Set<string>();
    for (const key of doc.globals.openJoints ?? []) {
      const sep = key.indexOf(":");
      if (sep >= 0) { groupedColIds.add(key.slice(0, sep)); groupedColIds.add(key.slice(sep + 1)); }
    }

    const items: { key: string; label: string; isHidden: boolean }[] = [];

    // Individual back panels — skip cells belonging to grouped column pairs
    doc.columns.forEach((col, ci) => {
      if (groupedColIds.has(col.id)) return;
      col.cells.forEach((cell, idx) => {
        const key = `${col.id}/${cell.id}`;
        items.push({ key, label: `Columna ${ci + 1} – Sección ${idx + 1}`, isHidden: hiddenSet.has(key) });
      });
    });

    // Grouped back panels — one per module per grouped pair
    for (const joint of doc.globals.openJoints ?? []) {
      const sep = joint.indexOf(":");
      if (sep < 0) continue;
      const leftColId = joint.slice(0, sep);
      const rightColId = joint.slice(sep + 1);
      const ciL = doc.columns.findIndex((c) => c.id === leftColId);
      const ciR = doc.columns.findIndex((c) => c.id === rightColId);
      if (ciL < 0 || ciR < 0) continue;
      const maxMi = Math.max(colModuleCount(doc.columns[ciL]), colModuleCount(doc.columns[ciR]));
      for (let mi = 0; mi < maxMi; mi++) {
        const key = `grouped/${leftColId}/${rightColId}/m${mi}`;
        const colLabel = `${LETTERS[ciL] ?? ciL + 1}+${LETTERS[ciR] ?? ciR + 1}`;
        const label = maxMi > 1 ? `Columnas ${colLabel} – Módulo ${mi + 1}` : `Columnas ${colLabel}`;
        items.push({ key, label, isHidden: hiddenSet.has(key) });
      }
    }

    return items;
  }, [doc.columns, doc.globals.openJoints, hiddenSet]);

  const toggleBackPanel = useCallback(
    (key: string) => {
      const current = doc.globals.hiddenBackPanels ?? [];
      const next = current.includes(key)
        ? current.filter((k) => k !== key)
        : [...current, key];
      setGlobals({ hiddenBackPanels: next });
    },
    [doc.globals.hiddenBackPanels, setGlobals],
  );

  const hideAll = useCallback(() => {
    setGlobals({ hiddenBackPanels: backPanelItems.map((p) => p.key) });
  }, [backPanelItems, setGlobals]);

  const showAll = useCallback(() => {
    setGlobals({ hiddenBackPanels: [] });
  }, [setGlobals]);

  return (
    <div className="relative h-full w-full">
      <Scene
        doc={doc}
        mode={mode}
        colorMode={colorMode}
        onToggleBackPanel={mode === "expanded" && !overrideBoxes ? toggleBackPanel : undefined}
        overrideBoxes={overrideBoxes}
      />

      {mode === "expanded" && (
        <div className="pointer-events-auto absolute right-2 top-2 flex flex-col gap-1.5">
          {/* Back panels visibility menu */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Gestionar piezas visibles"
                className="relative flex size-8 items-center justify-center rounded-md bg-black/60 text-[#8a93a6] hover:bg-black/80 hover:text-[#d7dde9]"
              >
                <Layers className="size-4" />
                {hiddenCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-[#4a7ac5] text-[8px] font-bold text-white">
                    {hiddenCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              side="bottom"
              className="w-56 border-[#1c2330] bg-[#0d1117] p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-[#d7dde9]">
                  Fondos
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={showAll}
                    className="text-[10px] text-[#8a93a6] hover:text-[#d7dde9]"
                  >
                    ver todos
                  </button>
                  <span className="text-[#3a4250]">·</span>
                  <button
                    type="button"
                    onClick={hideAll}
                    className="text-[10px] text-[#8a93a6] hover:text-[#d7dde9]"
                  >
                    ocultar todos
                  </button>
                </div>
              </div>
              {backPanelItems.length === 0 ? (
                <p className="py-2 text-center text-[11px] text-[#5a6575]">
                  Sin piezas
                </p>
              ) : (
                <div className="max-h-52 space-y-0.5 overflow-y-auto">
                  {backPanelItems.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => toggleBackPanel(item.key)}
                      className={cn(
                        "flex w-full items-center justify-between rounded px-2 py-1.5 text-left transition hover:bg-[#11151d]",
                        item.isHidden ? "text-[#5a6575]" : "text-[#9aa4b6]",
                      )}
                    >
                      <span className="text-xs">{item.label}</span>
                      {item.isHidden ? (
                        <EyeOff className="size-3.5 shrink-0 text-[#4a7ac5]" />
                      ) : (
                        <Eye className="size-3.5 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
              <p className="mt-2.5 text-[10px] text-[#3a4250]">
                Mantén presionado la pieza en 3D para alternar
              </p>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
