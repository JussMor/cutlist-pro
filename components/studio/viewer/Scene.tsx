"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";

import type { StudioDocument } from "@/lib/studio/document";
import {
  assemblyBounds,
  type Box3D,
  buildAssembly,
  expandAssembly,
} from "@/lib/studio/geometry";
import type { ColorMode, RenderMode } from "@/store/studioStore";

// The 2D facade editor lays columns out left→right with increasing x. A 3D
// *front* view (the camera sits in front of the doors, on −z) naturally mirrors
// x on screen, so a column added on the right showed up on the left. Mirror the
// built geometry across x for display only — geometry.ts stays the single
// source of truth for the despiece. Negating pos.x and the y-rotation yields a
// correctly-wound box (no inverted normals), and assemblyBounds/camera/floor
// all consume the mirrored boxes so framing stays centered.
function mirrorForView(b: Box3D): Box3D {
  return {
    ...b,
    pos: [-b.pos[0], b.pos[1], b.pos[2]],
    rotation: b.rotation
      ? [b.rotation[0], -b.rotation[1], b.rotation[2]]
      : b.rotation,
  };
}

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

/** Stable key that survives column/cell reordering within the same document. */
function backPanelKey(box: Box3D, doc: StudioDocument): string | null {
  const ci = box.meta?.column;
  const idx = box.meta?.cell;
  if (ci == null || idx == null) return null;
  const col = doc.columns[ci];
  const cell = col?.cells[idx];
  if (!col || !cell) return null;
  return `${col.id}/${cell.id}`;
}

export default function Scene({
  doc,
  mode,
  colorMode,
  onToggleBackPanel,
}: {
  doc: StudioDocument;
  mode: RenderMode;
  colorMode: ColorMode;
  onToggleBackPanel?: (key: string) => void;
}) {
  const hiddenSet = useMemo(
    () => new Set(doc.globals.hiddenBackPanels ?? []),
    [doc.globals.hiddenBackPanels],
  );

  const boxes = useMemo(() => {
    // Expanded shows the cabinet disassembled with the doors flat (closed), so
    // it builds closed geometry and then explodes it; only "open" swings doors.
    const base = buildAssembly(doc, mode === "open" ? "open" : "closed");
    const laid = mode === "expanded" ? expandAssembly(base) : base;
    return laid.map(mirrorForView);
  }, [doc, mode]);

  const bounds = useMemo(() => assemblyBounds(boxes), [boxes]);
  const [cx, cy, cz] = bounds.center;
  const radius = Math.max(...bounds.size, 0.6);

  return (
    <Canvas
      camera={{
        position: [cx + radius * 2.7, cy + radius * 1.75, cz - radius * 3.6],
        fov: 38,
      }}
      dpr={[1, 2]}
    >
      <color attach="background" args={[colorMode === "colored" ? "#4f4c4c" : "#141211"]} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[6, 9, 6]} intensity={1.15} castShadow />
      <directionalLight position={[-6, 4, -5]} intensity={0.4} />
      <group>
        {boxes.map((b) => {
          const key = b.role === "back" ? backPanelKey(b, doc) : null;
          const isGhosted = key !== null && hiddenSet.has(key);
          return (
            <PanelMesh
              key={b.id}
              box={b}
              colorMode={colorMode}
              onLongPress={
                key !== null && mode === "expanded" && onToggleBackPanel
                  ? () => onToggleBackPanel(key)
                  : undefined
              }
              isGhosted={isGhosted}
            />
          );
        })}
      </group>
      <DottedFloor cx={cx} y={bounds.min[1] - 0.002} cz={cz} colorMode={colorMode} />
      <OrbitControls makeDefault enableDamping target={[cx, cy, cz]} />
    </Canvas>
  );
}
