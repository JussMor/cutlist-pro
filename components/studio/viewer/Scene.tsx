"use client";

import { Html, OrbitControls } from "@react-three/drei";
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

const CUTTABLE_ROLES = new Set<Box3D["role"]>([
  "deck",
  "side",
  "back",
  "door",
  "drawer-front",
  "drawer-side",
  "drawer-back",
  "drawer-bottom",
  "drawer-inner-front",
  "shelf",
  "divider-panel",
]);

function formatCm(value: number) {
  return `${Math.round(value * 100)} cm`;
}

function roleLabel(box: Box3D) {
  if (box.role === "drawer-front") return "Frente";
  if (box.role === "drawer-side") return "Lateral x2";
  if (box.role === "drawer-back") return "Trasera";
  if (box.role === "drawer-bottom") return "Fondo";
  if (box.role === "drawer-inner-front") return "Frente int.";
  if (box.role === "side") return "Lateral";
  if (box.role === "deck") return "Tapa/Base";
  if (box.role === "shelf") return "Entrepanio";
  if (box.role === "back") return "Fondo";
  if (box.role === "door") return "Puerta";
  if (box.role === "divider-panel") return "Divisor";
  return "Pieza";
}

function panelFaceDimensions(box: Box3D): [number, number] {
  const [w, h, d] = box.size;
  if (box.role === "side" || box.role === "divider-panel") return [h, d];
  if (box.role === "deck" || box.role === "shelf" || box.role === "drawer-bottom") return [w, d];
  return [h, w];
}

function dimensionText(box: Box3D) {
  const [a, b] = panelFaceDimensions(box);
  return `${formatCm(a)} x ${formatCm(b)}`;
}

function isDrawerPart(box: Box3D) {
  return box.role.startsWith("drawer-");
}

function shouldLabelBox(box: Box3D, seenDrawerParts: Set<string>) {
  if (!CUTTABLE_ROLES.has(box.role)) return false;
  if (box.role === "drawer-inner-front") return false;
  if (isDrawerPart(box)) {
    const key = `${box.role}-${dimensionText(box)}`;
    if (seenDrawerParts.has(key)) return false;
    seenDrawerParts.add(key);
  }
  return true;
}

function DimensionLabel({ box }: { box: Box3D }) {
  const yOffset = Math.max(box.size[1] / 2 + 0.025, 0.04);
  return (
    <Html
      position={[box.pos[0], box.pos[1] + yOffset, box.pos[2]]}
      center
      distanceFactor={4.8}
      occlude={false}
      style={{ pointerEvents: "none" }}
    >
      <div className="rounded border border-black/30 bg-black/70 px-1.5 py-1 text-center text-[10px] font-semibold leading-tight text-white shadow">
        <div className="whitespace-nowrap">{roleLabel(box)}</div>
        <div className="whitespace-nowrap text-[9px] font-medium text-[#d7dde9]">
          {dimensionText(box)}
        </div>
      </div>
    </Html>
  );
}

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
  // Grouped back panel spans two adjacent columns
  if (box.meta?.columnRight != null) {
    const ciL = box.meta.column;
    const ciR = box.meta.columnRight;
    const mi = box.meta.module;
    if (ciL == null || mi == null) return null;
    const colL = doc.columns[ciL];
    const colR = doc.columns[ciR];
    if (!colL || !colR) return null;
    return `grouped/${colL.id}/${colR.id}/m${mi}`;
  }
  // Individual back panel
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
  overrideBoxes,
}: {
  doc: StudioDocument;
  mode: RenderMode;
  colorMode: ColorMode;
  onToggleBackPanel?: (key: string) => void;
  overrideBoxes?: Box3D[];
}) {
  const hiddenSet = useMemo(
    () => new Set(doc.globals.hiddenBackPanels ?? []),
    [doc.globals.hiddenBackPanels],
  );

  const boxes = useMemo(() => {
    if (overrideBoxes) return overrideBoxes.map(mirrorForView);
    // Expanded shows the cabinet disassembled with the doors flat (closed), so
    // it builds closed geometry and then explodes it; only "open" swings doors.
    const base = buildAssembly(doc, mode === "open" ? "open" : "closed");
    const laid = mode === "expanded" ? expandAssembly(base) : base;
    return laid.map(mirrorForView);
  }, [doc, mode, overrideBoxes]);

  const labeledBoxes = useMemo(() => {
    if (mode !== "expanded") return [];
    const seenDrawerParts = new Set<string>();
    return boxes.filter((box) => shouldLabelBox(box, seenDrawerParts));
  }, [boxes, mode]);

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
        {labeledBoxes.map((b) => (
          <DimensionLabel key={`dim-${b.id}`} box={b} />
        ))}
      </group>
      <DottedFloor cx={cx} y={bounds.min[1] - 0.002} cz={cz} colorMode={colorMode} />
      <OrbitControls makeDefault enableDamping target={[cx, cy, cz]} />
    </Canvas>
  );
}
