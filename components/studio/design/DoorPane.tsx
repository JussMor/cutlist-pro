"use client";

import { Box, ChevronLeft } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { Viewer3D } from "../viewer/Viewer3D";

// ─── Config ─────────────────────────────────────────────────────────────────

type DoorStyle = "slab" | "shaker" | "shaker-glass";

interface DoorConfig {
  width: number;
  height: number;
  thickness: number;   // mm
  style: DoorStyle;
  stileWidth: number;  // mm
  topRail: number;     // mm
  bottomRail: number;  // mm
  midRails: number;
}

const DEFAULTS: DoorConfig = {
  width: 45, height: 200, thickness: 19,
  style: "shaker", stileWidth: 55, topRail: 55, bottomRail: 75, midRails: 0,
};

const STYLE_LABELS: Record<DoorStyle, string> = {
  slab: "Tablero", shaker: "Shaker", "shaker-glass": "Cristal",
};

// ─── Diagram ────────────────────────────────────────────────────────────────

function DoorDiagram({ cfg }: { cfg: DoorConfig }) {
  const VW = 220, VH = 340;
  const pad = 28;
  const scale = Math.min((VW - pad * 2) / cfg.width, (VH - pad * 2 - 20) / cfg.height);
  const sw = cfg.width * scale;
  const sh = cfg.height * scale;
  const ox = (VW - sw) / 2;
  const oy = pad;

  const stW = (cfg.stileWidth / 10) * scale;
  const tR  = (cfg.topRail / 10) * scale;
  const bR  = (cfg.bottomRail / 10) * scale;
  const innerX = ox + stW;
  const innerW = sw - stW * 2;
  const innerH = sh - tR - bR;
  const midH   = tR * 0.8;
  const midYs  = Array.from({ length: cfg.midRails }, (_, i) =>
    oy + tR + (innerH / (cfg.midRails + 1)) * (i + 1) - midH / 2,
  );

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="h-full max-h-72 w-auto">
      <rect x={ox} y={oy} width={sw} height={sh}
        fill="#1a2133" stroke="#3a4869" strokeWidth="1.5" rx="1" />
      {cfg.style !== "slab" && (
        <>
          <rect x={ox} y={oy} width={stW} height={sh} fill="#1e2840" />
          <rect x={ox + sw - stW} y={oy} width={stW} height={sh} fill="#1e2840" />
          <rect x={innerX} y={oy} width={innerW} height={tR} fill="#1e2840" />
          <rect x={innerX} y={oy + sh - bR} width={innerW} height={bR} fill="#1e2840" />
          <rect x={innerX} y={oy + tR} width={innerW} height={innerH}
            fill={cfg.style === "shaker-glass" ? "#111927" : "#161d2e"}
            stroke="#3a4869" strokeWidth="1" />
          {midYs.map((y, i) => (
            <rect key={i} x={innerX} y={y} width={innerW} height={midH}
              fill="#1e2840" stroke="#3a4869" strokeWidth="0.8" />
          ))}
          {cfg.style === "shaker-glass" && (
            <g clipPath="url(#glCp)">
              {Array.from({ length: 10 }, (_, i) => (
                <line key={i}
                  x1={innerX + i * (innerW / 5)} y1={oy + tR}
                  x2={innerX + i * (innerW / 5) - innerW / 2} y2={oy + sh - bR}
                  stroke="#3a4869" strokeWidth="0.8" opacity="0.4" />
              ))}
            </g>
          )}
          <defs>
            <clipPath id="glCp">
              <rect x={innerX} y={oy + tR} width={innerW} height={innerH} />
            </clipPath>
          </defs>
        </>
      )}
      <text x={VW / 2} y={oy + sh + 18} textAnchor="middle" fill="#4a5568" fontSize="10">
        {cfg.width} × {cfg.height} cm
      </text>
    </svg>
  );
}

// ─── Form ────────────────────────────────────────────────────────────────────

function Field({ label, value, step = 1, onChange }: {
  label: string; value: number; step?: number; onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-xl border border-[#1f2735] bg-[#0d1119] p-3">
      <div className="mb-1 text-[11px] uppercase tracking-wide text-[#7d879a]">{label}</div>
      <input type="number" step={step} value={value}
        onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(v); }}
        className="w-full bg-transparent text-2xl font-semibold text-[#f4b450] outline-none" />
    </div>
  );
}

