"use client";

import dynamic from "next/dynamic";
import { useCallback } from "react";

import { useStudioStore } from "@/store/studioStore";

const Scene = dynamic(() => import("./Scene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-xs text-[#7d879a]">
      Cargando vista 3D…
    </div>
  ),
});

export function Viewer3D() {
  const doc = useStudioStore((s) => s.doc);
  const mode = useStudioStore((s) => s.renderMode);
  const colorMode = useStudioStore((s) => s.colorMode);
  const setGlobals = useStudioStore((s) => s.setGlobals);

  const hiddenCount = (doc.globals.hiddenBackPanels ?? []).length;

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

  return (
    <div className="relative h-full w-full">
      <Scene
        doc={doc}
        mode={mode}
        colorMode={colorMode}
        onToggleBackPanel={mode === "expanded" ? toggleBackPanel : undefined}
      />
      {mode === "expanded" && hiddenCount > 0 && (
        <div className="pointer-events-none absolute left-2 top-2 rounded bg-black/60 px-2 py-1 text-[10px] font-medium text-[#8a93a6]">
          {hiddenCount} fondo{hiddenCount > 1 ? "s" : ""} oculto{hiddenCount > 1 ? "s" : ""} — mantén presionado para activar
        </div>
      )}
    </div>
  );
}
