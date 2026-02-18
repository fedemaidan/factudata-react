import { useCallback, useEffect } from "react";
import { getCachedConversations } from "src/db/indexed-db";

export function useConversationsFetch({
  filters,
  onConversationsLoaded,
  onLoadingUpdated,
}) {
  const runCachedFilters = useCallback(
    async (currentFilters) => {
      onLoadingUpdated?.(true);
      try {
        const conversations = await getCachedConversations({ filters: currentFilters, limit: 200 });
        onConversationsLoaded?.(conversations);
      } catch (error) {
        console.error("Error cargando conversaciones desde cache:", error);
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

