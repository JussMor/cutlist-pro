"use client";

import { ROLE_COLORS } from "@/lib/studio/colors";
import type { StudioPanel } from "@/lib/studio/despiece";

const ROLE_TO_COLOR: Record<StudioPanel["role"], string> = {
  "back-panel": ROLE_COLORS.back,
  "horizontal-deck": ROLE_COLORS.deck,
  "vertical-side": ROLE_COLORS.side,
  door: ROLE_COLORS.door,
  "drawer-front": ROLE_COLORS["drawer-front"],
  "drawer-side": ROLE_COLORS["drawer-side"],
  "drawer-back": ROLE_COLORS["drawer-back"],
  "drawer-bottom": ROLE_COLORS["drawer-bottom"],
  "drawer-inner-front": ROLE_COLORS["drawer-inner-front"],
};

// Lightweight SVG iso wireframe — far cheaper than a <Canvas> per card.
function isoPolys(width: number, height: number) {
  const maxW = 120;
  const maxH = 80;
  const aspect = width / height || 1;
  let fw = maxW;
  let fh = maxW / aspect;
  if (fh > maxH) {
    fh = maxH;
    fw = maxH * aspect;
  }
  const dx = 12;
  const dy = -8;
  const x0 = (156 - fw) / 2 - dx / 2;
  const y0 = (110 - fh) / 2 - dy / 2;
  const x1 = x0 + fw;
  const y1 = y0 + fh;
  return {
    front: `${x0},${y0} ${x1},${y0} ${x1},${y1} ${x0},${y1}`,
    top: `${x0},${y0} ${x1},${y0} ${x1 + dx},${y0 + dy} ${x0 + dx},${y0 + dy}`,
    side: `${x1},${y0} ${x1 + dx},${y0 + dy} ${x1 + dx},${y1 + dy} ${x1},${y1}`,
  };
}

export function PanelThumbnailCard({ panel }: { panel: StudioPanel }) {
  const color = ROLE_TO_COLOR[panel.role];
  const p = isoPolys(panel.width, panel.height);
  return (
    <div className="relative aspect-square rounded-xl border border-[#1c2330] bg-[#0d1119]">
      <svg viewBox="0 0 156 120" className="h-full w-full">
        <polygon points={p.front} fill="none" stroke={color} strokeWidth={1.6} />
        <polygon points={p.top} fill="none" stroke={color} strokeWidth={1.6} />
        <polygon points={p.side} fill="none" stroke={color} strokeWidth={1.6} />
      </svg>
      <span className="absolute bottom-2 left-2 flex size-7 items-center justify-center rounded-full bg-[#e8eaee] text-[11px] font-bold text-[#0b0e14]">
        {panel.badge}
      </span>
      <span className="absolute bottom-3 right-3 text-xs font-semibold text-[#9aa4b6]">
        ×{panel.qty}
      </span>
    </div>
  );
}
