import { IsoPanel, ModuleNode, Panel, PanelRole, StockSheet } from "@/lib/domain/types";
import { expandPanels, normalizeName, normalizePanelsModule, ROOT_MODULE } from "./workshopPanelHelpers";

export const rolePreviewColors: Record<PanelRole, string> = {
  side: "#c6cfdb",
  top: "#f0d8a6",
  bottom: "#bba07d",
  back: "#88a9c4",
  shelf: "#8fb89e",
  door: "#d79f9b",
  divider: "#a99bd0",
  "drawer-front": "#c0877f",
  "drawer-side": "#85a8be",
  "drawer-back": "#6f8ea2",
  "drawer-bottom": "#b9c7d4",
};

export function materialPreviewColor(sheet?: StockSheet | null): string {
  const name = normalizeName(sheet?.name ?? sheet?.material ?? "");

  if (name.includes("blanco") || name.includes("nevada")) return "#e8dec8";
  if (name.includes("negra") || name.includes("negro")) return "#4e535c";
  if (name.includes("wengue")) return "#6a4b3d";
  if (name.includes("cerezo")) return "#9d5f46";
  if (name.includes("croma") || name.includes("cromo")) return "#9b9385";
  if (name.includes("habana")) return "#8b694d";
  if (name.includes("gris") || name.includes("olmo")) return "#8d9196";
  if (name.includes("marmol")) return "#d7d4cd";
  if (name.includes("mdf")) return "#b69d7f";
  if (name.includes("triplex")) return "#a68b61";

  return "#cfc2ab";
}

