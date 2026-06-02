"use client";

import { Box, ChevronLeft } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { Viewer3D } from "../viewer/Viewer3D";

// ─── Config ─────────────────────────────────────────────────────────────────

interface DeskConfig {
  width: number;
  depth: number;
  height: number;
  topThickness: number;  // mm
  legType: "panel" | "square";
  legThickness: number;  // mm
  legInset: number;      // cm
  apron: boolean;
  apronHeight: number;   // mm
  modesty: boolean;
}

const DEFAULTS: DeskConfig = {
  width: 140, depth: 70, height: 75,
  topThickness: 25, legType: "panel",
  legThickness: 18, legInset: 0,
  apron: false, apronHeight: 70, modesty: false,
};

// ─── Diagram ────────────────────────────────────────────────────────────────

function DeskDiagram({ cfg }: { cfg: DeskConfig }) {
  const VW = 320, VH = 220;
  const pad = 40;
  const scale = Math.min((VW - pad * 2) / cfg.width, (VH - pad * 2) / cfg.height);
  const sw = cfg.width * scale;
  const sh = cfg.height * scale;
  const ox = (VW - sw) / 2;
  const oy = pad;

  const topH  = (cfg.topThickness / 10) * scale;
  const legW  = (cfg.legThickness / 10) * scale;
  const inset = cfg.legInset * scale;
  const apronH = cfg.apron ? (cfg.apronHeight / 10) * scale : 0;
  const legY  = oy + topH + apronH;
  const legH  = sh - topH - apronH;

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full max-w-sm">
      <rect x={ox} y={oy} width={sw} height={topH}
        fill="#1a2133" stroke="#3a4869" strokeWidth="1.5" rx="1" />
      {cfg.apron && (
        <rect x={ox + inset + legW} y={oy + topH} width={sw - 2 * (inset + legW)} height={apronH}
          fill="#16192a" stroke="#3a4869" strokeWidth="1" />
      )}
      <rect x={ox + inset} y={legY} width={legW} height={legH}
        fill="#1a2133" stroke="#3a4869" strokeWidth="1.5" />
      <rect x={ox + sw - inset - legW} y={legY} width={legW} height={legH}
        fill="#1a2133" stroke="#3a4869" strokeWidth="1.5" />
      {cfg.modesty && (
        <rect x={ox + inset + legW} y={legY} width={sw - 2 * (inset + legW)} height={legH * 0.5}
          fill="#161d2e" stroke="#3a4869" strokeWidth="1" strokeDasharray="4 2" />
      )}
      <text x={VW / 2} y={oy + sh + 18} textAnchor="middle" fill="#4a5568" fontSize="10">
        {cfg.width} × {cfg.depth} × {cfg.height} cm
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

function DeskControls({ cfg, set }: { cfg: DeskConfig; set: <K extends keyof DeskConfig>(k: K, v: DeskConfig[K]) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ancho (cm)"   value={cfg.width}        onChange={(v) => set("width", v)} />
        <Field label="Fondo (cm)"   value={cfg.depth}        onChange={(v) => set("depth", v)} />
        <Field label="Altura (cm)"  value={cfg.height}       onChange={(v) => set("height", v)} />
        <Field label="Tablero (mm)" value={cfg.topThickness} onChange={(v) => set("topThickness", v)} />
      </div>

      <div className="rounded-xl border border-[#1f2735] bg-[#0d1119] p-3">
        <div className="mb-2 text-[11px] uppercase tracking-wide text-[#7d879a]">Patas</div>
        <div className="flex gap-1.5">
          {(["panel", "square"] as const).map((t) => (
            <button key={t} type="button" onClick={() => set("legType", t)}
              className={cn(
                "flex-1 rounded-lg border py-1.5 text-xs transition",
                cfg.legType === t
                  ? "border-[#f4b450] bg-[#f4b450]/10 text-[#f4b450]"
                  : "border-[#1f2735] text-[#7d879a] hover:border-[#4a5568] hover:text-[#d7dde9]",
              )}>
              {t === "panel" ? "Panel" : "Cuadrada"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Grosor pata (mm)"  value={cfg.legThickness} onChange={(v) => set("legThickness", v)} />
        <Field label="Retranqueo (cm)"   value={cfg.legInset}     onChange={(v) => set("legInset", v)} />
      </div>

      <div className="rounded-xl border border-[#1f2735] bg-[#0d1119] p-3">
        <div className="mb-2 text-[11px] uppercase tracking-wide text-[#7d879a]">Opciones</div>
        <div className="flex gap-1.5">
          {([["apron", "Traviesa"], ["modesty", "Pudor"]] as const).map(([key, label]) => (
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
      </div>
    </div>
  );
}

// ─── Pane ────────────────────────────────────────────────────────────────────

export function DeskPane() {
  const [cfg, setCfg] = useState<DeskConfig>(DEFAULTS);
  const [mobileView, setMobileView] = useState<"2d" | "3d">("2d");
  const set = <K extends keyof DeskConfig>(k: K, v: DeskConfig[K]) =>
    setCfg((c) => ({ ...c, [k]: v }));

  return (
    <div className="h-full">
      {/* ── Mobile ── */}
      <div className="flex h-full flex-col lg:hidden">
        {mobileView === "2d" ? (
          <>
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[#0b0e14] p-4">
              <DeskDiagram cfg={cfg} />
            </div>
            <div className="space-y-3 border-t border-[#1c2330] p-4">
              <DeskControls cfg={cfg} set={set} />
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
            <DeskDiagram cfg={cfg} />
          </div>
          <div className="space-y-3 border-t border-[#1c2330] p-4">
            <DeskControls cfg={cfg} set={set} />
          </div>
        </div>
        <div className="relative min-h-[340px] bg-[#0b0e14]">
          <Viewer3D />
        </div>
      </div>
    </div>
  );
}
