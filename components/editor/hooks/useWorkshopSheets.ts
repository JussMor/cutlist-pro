import { fetchSheets } from "@/lib/api/client";
import { MaterialMode, StockSheet } from "@/lib/domain/types";
import { useMemo, useState } from "react";

export interface UseWorkshopSheetsReturn {
  sheets: StockSheet[];
  selectedSheetIds: number[];
  primarySheetId: number | null;
  materialMode: MaterialMode;
  globalDims: { L: number; W: number };
  loadingSheets: boolean;
  assignableSheets: StockSheet[];
  loadSheets: (forceRefresh?: boolean) => Promise<void>;
  toggleSheetSelection: (sheetId: number) => void;
  changeMaterialMode: (mode: MaterialMode) => void;
  changeGlobalDims: (L: number, W: number) => void;
  changePrimarySheet: (sheetId: number) => void;
  setSheets: React.Dispatch<React.SetStateAction<StockSheet[]>>;
  setSelectedSheetIds: React.Dispatch<React.SetStateAction<number[]>>;
  setPrimarySheetId: React.Dispatch<React.SetStateAction<number | null>>;
  setMaterialMode: React.Dispatch<React.SetStateAction<MaterialMode>>;
  setGlobalDims: React.Dispatch<React.SetStateAction<{ L: number; W: number }>>;
  setResultNull: () => void;
}

import React from "react";

export interface UseWorkshopSheetsOptions {
  setResult: (val: null) => void;
  setError: (msg: string | null) => void;
}

export function useWorkshopSheets({
  setResult,
  setError,
}: UseWorkshopSheetsOptions): UseWorkshopSheetsReturn {
  const [sheets, setSheets] = useState<StockSheet[]>([]);
  const [selectedSheetIds, setSelectedSheetIds] = useState<number[]>([]);
  const [primarySheetId, setPrimarySheetId] = useState<number | null>(null);
  const [materialMode, setMaterialMode] = useState<MaterialMode>("single");
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [globalDims, setGlobalDims] = useState<{ L: number; W: number }>({
    L: 244,
    W: 215,
  });

  const assignableSheets = useMemo(() => {
    const applyDims = (sheet: StockSheet): StockSheet => ({
      ...sheet,
      L: globalDims.L,
      W: globalDims.W,
    });
    if (materialMode === "single") {
      return sheets
        .filter((sheet) => sheet.odooId === primarySheetId)
        .map(applyDims);
    }
    return sheets
      .filter((sheet) => selectedSheetIds.includes(sheet.odooId))
      .map(applyDims);
  }, [materialMode, primarySheetId, selectedSheetIds, sheets, globalDims]);

  async function loadSheets(forceRefresh = false) {
    try {
      setLoadingSheets(true);
      setError(null);
      const data = await fetchSheets(forceRefresh);
      setSheets(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando tableros");
    } finally {
      setLoadingSheets(false);
    }
  }

  function toggleSheetSelection(sheetId: number) {
    setSelectedSheetIds((current) => {
      const exists = current.includes(sheetId);
      const next = exists
        ? current.filter((id) => id !== sheetId)
        : [...current, sheetId];
      return next;
    });
    setResult(null);
  }

  function changeMaterialMode(mode: MaterialMode) {
    setMaterialMode(mode);
    setResult(null);
  }

  function changeGlobalDims(L: number, W: number) {
    setGlobalDims({ L, W });
    setResult(null);
  }

  function changePrimarySheet(sheetId: number) {
    setPrimarySheetId(sheetId);
    if (!selectedSheetIds.includes(sheetId)) {
      setSelectedSheetIds((current) => [...current, sheetId]);
    }
    setResult(null);
  }

  return {
    sheets,
    selectedSheetIds,
    primarySheetId,
    materialMode,
    globalDims,
    loadingSheets,
    assignableSheets,
    loadSheets,
    toggleSheetSelection,
    changeMaterialMode,
    changeGlobalDims,
    changePrimarySheet,
    setSheets,
    setSelectedSheetIds,
    setPrimarySheetId,
    setMaterialMode,
    setGlobalDims,
    setResultNull: () => setResult(null),
  };
}
