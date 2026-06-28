"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { getActiveStudioDocId, useStudioStore } from "@/store/studioStore";

import { StudioTopNav } from "./StudioTopNav";
import { CutlistPane } from "./cutlist/CutlistPane";
import { DesignPane } from "./design/DesignPane";

export function StudioApp({ documentId }: { documentId?: string }) {
  const router = useRouter();
  const activeTab = useStudioStore((s) => s.activeTab);
  const load = useStudioStore((s) => s.load);
  const newDocument = useStudioStore((s) => s.newDocument);

  useEffect(() => {
    if (documentId) {
      load(documentId).catch(() => undefined);
      return;
    }
    const forceNew =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("new") === "1";
    if (forceNew) {
      newDocument();
      return;
    }
    const activeDocId = getActiveStudioDocId();
    if (activeDocId) {
      router.replace(`/studio/${activeDocId}`);
      load(activeDocId).catch(() => undefined);
      return;
    }
    newDocument();
  }, [documentId, load, newDocument, router]);

  return (
    <div className="flex h-screen flex-col bg-[#07090d] text-[#d7dde9]">
      <StudioTopNav />
      <div className="min-h-0 flex-1">
        {activeTab === "design" ? <DesignPane /> : <CutlistPane />}
      </div>
    </div>
  );
}
