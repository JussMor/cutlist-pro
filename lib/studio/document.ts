/**
 * lib/studio/document.ts
 * Authoring model for the Studio redesign: columns of typed module cells plus
 * global dimensions. Pure interfaces + factory + pure mutators (each returns a
 * new document) so they slot directly into the Zustand `set` reducer.
 *
 * Units: width / height / depth are CENTIMETERS; thickness / overhang are MILLIMETERS.
 * The despiece + geometry engines convert to a single working unit.
 */

/**
 * Legacy single-axis cell type. Kept for backward compatibility with saved
 * documents; new code reads `interior` + `front` via the helpers below.
 */
export type CellType =
  | "multiple"
  | "shelf"
  | "drawer"
  | "doors"
  | "left-door"
  | "right-door";

/** What lives *inside* the compartment, independent of any door in front. */
export type CellInterior = "empty" | "shelf" | "drawer";

/** The door treatment on the *front* of the compartment, independent of interior. */
export type CellFront = "none" | "double" | "left" | "right" | "flip-up";

export interface StudioCell {
  id: string;
  /** @deprecated legacy single-axis type — read via cellInterior()/cellFront() */
  type?: CellType;
  interior?: CellInterior; // what's inside (empty / shelves / drawers)
  front?: CellFront; // door in front (none / double / left / right / flip-up)
  height: number; // centimeters (total exterior section height = lateral height for a single-cell column)
  shelfCount?: number; // shelf interior
  drawerCount?: number; // drawer interior
}

/**
 * Resolve a cell's interior, falling back to the legacy `type` so old documents
 * keep rendering without a migration pass.
 */
export function cellInterior(cell: StudioCell): CellInterior {
  if (cell.interior) return cell.interior;
  switch (cell.type) {
    case "shelf":
      return "shelf";
    case "drawer":
      return "drawer";
    default:
      // "multiple" | "doors" | "left-door" | "right-door" -> open box
      return "empty";
  }
}

/** Resolve a cell's front door, falling back to the legacy `type`. */
export function cellFront(cell: StudioCell): CellFront {
  if (cell.front) return cell.front;
  switch (cell.type) {
    case "doors":
      return "double";
    case "left-door":
      return "left";
    case "right-door":
      return "right";
    default:
      return "none";
  }
}

export interface StudioColumn {
  id: string;
  width: number; // centimeters
  cells: StudioCell[]; // bottom -> top
}

export interface StudioGlobals {
  depth: number; // centimeters
  thickness: number; // mm
  overhang: number; // mm
  hiddenBackPanels?: string[]; // "${columnId}/${cellId}" keys for hidden fondos
}

export interface ManualPanel {
  id: string;
  label: string;
  L: number; // largo (cm)
  W: number; // ancho (cm)
  thickness: number; // espesor (cm)
  qty: number;
  banding: { top: boolean; bottom: boolean; left: boolean; right: boolean };
}

export type BandingMap = Record<string, { top: boolean; bottom: boolean; left: boolean; right: boolean }>;

export interface StudioDocument {
  id: string;
  title: string;
  columns: StudioColumn[];
  globals: StudioGlobals;
  manualPanels: ManualPanel[];
  bandingOverrides?: BandingMap; // keyed by StudioPanel.key — user overrides for auto panels
  createdAt: number;
  updatedAt: number;
}

export const DEFAULT_COLUMN_WIDTH = 45;
export const DEFAULT_CELL_HEIGHT = 30;
export const MAX_MODULE_HEIGHT_CM = 240;
export const DEFAULT_GLOBALS: StudioGlobals = {
  depth: 45,
  thickness: 15,
  overhang: 0,
};

let counter = 0;
function genId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export function createCell(): StudioCell {
  return {
    id: genId("cell"),
    interior: "shelf",
    front: "none",
    height: DEFAULT_CELL_HEIGHT,
    shelfCount: 1,
  };
}

export function createColumn(cells = 1): StudioColumn {
  return {
    id: genId("col"),
    width: DEFAULT_COLUMN_WIDTH,
    cells: Array.from({ length: Math.max(1, cells) }, () => createCell()),
  };
}

