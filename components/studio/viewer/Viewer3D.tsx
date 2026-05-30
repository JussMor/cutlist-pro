"use client";

import { Eye, EyeOff, Layers, GitMerge, Scissors, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Box3D } from "@/lib/studio/geometry";
import { cn } from "@/lib/utils";
import { useStudioStore } from "@/store/studioStore";

const Scene = dynamic(() => import("./Scene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-xs text-[#7d879a]">
      Cargando vista 3D…
    </div>
  ),
});

/** Two deck panels are merge-compatible when they sit at the junction between
 *  adjacent stacked modules in the same column (lower module's top deck +
 *  upper module's bottom deck). */
function areMergeCompatible(a: Box3D, b: Box3D): boolean {
  if (a.role !== "deck" || b.role !== "deck") return false;
  if (a.meta?.merged || b.meta?.merged) return false;

  const colA = a.meta?.column;
  const colB = b.meta?.column;
  if (colA == null || colB == null || colA !== colB) return false;

  const modA = a.meta?.module ?? 0;
  const modB = b.meta?.module ?? 0;
  if (Math.abs(modA - modB) !== 1) return false;

  const lower = modA < modB ? a : b;
  const upper = modA < modB ? b : a;

  const ldi = lower.meta?.deckIndex;
  const ldc = lower.meta?.deckCount;
  const udi = upper.meta?.deckIndex;

  if (ldi == null || ldc == null || udi == null) return false;
  return ldi === ldc && udi === 0;
}

export function Viewer3D() {
  const doc = useStudioStore((s) => s.doc);
  const mode = useStudioStore((s) => s.renderMode);
  const colorMode = useStudioStore((s) => s.colorMode);
  const setGlobals = useStudioStore((s) => s.setGlobals);
  const toggleMergedDeck = useStudioStore((s) => s.toggleMergedDeck);

  const hiddenPanels = useMemo(
    () => doc.globals.hiddenBackPanels ?? [],
    [doc.globals.hiddenBackPanels],
  );
  const hiddenSet = useMemo(() => new Set(hiddenPanels), [hiddenPanels]);
  const hiddenCount = hiddenPanels.length;

  // ── Merge selection state ──────────────────────────────────────────────────
  const [pickA, setPickA] = useState<Box3D | null>(null);
  const [pendingMerge, setPendingMerge] = useState<{
    colId: string;
    mi: number;
  } | null>(null);

  // Reset interaction state when leaving expanded mode
  useEffect(() => {
    if (mode !== "expanded") {
      setPickA(null);
      setPendingMerge(null);
    }
  }, [mode]);

  const handleDeckClick = useCallback(
    (box: Box3D) => {
      // Merged deck → immediate unmerge
      if (box.meta?.merged) {
        const colId = doc.columns[box.meta?.column ?? 0]?.id;
        if (colId) toggleMergedDeck(colId, box.meta?.module ?? 0);
        setPickA(null);
        setPendingMerge(null);
        return;
      }

      // Deselect if same panel clicked again
      if (pickA?.id === box.id) {
        setPickA(null);
        setPendingMerge(null);
        return;
      }

      if (!pickA) {
        setPickA(box);
        setPendingMerge(null);
        return;
      }

      if (areMergeCompatible(pickA, box)) {
        const lowerMod = Math.min(
          pickA.meta?.module ?? 0,
          box.meta?.module ?? 0,
        );
        const colIdx = pickA.meta?.column ?? 0;
        const colId = doc.columns[colIdx]?.id;
        if (colId) setPendingMerge({ colId, mi: lowerMod });
        setPickA(null);
      } else {
        // Not compatible → replace first pick
        setPickA(box);
        setPendingMerge(null);
      }
    },
    [pickA, doc.columns, toggleMergedDeck],
  );

  const confirmMerge = useCallback(() => {
    if (!pendingMerge) return;
    toggleMergedDeck(pendingMerge.colId, pendingMerge.mi);
    setPendingMerge(null);
  }, [pendingMerge, toggleMergedDeck]);

  const cancelMerge = useCallback(() => {
    setPendingMerge(null);
    setPickA(null);
  }, []);

  const selectedBoxIds = useMemo(
    () => (pickA ? [pickA.id] : []),
    [pickA],
  );

  // ── Back panel visibility helpers ─────────────────────────────────────────
  const backPanelItems = useMemo(
    () =>
      doc.columns.flatMap((col, ci) =>
        col.cells.map((cell, idx) => ({
          key: `${col.id}/${cell.id}`,
          label: `Columna ${ci + 1} – Sección ${idx + 1}`,
          isHidden: hiddenSet.has(`${col.id}/${cell.id}`),
        })),
      ),
    [doc.columns, hiddenSet],
  );

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
        onToggleBackPanel={mode === "expanded" ? toggleBackPanel : undefined}
        onDeckClick={mode === "expanded" ? handleDeckClick : undefined}
        selectedBoxIds={mode === "expanded" ? selectedBoxIds : undefined}
      />

      {mode === "expanded" && (
        <>
          {/* ── Top-right overlay controls ─────────────────────────────── */}
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
                          item.isHidden
                            ? "text-[#5a6575]"
                            : "text-[#9aa4b6]",
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

            {/* Merge / split hint button */}
            <button
              type="button"
              title="Unir / separar tableros horizontales – selecciona dos tableros adyacentes de módulos apilados"
              className={cn(
                "flex size-8 items-center justify-center rounded-md bg-black/60 transition",
                pickA
                  ? "text-[#5a9a8e] ring-1 ring-[#5a9a8e]"
                  : "text-[#8a93a6] hover:bg-black/80 hover:text-[#d7dde9]",
              )}
              onClick={pickA ? cancelMerge : undefined}
            >
              <Scissors className="size-4" />
            </button>
          </div>

          {/* ── Selection hint ────────────────────────────────────────────── */}
          {pickA && !pendingMerge && (
            <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-md bg-black/70 px-3 py-1.5 text-[11px] text-[#c8d3e8]">
              Selecciona el segundo tablero para unir
            </div>
          )}

          {/* ── Merge confirmation ────────────────────────────────────────── */}
          {pendingMerge && (
            <div className="pointer-events-auto absolute left-1/2 top-2 -translate-x-1/2 flex items-center gap-2.5 rounded-lg border border-[#2a3a28] bg-[#0d1117] px-3.5 py-2 shadow-xl">
              <GitMerge className="size-4 shrink-0 text-[#5a9a6e]" />
              <span className="text-xs text-[#d7dde9]">
                ¿Unir estas dos piezas?
              </span>
              <button
                type="button"
                onClick={confirmMerge}
                className="rounded bg-[#3a7a5e] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#4a8a6e]"
              >
                Unir
              </button>
              <button
                type="button"
                onClick={cancelMerge}
                className="flex size-5 items-center justify-center rounded text-[#5a6575] hover:text-[#9aa4b6]"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
