"use client";

import type { Box3D } from "@/lib/studio/geometry";

/** One cabinet panel as a centered box mesh. */
export function PanelMesh({ box, wireframe }: { box: Box3D; wireframe: boolean }) {
  return (
    <mesh position={box.pos}>
      <boxGeometry args={box.size} />
      <meshStandardMaterial
        color={box.color}
        wireframe={wireframe}
        roughness={0.62}
        metalness={0.04}
      />
    </mesh>
  );
}
