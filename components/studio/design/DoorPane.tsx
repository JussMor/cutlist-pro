"use client";

import { Box, ChevronLeft } from "lucide-react";
import { useMemo, useState } from "react";

import type { Box3D } from "@/lib/studio/geometry";
import { cn } from "@/lib/utils";

import { Viewer3D } from "../viewer/Viewer3D";

// ─── Config ──────────────────────────────────────────────────────────────────

type DoorStyle = "slab" | "shaker" | "shaker-glass";

interface DoorConfig {
  // Leaf (hoja)
  width: number;         // cm — leaf width
  height: number;        // cm — leaf height
  thickness: number;     // mm
  style: DoorStyle;
  stileWidth: number;    // mm
  topRail: number;       // mm
  bottomRail: number;    // mm
  midRails: number;
  // Batientes (clearances leaf → opening)
  sidesGap: number;      // mm each side
  topGap: number;        // mm
  bottomGap: number;     // mm
  // Tapa marcos
  tapaMarco: boolean;
  tapaMarcoSides: 1 | 2;
  tapaMarcoWidth: number;    // cm
  tapaMarcoThickness: number; // mm
}

const DEFAULTS: DoorConfig = {
  width: 82.5, height: 203, thickness: 40,
  style: "shaker", stileWidth: 95, topRail: 95, bottomRail: 120, midRails: 0,
  sidesGap: 2, topGap: 2, bottomGap: 5,
  tapaMarco: false, tapaMarcoSides: 2, tapaMarcoWidth: 7, tapaMarcoThickness: 12,
};

const STYLE_LABELS: Record<DoorStyle, string> = {
  slab: "Tablero", shaker: "Shaker", "shaker-glass": "Cristal",
};

// ─── Derived geometry helpers ─────────────────────────────────────────────────

function opening(cfg: DoorConfig) {
  return {
    w: cfg.width  + 2 * (cfg.sidesGap  / 10),  // cm
    h: cfg.height + (cfg.topGap + cfg.bottomGap) / 10,  // cm
  };
}

function tapaMarcoQty(cfg: DoorConfig) {
  if (!cfg.tapaMarco) return { legs: 0, heads: 0, pieces: [] as { label: string; w: number; h: number }[] };
  const op   = opening(cfg);
  const tmW  = cfg.tapaMarcoWidth;
  const legH = +(op.h.toFixed(1));
  const headW = +(( op.w + 2 * tmW ).toFixed(1));
  const legQty  = 2 * cfg.tapaMarcoSides;
  const headQty = 1 * cfg.tapaMarcoSides;
  const pieces = [
    { label: `Montante (×${legQty})`,  w: tmW,   h: legH   },
    { label: `Cabecero (×${headQty})`, w: headW, h: tmW    },
  ];
  return { legs: legQty, heads: headQty, pieces };
}

// ─── 3D Geometry ─────────────────────────────────────────────────────────────

const mm3 = (v: number) => v / 1000;
const cm3 = (v: number) => v / 100;

function doorToBoxes(cfg: DoorConfig): Box3D[] {
  const W = cm3(cfg.width);
  const H = cm3(cfg.height);
  const T = mm3(cfg.thickness);
  const sidesGap = mm3(cfg.sidesGap);
  const topGap = mm3(cfg.topGap);
  const bottomGap = mm3(cfg.bottomGap);

  const boxes: Box3D[] = [];

  // Door leaf — bottom at bottomGap above floor
  boxes.push({
    id: "door-leaf",
    role: "door",
    pos: [0, bottomGap + H / 2, T / 2],
    size: [W, H, T],
    color: "#f4b450",
  });

  if (cfg.tapaMarco) {
    const openW = W + 2 * sidesGap;
    const openH = H + topGap + bottomGap;
    const tmW = cm3(cfg.tapaMarcoWidth);
    const tmT = mm3(cfg.tapaMarcoThickness);

    // Left casing
    boxes.push({
      id: "tm-left",
      role: "side",
      pos: [-(openW / 2 + tmW / 2), openH / 2, tmT / 2],
      size: [tmW, openH, tmT],
      color: "#2f88ff",
    });
    // Right casing
    boxes.push({
      id: "tm-right",
      role: "side",
      pos: [+(openW / 2 + tmW / 2), openH / 2, tmT / 2],
      size: [tmW, openH, tmT],
      color: "#2f88ff",
    });
    // Top header
    boxes.push({
      id: "tm-top",
      role: "deck",
      pos: [0, openH + tmW / 2, tmT / 2],
      size: [openW + 2 * tmW, tmW, tmT],
      color: "#2fd06a",
    });
    // Second set of casings on back face for tapaMarcoSides === 2
    if (cfg.tapaMarcoSides === 2) {
      const backZ = T + tmT / 2;
      boxes.push({
        id: "tm-left-back",
        role: "side",
        pos: [-(openW / 2 + tmW / 2), openH / 2, backZ],
        size: [tmW, openH, tmT],
        color: "#2f88ff",
      });
      boxes.push({
        id: "tm-right-back",
        role: "side",
        pos: [+(openW / 2 + tmW / 2), openH / 2, backZ],
        size: [tmW, openH, tmT],
        color: "#2f88ff",
      });
      boxes.push({
        id: "tm-top-back",
        role: "deck",
        pos: [0, openH + tmW / 2, backZ],
        size: [openW + 2 * tmW, tmW, tmT],
        color: "#2fd06a",
      });
    }
  }

  return boxes;
}

