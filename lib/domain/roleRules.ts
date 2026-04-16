import {
  MachiningOp,
  ModuleNode,
  Panel,
  PanelRole,
  PricingConfig,
} from "@/lib/domain/types";

export interface RolePreparationResult {
  panels: Panel[];
  /** Hard errors that block optimization (e.g. unknown module id, invalid geometry). */
  issues: string[];
  /** Structural warnings shown to the user but that do NOT block optimization. */
  warnings: string[];
  ops: MachiningOp[];
}

function hasRole(panels: Panel[], role: Panel["role"]): boolean {
  return panels.some((panel) => panel.role === role && panel.qty > 0);
}

function groupByModule(panels: Panel[]): Map<string, Panel[]> {
  const map = new Map<string, Panel[]>();
  for (const panel of panels) {
    const key = panel.moduleId || "main";
    map.set(key, [...(map.get(key) ?? []), panel]);
  }
  return map;
}

function approxRoleSpan(
  panels: Panel[],
  roles: PanelRole[],
  axis: "L" | "W",
): number | null {
  const samples = panels.filter((panel) => roles.includes(panel.role));
  if (samples.length === 0) return null;
  return Math.max(...samples.map((panel) => panel[axis]));
}

function validateRoleConstraints(
  panels: Panel[],
  modules: ModuleNode[] = [],
): { issues: string[]; warnings: string[] } {
  const issues: string[] = [];
  const warnings: string[] = [];
  const moduleMap = groupByModule(panels);
  const knownModuleIds = new Set(modules.map((m) => m.id));

  for (const [moduleId, modulePanels] of moduleMap.entries()) {
    if (knownModuleIds.size > 0 && !knownModuleIds.has(moduleId)) {
      // Unknown module is a hard error — optimizer can't place panels correctly
      issues.push(`Piezas apuntan a modulo inexistente: ${moduleId}.`);
    }

    if (hasRole(modulePanels, "door")) {
      const hasStructure =
        hasRole(modulePanels, "side") &&
        (hasRole(modulePanels, "top") || hasRole(modulePanels, "bottom"));

      if (!hasStructure) {
        warnings.push(
          `Modulo ${moduleId}: hay puerta sin estructura base (laterales + tapa/base).`,
        );
      }
    }

    if (hasRole(modulePanels, "shelf") && !hasRole(modulePanels, "side")) {
      warnings.push(
        `Modulo ${moduleId}: hay entrepanios sin laterales — pueden ser piezas independientes.`,
      );
    }

    if (hasRole(modulePanels, "drawer-front")) {
      const hasDrawerBox =
        hasRole(modulePanels, "drawer-side") &&
        hasRole(modulePanels, "drawer-back") &&
        hasRole(modulePanels, "drawer-bottom");

      if (!hasDrawerBox) {
        warnings.push(
          `Modulo ${moduleId}: frente de cajon sin caja completa (laterales, trasera y fondo).`,
        );
      }
    }

    const carcassWidth = approxRoleSpan(
      modulePanels,
      ["top", "bottom", "shelf", "door", "drawer-front"],
      "L",
    );
    const doorWidth = approxRoleSpan(modulePanels, ["door"], "W");
    if (carcassWidth && doorWidth && doorWidth > carcassWidth + 0.5) {
      warnings.push(
        `Modulo ${moduleId}: puerta sobredimensionada respecto al vano del mueble.`,
      );
    }
  }

  return { issues, warnings };
}

