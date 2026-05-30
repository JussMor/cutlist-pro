"use client";

import { Box, ChevronLeft } from "lucide-react";
import { useState } from "react";

import { useStudioStore } from "@/store/studioStore";

import { Viewer3D } from "../viewer/Viewer3D";
import { FacadeGrid } from "./FacadeGrid";
import { GlobalControlsBar } from "./GlobalControlsBar";
import { SelectionInspector } from "./SelectionInspector";

export function DesignPane() {
  const hasSelection = useStudioStore((s) => s.selection.length > 0);
  const [mobileView, setMobileView] = useState<"2d" | "3d">("2d");

  return (
    <div className="h-full">
      {/* ── Mobile: one panel at a time (< lg) ── */}
      <div className="flex h-full flex-col lg:hidden">
        {mobileView === "2d" ? (
          <>
            <div className="min-h-0 flex-1 overflow-auto">
              <FacadeGrid />
            </div>
            <div className="space-y-3 border-t border-[#1c2330] p-4">
              {hasSelection ? <SelectionInspector /> : <GlobalControlsBar />}
              {/* Toggle to 3D */}
              <button
                type="button"
                onClick={() => setMobileView("3d")}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#262d3d] bg-[#0f1218] py-2.5 text-sm font-medium text-[#9aa4b6] transition active:bg-[#11151d]"
              >
                <Box className="size-4" />
                Ver en 3D
              </button>
            </div>
          </>
        ) : (
          <div className="relative h-full bg-[#0b0e14]">
            {/* Toggle back to 2D */}
            <button
              type="button"
              onClick={() => setMobileView("2d")}
              className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-[#11151d]/90 px-3 py-1.5 text-xs font-medium text-[#d7dde9] shadow backdrop-blur"
            >
              <ChevronLeft className="size-3.5" />
              Editar
            </button>
            <Viewer3D />
          </div>
        )}
      </div>

      {/* ── Desktop: side by side (≥ lg) ── */}
      <div className="hidden h-full lg:grid lg:grid-cols-2">
        <div className="relative flex min-h-0 flex-col border-r border-[#1c2330]">
          <div className="min-h-0 flex-1 overflow-auto">
            <FacadeGrid />
          </div>
          <div className="space-y-3 border-t border-[#1c2330] p-4">
            {hasSelection ? <SelectionInspector /> : <GlobalControlsBar />}
          </div>
        </div>
        <div className="relative min-h-[340px] bg-[#0b0e14]">
          <Viewer3D />
        </div>
      </div>
    </div>
  );
}
