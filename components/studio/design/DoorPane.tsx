"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

// ─── Config ─────────────────────────────────────────────────────────────────

type DoorStyle = "slab" | "shaker" | "shaker-glass";

interface DoorConfig {
  width: number;         // cm
  height: number;        // cm
  thickness: number;     // mm
  style: DoorStyle;
  stileWidth: number;    // mm (left/right frame)
  topRail: number;       // mm
  bottomRail: number;    // mm
  midRails: number;      // 0..3 extra horizontal rails
}

const DEFAULTS: DoorConfig = {
  width: 45,
  height: 200,
  thickness: 19,
  style: "shaker",
  stileWidth: 55,
  topRail: 55,
  bottomRail: 75,
  midRails: 0,
};

const STYLE_LABELS: Record<DoorStyle, string> = {
  slab: "Tablero",
  shaker: "Shaker",
  "shaker-glass": "Cristal",
};

// ─── Diagram ────────────────────────────────────────────────────────────────

function DoorDiagram({ cfg }: { cfg: DoorConfig }) {
  const VW = 220, VH = 340;
  const pad = 28;
  const maxW = VW - pad * 2;
  const maxH = VH - pad * 2 - 20;
  const scale = Math.min(maxW / cfg.width, maxH / cfg.height);

  const sw = cfg.width * scale;
  const sh = cfg.height * scale;
  const ox = (VW - sw) / 2;
  const oy = pad;

  const stW  = (cfg.stileWidth / 10) * scale;
  const tR   = (cfg.topRail / 10) * scale;
  const bR   = (cfg.bottomRail / 10) * scale;

  const innerX = ox + stW;
  const innerW = sw - stW * 2;

  // mid rail positions (evenly in the inner area)
  const midRailH = tR * 0.8;
  const innerH   = sh - tR - bR;
  const midRailYs = Array.from({ length: cfg.midRails }, (_, i) =>
    oy + tR + (innerH / (cfg.midRails + 1)) * (i + 1) - midRailH / 2,
  );

  const isGlass = cfg.style === "shaker-glass";

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="h-full max-h-80 w-auto">
      {/* Door outline */}
      <rect x={ox} y={oy} width={sw} height={sh}
        fill="#1a2133" stroke="#3a4869" strokeWidth="1.5" rx="1" />

      {/* Frame detail for shaker/glass */}
      {cfg.style !== "slab" && (
        <>
          {/* Left stile highlight */}
          <rect x={ox} y={oy} width={stW} height={sh}
            fill="#1e2840" stroke="none" />
          {/* Right stile */}
          <rect x={ox + sw - stW} y={oy} width={stW} height={sh}
            fill="#1e2840" stroke="none" />
          {/* Top rail */}
          <rect x={innerX} y={oy} width={innerW} height={tR}
            fill="#1e2840" stroke="none" />
          {/* Bottom rail */}
          <rect x={innerX} y={oy + sh - bR} width={innerW} height={bR}
            fill="#1e2840" stroke="none" />

          {/* Frame inner border */}
          <rect x={innerX} y={oy + tR} width={innerW} height={sh - tR - bR}
            fill={isGlass ? "#111927" : "#161d2e"} stroke="#3a4869" strokeWidth="1" />

          {/* Mid rails */}
          {midRailYs.map((y, i) => (
            <rect key={i} x={innerX} y={y} width={innerW} height={midRailH}
              fill="#1e2840" stroke="#3a4869" strokeWidth="0.8" />
          ))}

          {/* Glass hatch */}
          {isGlass && (
            <g clipPath="url(#glassCp)">
              {Array.from({ length: 12 }, (_, i) => (
                <line key={i}
                  x1={innerX + i * (innerW / 6)} y1={oy + tR}
                  x2={innerX + i * (innerW / 6) - innerW / 2} y2={oy + sh - bR}
                  stroke="#3a4869" strokeWidth="0.8" opacity="0.5" />
              ))}
            </g>
          )}
          <defs>
            <clipPath id="glassCp">
              <rect x={innerX} y={oy + tR} width={innerW} height={sh - tR - bR} />
            </clipPath>
          </defs>
        </>
      )}

      {/* Width dimension */}
      <line x1={ox} y1={oy + sh + 12} x2={ox + sw} y2={oy + sh + 12}
        stroke="#4a5568" strokeWidth="1" />
      <text x={ox + sw / 2} y={oy + sh + 22} textAnchor="middle" fill="#7d879a" fontSize="10">
        {cfg.width} cm
      </text>

      {/* Height dimension */}
      <line x1={ox - 10} y1={oy} x2={ox - 10} y2={oy + sh}
        stroke="#4a5568" strokeWidth="1" />
      <text x={ox - 14} y={oy + sh / 2} textAnchor="middle" fill="#7d879a" fontSize="10"
        transform={`rotate(-90,${ox - 14},${oy + sh / 2})`}>
        {cfg.height} cm
      </text>
    </svg>
  );
}