function applyRoleAdjustments(panel: Panel, pricing: PricingConfig): Panel {
  const fit = Math.max(0, pricing.fitClearanceCm || 0);
  const trim = Math.max(0, pricing.trimAllowanceCm || 0);
  const backInset = Math.max(0, pricing.backInsetCm || 0);

  if (panel.role === "door") {
    const reveal = Math.max(0, pricing.doorRevealCm || 0);
    const overlayCompensation =
      pricing.doorSystem === "overlay" ? -reveal : reveal;
    return {
      ...panel,
      L: Math.max(1, panel.L - fit * 2 - trim + overlayCompensation),
      W: Math.max(1, panel.W - fit * 2 - trim + overlayCompensation),
    };
  }

  if (panel.role === "drawer-front") {
    const reveal = Math.max(0, pricing.doorRevealCm || 0);
    return {
      ...panel,
      L: Math.max(1, panel.L - reveal * 2 - trim),
      W: Math.max(1, panel.W - reveal * 2 - trim),
    };
  }

  if (panel.role === "drawer-side" || panel.role === "drawer-back") {
    const sideClearance = Math.max(0, pricing.drawerSideClearanceCm || 0);
    return {
      ...panel,
      W: Math.max(1, panel.W - sideClearance),
    };
  }

  if (panel.role === "drawer-bottom") {
    return {
      ...panel,
      L: Math.max(1, panel.L - fit),
      W: Math.max(1, panel.W - fit),
    };
  }

  if (panel.role === "back") {
    return {
      ...panel,
      L: Math.max(1, panel.L - backInset),
      W: Math.max(1, panel.W - backInset),
    };
  }

  if (panel.role === "shelf") {
    return {
      ...panel,
      L: Math.max(1, panel.L - fit),
      W: Math.max(1, panel.W - trim),
    };
  }

  return panel;
}

function deriveMachiningOps(
  panel: Panel,
  pricing: PricingConfig,
): MachiningOp[] {
  const ops: MachiningOp[] = [];

  const bandingEdges = [
    panel.banding.top,
    panel.banding.bottom,
    panel.banding.left,
    panel.banding.right,
  ].filter(Boolean).length;

  if (bandingEdges > 0) {
    ops.push({
      panelId: panel.id,
      moduleId: panel.moduleId,
      qty: panel.qty * bandingEdges,
      type: "edge-banding",
      note: `${bandingEdges} cantos activos`,
    });
  }

  if (panel.role === "door") {
    const hingeQty = panel.L >= 160 ? 4 : panel.L >= 90 ? 3 : 2;
    ops.push({
      panelId: panel.id,
      moduleId: panel.moduleId,
      qty: hingeQty * panel.qty,
      type: "hinge",
      note: `Preparar perforaciones bisagra cazoleta ${pricing.hingeCupDiameterMm}mm.`,
    });
    ops.push({
      panelId: panel.id,
      moduleId: panel.moduleId,
      qty: hingeQty * panel.qty,
      type: "drill",
      note: "Taladros para bisagras y placas.",
    });
  }

  if (panel.role === "back") {
    ops.push({
      panelId: panel.id,
      moduleId: panel.moduleId,
      qty: panel.qty,
      type: "groove",
      note: "Ranura o clavado para fondo segun sistema.",
    });
  }

  if (panel.role === "drawer-side") {
    ops.push({
      panelId: panel.id,
      moduleId: panel.moduleId,
      qty: panel.qty,
      type: "slide",
      note: `Montaje de corredera para cajon (${pricing.drawerSystem}).`,
    });
    ops.push({
      panelId: panel.id,
      moduleId: panel.moduleId,
      qty: panel.qty * 2,
      type: "pilot-hole",
      note: "Taladros guia para fijacion de corredera.",
    });
  }

  if (
    panel.role === "side" ||
    panel.role === "divider" ||
    panel.role === "top" ||
    panel.role === "bottom"
  ) {
    ops.push({
      panelId: panel.id,
      moduleId: panel.moduleId,
      qty: panel.qty,
      type: "confirmat",
      note: "Uniones estructurales con tornillo confirmat.",
    });
  }

  return ops;
}

export function preparePanelsByRole(
  panels: Panel[],
  pricing: PricingConfig,
  modules: ModuleNode[] = [],
): RolePreparationResult {
  const { issues, warnings } = validateRoleConstraints(panels, modules);

  const preparedPanels = panels.map((panel) =>
    applyRoleAdjustments(panel, pricing),
  );
  const ops = preparedPanels.flatMap((panel) =>
    deriveMachiningOps(panel, pricing),
  );

  return { panels: preparedPanels, issues, warnings, ops };
}
