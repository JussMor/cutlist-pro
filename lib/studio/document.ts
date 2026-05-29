/**
 * lib/studio/document.ts
 * Authoring model for the Studio redesign: columns of typed module cells plus
 * global dimensions. Pure interfaces + factory + pure mutators (each returns a
 * new document) so they slot directly into the Zustand `set` reducer.
 *
 * Units: width / height / depth are METERS; thickness / overhang are MILLIMETERS.
 * The despiece + geometry engines convert to a single working unit.
 */

export type CellType =
  | "multiple"
  | "shelf"
  | "drawer"
  | "doors"
  | "left-door"
  | "right-door";

export interface StudioCell {
  id: string;
  type: CellType;
  height: number; // meters (clear opening height)
  shelfCount?: number; // shelf / multiple
  drawerCount?: number; // drawer
}

export interface StudioColumn {
  id: string;
  width: number; // meters
  cells: StudioCell[]; // bottom -> top
}

export interface StudioGlobals {
  depth: number; // meters
  thickness: number; // mm
  overhang: number; // mm
}

export interface StudioDocument {
  id: string;
  title: string;
  columns: StudioColumn[];
  globals: StudioGlobals;
  createdAt: number;
  updatedAt: number;
}

export const DEFAULT_COLUMN_WIDTH = 0.45;
export const DEFAULT_CELL_HEIGHT = 0.3;
export const DEFAULT_GLOBALS: StudioGlobals = {
  depth: 0.45,
  thickness: 18,
  overhang: 20,
};

let counter = 0;
function genId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export function createCell(type: CellType = "shelf"): StudioCell {
  return { id: genId("cell"), type, height: DEFAULT_CELL_HEIGHT, shelfCount: 1 };
}

export function createColumn(cells = 2): StudioColumn {
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
    columns: [createColumn(2), createColumn(2)],
    globals: { ...DEFAULT_GLOBALS },
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
  columns.splice(idx, 0, createColumn(2));
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

export type CellPatch = Partial<Pick<StudioCell, "type" | "height" | "shelfCount" | "drawerCount">>;

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
    idSet.has(col.id) ? { ...col, width: Math.max(0.05, width) } : col,
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
