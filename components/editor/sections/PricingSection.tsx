import { PricingConfig } from "@/lib/domain/types";
import { FieldHelpTooltip } from "./FieldHelpTooltip";

interface PricingSectionProps {
  pricing: PricingConfig;
  setPricingField: <K extends keyof PricingConfig>(
    key: K,
    value: PricingConfig[K],
  ) => void;
}

export function PricingSection({
  pricing,
  setPricingField,
}: PricingSectionProps) {
  return (
    <div className="field-grid">
      <div className="field">
        <label
          htmlFor="costPerCut"
          className="inline-flex items-center gap-1.5"
        >
          Costo por corte
          <FieldHelpTooltip content="Precio cobrado por cada corte recto generado por el optimizador. No cambia posiciones; cambia la cotizacion final." />
        </label>
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
        <label
          htmlFor="costPerBanding"
          className="inline-flex items-center gap-1.5"
        >
          Costo por canto (m)
          <FieldHelpTooltip content="Precio por metro lineal de enchapado de canto. No cambia posiciones de corte; solo afecta el total de la cotizacion." />
        </label>
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
