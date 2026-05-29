"use client";

import type { Box3D } from "@/lib/studio/geometry";
import type { ColorMode } from "@/store/studioStore";

/** One cabinet panel as a centered box mesh. */
export function PanelMesh({
  box,
  colorMode,
}: {
  box: Box3D;
  colorMode: ColorMode;
}) {
  const color = colorMode === "uncolored" ? "#d7d2c8" : box.color;
  return (
    <mesh position={box.pos} rotation={box.rotation ?? [0, 0, 0]}>
      <boxGeometry args={box.size} />
      <meshStandardMaterial
        color={color}
        wireframe={false}
        roughness={0.62}
        metalness={0.04}
      />
    </mesh>
  );
}
