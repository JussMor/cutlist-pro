"use client";

import { create } from "zustand";

type UnitSystem = "cm" | "mm";

interface UnitsState {
  unit: UnitSystem;
  setUnit: (unit: UnitSystem) => void;
  convert: (value: number, toUnit?: UnitSystem) => number;
  label: (value: number, toUnit?: UnitSystem) => string;
}

export const useUnitsStore = create<UnitsState>((set, get) => ({
  unit: "cm",
  setUnit: (unit: UnitSystem) => set({ unit }),
  convert: (value: number, toUnit?: UnitSystem) => {
    const currentUnit = toUnit || get().unit;
    if (currentUnit === "cm") return value;
    return value * 10; // cm to mm
  },
  label: (value: number, toUnit?: UnitSystem) => {
    const currentUnit = toUnit || get().unit;
    const converted = get().convert(value, currentUnit);
    return `${converted.toFixed(1)} ${currentUnit}`;
  },
}));