export function buildManualIsoLayout(
  panels: Panel[],
  modules: ModuleNode[],
): IsoPanel[] {
  const expanded = expandPanels(normalizePanelsModule(panels));
  if (expanded.length === 0) return [];

  const thickness = 1.8;
  const moduleOrder = modules.length > 0 ? modules : [ROOT_MODULE];

  const result: IsoPanel[] = [];
  const moduleWidthHints: number[] = [];

  moduleOrder.forEach((module, moduleIndex) => {
    const modulePanels = expanded.filter(
      (panel) => (panel.moduleId || ROOT_MODULE.id) === module.id,
    );
    if (modulePanels.length === 0) return;

    const sides = modulePanels.filter((p) => p.role === "side");
    const tops = modulePanels.filter((p) => p.role === "top");
    const bottoms = modulePanels.filter((p) => p.role === "bottom");
    const backs = modulePanels.filter((p) => p.role === "back");
    const shelves = modulePanels.filter((p) => p.role === "shelf");
    const doors = modulePanels.filter((p) => p.role === "door");
    const dividers = modulePanels.filter((p) => p.role === "divider");
    const drawerFronts = modulePanels.filter((p) => p.role === "drawer-front");
    const drawerSides = modulePanels.filter((p) => p.role === "drawer-side");
    const drawerBacks = modulePanels.filter((p) => p.role === "drawer-back");
    const drawerBottoms = modulePanels.filter(
      (p) => p.role === "drawer-bottom",
    );

    // ── Infer module bounding box (for positioning only, not panel sizes) ──
    // Width = L of horizontal spanning panels (top, bottom, shelf, door, drawer-front)
    const widthCandidates = [
      ...tops,
      ...bottoms,
      ...shelves,
      ...doors,
      ...drawerFronts,
    ].map((p) => p.L);
    const width = Math.max(
      30,
      ...(widthCandidates.length
        ? widthCandidates
        : modulePanels.map((p) => p.L)),
    );

    // Depth = W of depth-spanning panels (top, bottom, shelf, side)
    const depthCandidates = [...tops, ...bottoms, ...shelves, ...sides].map(
      (p) => p.W,
    );
    const depth = Math.max(
      20,
      ...(depthCandidates.length
        ? depthCandidates
        : modulePanels.map((p) => p.W)),
    );

    // Height = L of vertical panels.
    // Priority: sides > backs (their longest dim) > doors > fallback.
    // Backs define the cabinet height more reliably than doors (doors can be partial-height).
    const height =
      sides.length > 0
        ? Math.max(...sides.map((p) => p.L))
        : backs.length > 0
          ? Math.max(...backs.map((p) => Math.max(p.L, p.W)))
          : doors.length > 0
            ? Math.max(...doors.map((p) => p.L))
            : Math.max(45, width * 0.75);

    moduleWidthHints[moduleIndex] = width;
    const previousModulesWidth = moduleWidthHints
      .slice(0, moduleIndex)
      .reduce((sum, currentWidth) => sum + (currentWidth || 60) + 12, 0);

    const depthLevel =
      module.parentId && module.parentId !== ROOT_MODULE.id ? 1 : 0;
    const offsetX = previousModulesWidth + depthLevel * 8;
    const offsetY = depthLevel * 6;

    const pushPanel = (
      panel: Panel,
      index: number,
      pos: { x: number; y: number; z: number },
      size: { w: number; d: number; h: number },
    ) => {
      result.push({
        id: `${module.id}-${panel.id}-${index}`,
        label: `${module.name}: ${panel.label}`,
        role: panel.role,
        pos: {
          x: offsetX + pos.x,
          y: offsetY + pos.y,
          z: pos.z,
        },
        size,
        color: "#cfc2ab",
      });
    };

    // ── Each panel rendered at its own L×W size, oriented by role ──

    // Sides: vertical, L = cabinet height, W = cabinet depth
    sides.forEach((panel, i) => {
      const x =
        i === 0
          ? 0
          : i === 1
            ? width - thickness
            : Math.min(width - thickness * 2, (width / (sides.length + 1)) * i);
      pushPanel(
        panel,
        i,
        { x, y: 0, z: 0 },
        { w: thickness, d: panel.W, h: panel.L },
      );
    });

    // Bottom: caps the base — span the full inferred module width × depth.
    bottoms.forEach((panel, i) => {
      pushPanel(
        panel,
        i,
        { x: 0, y: 0, z: 0 },
        { w: width, d: depth, h: thickness },
      );
    });

    // Top: same as bottom but at z = height - thickness.
    tops.forEach((panel, i) => {
      pushPanel(
        panel,
        i,
        { x: 0, y: 0, z: height - thickness },
        { w: width, d: depth, h: thickness },
      );
    });

    // Shelves: horizontal, L = inner width, W = depth, distributed vertically
    shelves.forEach((panel, i) => {
      const z = (height / (shelves.length + 1)) * (i + 1);
      pushPanel(
        panel,
        i,
        { x: thickness, y: 0.6, z },
        { w: panel.L, d: panel.W, h: thickness },
      );
    });

    // Dividers: vertical, L = height, W = depth
    dividers.forEach((panel, i) => {
      const x = (width / (dividers.length + 1)) * (i + 1) - thickness / 2;
      pushPanel(
        panel,
        i,
        { x, y: 0.6, z: thickness },
        { w: thickness, d: panel.W, h: panel.L },
      );
    });

    // Back: vertical panel anchored to rear.
    backs.forEach((panel, i) => {
      const lDelta = Math.abs(panel.L - height);
      const wDelta = Math.abs(panel.W - height);
      const backH = lDelta <= wDelta ? panel.L : panel.W;
      const backW = lDelta <= wDelta ? panel.W : panel.L;
      pushPanel(
        panel,
        i,
        { x: 0, y: depth - 0.8, z: 0 },
        { w: backW, d: 0.8, h: backH },
      );
    });

    // Drawers: use actual panel dimensions and respect real piece count.
    const drawerRows = Math.max(
      drawerFronts.length,
      drawerBottoms.length,
      drawerBacks.length,
      Math.ceil(drawerSides.length / 2),
      0,
    );

    // Estimate occupied drawer-front stack height so doors can start above it.
    const drawerGap = 1.2;
    const drawerBaseZ = thickness + 1;
    const estimatedDrawerStackHeight =
      drawerRows === 0
        ? 0
        : drawerFronts.slice(0, drawerRows).reduce<number>((sum, front) => {
            const frontH = Math.max(4, front?.W ?? height * 0.12);
            return sum + frontH;
          }, 0) +
          drawerGap * Math.max(0, drawerRows - 1);

    const openingX = thickness;
    const openingW = Math.max(8, width - thickness * 2);

    // Doors: vertical, L = height, W = door width.
    doors.forEach((panel, i) => {
      const perLeafOpening = openingW / Math.max(doors.length, 1);
      const doorW = Math.min(panel.W, perLeafOpening);
      const x = openingX + i * perLeafOpening + (perLeafOpening - doorW) / 2;
      const maxStart = Math.max(0, height - panel.L);
      const desiredStart =
        drawerRows > 0 ? drawerBaseZ + estimatedDrawerStackHeight + 1 : 0;
      const z = Math.min(maxStart, Math.max(0, desiredStart));
      pushPanel(panel, i, { x, y: -1.8, z }, { w: doorW, d: 0.9, h: panel.L });
    });

    let nextDrawerZ = drawerBaseZ;
    for (let i = 0; i < drawerRows; i += 1) {
      const drawerFront = drawerFronts[i];
      const drawerBottom = drawerBottoms[i];
      const drawerBack = drawerBacks[i];
      const leftDrawerSide = drawerSides[i * 2];
      const rightDrawerSide = drawerSides[i * 2 + 1];

      const frontH = Math.max(4, drawerFront?.W ?? height * 0.12);
      const z = nextDrawerZ;
      // drawer-front: L = panel width, W = panel height
      const frontW = Math.max(8, drawerFront?.L ?? width * 0.6);
      // drawer-side: L = box depth, W = box height
      const sideRef = leftDrawerSide ?? rightDrawerSide;
      const boxDepthVal = Math.max(
        10,
        sideRef?.L ?? drawerBottom?.W ?? depth * 0.6,
      );
      const boxH = Math.max(4, sideRef?.W ?? frontH * 0.7);
      // drawer-bottom: L = box width, W = box depth
      const boxWidth = Math.max(
        8,
        drawerBottom?.L ?? drawerBack?.L ?? frontW * 0.9,
      );

      if (drawerFront) {
        const frontWidth = Math.min(frontW, openingW);
        pushPanel(
          drawerFront,
          i,
          { x: openingX + (openingW - frontWidth) / 2, y: -2.1, z },
          { w: frontWidth, d: 1, h: frontH },
        );
      }

      if (drawerBottom) {
        pushPanel(
          drawerBottom,
          i,
          { x: (width - boxWidth) / 2, y: 1.2, z: z + 0.5 },
          { w: drawerBottom.L, d: drawerBottom.W, h: 0.8 },
        );
      }

      if (leftDrawerSide) {
        pushPanel(
          leftDrawerSide,
          i,
          { x: (width - boxWidth) / 2, y: 1.2, z: z + 0.5 },
          { w: 0.8, d: boxDepthVal, h: boxH },
        );
      }

      if (rightDrawerSide) {
        pushPanel(
          rightDrawerSide,
          i + 100,
          { x: (width - boxWidth) / 2 + boxWidth - 0.8, y: 1.2, z: z + 0.5 },
          { w: 0.8, d: boxDepthVal, h: boxH },
        );
      }

      if (drawerBack) {
        pushPanel(
          drawerBack,
          i,
          { x: (width - boxWidth) / 2, y: 1.2 + boxDepthVal - 0.8, z: z + 0.5 },
          { w: drawerBack.L, d: 0.8, h: drawerBack.W },
        );
      }

      nextDrawerZ += frontH + drawerGap;
    }
  });

  return result;
}

