"use client";

import { useMemo } from "react";

import { computeDespiece } from "@/lib/studio/despiece";
import { useStudioStore } from "@/store/studioStore";

import { MachiningOperationsTable } from "./MachiningOperationsTable";
import { NoGuaranteeStamp } from "./NoGuaranteeStamp";
import { PanelCutlistTable } from "./PanelCutlistTable";
import { PanelThumbnailCard } from "./PanelThumbnailCard";

export function CutlistPane() {
  const doc = useStudioStore((s) => s.doc);
  const { panels, operations } = useMemo(() => computeDespiece(doc), [doc]);

  return (
    <div className="grid h-full grid-cols-1 gap-8 overflow-auto p-6 lg:grid-cols-2">
      <div className="space-y-8">
        <section>
          <h2 className="mb-2 text-sm font-semibold text-[#d7dde9]">
            Panel cutlist
          </h2>
          <PanelCutlistTable panels={panels} />
        </section>
        <section>
          <h2 className="mb-2 text-sm font-semibold text-[#d7dde9]">
            Machining operations
          </h2>
          <MachiningOperationsTable operations={operations} />
        </section>
      </div>
      <div className="grid grid-cols-2 content-start gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {panels.map((p) => (
          <PanelThumbnailCard key={p.key} panel={p} />
        ))}
      </div>
      <NoGuaranteeStamp />
    </div>
  );
}
