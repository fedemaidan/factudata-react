import { useEffect } from "react";
import { getErrorMessageIds } from "src/services/conversacionService";

export function useErrorNavigation({ selected, filters, onErrorIdsLoaded }) {
  useEffect(() => {
    if (!selected || !filters?.showErrors) {
      onErrorIdsLoaded?.([]);
      return;
    }

    const loadErrorIds = async () => {
      try {
        const ids = await getErrorMessageIds(selected.ultimoMensaje.id_conversacion);
        onErrorIdsLoaded?.(ids);
      } catch (error) {
        console.error("Error al cargar IDs de errores:", error);
        onErrorIdsLoaded?.([]);
      }
    };

    loadErrorIds();
  }, [selected, filters?.showErrors, onErrorIdsLoaded]);
}
