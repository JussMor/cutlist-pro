"use client";

import { CutResult, CutStep, Panel } from "@/lib/domain/types";

interface Props {
  panels: Panel[];
  result: CutResult | null;
}

function getPanelLabel(panelId: string, panels: Panel[]): string {
  const match = panels.find((panel) => panelId.startsWith(`${panel.id}-`));
  return match?.label ?? panelId;
}

function splitPreferenceLabel(value?: string): string {
  if (value === "vertical-first") return "Normal";
  if (value === "horizontal-first") return "Invertida";
  if (value === "short-side-first") return "Lado menor";
  if (value === "auto-best") return "Auto optimo";
  return "N/D";
}

function cutStepStroke(step: CutStep): string {
  return step.orientation === "vertical" ? "#7dd3fc" : "#c4b5fd";
}

function cutStepMidpoint(step: CutStep): { x: number; y: number } {
  return {
    x: (step.x1 + step.x2) / 2,
    y: (step.y1 + step.y2) / 2,
  };
}

export function SheetLayouts({ panels, result }: Props) {
  if (!result || result.sheets.length === 0) {
    return (
      <div className="sheet-layouts-empty muted">
        Optimiza el corte para ver las planchas con posiciones de piezas.
      </div>
    );
  }

  return (
    <div className="sheet-layouts">
      <div className="sheet-layouts-summary">
        <span>
          {result.sheets.length} plancha{result.sheets.length === 1 ? "" : "s"}
        </span>
        <span>{result.stats.wastePercent.toFixed(1)}% desperdicio</span>
        <span>{result.stats.totalCuts} cortes</span>
        <span>
          modo: {splitPreferenceLabel(result.optimizer?.appliedSplitPreference)}
        </span>
      </div>
      {result.optimizer?.compared && result.optimizer.compared.length > 0 && (
        <div className="mt-1 grid gap-1 text-xs text-slate-400">
          {result.optimizer.compared.map((entry) => (
            <span key={entry.splitPreference}>
              {splitPreferenceLabel(entry.splitPreference)}: {entry.sheetsUsed}{" "}
              plancha(s), {entry.wastePercent.toFixed(1)}% desperdicio,{" "}
              {entry.totalCuts} cortes
            </span>
          ))}
        </div>
      )}

      {result.sheets.map((sheetResult, index) => (
        <div
          key={`${sheetResult.sheet.odooId}-${index}`}
          className="sheet-card"
        >
          <div className="sheet-card-header">
            <strong>{sheetResult.sheet.name}</strong>
            <span className="muted">
              {sheetResult.sheet.L} x {sheetResult.sheet.W} cm
            </span>
          </div>

          <svg
            className="sheet-canvas"
            viewBox={`0 0 ${sheetResult.sheet.W} ${sheetResult.sheet.L}`}
            role="img"
            aria-label={`Plancha ${index + 1}`}
            preserveAspectRatio="xMidYMid meet"
          >
            <rect
              x="0"
              y="0"
              width={sheetResult.sheet.W}
              height={sheetResult.sheet.L}
              fill="#0b0f17"
              stroke="#394255"
              strokeWidth="1.5"
            />

            {sheetResult.placed.map((placed, pieceIndex) => {
              const label = getPanelLabel(placed.panelId, panels);
              return (
                <g key={`${placed.panelId}-${pieceIndex}`}>
                  <rect
                    x={placed.x}
                    y={placed.y}
                    width={placed.w}
                    height={placed.h}
                    fill="rgba(244, 180, 80, 0.18)"
                    stroke="#f4b450"
                    strokeWidth="0.8"
                  />
                  <text
                    x={placed.x + 2}
                    y={placed.y + 6}
                    fontSize="4.5"
                    fill="#d7dde9"
                  >
                    {label}
                  </text>
                  <text
                    x={placed.x + 2}
                    y={placed.y + 11}
                    fontSize="3.8"
                    fill="#97a2b7"
                  >
                    {placed.h.toFixed(0)} x {placed.w.toFixed(0)} cm
                  </text>
                </g>
              );
            })}

            {(sheetResult.cutSteps ?? []).map((step) => {
              const mid = cutStepMidpoint(step);
              return (
                <g key={`cut-${step.order}-${step.panelId}`}>
                  <line
                    x1={step.x1}
                    y1={step.y1}
                    x2={step.x2}
                    y2={step.y2}
                    stroke={cutStepStroke(step)}
                    strokeWidth="0.65"
                    strokeDasharray="2 1"
                  />
                  <circle
                    cx={mid.x}
                    cy={mid.y}
                    r="1.8"
                    fill="#0b0f17"
                    stroke={cutStepStroke(step)}
                    strokeWidth="0.5"
                  />
                  <text
                    x={mid.x}
                    y={mid.y + 0.7}
                    fontSize="2.8"
                    textAnchor="middle"
                    fill="#d7dde9"
                  >
                    {step.order}
                  </text>
                </g>
              );
            })}
          </svg>

          <div className="mt-3 grid max-h-40 gap-1 overflow-auto pr-1 text-xs text-slate-300">
            {(sheetResult.cutSteps ?? []).length === 0 && (
              <span className="text-slate-500">
                Sin pasos de corte registrados.
              </span>
            )}
            {(sheetResult.cutSteps ?? []).map((step) => (
              <span key={`step-${step.order}-${step.panelId}`}>
                Paso {step.order}: corte{" "}
                {step.orientation === "vertical" ? "vertical" : "horizontal"} (
                {step.length.toFixed(1)} cm) - pieza{" "}
                {getPanelLabel(step.panelId, panels)}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
