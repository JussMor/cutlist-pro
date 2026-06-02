"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

// ─── Config ─────────────────────────────────────────────────────────────────

type SinkType = "none" | "single" | "double";

interface VanityConfig {
  width: number;           // cm
  depth: number;           // cm
  carcassHeight: number;   // cm (cabinet body, without top)
  topThickness: number;    // mm
  overhangFront: number;   // cm
  overhangSide: number;    // cm
  backsplash: boolean;
  backsplashHeight: number; // cm
  sinkType: SinkType;
  cutoutWidth: number;     // cm
  cutoutDepth: number;     // cm
}

const DEFAULTS: VanityConfig = {
  width: 90,
  depth: 55,
  carcassHeight: 68,
  topThickness: 20,
  overhangFront: 2,
  overhangSide: 0,
  backsplash: false,
  backsplashHeight: 10,
  sinkType: "single",
  cutoutWidth: 40,
  cutoutDepth: 35,
};

const SINK_LABELS: Record<SinkType, string> = {
  none: "Sin seno",
  single: "1 seno",
  double: "2 senos",
};

// ─── Diagram ────────────────────────────────────────────────────────────────

function VanityDiagram({ cfg }: { cfg: VanityConfig }) {
  const VW = 300, VH = 260;
  const pad = 32;
  const maxW = VW - pad * 2;
  const topCm = cfg.topThickness / 10;
  const totalH = cfg.carcassHeight + topCm + (cfg.backsplash ? cfg.backsplashHeight : 0);
  const maxH = VH - pad * 2;
  const scale = Math.min(maxW / cfg.width, maxH / totalH);

  const ovhSide = cfg.overhangSide * scale;
  const cw = cfg.width * scale;
  const oy = pad;

  // countertop (wider due to overhang)
  const topW = cw + ovhSide * 2;
  const topH = topCm * scale;
  const topX = (VW - topW) / 2;
  const topY = oy + (cfg.backsplash ? cfg.backsplashHeight * scale : 0);

  // carcass
  const carcassH = cfg.carcassHeight * scale;
  const carcassX = (VW - cw) / 2;
  const carcassY = topY + topH;

  // sink cutout on top face
  const cutW = cfg.cutoutWidth * scale;
  const cutX2 = topX + topW / 2 + cutW / 2; // right edge of cutout

  // double sink
  const sinkSpacing = (topW - cutW * 2) / 3;

  // backsplash
  const bsH = cfg.backsplash ? cfg.backsplashHeight * scale : 0;
  const bsX = carcassX;
  const bsY = oy;

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full max-w-sm">
      {/* Backsplash */}
      {cfg.backsplash && (
        <rect x={bsX} y={bsY} width={cw} height={bsH}
          fill="#161d2e" stroke="#3a4869" strokeWidth="1" />
      )}

      {/* Countertop */}
      <rect x={topX} y={topY} width={topW} height={topH}
        fill="#1a2133" stroke="#3a4869" strokeWidth="1.5" rx="1" />

      {/* Sink cutout(s) on countertop */}
      {cfg.sinkType === "single" && (
        <rect
          x={topX + topW / 2 - cutW / 2} y={topY + 1}
          width={cutW} height={topH - 2}
          fill="#0d1119" stroke="#f4b450" strokeWidth="1" strokeDasharray="3 2" rx="1"
        />
      )}
      {cfg.sinkType === "double" && (
        <>
          <rect x={topX + sinkSpacing} y={topY + 1}
            width={cutW} height={topH - 2}
            fill="#0d1119" stroke="#f4b450" strokeWidth="1" strokeDasharray="3 2" rx="1" />
          <rect x={topX + sinkSpacing * 2 + cutW} y={topY + 1}
            width={cutW} height={topH - 2}
            fill="#0d1119" stroke="#f4b450" strokeWidth="1" strokeDasharray="3 2" rx="1" />
        </>
      )}

      {/* Carcass */}
      <rect x={carcassX} y={carcassY} width={cw} height={carcassH}
        fill="#131825" stroke="#3a4869" strokeWidth="1.5" />

      {/* Door / front hint lines */}
      {[0.3, 0.7].map((f, i) => (
        <line key={i}
          x1={carcassX + cw * f} y1={carcassY + 4}
          x2={carcassX + cw * f} y2={carcassY + carcassH - 4}
          stroke="#3a4869" strokeWidth="0.8" strokeDasharray="3 3" />
      ))}

      {/* Overhang arrows */}
      {cfg.overhangFront > 0 && (
        <text x={VW / 2} y={carcassY + carcassH + 20}
          textAnchor="middle" fill="#7d879a" fontSize="9">
          vuelo frontal {cfg.overhangFront} cm
        </text>
      )}

      {/* Width dimension */}
      <line x1={topX} y1={topY + topH + carcassH + 14} x2={topX + topW} y2={topY + topH + carcassH + 14}
        stroke="#4a5568" strokeWidth="1" />
      <text x={VW / 2} y={topY + topH + carcassH + 24}
        textAnchor="middle" fill="#7d879a" fontSize="10">
        {cfg.width} cm
      </text>

      {/* Height dimension */}
      <line x1={topX - 10} y1={topY} x2={topX - 10} y2={topY + topH + carcassH}
        stroke="#4a5568" strokeWidth="1" />
      <text x={topX - 14} y={topY + (topH + carcassH) / 2}
        textAnchor="middle" fill="#7d879a" fontSize="10"
        transform={`rotate(-90,${topX - 14},${topY + (topH + carcassH) / 2})`}>
        {cfg.carcassHeight + cfg.topThickness / 10} cm
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

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <button type="button" onClick={() => onChange(!checked)}
        className={cn("h-4 w-7 rounded-full transition", checked ? "bg-[#f4b450]" : "bg-[#1f2735]")}>
        <span className={cn("block h-3 w-3 translate-x-0.5 rounded-full bg-[#0d1119] transition", checked && "translate-x-3.5")} />
      </button>
      <span className="text-xs text-[#7d879a]">{label}</span>
    </label>
  );
}