export function createStudioDocument(title = "untitled"): StudioDocument {
  const now = Date.now();
  return {
    id: genId("studio"),
    title,
    columns: [],
    globals: { ...DEFAULT_GLOBALS },
    manualPanels: [],
    createdAt: now,
    updatedAt: now,
  };
}

function touch(doc: StudioDocument): StudioDocument {
  return { ...doc, updatedAt: Date.now() };
}

export function columnIdOfCell(
  doc: StudioDocument,
  cellId: string,
): string | undefined {
  return doc.columns.find((c) => c.cells.some((cell) => cell.id === cellId))?.id;
}

export function addColumn(
  doc: StudioDocument,
  atIndex = doc.columns.length,
): StudioDocument {
  const columns = [...doc.columns];
  const idx = Math.max(0, Math.min(atIndex, columns.length));
  columns.splice(idx, 0, createColumn(1));
  return touch({ ...doc, columns });
}

export function addCell(
  doc: StudioDocument,
  columnId: string,
  atIndex?: number,
): StudioDocument {
  const columns = doc.columns.map((col) => {
    if (col.id !== columnId) return col;
    const cells = [...col.cells];
    const idx = atIndex == null ? cells.length : Math.max(0, Math.min(atIndex, cells.length));
    cells.splice(idx, 0, createCell());
    return { ...col, cells };
  });
  return touch({ ...doc, columns });
}

export type CellPatch = Partial<
  Pick<StudioCell, "interior" | "front" | "height" | "shelfCount" | "drawerCount">
>;

export function updateCells(
  doc: StudioDocument,
  ids: string[],
  patch: CellPatch,
): StudioDocument {
  const idSet = new Set(ids);
  const columns = doc.columns.map((col) => ({
    ...col,
    cells: col.cells.map((cell) =>
      idSet.has(cell.id) ? { ...cell, ...patch } : cell,
    ),
  }));
  return touch({ ...doc, columns });
}

export function updateColumnWidth(
  doc: StudioDocument,
  columnIds: string[],
  width: number,
): StudioDocument {
  const idSet = new Set(columnIds);
  const columns = doc.columns.map((col) =>
    idSet.has(col.id) ? { ...col, width: Math.max(5, width) } : col,
  );
  return touch({ ...doc, columns });
}

export function deleteCells(doc: StudioDocument, ids: string[]): StudioDocument {
  const idSet = new Set(ids);
  const columns = doc.columns
    .map((col) => ({
      ...col,
      cells: col.cells.filter((cell) => !idSet.has(cell.id)),
    }))
    .filter((col) => col.cells.length > 0);
  // never allow an empty document
  if (columns.length === 0) return touch({ ...doc, columns: [createColumn(1)] });
  return touch({ ...doc, columns });
}

export function setGlobals(
  doc: StudioDocument,
  patch: Partial<StudioGlobals>,
): StudioDocument {
  return touch({ ...doc, globals: { ...doc.globals, ...patch } });
}

export function addManualPanel(
  doc: StudioDocument,
  panel: Omit<ManualPanel, "id">,
): StudioDocument {
  const manualPanels = [...(doc.manualPanels ?? []), { ...panel, id: genId("mp") }];
  return touch({ ...doc, manualPanels });
}

export function updateManualPanel(
  doc: StudioDocument,
  id: string,
  patch: Partial<Omit<ManualPanel, "id">>,
): StudioDocument {
  const manualPanels = (doc.manualPanels ?? []).map((p) =>
    p.id === id ? { ...p, ...patch } : p,
  );
  return touch({ ...doc, manualPanels });
}

export function updateBandingOverride(
  doc: StudioDocument,
  panelKey: string,
  banding: { top: boolean; bottom: boolean; left: boolean; right: boolean },
): StudioDocument {
  return touch({ ...doc, bandingOverrides: { ...(doc.bandingOverrides ?? {}), [panelKey]: banding } });
}

export function deleteManualPanel(doc: StudioDocument, id: string): StudioDocument {
  const manualPanels = (doc.manualPanels ?? []).filter((p) => p.id !== id);
  return touch({ ...doc, manualPanels });
}
