"use client";

/**
 * CombinedProjectsPicker
 * Lets the user pull *other* saved Studio documents into the current optimizer
 * run (Option B: separate documents, aggregated at optimize time). Each added
 * document carries a unit quantity; the parent merges their panels via
 * aggregateDespiece() so a dresser + 3 nightstands nest together into one cost.
 *
 * Ephemeral by design: the selection lives in component state, not persisted.
 */
import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  fetchStudioDocs,
  loadStudioDoc,
  type StudioDocSummary,
} from "@/lib/api/client";
import type { AggregateEntry } from "@/lib/studio/aggregate";
import { cn } from "@/lib/utils";

interface PickedEntry extends AggregateEntry {
  title: string;
}

export function CombinedProjectsPicker({
  currentDocId,
  onChange,
  className,
}: {
  /** The document already loaded in the studio — excluded from the picker. */
  currentDocId: string;
  /** Fires whenever the set of extra documents (or their quantities) changes. */
  onChange: (entries: AggregateEntry[]) => void;
  className?: string;
}) {
  const [available, setAvailable] = useState<StudioDocSummary[]>([]);
  const [picked, setPicked] = useState<PickedEntry[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchStudioDocs()
      .then((docs) => {
        if (alive) setAvailable(docs);
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : "No se pudo cargar la lista");
      });
    return () => {
      alive = false;
    };
  }, []);

  // Emit the bare AggregateEntry[] upward whenever selection changes.
  useEffect(() => {
    onChange(picked.map(({ doc, quantity }) => ({ doc, quantity })));
  }, [picked, onChange]);

  const pickedIds = useMemo(() => new Set(picked.map((p) => p.doc.id)), [picked]);

  const selectable = available.filter(
    (d) => d.id !== currentDocId && !pickedIds.has(d.id),
  );

  async function addDoc(summary: StudioDocSummary) {
    setError(null);
    setLoadingId(summary.id);
    try {
      const record = await loadStudioDoc(summary.id);
      if (!record) throw new Error("Proyecto no encontrado");
      setPicked((prev) => [
        ...prev,
        { doc: record.document, quantity: 1, title: record.title },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo agregar el proyecto");
    } finally {
      setLoadingId(null);
    }
  }

  function setQty(id: string, qty: number) {
    setPicked((prev) =>
      prev.map((p) =>
        p.doc.id === id ? { ...p, quantity: Math.max(1, Math.floor(qty || 1)) } : p,
      ),
    );
  }

  function removeDoc(id: string) {
    setPicked((prev) => prev.filter((p) => p.doc.id !== id));
  }

  return (
    <div className={cn("rounded-xl border border-[#1f2735] bg-[#0d1119]/90 p-4", className)}>
      <div className="mb-1 text-xs font-semibold text-[#d7dde9]">
        Otros muebles en este cálculo
      </div>
      <p className="mb-3 text-[11px] text-[#7d879a]">
        Agrega más proyectos para optimizar y presupuestar todo junto.
      </p>

      {/* Selected furniture, each with a unit quantity */}
      {picked.length > 0 && (
        <ul className="mb-3 flex flex-col gap-1.5">
          {picked.map((p) => (
            <li
              key={p.doc.id}
              className="flex items-center gap-2 rounded-md border border-[#1f2735] bg-[#12100f] px-2 py-1.5"
            >
              <span className="flex-1 truncate text-xs text-[#d7dde9]">{p.title}</span>
              <label className="flex items-center gap-1 text-[11px] text-[#7d879a]">
                <span>×</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={p.quantity}
                  onChange={(e) => setQty(p.doc.id, parseInt(e.target.value, 10))}
                  className="w-12 rounded border border-[#1f2735] bg-transparent px-1.5 py-0.5 text-right text-[#d7dde9] outline-none focus:border-[#f4b450]"
                />
              </label>
              <button
                type="button"
                aria-label={`Quitar ${p.title}`}
                onClick={() => removeDoc(p.doc.id)}
                className="rounded p-0.5 text-[#7d879a] hover:text-[#f87171]"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add-from-list */}
      {selectable.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectable.map((d) => (
            <Button
              key={d.id}
              variant="outline"
              size="sm"
              disabled={loadingId === d.id}
              onClick={() => addDoc(d)}
              className="h-7 gap-1 text-xs"
            >
              <Plus className="size-3" />
              {loadingId === d.id ? "…" : d.title}
            </Button>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-[#5b5a58]">
          {available.length <= 1
            ? "No hay otros proyectos guardados todavía."
            : "Todos los proyectos disponibles ya están agregados."}
        </p>
      )}

      {error && <p className="mt-2 text-[11px] text-[#f87171]">{error}</p>}
    </div>
  );
}