// ─── Pane ────────────────────────────────────────────────────────────────────

export function VanityPane() {
  const [cfg, setCfg] = useState<VanityConfig>(DEFAULTS);
  const set = <K extends keyof VanityConfig>(k: K, v: VanityConfig[K]) =>
    setCfg((c) => ({ ...c, [k]: v }));

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Diagram */}
      <div className="flex min-h-[220px] flex-1 items-center justify-center bg-[#0b0e14] p-6">
        <VanityDiagram cfg={cfg} />
      </div>

      {/* Controls */}
      <div className="shrink-0 space-y-5 overflow-y-auto border-t border-[#1c2330] p-4 lg:w-64 lg:border-l lg:border-t-0">
        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4a5568]">Carcasa</p>
          <Field label="Ancho" value={cfg.width} unit="cm" onChange={(v) => set("width", v)} />
          <Field label="Fondo" value={cfg.depth} unit="cm" onChange={(v) => set("depth", v)} />
          <Field label="Alto carcasa" value={cfg.carcassHeight} unit="cm" onChange={(v) => set("carcassHeight", v)} />
        </section>

        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4a5568]">Encimera</p>
          <Field label="Grosor" value={cfg.topThickness} unit="mm" onChange={(v) => set("topThickness", v)} />
          <Field label="Vuelo frontal" value={cfg.overhangFront} unit="cm" min={0} onChange={(v) => set("overhangFront", v)} />
          <Field label="Vuelo lateral" value={cfg.overhangSide} unit="cm" min={0} onChange={(v) => set("overhangSide", v)} />
        </section>

        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4a5568]">Seno</p>
          <div className="flex gap-1">
            {(["none", "single", "double"] as const).map((s) => (
              <button key={s} type="button" onClick={() => set("sinkType", s)}
                className={cn(
                  "flex-1 rounded py-1.5 text-xs transition",
                  cfg.sinkType === s
                    ? "bg-[#e8eaee] font-medium text-[#0b0e14]"
                    : "border border-[#1f2735] text-[#7d879a] hover:text-[#d7dde9]",
                )}>
                {SINK_LABELS[s]}
              </button>
            ))}
          </div>
          {cfg.sinkType !== "none" && (
            <>
              <Field label="Ancho hueco" value={cfg.cutoutWidth} unit="cm" onChange={(v) => set("cutoutWidth", v)} />
              <Field label="Fondo hueco" value={cfg.cutoutDepth} unit="cm" onChange={(v) => set("cutoutDepth", v)} />
            </>
          )}
        </section>

        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4a5568]">Opciones</p>
          <Toggle label="Salpicadero" checked={cfg.backsplash} onChange={(v) => set("backsplash", v)} />
          {cfg.backsplash && (
            <Field label="Alto salpicadero" value={cfg.backsplashHeight} unit="cm" onChange={(v) => set("backsplashHeight", v)} />
          )}
        </section>
      </div>
    </div>
  );
}