// ─── Field helpers ───────────────────────────────────────────────────────────

function Field({
  label, value, unit, step = 1, min = 0, onChange,
}: {
  label: string; value: number; unit: string;
  step?: number; min?: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-[#7d879a]">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number" step={step} min={min} value={value}
          onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(v); }}
          className="w-16 rounded border border-[#1f2735] bg-[#0d1119] px-2 py-1 text-right text-sm text-[#f4b450] outline-none focus:border-[#3a4559]"
        />
        <span className="w-6 shrink-0 text-xs text-[#4a5568]">{unit}</span>
      </div>
    </div>
  );
}

function Stepper({ label, value, min = 0, max = 3, onChange }: {
  label: string; value: number; min?: number; max?: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-[#7d879a]">{label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="flex h-6 w-6 items-center justify-center rounded border border-[#1f2735] text-[#7d879a] disabled:opacity-30 hover:text-[#d7dde9]">
          −
        </button>
        <span className="w-5 text-center text-sm text-[#f4b450]">{value}</span>
        <button type="button" disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className="flex h-6 w-6 items-center justify-center rounded border border-[#1f2735] text-[#7d879a] disabled:opacity-30 hover:text-[#d7dde9]">
          +
        </button>
      </div>
    </div>
  );
}

// ─── Pane ────────────────────────────────────────────────────────────────────

export function DoorPane() {
  const [cfg, setCfg] = useState<DoorConfig>(DEFAULTS);
  const set = <K extends keyof DoorConfig>(k: K, v: DoorConfig[K]) =>
    setCfg((c) => ({ ...c, [k]: v }));

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Diagram */}
      <div className="flex min-h-[280px] flex-1 items-center justify-center bg-[#0b0e14] p-6">
        <DoorDiagram cfg={cfg} />
      </div>

      {/* Controls */}
      <div className="shrink-0 space-y-5 overflow-y-auto border-t border-[#1c2330] p-4 lg:w-64 lg:border-l lg:border-t-0">
        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4a5568]">Dimensiones</p>
          <Field label="Ancho" value={cfg.width} unit="cm" onChange={(v) => set("width", v)} />
          <Field label="Alto" value={cfg.height} unit="cm" onChange={(v) => set("height", v)} />
          <Field label="Grosor" value={cfg.thickness} unit="mm" onChange={(v) => set("thickness", v)} />
        </section>

        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4a5568]">Estilo</p>
          <div className="flex gap-1">
            {(["slab", "shaker", "shaker-glass"] as const).map((s) => (
              <button key={s} type="button" onClick={() => set("style", s)}
                className={cn(
                  "flex-1 rounded py-1.5 text-xs transition",
                  cfg.style === s
                    ? "bg-[#e8eaee] font-medium text-[#0b0e14]"
                    : "border border-[#1f2735] text-[#7d879a] hover:text-[#d7dde9]",
                )}>
                {STYLE_LABELS[s]}
              </button>
            ))}
          </div>
        </section>

        {cfg.style !== "slab" && (
          <section className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4a5568]">Marco</p>
            <Field label="Montante" value={cfg.stileWidth} unit="mm" onChange={(v) => set("stileWidth", v)} />
            <Field label="Travesaño sup." value={cfg.topRail} unit="mm" onChange={(v) => set("topRail", v)} />
            <Field label="Travesaño inf." value={cfg.bottomRail} unit="mm" onChange={(v) => set("bottomRail", v)} />
            <Stepper label="Travesaños medios" value={cfg.midRails} max={3} onChange={(v) => set("midRails", v)} />
          </section>
        )}
      </div>
    </div>
  );
}
