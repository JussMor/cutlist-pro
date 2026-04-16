"use client";

import { CostBreakdown as CostBreakdownType } from "@/lib/domain/types";

interface Props {
  breakdown?: CostBreakdownType;
}

export function CostBreakdown({ breakdown }: Props) {
  if (!breakdown) {
    return <p className="muted">Ejecuta optimizacion para ver costos.</p>;
  }

  return (
    <div>
      <div className="metric">
        <span>Material</span>
        <strong>${breakdown.material.toFixed(2)}</strong>
      </div>
      <div className="metric">
        <span>Cortes</span>
        <strong>${breakdown.cutting.toFixed(2)}</strong>
      </div>
      <div className="metric">
        <span>Canto</span>
        <strong>${breakdown.banding.toFixed(2)}</strong>
      </div>
      <div className="metric">
        <span>Total</span>
        <strong className="price">${breakdown.total.toFixed(2)}</strong>
      </div>
    </div>
  );
}
