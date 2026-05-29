"use client";

import { Grid, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";

import type { StudioDocument } from "@/lib/studio/document";
import { assemblyBounds, buildAssembly, explode } from "@/lib/studio/geometry";
import type { RenderMode } from "@/store/studioStore";

import { PanelMesh } from "./PanelMesh";

export default function Scene({
  doc,
  mode,
}: {
  doc: StudioDocument;
  mode: RenderMode;
}) {
  const boxes = useMemo(() => {
    const base = buildAssembly(doc);
    return mode === "exploded" ? explode(base, 0.22) : base;
  }, [doc, mode]);

  const bounds = useMemo(() => assemblyBounds(boxes), [boxes]);
  const [cx, cy, cz] = bounds.center;
  const radius = Math.max(...bounds.size, 0.6);
  const wireframe = mode === "wireframe";

  return (
    <Canvas
      camera={{
        position: [cx + radius * 1.5, cy + radius * 1.1, cz + radius * 2],
        fov: 42,
      }}
      dpr={[1, 2]}
    >
      <color attach="background" args={["#0b0e14"]} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[6, 9, 6]} intensity={1.15} castShadow />
      <directionalLight position={[-6, 4, -5]} intensity={0.4} />
      <group>
        {boxes.map((b) => (
          <PanelMesh key={b.id} box={b} wireframe={wireframe} />
        ))}
      </group>
      <Grid
        position={[cx, bounds.min[1] - 0.002, cz]}
        args={[24, 24]}
        cellColor="#222b3a"
        sectionColor="#39445c"
        infiniteGrid
        fadeDistance={20}
        fadeStrength={2}
      />
      <OrbitControls makeDefault enableDamping target={[cx, cy, cz]} />
    </Canvas>
  );
}
