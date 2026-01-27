import { useEffect } from "react";
import { getInsightMessageIds } from "src/services/conversacionService";

export function useInsightNavigation({ selected, filters, onInsightIdsLoaded }) {
  const selectedConversationId = selected?.ultimoMensaje?.id_conversacion;
  const showInsight = filters?.showInsight;
  const insightCategory = filters?.insightCategory;
  const insightTypes = filters?.insightTypes;
  const fechaDesde = filters?.fechaDesde;
  const fechaHasta = filters?.fechaHasta;
  const insightTypesStr = JSON.stringify(insightTypes || []);

  useEffect(() => {
    if (!selectedConversationId || !showInsight) {
      onInsightIdsLoaded?.([]);
      return;
    }

    const loadInsightIds = async () => {
      try {
        const currentFilters = {
          fechaDesde,
          fechaHasta,
          insightCategory,
          insightTypes: insightTypes || [],
        };
        const ids = await getInsightMessageIds(selectedConversationId, currentFilters);
        onInsightIdsLoaded?.(ids);
      } catch (error) {
        console.error("Error al cargar IDs de insights:", error);
        onInsightIdsLoaded?.([]);
      }
    };

    loadInsightIds();
  }, [selectedConversationId, showInsight, insightCategory, insightTypesStr, insightTypes, fechaDesde, fechaHasta, onInsightIdsLoaded]);
}