function DoorControls({ cfg, set }: { cfg: DoorConfig; set: <K extends keyof DoorConfig>(k: K, v: DoorConfig[K]) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ancho (cm)"   value={cfg.width}     onChange={(v) => set("width", v)} />
        <Field label="Alto (cm)"    value={cfg.height}    onChange={(v) => set("height", v)} />
        <Field label="Grosor (mm)"  value={cfg.thickness} onChange={(v) => set("thickness", v)} />
      </div>

      <div className="rounded-xl border border-[#1f2735] bg-[#0d1119] p-3">
        <div className="mb-2 text-[11px] uppercase tracking-wide text-[#7d879a]">Estilo</div>
        <div className="flex gap-1.5">
          {(["slab", "shaker", "shaker-glass"] as const).map((s) => (
            <button key={s} type="button" onClick={() => set("style", s)}
              className={cn(
                "flex-1 rounded-lg border py-1.5 text-xs transition",
                cfg.style === s
                  ? "border-[#f4b450] bg-[#f4b450]/10 text-[#f4b450]"
                  : "border-[#1f2735] text-[#7d879a] hover:border-[#4a5568] hover:text-[#d7dde9]",
              )}>
              {STYLE_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {cfg.style !== "slab" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Montante (mm)"   value={cfg.stileWidth}   onChange={(v) => set("stileWidth", v)} />
          <Field label="Trav. sup (mm)"  value={cfg.topRail}      onChange={(v) => set("topRail", v)} />
          <Field label="Trav. inf (mm)"  value={cfg.bottomRail}   onChange={(v) => set("bottomRail", v)} />
          <div className="rounded-xl border border-[#1f2735] bg-[#0d1119] p-3">
            <div className="mb-1 text-[11px] uppercase tracking-wide text-[#7d879a]">Trav. medios</div>
            <div className="flex items-center gap-2">
              <button type="button" disabled={cfg.midRails <= 0} onClick={() => set("midRails", cfg.midRails - 1)}
                className="flex size-7 items-center justify-center rounded border border-[#1f2735] text-[#7d879a] disabled:opacity-30 hover:text-[#d7dde9]">−</button>
              <span className="flex-1 text-center text-2xl font-semibold text-[#f4b450]">{cfg.midRails}</span>
              <button type="button" disabled={cfg.midRails >= 3} onClick={() => set("midRails", cfg.midRails + 1)}
                className="flex size-7 items-center justify-center rounded border border-[#1f2735] text-[#7d879a] disabled:opacity-30 hover:text-[#d7dde9]">+</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Pane ────────────────────────────────────────────────────────────────────

export function DoorPane() {
  const [cfg, setCfg] = useState<DoorConfig>(DEFAULTS);
  const [mobileView, setMobileView] = useState<"2d" | "3d">("2d");
  const set = <K extends keyof DoorConfig>(k: K, v: DoorConfig[K]) =>
    setCfg((c) => ({ ...c, [k]: v }));

  return (
    <div className="h-full">
      {/* ── Mobile ── */}
      <div className="flex h-full flex-col lg:hidden">
        {mobileView === "2d" ? (
          <>
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[#0b0e14] p-4">
              <DoorDiagram cfg={cfg} />
            </div>
            <div className="space-y-3 border-t border-[#1c2330] p-4">
              <DoorControls cfg={cfg} set={set} />
              <button type="button" onClick={() => setMobileView("3d")}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#262d3d] bg-[#0f1218] py-2.5 text-sm font-medium text-[#9aa4b6] transition active:bg-[#11151d]">
                <Box className="size-4" /> Ver en 3D
              </button>
            </div>
          </>
        ) : (
          <div className="relative h-full bg-[#0b0e14]">
            <button type="button" onClick={() => setMobileView("2d")}
              className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-[#11151d]/90 px-3 py-1.5 text-xs font-medium text-[#d7dde9] shadow backdrop-blur">
              <ChevronLeft className="size-3.5" /> Editar
            </button>
            <Viewer3D />
          </div>
        )}
      </div>

      {/* ── Desktop ── */}
      <div className="hidden h-full lg:grid lg:grid-cols-2">
        <div className="relative flex min-h-0 flex-col border-r border-[#1c2330]">
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[#0b0e14] p-6">
            <DoorDiagram cfg={cfg} />
          </div>
          <div className="space-y-3 border-t border-[#1c2330] p-4">
            <DoorControls cfg={cfg} set={set} />
          </div>
        </div>
        <div className="relative min-h-[340px] bg-[#0b0e14]">
          <Viewer3D />
        </div>
      </div>
    </div>
  );
}
