import { useEffect } from "react";
import { getInsightMessageIds } from "src/services/conversacionService";

export function useInsightNavigation({ selected, filters, onInsightIdsLoaded }) {
  useEffect(() => {
    if (!selected || !filters?.showInsight) {
      onInsightIdsLoaded?.([]);
      return;
    }

    const loadInsightIds = async () => {
      try {
        const ids = await getInsightMessageIds(selected.ultimoMensaje.id_conversacion, filters);
        onInsightIdsLoaded?.(ids);
      } catch (error) {
        console.error("Error al cargar IDs de insights:", error);
        onInsightIdsLoaded?.([]);
      }
    };

    loadInsightIds();
  }, [selected, filters?.showInsight, onInsightIdsLoaded]);
}
