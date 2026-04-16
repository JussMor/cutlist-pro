"use client";

import { PricingConfig } from "@/lib/domain/types";
import { create } from "zustand";

interface PricingState {
  pricing: PricingConfig;
  setPricingField: <T extends keyof PricingConfig>(
    key: T,
    value: PricingConfig[T],
  ) => void;
}

export const usePricingStore = create<PricingState>((set) => ({
  pricing: {
    costPerCut: 0.8,
    costPerBandingMeter: 1.2,
    bandingType: "ABS 1mm",
    kerfCm: 0.3,
    fitClearanceCm: 0.2,
    trimAllowanceCm: 0.05,
    backInsetCm: 0.2,
    doorSystem: "overlay",
    doorRevealCm: 0.2,
    hingeCupDiameterMm: 35,
    drawerSystem: "side-mount",
    drawerSideClearanceCm: 1.25,
  },
  setPricingField: (key, value) =>
    set((state) => ({ pricing: { ...state.pricing, [key]: value } })),
}));
