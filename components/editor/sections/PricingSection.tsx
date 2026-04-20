import { PricingConfig } from "@/lib/domain/types";

interface PricingSectionProps {
  pricing: PricingConfig;
  setPricingField: <K extends keyof PricingConfig>(key: K, value: PricingConfig[K]) => void;
}

export function PricingSection({ pricing, setPricingField }: PricingSectionProps) {
  return (
    <div className="field-grid">
      <div className="field">
        <label htmlFor="costPerCut">Costo por corte</label>
        <input
          id="costPerCut"
          type="number"
          step="0.1"
          value={pricing.costPerCut}
          onChange={(e) =>
            setPricingField("costPerCut", Number(e.target.value))
          }
        />
      </div>
      <div className="field">
        <label htmlFor="costPerBanding">Costo por canto (m)</label>
        <input
          id="costPerBanding"
          type="number"
          step="0.1"
          value={pricing.costPerBandingMeter}
          onChange={(e) =>
            setPricingField("costPerBandingMeter", Number(e.target.value))
          }
        />
      </div>
    </div>
  );
}

