"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

// ─── Config ─────────────────────────────────────────────────────────────────

type ExposedSides = "1" | "2-corner" | "3-wall" | "4-full";

interface ColumnConfig {
  colWidth: number;         // cm (column face width)
  colDepth: number;         // cm (column depth)
  claddingThickness: number; // mm
  height: number;           // cm
  exposedSides: ExposedSides;
  plinth: boolean;
  plinthHeight: number;     // cm
  cap: boolean;
  capHeight: number;        // cm
}

const DEFAULTS: ColumnConfig = {
  colWidth: 30,
  colDepth: 30,
  claddingThickness: 18,
  height: 250,
  exposedSides: "4-full",
  plinth: false,
  plinthHeight: 10,
  cap: false,
  capHeight: 8,
};

const SIDES_LABELS: Record<ExposedSides, string> = {
  "1": "1 lado",
  "2-corner": "2 lados (L)",
  "3-wall": "3 lados",
  "4-full": "4 lados",
};

// Panel counts per config
const PANEL_COUNTS: Record<ExposedSides, number> = {
  "1": 1,
  "2-corner": 2,
  "3-wall": 3,
  "4-full": 4,
};

// ─── Diagram (plan / top-down view) ─────────────────────────────────────────

function ColumnDiagram({ cfg }: { cfg: ColumnConfig }) {
  const VW = 280, VH = 280;
  const pad = 50;
  const ct = cfg.claddingThickness / 10; // cm

  // Scale based on maximum dimension visible
  const totalW = cfg.colWidth + (["4-full", "3-wall"].includes(cfg.exposedSides) ? ct * 2 :
    cfg.exposedSides === "2-corner" ? ct : ct);
  const totalD = cfg.colDepth + (["4-full", "3-wall"].includes(cfg.exposedSides) ? ct * 2 :
    cfg.exposedSides === "2-corner" ? ct : 0);

  const maxW = VW - pad * 2;
  const maxH = VH - pad * 2;
  const scale = Math.min(maxW / Math.max(totalW, totalD), maxH / Math.max(totalW, totalD));

  const cw = cfg.colWidth * scale;
  const cd = cfg.colDepth * scale;
  const cl = ct * scale; // cladding thickness in SVG

  const ox = (VW - cw) / 2;
  const oy = (VH - cd) / 2;

  const show4 = cfg.exposedSides === "4-full";
  const show3 = cfg.exposedSides === "3-wall";
  const showCorner = cfg.exposedSides === "2-corner";
  const show1 = cfg.exposedSides === "1";

  const panelFill  = "#1a2133";
  const panelStroke = "#3a4869";
  const colFill    = "#0d1119";
  const colStroke  = "#4a5568";

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full max-w-xs">
      {/* PLAN VIEW label */}
      <text x={VW / 2} y={16} textAnchor="middle" fill="#4a5568" fontSize="9" letterSpacing="2">
        VISTA PLANTA
      </text>

      {/* Front panel (bottom) — always shown */}
      <rect x={ox} y={oy + cd} width={cw} height={cl}
        fill={panelFill} stroke={panelStroke} strokeWidth="1.5" />

      {/* Back panel (top) — 3-wall and 4-full */}
      {(show4 || show3) && (
        <rect x={ox} y={oy - cl} width={cw} height={cl}
          fill={panelFill} stroke={panelStroke} strokeWidth="1.5" />
      )}

      {/* Left panel — 2-corner, 3-wall, 4-full */}
      {(show4 || show3 || showCorner) && (
        <rect x={show4 ? ox - cl : ox} y={show4 ? oy - cl : oy} width={cl} height={show4 ? cd + cl * 2 : cd}
          fill={panelFill} stroke={panelStroke} strokeWidth="1.5" />
      )}

      {/* Right panel — 4-full only */}
      {show4 && (
        <rect x={ox + cw} y={oy - cl} width={cl} height={cd + cl * 2}
          fill={panelFill} stroke={panelStroke} strokeWidth="1.5" />
      )}

      {/* Column core */}
      <rect x={ox} y={oy} width={cw} height={cd}
        fill={colFill} stroke={colStroke} strokeWidth="1" strokeDasharray="4 3" />

      {/* Column center cross */}
      <line x1={ox + cw / 2} y1={oy} x2={ox + cw / 2} y2={oy + cd}
        stroke={colStroke} strokeWidth="0.6" strokeDasharray="3 3" opacity="0.5" />
      <line x1={ox} y1={oy + cd / 2} x2={ox + cw} y2={oy + cd / 2}
        stroke={colStroke} strokeWidth="0.6" strokeDasharray="3 3" opacity="0.5" />

      {/* Dimension: col width */}
      <text x={ox + cw / 2} y={VH - 12} textAnchor="middle" fill="#7d879a" fontSize="10">
        col {cfg.colWidth} × {cfg.colDepth} cm · canto {cfg.claddingThickness} mm
      </text>

      {/* Panel count badge */}
      <text x={VW / 2} y={26} textAnchor="middle" fill="#f4b450" fontSize="11" fontWeight="600">
        {PANEL_COUNTS[cfg.exposedSides]} panel{PANEL_COUNTS[cfg.exposedSides] > 1 ? "es" : ""}
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

export function ColumnPane() {
  const [cfg, setCfg] = useState<ColumnConfig>(DEFAULTS);
  const set = <K extends keyof ColumnConfig>(k: K, v: ColumnConfig[K]) =>
    setCfg((c) => ({ ...c, [k]: v }));

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Diagram */}
      <div className="flex min-h-[240px] flex-1 items-center justify-center bg-[#0b0e14] p-6">
        <ColumnDiagram cfg={cfg} />
      </div>

      {/* Controls */}
      <div className="shrink-0 space-y-5 overflow-y-auto border-t border-[#1c2330] p-4 lg:w-64 lg:border-l lg:border-t-0">
        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4a5568]">Columna</p>
          <Field label="Ancho columna" value={cfg.colWidth} unit="cm" onChange={(v) => set("colWidth", v)} />
          <Field label="Fondo columna" value={cfg.colDepth} unit="cm" onChange={(v) => set("colDepth", v)} />
          <Field label="Altura total" value={cfg.height} unit="cm" onChange={(v) => set("height", v)} />
        </section>

        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4a5568]">Revestimiento</p>
          <Field label="Grosor panel" value={cfg.claddingThickness} unit="mm" onChange={(v) => set("claddingThickness", v)} />
          <div className="space-y-1.5">
            {(["1", "2-corner", "3-wall", "4-full"] as const).map((s) => (
              <button key={s} type="button" onClick={() => set("exposedSides", s)}
                className={cn(
                  "flex w-full items-center justify-between rounded px-3 py-1.5 text-xs transition",
                  cfg.exposedSides === s
                    ? "bg-[#e8eaee] font-medium text-[#0b0e14]"
                    : "border border-[#1f2735] text-[#7d879a] hover:text-[#d7dde9]",
                )}>
                <span>{SIDES_LABELS[s]}</span>
                <span className={cn("font-semibold", cfg.exposedSides === s ? "text-[#0b0e14]" : "text-[#f4b450]")}>
                  {PANEL_COUNTS[s]}p
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4a5568]">Extras</p>
          <Toggle label="Plinto base" checked={cfg.plinth} onChange={(v) => set("plinth", v)} />
          {cfg.plinth && (
            <Field label="Alto plinto" value={cfg.plinthHeight} unit="cm" onChange={(v) => set("plinthHeight", v)} />
          )}
          <Toggle label="Remate superior" checked={cfg.cap} onChange={(v) => set("cap", v)} />
          {cfg.cap && (
            <Field label="Alto remate" value={cfg.capHeight} unit="cm" onChange={(v) => set("capHeight", v)} />
          )}
        </section>
      </div>
    </div>
  );
}
