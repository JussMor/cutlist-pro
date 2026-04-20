import { PricingConfig } from "@/lib/domain/types";
import { FieldHelpTooltip } from "./FieldHelpTooltip";

interface OptimizerSectionProps {
  pricing: PricingConfig;
  setPricingField: <K extends keyof PricingConfig>(
    key: K,
    value: PricingConfig[K],
  ) => void;
}

export function OptimizerSection({
  pricing,
  setPricingField,
}: OptimizerSectionProps) {
  return (
    <div className="field-grid">
      <div className="field">
        <label htmlFor="kerfCm" className="inline-flex items-center gap-1.5">
          Kerf (cm)
          <FieldHelpTooltip content="Ancho de la hoja de sierra. Se suma en los cortes y puede cambiar posiciones, cantidad de planchas y desperdicio." />
        </label>
        <input
          id="kerfCm"
          type="number"
          step="0.01"
          value={pricing.kerfCm}
          onChange={(e) => setPricingField("kerfCm", Number(e.target.value))}
        />
      </div>
      <div className="field">
        <label
          htmlFor="fitClearanceCm"
          className="inline-flex items-center gap-1.5"
        >
          Holgura de ajuste (cm)
          <FieldHelpTooltip content="Descuento de ajuste para que piezas encajen sin forzar. Modifica medidas finales y por eso puede mover el layout de corte." />
        </label>
        <input
          id="fitClearanceCm"
          type="number"
          step="0.01"
          value={pricing.fitClearanceCm}
          onChange={(e) =>
            setPricingField("fitClearanceCm", Number(e.target.value))
          }
        />
      </div>
      <div className="field">
        <label
          htmlFor="trimAllowanceCm"
          className="inline-flex items-center gap-1.5"
        >
          Margen de trim (cm)
          <FieldHelpTooltip content="Descuento extra para repaso o ajuste final de cantos. Cambia dimensiones de piezas y puede alterar la posicion de cortes." />
        </label>
        <input
          id="trimAllowanceCm"
          type="number"
          step="0.01"
          value={pricing.trimAllowanceCm}
          onChange={(e) =>
            setPricingField("trimAllowanceCm", Number(e.target.value))
          }
        />
      </div>
      <div className="field">
        <label
          htmlFor="backInsetCm"
          className="inline-flex items-center gap-1.5"
        >
          Inset de fondo (cm)
          <FieldHelpTooltip content="Reduccion aplicada a paneles de fondo para calce. Al cambiar tamaño del fondo, cambia la distribucion de corte." />
        </label>
        <input
          id="backInsetCm"
          type="number"
          step="0.01"
          value={pricing.backInsetCm}
          onChange={(e) =>
            setPricingField("backInsetCm", Number(e.target.value))
          }
        />
      </div>
      <div className="field">
        <label
          htmlFor="doorSystem"
          className="inline-flex items-center gap-1.5"
        >
          Sistema de puerta
          <FieldHelpTooltip content="Define si la puerta va overlay o inset. Esto ajusta el tamano de las puertas y puede cambiar posiciones y consumo de plancha." />
        </label>
        <select
          id="doorSystem"
          value={pricing.doorSystem}
          onChange={(e) =>
            setPricingField("doorSystem", e.target.value as "overlay" | "inset")
          }
        >
          <option value="overlay">Overlay</option>
          <option value="inset">Inset</option>
        </select>
      </div>
      <div className="field">
        <label
          htmlFor="doorRevealCm"
          className="inline-flex items-center gap-1.5"
        >
          Revelado puerta (cm)
          <FieldHelpTooltip content="Separacion visible alrededor de la puerta. Ajusta medidas de puerta/frente y puede modificar el layout de corte." />
        </label>
        <input
          id="doorRevealCm"
          type="number"
          step="0.01"
          value={pricing.doorRevealCm}
          onChange={(e) =>
            setPricingField("doorRevealCm", Number(e.target.value))
          }
        />
      </div>
      <div className="field">
        <label htmlFor="drawerSideClearanceCm">
          Holgura lateral cajon (cm)
          <FieldHelpTooltip content="Descuento lateral para guias de cajon. Cambia el ancho de piezas de cajon y afecta ubicacion y cantidad de cortes." />
        </label>
        <input
          id="drawerSideClearanceCm"
          type="number"
          step="0.01"
          value={pricing.drawerSideClearanceCm}
          onChange={(e) =>
            setPricingField("drawerSideClearanceCm", Number(e.target.value))
          }
        />
      </div>
    </div>
  );
}
