"use client";

import { useEffect } from "react";

import { useStudioStore } from "@/store/studioStore";

import { StudioTopNav } from "./StudioTopNav";
import { CutlistPane } from "./cutlist/CutlistPane";
import { DesignPane } from "./design/DesignPane";

export function StudioApp({ documentId }: { documentId?: string }) {
  const activeTab = useStudioStore((s) => s.activeTab);
  const load = useStudioStore((s) => s.load);

  useEffect(() => {
    if (documentId) load(documentId).catch(() => undefined);
  }, [documentId, load]);

  return (
    <div className="flex h-screen flex-col bg-[#07090d] text-[#d7dde9]">
      <StudioTopNav />
      <div className="min-h-0 flex-1">
        {activeTab === "design" ? <DesignPane /> : <CutlistPane />}
      </div>
    </div>
  );
}
