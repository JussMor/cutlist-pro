"use client";

import { useRef } from "react";

import type { Box3D } from "@/lib/studio/geometry";
import type { ColorMode } from "@/store/studioStore";

const LONG_PRESS_MS = 600;

/** One cabinet panel as a centered box mesh. */
export function PanelMesh({
  box,
  colorMode,
  onLongPress,
  isGhosted,
}: {
  box: Box3D;
  colorMode: ColorMode;
  onLongPress?: () => void;
  isGhosted?: boolean;
}) {
  const color = colorMode === "uncolored" ? "#d7d2c8" : box.color;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelTimer = () => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  return (
    <mesh
      position={box.pos}
      rotation={box.rotation ?? [0, 0, 0]}
      onPointerDown={
        onLongPress
          ? (e) => {
              e.stopPropagation();
              timer.current = setTimeout(() => {
                timer.current = null;
                onLongPress();
              }, LONG_PRESS_MS);
            }
          : undefined
      }
      onPointerUp={onLongPress ? cancelTimer : undefined}
      onPointerLeave={onLongPress ? cancelTimer : undefined}
    >
      <boxGeometry args={box.size} />
      <meshStandardMaterial
        color={color}
        transparent={isGhosted}
        opacity={isGhosted ? 0.18 : 1}
        depthWrite={!isGhosted}
        roughness={0.62}
        metalness={0.04}
      />
    </mesh>
  );
}
