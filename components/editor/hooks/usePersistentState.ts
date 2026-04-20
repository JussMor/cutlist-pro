import { Dispatch, SetStateAction, useEffect, useState } from "react";

export function usePersistentState<T>(
  storageKey: string,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        setState(JSON.parse(raw) as T);
      }
    } catch {
      // Ignore parse/storage read failures and keep initial value
    } finally {
      setHydrated(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Ignore storage failures (private mode, quota, etc.)
    }
  }, [hydrated, storageKey, state]);

  return [state, setState];
}