// ─── Diagram ─────────────────────────────────────────────────────────────────

function DoorDiagram({ cfg }: { cfg: DoorConfig }) {
  const VW = 240, VH = 360;
  const pad = 24;

  const op     = opening(cfg);
  const tmWcm  = cfg.tapaMarco ? cfg.tapaMarcoWidth : 0;
  const totalW = op.w + 2 * tmWcm;
  const totalH = op.h + tmWcm;  // head at top
  const scale  = Math.min((VW - pad * 2) / totalW, (VH - pad * 2 - 24) / totalH);

  const opW   = op.w  * scale;
  const opH   = op.h  * scale;
  const tmPx  = tmWcm * scale;
  const sGap  = (cfg.sidesGap  / 10) * scale;
  const tGap  = (cfg.topGap    / 10) * scale;

  const leafW = cfg.width  * scale;
  const leafH = cfg.height * scale;

  // Origins — center the total (opening + tapa marcos)
  const totalWpx  = opW + 2 * tmPx;
  const opX       = (VW - totalWpx) / 2 + tmPx;
  const opY       = pad + tmPx;

  const leafX = opX + sGap;
  const leafY = opY + tGap;

  // Shaker frame dimensions
  const stW   = (cfg.stileWidth / 10) * scale;
  const tR    = (cfg.topRail    / 10) * scale;
  const bR    = (cfg.bottomRail / 10) * scale;
  const inX   = leafX + stW;
  const inW   = leafW - stW * 2;
  const inH   = leafH - tR - bR;
  const midH  = tR * 0.8;
  const midYs = Array.from({ length: cfg.midRails }, (_, i) =>
    leafY + tR + (inH / (cfg.midRails + 1)) * (i + 1) - midH / 2,
  );

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="h-full max-h-80 w-auto">
      {/* ── Tapa marcos ── */}
      {cfg.tapaMarco && (
        <>
          {/* Head */}
          <rect x={opX - tmPx} y={pad} width={opW + 2 * tmPx} height={tmPx}
            fill="#1e3040" stroke="#4a6080" strokeWidth="1.2" />
          {/* Left leg */}
          <rect x={opX - tmPx} y={opY} width={tmPx} height={opH}
            fill="#1e3040" stroke="#4a6080" strokeWidth="1.2" />
          {/* Right leg */}
          <rect x={opX + opW} y={opY} width={tmPx} height={opH}
            fill="#1e3040" stroke="#4a6080" strokeWidth="1.2" />
        </>
      )}

      {/* ── Opening outline (dashed) ── */}
      <rect x={opX} y={opY} width={opW} height={opH}
        fill="none" stroke="#4a5568" strokeWidth="1" strokeDasharray="5 3" />

      {/* ── Door leaf ── */}
      <rect x={leafX} y={leafY} width={leafW} height={leafH}
        fill="#1a2133" stroke="#3a4869" strokeWidth="1.5" rx="1" />

      {/* Shaker / glass frame */}
      {cfg.style !== "slab" && (
        <>
          <rect x={leafX}                y={leafY} width={stW}  height={leafH} fill="#1e2840" />
          <rect x={leafX + leafW - stW}  y={leafY} width={stW}  height={leafH} fill="#1e2840" />
          <rect x={inX}                  y={leafY} width={inW}  height={tR}    fill="#1e2840" />
          <rect x={inX} y={leafY + leafH - bR}     width={inW}  height={bR}    fill="#1e2840" />
          <rect x={inX} y={leafY + tR}  width={inW} height={inH}
            fill={cfg.style === "shaker-glass" ? "#111927" : "#161d2e"}
            stroke="#3a4869" strokeWidth="1" />
          {midYs.map((y, i) => (
            <rect key={i} x={inX} y={y} width={inW} height={midH}
              fill="#1e2840" stroke="#3a4869" strokeWidth="0.8" />
          ))}
          {cfg.style === "shaker-glass" && (
            <g clipPath="url(#glCp)">
              {Array.from({ length: 10 }, (_, i) => (
                <line key={i}
                  x1={inX + i * (inW / 5)} y1={leafY + tR}
                  x2={inX + i * (inW / 5) - inW / 2} y2={leafY + leafH - bR}
                  stroke="#3a4869" strokeWidth="0.8" opacity="0.4" />
              ))}
            </g>
          )}
          <defs>
            <clipPath id="glCp">
              <rect x={inX} y={leafY + tR} width={inW} height={inH} />
            </clipPath>
          </defs>
        </>
      )}

      {/* ── Batiente gap labels (if > 0) ── */}
      {cfg.sidesGap > 0 && (
        <text x={opX + 2} y={leafY + leafH / 2} fill="#f4b450" fontSize="8" dominantBaseline="middle">
          {cfg.sidesGap}
        </text>
      )}
      {cfg.topGap > 0 && (
        <text x={leafX + leafW / 2} y={opY + 2} fill="#f4b450" fontSize="8" dominantBaseline="hanging" textAnchor="middle">
          {cfg.topGap}
        </text>
      )}

      {/* ── Dimension labels ── */}
      <text x={VW / 2} y={opY + opH + tmPx + 16} textAnchor="middle" fill="#4a5568" fontSize="10">
        hoja {cfg.width} × {cfg.height} cm · cerco {+(op.w.toFixed(1))} × {+(op.h.toFixed(1))} cm
      </text>
    </svg>
  );
}

