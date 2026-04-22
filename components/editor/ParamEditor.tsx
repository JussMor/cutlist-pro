"use client";

import { TemplateParams } from "@/lib/domain/types";
import { useUnitsStore } from "@/store/unitsStore";

type ParamKey = "W" | "H" | "D" | "thickness" | "shelves";

interface Props {
  params: TemplateParams;
  onChange: (key: ParamKey, value: number) => void;
}

const fields: Array<{
  key: ParamKey;
  label: string;
  min: number;
  max: number;
  step: number;
}> = [
  { key: "W", label: "Ancho", min: 40, max: 300, step: 1 },
  { key: "H", label: "Alto", min: 40, max: 300, step: 1 },
  { key: "D", label: "Profundidad", min: 20, max: 80, step: 1 },
  { key: "thickness", label: "Espesor", min: 1.5, max: 3, step: 0.1 },
  { key: "shelves", label: "Entrepanios", min: 0, max: 10, step: 1 },
];

export function ParamEditor({ params, onChange }: Props) {
  const { unit } = useUnitsStore();

  return (
    <div className="field-grid">
      {fields.map((f) => (
        <div key={f.key} className="field">
          <label htmlFor={f.key}>
            {f.label} {f.key !== "shelves" && `(${unit})`}
          </label>
          <input
            id={f.key}
            type="number"
            min={f.min}
            max={f.max}
            step={f.step}
            value={params[f.key]}
            onChange={(event) => onChange(f.key, Number(event.target.value))}
          />
        </div>
      ))}
    </div>
  );
}
