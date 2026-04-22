"use client";

import { MultiSelect } from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { MaterialMode, StockSheet } from "@/lib/domain/types";
import { useUnitsStore } from "@/store/unitsStore";

const STANDARD_DIMS = [
  { label: "244 × 122 cm", L: 244, W: 122 },
  { label: "244 × 61 cm (mitad)", L: 244, W: 61 },
  { label: "244 × 215 cm (doble)", L: 244, W: 215 },
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
  const { unit, convert } = useUnitsStore();
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

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        {materialMode === "single" && sheets.length > 0 && (
          <div style={{ flex: 1 }}>
            <label className="block text-xs font-medium text-[#d7dde9] mb-1.5">
              Melamina principal
            </label>
            <Select
              value={primarySheetId?.toString() ?? ""}
              onValueChange={(value) => onPrimarySheetChange(Number(value))}
            >
              <SelectTrigger>
                {sheets.find((s) => s.odooId === primarySheetId)?.name ||
                  "Seleccionar"}
              </SelectTrigger>
              <SelectContent>
                {sheets.map((sheet) => (
                  <SelectItem
                    key={sheet.odooId}
                    value={sheet.odooId.toString()}
                  >
                    <div className="grid gap-0.5">
                      <div>{sheet.name}</div>
                      <div className="text-xs text-[#989faa]">
                        {sheet.qty} plancha{sheet.qty !== 1 ? "s" : ""} · $
                        {sheet.pricePerSheet.toFixed(2)}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {materialMode === "mixed" && (
          <div style={{ flex: 1 }}>
            <label className="block text-xs font-medium text-[#d7dde9] mb-1.5">
              Materiales disponibles
            </label>
            <MultiSelect
              options={sheets.map((sheet) => ({
                id: sheet.odooId,
                label: sheet.name,
                subtitle: `${sheet.qty} plancha${sheet.qty !== 1 ? "s" : ""} · $${sheet.pricePerSheet.toFixed(2)}`,
              }))}
              selectedIds={selectedSheetIds}
              onToggle={(id) => onToggleSheet(Number(id))}
              placeholder="Seleccionar materiales"
            />
          </div>
        )}
        <div style={{ flex: 1 }}>
          <label className="block text-xs font-medium text-[#d7dde9] mb-1.5">
            Medidas plancha
          </label>
          <Select
            value={dimsKey}
            onValueChange={(value) => {
              const found = STANDARD_DIMS.find(
                (d) => `${d.L}x${d.W}` === value,
              );
              if (found) onGlobalDimsChange(found.L, found.W);
            }}
          >
            <SelectTrigger>
              {convert(Number(dimsKey.split("x")[0])).toFixed(0)} ×{" "}
              {convert(Number(dimsKey.split("x")[1])).toFixed(0)} {unit}
            </SelectTrigger>
            <SelectContent>
              {STANDARD_DIMS.map((d) => (
                <SelectItem key={`${d.L}x${d.W}`} value={`${d.L}x${d.W}`}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
