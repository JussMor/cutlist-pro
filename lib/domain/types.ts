export type TemplateCategory =
  | "cocina"
  | "dormitorio"
  | "almacenaje"
  | "oficina";

export type PanelRole =
  | "side"
  | "top"
  | "bottom"
  | "back"
  | "shelf"
  | "door"
  | "divider"
  | "drawer-front"
  | "drawer-side"
  | "drawer-back"
  | "drawer-bottom";

export interface TemplateParams {
  W: number;
  H: number;
  D: number;
  thickness: number;
  shelves: number;
  [key: string]: number;
}

export interface BandingEdges {
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
}

export interface Panel {
  id: string;
  label: string;
  role: PanelRole;
  moduleId?: string;
  parentModuleId?: string;
  qty: number;
  L: number;
  W: number;
  banding: BandingEdges;
  stockSheetId?: number | null;
  grainDirection?: "horizontal" | "vertical" | "none";
}

export interface ModuleNode {
  id: string;
  name: string;
  parentId?: string;
}

export interface MachiningOp {
  panelId: string;
  moduleId?: string;
  qty?: number;
  type:
    | "edge-banding"
    | "drill"
    | "groove"
    | "hinge"
    | "slide"
    | "pilot-hole"
    | "confirmat";
  note: string;
}

export interface IsoPanel {
  id: string;
  label: string;
  role: PanelRole;
  pos: { x: number; y: number; z: number };
  size: { w: number; d: number; h: number };
  color: string;
}

export interface FurnitureTemplate {
  key: string;
  name: string;
  category: TemplateCategory;
  defaultParams: TemplateParams;
  despiece: (params: TemplateParams) => Panel[];
  isoLayout: (params: TemplateParams) => IsoPanel[];
}

export interface StockSheet {
  odooId: number;
  name: string;
  qty: number;
  pricePerSheet: number;
  L: number;
  W: number;
  material: string;
}

export type GuillotineSplitPreference =
  | "vertical-first"
  | "horizontal-first"
  | "short-side-first"
  | "auto-best";

export interface CutStep {
  order: number;
  panelId: string;
  split: "vertical-first" | "horizontal-first";
  orientation: "vertical" | "horizontal";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  length: number;
}

export interface OptimizeRequestOptions {
  splitPreference?: GuillotineSplitPreference;
}

export interface OptimizerComparisonEntry {
  splitPreference: "vertical-first" | "horizontal-first" | "short-side-first";
  sheetsUsed: number;
  wastePercent: number;
  totalCuts: number;
  totalCutLength: number;
}

export interface CutResultOptimizerMeta {
  requestedSplitPreference: GuillotineSplitPreference;
  appliedSplitPreference:
    | "vertical-first"
    | "horizontal-first"
    | "short-side-first";
  compared?: OptimizerComparisonEntry[];
}

export interface PlacedPanel {
  panelId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotated: boolean;
}

export interface PlacedSheet {
  sheet: StockSheet;
  placed: PlacedPanel[];
  cutSteps?: CutStep[];
}

export interface CostBreakdown {
  material: number;
  cutting: number;
  banding: number;
  total: number;
}

export interface CutResult {
  sheets: PlacedSheet[];
  stats: {
    sheetsUsed: number;
    totalArea: number;
    wastedArea: number;
    wastePercent: number;
    totalCuts: number;
    totalCutLength: number;
    totalBandingLength: number;
  };
  totalCost?: CostBreakdown;
  optimizer?: CutResultOptimizerMeta;
}

export interface PricingConfig {
  costPerCut: number;
  costPerBandingMeter: number;
  bandingType: string;
  kerfCm: number;
  fitClearanceCm: number;
  trimAllowanceCm: number;
  backInsetCm: number;
  doorSystem: "overlay" | "inset";
  doorRevealCm: number;
  hingeCupDiameterMm: 35 | 26;
  drawerSystem: "side-mount" | "undermount";
  drawerSideClearanceCm: number;
}

export type MaterialMode = "single" | "mixed";

export type ArtifactType = "drawer";

export interface DrawerArtifactParams {
  count: number;
  frontWidth: number;
  frontHeight: number;
  innerFrontHeight?: number;
  boxDepth: number;
  boxHeight: number;
  sideThickness: number;
  bottomThickness: number;
  backThickness: number;
  materialSheetId?: number | null;
  includeInnerFront?: boolean;
}

export interface ArtifactInstance {
  id: string;
  name: string;
  type: ArtifactType;
  moduleId: string;
  enabled: boolean;
  params: DrawerArtifactParams;
}

export interface Project {
  id: string;
  name: string;
  templateKey: string;
  params: TemplateParams;
  cutResult?: CutResult;
  pricingConfig: PricingConfig;
  workspace?: {
    panels: Panel[];
    modules: ModuleNode[];
    hiddenPreviewPanelIds: string[];
    selectedSheetIds: number[];
    primarySheetId: number | null;
    materialMode: MaterialMode;
    previewColorMode: "material" | "piece";
    globalDims: { L: number; W: number };
    activeAssemblyId?: string;
    artifacts?: ArtifactInstance[];
  };
  createdAt: number;
  updatedAt: number;
}

export interface Assembly {
  id: string;
  name: string;
  description?: string;
  panels: Panel[];
  isCustom: boolean;
  category?: TemplateCategory;
  createdAt: number;
  updatedAt: number;
}
