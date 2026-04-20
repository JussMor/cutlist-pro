"use client";

import { IsoPanel } from "@/lib/domain/types";
import { ISO } from "@/lib/preview/iso";
import { useEffect, useMemo, useRef, useState } from "react";

interface Props {
  panels: IsoPanel[];
}

function panelFaces(panel: IsoPanel, scale: number) {
  const x = panel.pos.x;
  const y = panel.pos.y;
  const z = panel.pos.z;
  const w = panel.size.w;
  const d = panel.size.d;
  const h = panel.size.h;

  const top = ISO.face(
    [
      [x, y, z + h],
      [x + w, y, z + h],
      [x + w, y + d, z + h],
      [x, y + d, z + h],
    ],
    scale,
  );

  const front = ISO.face(
    [
      [x, y, z],
      [x + w, y, z],
      [x + w, y, z + h],
      [x, y, z + h],
    ],
    scale,
  );

  const side = ISO.face(
    [
      [x + w, y, z],
      [x + w, y + d, z],
      [x + w, y + d, z + h],
      [x + w, y, z + h],
    ],
    scale,
  );

  return { top, front, side };
}

function shade(hex: string, amount: number): string {
  const clamped = Math.max(-255, Math.min(255, amount));
  const raw = hex.replace("#", "");
  const num = Number.parseInt(raw, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + clamped));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + clamped));
  const b = Math.max(0, Math.min(255, (num & 0xff) + clamped));
  return `rgb(${r}, ${g}, ${b})`;
}

function buildViewBox(faces: Array<ReturnType<typeof panelFaces>>): string {
  const points = faces.flatMap((face) => [
    ...face.top,
    ...face.front,
    ...face.side,
  ]);

  if (points.length === 0) {
    return "0 0 100 100";
  }

  const xs = points.map((point) => point.sx);
  const ys = points.map((point) => point.sy);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  // Keep extra breathing room so tall modules don't look over-zoomed.
  const paddingX = Math.max(width * 0.2, 22);
  const paddingY = Math.max(height * 0.22, 22);

  return `${minX - paddingX} ${minY - paddingY} ${width + paddingX * 2} ${height + paddingY * 2}`;
}

function zoomedViewBox(baseViewBox: string, zoom: number): string {
  const parts = baseViewBox.split(" ").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) {
    return baseViewBox;
  }

  const [x, y, w, h] = parts;
  const centerX = x + w / 2;
  const centerY = y + h / 2;
  const scaledW = w / zoom;
  const scaledH = h / zoom;

  return `${centerX - scaledW / 2} ${centerY - scaledH / 2} ${scaledW} ${scaledH}`;
}

export function IsoPreview({ panels }: Props) {
  const [zoom, setZoom] = useState(1);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const sorted = ISO.sortPanels(panels);
  const scale = 1;
  const faces = useMemo(
    () =>
      sorted.map((panel) => ({
        panel,
        faces: panelFaces(panel, scale),
      })),
    [sorted],
  );
  const baseViewBox = useMemo(
    () => buildViewBox(faces.map((entry) => entry.faces)),
    [faces],
  );
  const viewBox = useMemo(
    () => zoomedViewBox(baseViewBox, zoom),
    [baseViewBox, zoom],
  );

  useEffect(() => {
    // Fit to model when geometry changes; user can zoom in/out afterwards.
    setZoom(1);
  }, [panels]);

  useEffect(() => {
    const node = shellRef.current;
    if (!node) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.deltaY < 0) {
        setZoom((current) => Math.min(4, Number((current + 0.15).toFixed(2))));
        return;
      }

      setZoom((current) => Math.max(0.5, Number((current - 0.15).toFixed(2))));
    };

    node.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      node.removeEventListener("wheel", onWheel);
    };
  }, []);

  function zoomIn() {
    setZoom((current) => Math.min(4, Number((current + 0.15).toFixed(2))));
  }

  function zoomOut() {
    setZoom((current) => Math.max(0.5, Number((current - 0.15).toFixed(2))));
  }

  function resetZoom() {
    setZoom(1);
  }

  return (
    <div className="iso-preview-shell" ref={shellRef}>
      <div className="iso-zoom-controls">
        <button
          type="button"
          className="iso-zoom-btn"
          onClick={zoomOut}
          aria-label="Zoom out"
        >
          -
        </button>
        <button
          type="button"
          className="iso-zoom-btn"
          onClick={resetZoom}
          aria-label="Reset zoom"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          className="iso-zoom-btn"
          onClick={zoomIn}
          aria-label="Zoom in"
        >
          +
        </button>
      </div>

      <svg
        viewBox={viewBox}
        width="100%"
        height="100%"
        role="img"
        aria-label="Preview isometrico"
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block" }}
      >
        {faces.map(({ panel, faces: currentFaces }) => {
          const { top, front, side } = currentFaces;

          return (
            <g key={panel.id}>
              <polygon
                points={ISO.poly(side)}
                fill={shade(panel.color, -25)}
                stroke="#242a35"
                strokeWidth="1"
              />
              <polygon
                points={ISO.poly(front)}
                fill={panel.color}
                stroke="#242a35"
                strokeWidth="1"
              />
              <polygon
                points={ISO.poly(top)}
                fill={shade(panel.color, 18)}
                stroke="#242a35"
                strokeWidth="1"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
