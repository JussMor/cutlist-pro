import { PricingConfig } from "@/lib/domain/types";

interface OptimizerSectionProps {
  pricing: PricingConfig;
  setPricingField: <K extends keyof PricingConfig>(key: K, value: PricingConfig[K]) => void;
}

export function OptimizerSection({ pricing, setPricingField }: OptimizerSectionProps) {
  return (
    <div className="field-grid">
      <div className="field">
        <label htmlFor="kerfCm">Kerf (cm)</label>
        <input
          id="kerfCm"
          type="number"
          step="0.01"
          value={pricing.kerfCm}
          onChange={(e) =>
            setPricingField("kerfCm", Number(e.target.value))
          }
        />
      </div>
      <div className="field">
        <label htmlFor="fitClearanceCm">Holgura de ajuste (cm)</label>
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
        <label htmlFor="trimAllowanceCm">Margen de trim (cm)</label>
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
        <label htmlFor="backInsetCm">Inset de fondo (cm)</label>
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
        <label htmlFor="doorSystem">Sistema de puerta</label>
        <select
          id="doorSystem"
          value={pricing.doorSystem}
          onChange={(e) =>
            setPricingField(
              "doorSystem",
              e.target.value as "overlay" | "inset",
            )
          }
        >
          <option value="overlay">Overlay</option>
          <option value="inset">Inset</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="doorRevealCm">Revelado puerta (cm)</label>
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
        <label htmlFor="hingeCupDiameterMm">Cazoleta bisagra (mm)</label>
        <select
          id="hingeCupDiameterMm"
          value={pricing.hingeCupDiameterMm}
          onChange={(e) =>
            setPricingField(
              "hingeCupDiameterMm",
              Number(e.target.value) as 35 | 26,
            )
          }
        >
          <option value={35}>35</option>
          <option value={26}>26</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="drawerSystem">Sistema de cajon</label>
        <select
          id="drawerSystem"
          value={pricing.drawerSystem}
          onChange={(e) =>
            setPricingField(
              "drawerSystem",
              e.target.value as "side-mount" | "undermount",
            )
          }
        >
          <option value="side-mount">Side mount</option>
          <option value="undermount">Undermount</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="drawerSideClearanceCm">Holgura lateral cajon (cm)</label>
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
      <div className="field">
        <label htmlFor="bandingType">Tipo de canto</label>
        <input
          id="bandingType"
          value={pricing.bandingType}
          onChange={(e) =>
            setPricingField("bandingType", e.target.value)
          }
        />
      </div>
    </div>
  );
}