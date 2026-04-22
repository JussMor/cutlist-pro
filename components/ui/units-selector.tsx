"use client";

import { useUnitsStore } from "@/store/unitsStore";
import { Button } from "./button";

export function UnitsSelector() {
  const { unit, setUnit } = useUnitsStore();

  return (
    <div className="inline-flex gap-2 p-2 bg-slate-900 rounded border border-slate-700">
      <Button
        variant={unit === "cm" ? "default" : "outline"}
        size="sm"
        onClick={() => setUnit("cm")}
      >
        cm
      </Button>
      <Button
        variant={unit === "mm" ? "default" : "outline"}
        size="sm"
        onClick={() => setUnit("mm")}
      >
        mm
      </Button>
    </div>
  );
}
