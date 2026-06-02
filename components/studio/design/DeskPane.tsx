"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

// ─── Config ─────────────────────────────────────────────────────────────────

interface DeskConfig {
  width: number;           // cm
  depth: number;           // cm
  height: number;          // cm
  topThickness: number;    // mm
  legType: "panel" | "square";
  legThickness: number;    // mm  (square leg: same for both dims)
  legInset: number;        // cm from edge
  apron: boolean;          // perimeter rail under tabletop
  apronHeight: number;     // mm
  modesty: boolean;        // front modesty panel
}

const DEFAULTS: DeskConfig = {
  width: 140,
  depth: 70,
  height: 75,
  topThickness: 25,
  legType: "panel",
  legThickness: 18,
  legInset: 0,
  apron: false,
  apronHeight: 70,
  modesty: false,
};

// ─── Diagram ────────────────────────────────────────────────────────────────

function DeskDiagram({ cfg }: { cfg: DeskConfig }) {
  const VW = 300, VH = 220;
  const pad = 36;
  const maxW = VW - pad * 2;
  const maxH = VH - pad * 2;
  const scale = Math.min(maxW / cfg.width, maxH / cfg.height);

  const sw = cfg.width * scale;
  const sh = cfg.height * scale;
  const ox = (VW - sw) / 2;
  const oy = pad;

  const topH  = (cfg.topThickness / 10) * scale;
  const legW  = (cfg.legThickness / 10) * scale;
  const inset = cfg.legInset * scale;
  const bodyY = oy + topH;
  const bodyH = sh - topH;

  const apronH  = (cfg.apronHeight / 10) * scale;
  const legBodyY = cfg.apron ? bodyY + apronH : bodyY;
  const legBodyH = cfg.apron ? bodyH - apronH : bodyH;

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full max-w-sm">
      {/* Tabletop */}
      <rect x={ox} y={oy} width={sw} height={topH}
        fill="#1a2133" stroke="#3a4869" strokeWidth="1.2" rx="1" />

      {/* Apron rail */}
      {cfg.apron && (
        <rect x={ox + inset + legW} y={bodyY} width={sw - 2 * (inset + legW)} height={apronH}
          fill="#16192a" stroke="#3a4869" strokeWidth="1" />
      )}

      {/* Left leg */}
      <rect x={ox + inset} y={legBodyY} width={legW} height={legBodyH}
        fill="#1a2133" stroke="#3a4869" strokeWidth="1.2" />

      {/* Right leg */}
      <rect x={ox + sw - inset - legW} y={legBodyY} width={legW} height={legBodyH}
        fill="#1a2133" stroke="#3a4869" strokeWidth="1.2" />

      {/* Modesty panel */}
      {cfg.modesty && (
        <rect x={ox + inset + legW} y={legBodyY} width={sw - 2 * (inset + legW)} height={legBodyH * 0.5}
          fill="#161d2e" stroke="#3a4869" strokeWidth="1" strokeDasharray="4 2" />
      )}

      {/* Depth tick (perspective hint) */}
      <line x1={ox + sw} y1={oy} x2={ox + sw + 10} y2={oy - 6}
        stroke="#3a4869" strokeWidth="1" />
      <line x1={ox + sw} y1={oy + topH} x2={ox + sw + 10} y2={oy + topH - 6}
        stroke="#3a4869" strokeWidth="1" />
      <text x={ox + sw + 13} y={oy + topH / 2 - 2} fill="#7d879a" fontSize="9" dominantBaseline="middle">
        {cfg.depth}
      </text>

      {/* Width dimension */}
      <line x1={ox} y1={oy + sh + 10} x2={ox + sw} y2={oy + sh + 10}
        stroke="#4a5568" strokeWidth="1" markerStart="url(#a)" markerEnd="url(#a)" />
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

      <defs>
        <marker id="a" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
          <path d="M0,0 L4,2 L0,4" fill="none" stroke="#4a5568" strokeWidth="1" />
        </marker>
      </defs>
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
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "h-4 w-7 rounded-full transition",
          checked ? "bg-[#f4b450]" : "bg-[#1f2735]",
        )}
      >
        <span className={cn(
          "block h-3 w-3 translate-x-0.5 rounded-full bg-[#0d1119] transition",
          checked && "translate-x-3.5",
        )} />
      </button>
      <span className="text-xs text-[#7d879a]">{label}</span>
    </label>
  );
}

// ─── Pane ────────────────────────────────────────────────────────────────────

export function DeskPane() {
  const [cfg, setCfg] = useState<DeskConfig>(DEFAULTS);
  const set = <K extends keyof DeskConfig>(k: K, v: DeskConfig[K]) =>
    setCfg((c) => ({ ...c, [k]: v }));

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Diagram */}
      <div className="flex min-h-[220px] flex-1 items-center justify-center bg-[#0b0e14] p-6">
        <DeskDiagram cfg={cfg} />
      </div>

      {/* Controls */}
      <div className="shrink-0 space-y-5 overflow-y-auto border-t border-[#1c2330] p-4 lg:w-64 lg:border-l lg:border-t-0">
        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4a5568]">Tablero</p>
          <Field label="Ancho" value={cfg.width} unit="cm" onChange={(v) => set("width", v)} />
          <Field label="Fondo" value={cfg.depth} unit="cm" onChange={(v) => set("depth", v)} />
          <Field label="Altura total" value={cfg.height} unit="cm" onChange={(v) => set("height", v)} />
          <Field label="Grosor" value={cfg.topThickness} unit="mm" onChange={(v) => set("topThickness", v)} />
        </section>

        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4a5568]">Patas</p>
          <div className="flex gap-1.5">
            {(["panel", "square"] as const).map((t) => (
              <button key={t} type="button" onClick={() => set("legType", t)}
                className={cn(
                  "flex-1 rounded py-1.5 text-xs transition",
                  cfg.legType === t
                    ? "bg-[#e8eaee] font-medium text-[#0b0e14]"
                    : "border border-[#1f2735] text-[#7d879a] hover:text-[#d7dde9]",
                )}>
                {t === "panel" ? "Panel" : "Cuadrada"}
              </button>
            ))}
          </div>
          <Field label="Grosor" value={cfg.legThickness} unit="mm" onChange={(v) => set("legThickness", v)} />
          <Field label="Retranqueo" value={cfg.legInset} unit="cm" min={0} onChange={(v) => set("legInset", v)} />
        </section>

        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4a5568]">Opciones</p>
          <Toggle label="Traviesa/apron" checked={cfg.apron} onChange={(v) => set("apron", v)} />
          {cfg.apron && (
            <Field label="Alto traviesa" value={cfg.apronHeight} unit="mm" onChange={(v) => set("apronHeight", v)} />
          )}
          <Toggle label="Panel de pudor" checked={cfg.modesty} onChange={(v) => set("modesty", v)} />
        </section>
      </div>
    </div>
  );
}
