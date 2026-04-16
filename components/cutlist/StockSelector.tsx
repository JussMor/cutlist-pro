"use client";

import { MaterialMode, StockSheet } from "@/lib/domain/types";

const STANDARD_DIMS = [
  { label: "244 × 122 cm", L: 244, W: 122 },
  { label: "244 × 61 cm (mitad)", L: 244, W: 61 },
  { label: "244 × 244 cm (doble)", L: 244, W: 244 },
  { label: "122 × 122 cm (cuarto)", L: 122, W: 122 },
];

interface Props {
  sheets: StockSheet[];
  selectedSheetIds: number[];
  materialMode: MaterialMode;
  primarySheetId: number | null;
  globalDims: { L: number; W: number };
  onToggleSheet: (sheetId: number) => void;
  onMaterialModeChange: (mode: MaterialMode) => void;
  onPrimarySheetChange: (sheetId: number) => void;
  onGlobalDimsChange: (L: number, W: number) => void;
}

export function StockSelector({
  sheets,
  selectedSheetIds,
  materialMode,
  primarySheetId,
  globalDims,
  onToggleSheet,
  onMaterialModeChange,
  onPrimarySheetChange,
  onGlobalDimsChange,
}: Props) {
  const dimsKey = `${globalDims.L}x${globalDims.W}`;

  return (
    <div className="stock-selector">
      <div className="stock-mode-row">
        <button
          type="button"
          className={`mode-chip ${materialMode === "single" ? "active" : ""}`}
          onClick={() => onMaterialModeChange("single")}
        >
          Material unico
        </button>
        <button
          type="button"
          className={`mode-chip ${materialMode === "mixed" ? "active" : ""}`}
          onClick={() => onMaterialModeChange("mixed")}
        >
          Material mixto
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "flex-end" }}>
        {materialMode === "single" && selectedSheetIds.length > 0 && (
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="primarySheet">Melamina principal</label>
            <select
              id="primarySheet"
              className="table-input"
              value={primarySheetId ?? ""}
              onChange={(event) =>
                onPrimarySheetChange(Number(event.target.value))
              }
            >
              {sheets
                .filter((sheet) => selectedSheetIds.includes(sheet.odooId))
                .map((sheet) => (
                  <option key={sheet.odooId} value={sheet.odooId}>
                    {sheet.name}
                  </option>
                ))}
            </select>
          </div>
        )}
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="globalDims">Medidas plancha</label>
          <select
            id="globalDims"
            className="table-input"
            value={dimsKey}
            onChange={(e) => {
              const found = STANDARD_DIMS.find(
                (d) => `${d.L}x${d.W}` === e.target.value,
              );
              if (found) onGlobalDimsChange(found.L, found.W);
            }}
          >
            {STANDARD_DIMS.map((d) => (
              <option key={`${d.L}x${d.W}`} value={`${d.L}x${d.W}`}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="stock-list">
        {sheets.map((sheet) => {
          const checked = selectedSheetIds.includes(sheet.odooId);
          return (
            <label
              key={sheet.odooId}
              className={`stock-option ${checked ? "active" : ""}`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggleSheet(sheet.odooId)}
              />
              <div className="stock-option-body">
                <strong>{sheet.name}</strong>
                <span className="muted">
                  {sheet.qty} planchas · ${sheet.pricePerSheet.toFixed(2)}
                </span>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
