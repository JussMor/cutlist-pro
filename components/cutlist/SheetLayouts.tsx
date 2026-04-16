"use client";

import { CutResult, Panel } from "@/lib/domain/types";

interface Props {
  panels: Panel[];
  result: CutResult | null;
}

function getPanelLabel(panelId: string, panels: Panel[]): string {
  const match = panels.find((panel) => panelId.startsWith(`${panel.id}-`));
  return match?.label ?? panelId;
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
      </div>

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
          </svg>
        </div>
      ))}
    </div>
  );
}
