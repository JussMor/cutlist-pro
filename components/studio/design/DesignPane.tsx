"use client";

import { useStudioStore } from "@/store/studioStore";

import { Viewer3D } from "../viewer/Viewer3D";
import { FacadeGrid } from "./FacadeGrid";
import { GlobalControlsBar } from "./GlobalControlsBar";
import { SelectionInspector } from "./SelectionInspector";

export function DesignPane() {
  const hasSelection = useStudioStore((s) => s.selection.length > 0);

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-2">
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
  );
}
