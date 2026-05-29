"use client";

import dynamic from "next/dynamic";

import { useStudioStore } from "@/store/studioStore";

// three.js touches WebGL/window — load the Canvas client-only so the worker
// never evaluates it during SSR (OpenNext renders on the edge).
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
  return (
    <div className="h-full w-full">
      <Scene doc={doc} mode={mode} />
    </div>
  );
}
