"use client";

import { create } from "zustand";

import {
  loadStudioDoc,
  saveStudioDoc,
  type StudioDocRecord,
} from "@/lib/api/client";
import {
  addCell as addCellMut,
  addColumn as addColumnMut,
  addManualPanel as addManualPanelMut,
  columnIdOfCell,
  createStudioDocument,
  deleteCells as deleteCellsMut,
  deleteManualPanel as deleteManualPanelMut,
  setGlobals as setGlobalsMut,
  toggleMergedDeck as toggleMergedDeckMut,
  updateBandingOverride as updateBandingOverrideMut,
  updateCells as updateCellsMut,
  updateColumnWidth,
  updateManualPanel as updateManualPanelMut,
  MAX_MODULE_HEIGHT_CM,
  type CellPatch,
  type ManualPanel,
  type StudioColumn,
  type StudioDocument,
  type StudioGlobals,
} from "@/lib/studio/document";

export type StudioTab = "design" | "cutlist";
export type RenderMode = "closed" | "open" | "expanded";
export type ColorMode = "colored" | "uncolored";

interface StudioState {
  doc: StudioDocument;
  activeTab: StudioTab;
  renderMode: RenderMode;
  colorMode: ColorMode;
  selection: string[]; // selected cell ids
  saving: boolean;
  publishedAt?: number;

  setActiveTab: (tab: StudioTab) => void;
  setRenderMode: (mode: RenderMode) => void;
  setColorMode: (mode: ColorMode) => void;
  setTitle: (title: string) => void;

  setSelection: (ids: string[]) => void;
  toggleSelect: (id: string, additive: boolean) => void;
  clearSelection: () => void;

  addColumn: (atIndex?: number) => void;
  addCellToColumn: (columnId: string, atIndex?: number) => void;
  patchSelection: (patch: CellPatch) => void;
  setSelectionWidth: (width: number) => void;
  deleteSelection: () => void;
  setGlobals: (patch: Partial<StudioGlobals>) => void;

  addManualPanel: (panel: Omit<ManualPanel, "id">) => void;
  updateManualPanel: (id: string, patch: Partial<Omit<ManualPanel, "id">>) => void;
  deleteManualPanel: (id: string) => void;
  updateBandingOverride: (panelKey: string, banding: { top: boolean; bottom: boolean; left: boolean; right: boolean }) => void;
  toggleMergedDeck: (colId: string, mi: number) => void;

  newDocument: () => void;
  load: (id: string) => Promise<void>;
  save: () => Promise<void>;
  publish: () => Promise<void>;
}

function selectedColumnIds(doc: StudioDocument, selection: string[]): string[] {
  const ids = new Set<string>();
  for (const cellId of selection) {
    const colId = columnIdOfCell(doc, cellId);
    if (colId) ids.add(colId);
  }
  return Array.from(ids);
}

export const useStudioStore = create<StudioState>((set, get) => ({
  doc: createStudioDocument(),
  activeTab: "design",
  renderMode: "open",
  colorMode: "colored",
  selection: [],
  saving: false,

  setActiveTab: (activeTab) => set({ activeTab }),
  setRenderMode: (renderMode) => set({ renderMode }),
  setColorMode: (colorMode) => set({ colorMode }),
  setTitle: (title) =>
    set((s) => ({ doc: { ...s.doc, title, updatedAt: Date.now() } })),

  setSelection: (selection) => set({ selection }),
  toggleSelect: (id, additive) =>
    set((s) => {
      if (!additive) return { selection: [id] };
      return s.selection.includes(id)
        ? { selection: s.selection.filter((x) => x !== id) }
        : { selection: [...s.selection, id] };
    }),
  clearSelection: () => set({ selection: [] }),

  addColumn: (atIndex) => set((s) => ({ doc: addColumnMut(s.doc, atIndex) })),
  addCellToColumn: (columnId, atIndex) =>
    set((s) => ({ doc: addCellMut(s.doc, columnId, atIndex) })),

  patchSelection: (patch) => {
    const clamped =
      patch.height !== undefined
        ? { ...patch, height: Math.min(patch.height, MAX_MODULE_HEIGHT_CM) }
        : patch;
    set((s) => ({ doc: updateCellsMut(s.doc, s.selection, clamped) }));
  },
  setSelectionWidth: (width) =>
    set((s) => ({
      doc: updateColumnWidth(s.doc, selectedColumnIds(s.doc, s.selection), width),
    })),
  deleteSelection: () =>
    set((s) => ({
      doc: deleteCellsMut(s.doc, s.selection),
      selection: [],
    })),
  setGlobals: (patch) => set((s) => ({ doc: setGlobalsMut(s.doc, patch) })),

  addManualPanel: (panel) =>
    set((s) => ({ doc: addManualPanelMut(s.doc, panel) })),
  updateManualPanel: (id, patch) =>
    set((s) => ({ doc: updateManualPanelMut(s.doc, id, patch) })),
  deleteManualPanel: (id) =>
    set((s) => ({ doc: deleteManualPanelMut(s.doc, id) })),
  updateBandingOverride: (panelKey, banding) =>
    set((s) => ({ doc: updateBandingOverrideMut(s.doc, panelKey, banding) })),
  toggleMergedDeck: (colId, mi) =>
    set((s) => ({ doc: toggleMergedDeckMut(s.doc, colId, mi) })),

  newDocument: () =>
    set({ doc: createStudioDocument(), selection: [], publishedAt: undefined }),

  load: async (id) => {
    const record = await loadStudioDoc(id);
    if (record) {
      const doc = { ...record.document, manualPanels: record.document.manualPanels ?? [] };
      set({ doc, publishedAt: record.publishedAt, selection: [] });
    }
  },

  save: async () => {
    set({ saving: true });
    try {
      const { doc, publishedAt } = get();
      await saveStudioDoc(toRecord(doc, publishedAt));
    } finally {
      set({ saving: false });
    }
  },

  publish: async () => {
    const publishedAt = Date.now();
    set({ saving: true, publishedAt });
    try {
      const { doc } = get();
      await saveStudioDoc(toRecord(doc, publishedAt));
    } finally {
      set({ saving: false });
    }
  },
}));

function toRecord(doc: StudioDocument, publishedAt?: number): StudioDocRecord {
  return { id: doc.id, title: doc.title, document: doc, publishedAt };
}

export type { StudioColumn };
