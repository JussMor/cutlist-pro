"use client";

import { useUnitsStore } from "@/store/unitsStore";
import { Button } from "./button";

export function UnitsSelector() {
  const { unit, setUnit } = useUnitsStore();
  const modeLabel = unit === "cm" ? "Centimetros (cm)" : "Milimetros (mm)";

  return (
    <div className="grid gap-1.5 p-2 bg-gradient-to-b from-slate-800 to-slate-900 rounded-lg border border-slate-600 shadow-md min-w-[210px]">
      <div className="text-[11px] leading-none text-slate-300">
        Unidad activa:{" "}
        <span className="font-semibold text-sky-300">{modeLabel}</span>
      </div>
      <div className="inline-flex gap-1.5">
        <Button
          variant={unit === "cm" ? "default" : "outline"}
          size="sm"
          onClick={() => setUnit("cm")}
          className={unit === "cm" ? "bg-blue-600 hover:bg-blue-700" : ""}
          aria-pressed={unit === "cm"}
        >
          cm
        </Button>
        <Button
          variant={unit === "mm" ? "default" : "outline"}
          size="sm"
          onClick={() => setUnit("mm")}
          className={unit === "mm" ? "bg-blue-600 hover:bg-blue-700" : ""}
          aria-pressed={unit === "mm"}
        >
          mm
        </Button>
      </div>
    </div>
  );
}
