"use client";

import { Box, ChevronLeft } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { Viewer3D } from "../viewer/Viewer3D";

// ─── Config ─────────────────────────────────────────────────────────────────

type ExposedSides = "1" | "2-corner" | "3-wall" | "4-full";

interface ColumnConfig {
  colWidth: number;
  colDepth: number;
  claddingThickness: number;  // mm
  height: number;
  exposedSides: ExposedSides;
  plinth: boolean;
  plinthHeight: number;  // cm
  cap: boolean;
  capHeight: number;     // cm
}

const DEFAULTS: ColumnConfig = {
  colWidth: 30, colDepth: 30, claddingThickness: 18,
  height: 250, exposedSides: "4-full",
  plinth: false, plinthHeight: 10, cap: false, capHeight: 8,
};

const SIDES_OPTIONS: { id: ExposedSides; label: string; panels: number }[] = [
  { id: "1",        label: "1 lado",     panels: 1 },
  { id: "2-corner", label: "2 lados (L)", panels: 2 },
  { id: "3-wall",   label: "3 lados",    panels: 3 },
  { id: "4-full",   label: "4 lados",    panels: 4 },
];

// ─── Diagram (plan view) ─────────────────────────────────────────────────────

function ColumnDiagram({ cfg }: { cfg: ColumnConfig }) {
  const VW = 280, VH = 260;
  const ct = cfg.claddingThickness / 10;
  const maxDim = Math.max(cfg.colWidth + ct * 2, cfg.colDepth + ct * 2);
  const scale = Math.min((VW - 80) / maxDim, (VH - 80) / maxDim);
  const cw = cfg.colWidth * scale;
  const cd = cfg.colDepth * scale;
  const cl = ct * scale;
  const ox = (VW - cw) / 2;
  const oy = (VH - cd) / 2;

  const show4 = cfg.exposedSides === "4-full";
  const show3 = cfg.exposedSides === "3-wall";
  const showL = cfg.exposedSides === "2-corner";
  const p = "#1a2133", s = "#3a4869";

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full max-w-xs">
      <text x={VW / 2} y={14} textAnchor="middle" fill="#4a5568" fontSize="9" letterSpacing="1.5">
        VISTA PLANTA
      </text>
      {/* Front panel — always */}
      <rect x={ox} y={oy + cd} width={cw} height={cl} fill={p} stroke={s} strokeWidth="1.5" />
      {/* Back */}
      {(show4 || show3) && (
        <rect x={ox} y={oy - cl} width={cw} height={cl} fill={p} stroke={s} strokeWidth="1.5" />
      )}
      {/* Left */}
      {(show4 || show3 || showL) && (
        <rect x={show4 ? ox - cl : ox} y={show4 ? oy - cl : oy}
          width={cl} height={show4 ? cd + cl * 2 : cd}
          fill={p} stroke={s} strokeWidth="1.5" />
      )}
      {/* Right — 4 only */}
      {show4 && (
        <rect x={ox + cw} y={oy - cl} width={cl} height={cd + cl * 2}
          fill={p} stroke={s} strokeWidth="1.5" />
      )}
      {/* Column core */}
      <rect x={ox} y={oy} width={cw} height={cd}
        fill="#0d1119" stroke="#4a5568" strokeWidth="1" strokeDasharray="4 3" />
      <line x1={ox + cw / 2} y1={oy} x2={ox + cw / 2} y2={oy + cd} stroke="#4a5568" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.4" />
      <line x1={ox} y1={oy + cd / 2} x2={ox + cw} y2={oy + cd / 2} stroke="#4a5568" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.4" />
      {/* Panel count */}
      <text x={VW / 2} y={VH - 8} textAnchor="middle" fill="#4a5568" fontSize="10">
        {cfg.colWidth} × {cfg.colDepth} cm · {SIDES_OPTIONS.find((o) => o.id === cfg.exposedSides)?.panels} panel(es)
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

function ColumnControls({ cfg, set }: { cfg: ColumnConfig; set: <K extends keyof ColumnConfig>(k: K, v: ColumnConfig[K]) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ancho col (cm)"  value={cfg.colWidth}           onChange={(v) => set("colWidth", v)} />
        <Field label="Fondo col (cm)"  value={cfg.colDepth}           onChange={(v) => set("colDepth", v)} />
        <Field label="Altura (cm)"     value={cfg.height}             onChange={(v) => set("height", v)} />
        <Field label="Panel (mm)"      value={cfg.claddingThickness}  onChange={(v) => set("claddingThickness", v)} />
      </div>

      <div className="rounded-xl border border-[#1f2735] bg-[#0d1119] p-3">
        <div className="mb-2 text-[11px] uppercase tracking-wide text-[#7d879a]">Lados expuestos</div>
        <div className="flex flex-col gap-1.5">
          {SIDES_OPTIONS.map((o) => (
            <button key={o.id} type="button" onClick={() => set("exposedSides", o.id)}
              className={cn(
                "flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs transition",
                cfg.exposedSides === o.id
                  ? "border-[#f4b450] bg-[#f4b450]/10 text-[#f4b450]"
                  : "border-[#1f2735] text-[#7d879a] hover:border-[#4a5568] hover:text-[#d7dde9]",
              )}>
              <span>{o.label}</span>
              <span className={cn("font-semibold", cfg.exposedSides === o.id ? "text-[#f4b450]" : "text-[#4a5568]")}>
                {o.panels}p
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[#1f2735] bg-[#0d1119] p-3">
        <div className="mb-2 text-[11px] uppercase tracking-wide text-[#7d879a]">Extras</div>
        <div className="flex gap-1.5">
          {([["plinth", "Plinto"], ["cap", "Remate"]] as const).map(([key, label]) => (
            <button key={key} type="button" onClick={() => set(key, !cfg[key])}
              className={cn(
                "flex-1 rounded-lg border py-1.5 text-xs transition",
                cfg[key]
                  ? "border-[#f4b450] bg-[#f4b450]/10 text-[#f4b450]"
                  : "border-[#1f2735] text-[#7d879a] hover:border-[#4a5568] hover:text-[#d7dde9]",
              )}>
              {label}
            </button>
          ))}
        </div>
        {(cfg.plinth || cfg.cap) && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {cfg.plinth && (
              <Field label="Alto plinto (cm)" value={cfg.plinthHeight} onChange={(v) => set("plinthHeight", v)} />
            )}
            {cfg.cap && (
              <Field label="Alto remate (cm)" value={cfg.capHeight} onChange={(v) => set("capHeight", v)} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Pane ────────────────────────────────────────────────────────────────────

export function ColumnPane() {
  const [cfg, setCfg] = useState<ColumnConfig>(DEFAULTS);
  const [mobileView, setMobileView] = useState<"2d" | "3d">("2d");
  const set = <K extends keyof ColumnConfig>(k: K, v: ColumnConfig[K]) =>
    setCfg((c) => ({ ...c, [k]: v }));

  return (
    <div className="h-full">
      {/* ── Mobile ── */}
      <div className="flex h-full flex-col lg:hidden">
        {mobileView === "2d" ? (
          <>
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[#0b0e14] p-4">
              <ColumnDiagram cfg={cfg} />
            </div>
            <div className="space-y-3 border-t border-[#1c2330] p-4">
              <ColumnControls cfg={cfg} set={set} />
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
            <ColumnDiagram cfg={cfg} />
          </div>
          <div className="space-y-3 border-t border-[#1c2330] p-4">
            <ColumnControls cfg={cfg} set={set} />
          </div>
        </div>
        <div className="relative min-h-[340px] bg-[#0b0e14]">
          <Viewer3D />
        </div>
      </div>
    </div>
  );
}
