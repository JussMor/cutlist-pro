import { useEffect, useRef } from "react";

export function useReloadConfirmationGuard(enabled = true) {
  const allowReloadRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (allowReloadRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const isReloadShortcut =
        event.key === "F5" ||
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "r");

      if (!isReloadShortcut) return;

      event.preventDefault();
      const confirmed = window.confirm(
        "Esta accion recargara la pagina. Deseas continuar?",
      );
      if (!confirmed) return;

      allowReloadRef.current = true;
      window.location.reload();
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [enabled]);
}