// ─── Field helpers ────────────────────────────────────────────────────────────

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

// ─── Controls ────────────────────────────────────────────────────────────────

function DoorControls({ cfg, set }: {
  cfg: DoorConfig;
  set: <K extends keyof DoorConfig>(k: K, v: DoorConfig[K]) => void;
}) {
  const tm = tapaMarcoQty(cfg);

  return (
    <div className="space-y-4">

      {/* Hoja */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4a5568]">Hoja</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ancho (cm)"  value={cfg.width}     onChange={(v) => set("width", v)} />
          <Field label="Alto (cm)"   value={cfg.height}    onChange={(v) => set("height", v)} />
          <Field label="Grosor (mm)" value={cfg.thickness} onChange={(v) => set("thickness", v)} />
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
            <Field label="Montante (mm)"  value={cfg.stileWidth}  onChange={(v) => set("stileWidth", v)} />
            <Field label="Trav. sup (mm)" value={cfg.topRail}     onChange={(v) => set("topRail", v)} />
            <Field label="Trav. inf (mm)" value={cfg.bottomRail}  onChange={(v) => set("bottomRail", v)} />
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

      {/* Batientes */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4a5568]">Batientes</p>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Lados (mm)"  value={cfg.sidesGap}   onChange={(v) => set("sidesGap", v)} />
          <Field label="Testa (mm)"  value={cfg.topGap}     onChange={(v) => set("topGap", v)} />
          <Field label="Suelo (mm)"  value={cfg.bottomGap}  onChange={(v) => set("bottomGap", v)} />
        </div>
        <div className="rounded-xl border border-[#1f2735] bg-[#0d1119] px-3 py-2 text-xs text-[#7d879a]">
          Cerco: <span className="text-[#f4b450]">{+(opening(cfg).w.toFixed(1))} × {+(opening(cfg).h.toFixed(1))} cm</span>
        </div>
      </div>

      {/* Tapa marcos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4a5568]">Tapa marcos</p>
          <button type="button" onClick={() => set("tapaMarco", !cfg.tapaMarco)}
            className={cn("h-4 w-7 rounded-full transition", cfg.tapaMarco ? "bg-[#f4b450]" : "bg-[#1f2735]")}>
            <span className={cn("block h-3 w-3 translate-x-0.5 rounded-full bg-[#0d1119] transition", cfg.tapaMarco && "translate-x-3.5")} />
          </button>
        </div>
        {cfg.tapaMarco && (
          <>
            <div className="rounded-xl border border-[#1f2735] bg-[#0d1119] p-3">
              <div className="mb-2 text-[11px] uppercase tracking-wide text-[#7d879a]">Caras de muro</div>
              <div className="flex gap-1.5">
                {([1, 2] as const).map((n) => (
                  <button key={n} type="button" onClick={() => set("tapaMarcoSides", n)}
                    className={cn(
                      "flex-1 rounded-lg border py-1.5 text-xs transition",
                      cfg.tapaMarcoSides === n
                        ? "border-[#f4b450] bg-[#f4b450]/10 text-[#f4b450]"
                        : "border-[#1f2735] text-[#7d879a] hover:border-[#4a5568] hover:text-[#d7dde9]",
                    )}>
                    {n} cara{n > 1 ? "s" : ""}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ancho (cm)"  value={cfg.tapaMarcoWidth}     onChange={(v) => set("tapaMarcoWidth", v)} />
              <Field label="Grosor (mm)" value={cfg.tapaMarcoThickness} onChange={(v) => set("tapaMarcoThickness", v)} />
            </div>
            {/* Piece summary */}
            <div className="rounded-xl border border-[#1f2735] bg-[#0d1119] p-3 space-y-1.5">
              <div className="text-[11px] uppercase tracking-wide text-[#7d879a] mb-2">Piezas de tapa marco</div>
              {tm.pieces.map((p) => (
                <div key={p.label} className="flex items-center justify-between text-xs">
                  <span className="text-[#9aa4b6]">{p.label}</span>
                  <span className="text-[#f4b450]">{p.w.toFixed(1)} × {p.h.toFixed(1)} cm</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

    </div>
  );
}

// ─── Pane ────────────────────────────────────────────────────────────────────

export function DoorPane() {
  const [cfg, setCfg] = useState<DoorConfig>(DEFAULTS);
  const [mobileView, setMobileView] = useState<"2d" | "3d">("2d");
  const set = <K extends keyof DoorConfig>(k: K, v: DoorConfig[K]) =>
    setCfg((c) => ({ ...c, [k]: v }));
  const boxes3d = useMemo(() => doorToBoxes(cfg), [cfg]);

  return (
    <div className="h-full">
      {/* ── Mobile ── */}
      <div className="flex h-full flex-col lg:hidden">
        {mobileView === "2d" ? (
          <>
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[#0b0e14] p-4">
              <DoorDiagram cfg={cfg} />
            </div>
            <div className="overflow-y-auto border-t border-[#1c2330] p-4">
              <div className="space-y-4">
                <DoorControls cfg={cfg} set={set} />
                <button type="button" onClick={() => setMobileView("3d")}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#262d3d] bg-[#0f1218] py-2.5 text-sm font-medium text-[#9aa4b6] transition active:bg-[#11151d]">
                  <Box className="size-4" /> Ver en 3D
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="relative h-full bg-[#0b0e14]">
            <button type="button" onClick={() => setMobileView("2d")}
              className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-[#11151d]/90 px-3 py-1.5 text-xs font-medium text-[#d7dde9] shadow backdrop-blur">
              <ChevronLeft className="size-3.5" /> Editar
            </button>
            <Viewer3D overrideBoxes={boxes3d} />
          </div>
        )}
      </div>

      {/* ── Desktop ── */}
      <div className="hidden h-full lg:grid lg:grid-cols-2">
        <div className="relative flex min-h-0 flex-col border-r border-[#1c2330]">
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[#0b0e14] p-6">
            <DoorDiagram cfg={cfg} />
          </div>
          <div className="overflow-y-auto border-t border-[#1c2330] p-4" style={{ maxHeight: "55%" }}>
            <DoorControls cfg={cfg} set={set} />
          </div>
        </div>
        <div className="relative min-h-[340px] bg-[#0b0e14]">
          <Viewer3D overrideBoxes={boxes3d} />
        </div>
      </div>
    </div>
  );
}
