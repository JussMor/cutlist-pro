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
  onClick,
  isGhosted,
  isSelected,
}: {
  box: Box3D;
  colorMode: ColorMode;
  onLongPress?: () => void;
  onClick?: () => void;
  isGhosted?: boolean;
  isSelected?: boolean;
}) {
  const color = colorMode === "uncolored" ? "#d7d2c8" : box.color;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const downClientXY = useRef<[number, number] | null>(null);

  const cancelTimer = () => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const matKey = `${isGhosted ? "g" : "s"}-${isSelected ? "sel" : "ns"}`;

  return (
    <mesh
      position={box.pos}
      rotation={box.rotation ?? [0, 0, 0]}
      onPointerDown={
        onLongPress || onClick
          ? (e) => {
              e.stopPropagation();
              downClientXY.current = [e.clientX, e.clientY];
              if (onLongPress) {
                timer.current = setTimeout(() => {
                  timer.current = null;
                  downClientXY.current = null;
                  onLongPress();
                }, LONG_PRESS_MS);
              }
            }
          : undefined
      }
      onPointerUp={
        onLongPress || onClick
          ? (e) => {
              cancelTimer();
              if (onClick && downClientXY.current) {
                const dx = e.clientX - downClientXY.current[0];
                const dy = e.clientY - downClientXY.current[1];
                if (dx * dx + dy * dy < 25) {
                  e.stopPropagation();
                  onClick();
                }
              }
              downClientXY.current = null;
            }
          : undefined
      }
      onPointerLeave={
        onLongPress || onClick
          ? () => {
              cancelTimer();
              downClientXY.current = null;
            }
          : undefined
      }
    >
      <boxGeometry args={box.size} />
      {/* key forces material recreation when transparent toggles — Three.js
          requires needsUpdate for that property; this is the R3F idiom. */}
      <meshStandardMaterial
        key={matKey}
        color={color}
        transparent={isGhosted}
        opacity={isGhosted ? 0.18 : 1}
        depthWrite={!isGhosted}
        roughness={isSelected ? 0.35 : 0.62}
        metalness={isSelected ? 0.18 : 0.04}
        emissive={isSelected ? "#3a7adf" : "#000000"}
        emissiveIntensity={isSelected ? 0.45 : 0}
      />
    </mesh>
  );
}
