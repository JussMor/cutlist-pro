"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";

import type { StudioDocument } from "@/lib/studio/document";
import {
  assemblyBounds,
  buildAssembly,
  expandAssembly,
} from "@/lib/studio/geometry";
import type { ColorMode, RenderMode } from "@/store/studioStore";

import { PanelMesh } from "./PanelMesh";

function DottedFloor({
  cx,
  y,
  cz,
  colorMode,
}: {
  cx: number;
  y: number;
  cz: number;
  colorMode: ColorMode;
}) {
  const positions = useMemo(() => {
    const pts: number[] = [];
    const step = 0.22;
    const span = 6;
    for (let x = -span; x <= span; x += step) {
      for (let z = -span; z <= span; z += step) {
        pts.push(cx + x, y, cz + z);
      }
    }
    return new Float32Array(pts);
  }, [cx, y, cz]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color={colorMode === "colored" ? "#d5d1cc" : "#6d6865"}
        size={0.018}
        sizeAttenuation
        transparent
        opacity={0.72}
      />
    </points>
  );
}

export default function Scene({
  doc,
  mode,
  colorMode,
}: {
  doc: StudioDocument;
  mode: RenderMode;
  colorMode: ColorMode;
}) {
  const boxes = useMemo(() => {
    const base = buildAssembly(doc, mode === "closed" ? "closed" : "open");
    return mode === "expanded" ? expandAssembly(base) : base;
  }, [doc, mode]);

  const bounds = useMemo(() => assemblyBounds(boxes), [boxes]);
  const [cx, cy, cz] = bounds.center;
  const radius = Math.max(...bounds.size, 0.6);

  return (
    <Canvas
      camera={{
        position: [cx + radius * 2.7, cy + radius * 1.75, cz + radius * 3.6],
        fov: 38,
      }}
      dpr={[1, 2]}
    >
      <color attach="background" args={[colorMode === "colored" ? "#4f4c4c" : "#141211"]} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[6, 9, 6]} intensity={1.15} castShadow />
      <directionalLight position={[-6, 4, -5]} intensity={0.4} />
      <group>
        {boxes.map((b) => (
          <PanelMesh key={b.id} box={b} colorMode={colorMode} />
        ))}
      </group>
      <DottedFloor cx={cx} y={bounds.min[1] - 0.002} cz={cz} colorMode={colorMode} />
      <OrbitControls makeDefault enableDamping target={[cx, cy, cz]} />
    </Canvas>
  );
}
