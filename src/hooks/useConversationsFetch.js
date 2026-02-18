import { useCallback, useEffect } from "react";
import { getCachedConversations, cacheConversations } from "src/db/indexed-db";
import { fetchConversations } from "src/services/conversacionService";

const hasInsightFilters = (filters) =>
  Boolean(
    filters?.showInsight ||
      (filters?.insightCategory && filters.insightCategory !== "todos") ||
      (filters?.insightTypes?.length > 0)
  );

export function useConversationsFetch({
  filters,
  onConversationsLoaded,
  onLoadingUpdated,
}) {
  const runCachedFilters = useCallback(
    async (currentFilters) => {
      onLoadingUpdated?.(true);
      try {
        if (hasInsightFilters(currentFilters)) {
          const insightFilters = { ...currentFilters, showInsight: true };
          const data = await fetchConversations(insightFilters);
          const items = Array.isArray(data) ? data : data?.items ?? [];
          const filtered = items.filter((c) => Number(c?.insightCount ?? 0) > 0);
          await cacheConversations(filtered).catch(() => {});
          onConversationsLoaded?.(filtered);
        } else {
          const conversations = await getCachedConversations({
            filters: currentFilters,
            limit: 200,
          });
          onConversationsLoaded?.(conversations);
        }
      } catch (error) {
        console.error("Error cargando conversaciones:", error);
      } finally {
        onLoadingUpdated?.(false);
      }
    },
    [onConversationsLoaded, onLoadingUpdated]
  );

  useEffect(() => {
    runCachedFilters(filters);
  }, [filters, runCachedFilters]);

  const refreshConversations = useCallback(async () => {
    await runCachedFilters(filters);
  }, [filters, runCachedFilters]);

  return {
    refreshConversations,
    runCachedFilters,
    performSearch: runCachedFilters,
  };
}

