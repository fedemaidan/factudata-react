import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import {
  fetchConversations,
  searchConversations,
  searchMessages,
} from "src/services/conversacionService";

export function useConversationsFetch({
  filters,
  onConversationsLoaded,
  onMessageResultsLoaded,
  onSearchUpdated,
}) {
  const router = useRouter();
  const activeRef = useRef(true);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }
    activeRef.current = true;

    const q = router.query.q;
    const query = Array.isArray(q) ? q[0] : q || "";
    const shouldSearchMessages = query.trim().length >= 2;

    const loadConversations = async () => {
      try {
        const [conversationData, messageMatchesData] = await Promise.all([
          query ? searchConversations(query, filters) : fetchConversations(filters),
          shouldSearchMessages ? searchMessages(query) : Promise.resolve([]),
        ]);

        if (!activeRef.current) {
          return;
        }

        onConversationsLoaded?.(conversationData);
        onMessageResultsLoaded?.(messageMatchesData);
        onSearchUpdated?.(query);
      } catch (error) {
        console.error("Error al cargar conversaciones:", error);
      }
    };

    loadConversations();

    return () => {
      activeRef.current = false;
    };
  }, [filters, router.isReady, router.query.q, onConversationsLoaded, onMessageResultsLoaded, onSearchUpdated]);

  const refreshConversations = useCallback(async () => {
    if (!router.isReady) {
      return;
    }
    try {
      const data = await fetchConversations(filters);
      onConversationsLoaded?.(data);

      const q = router.query.q;
      const query = Array.isArray(q) ? q[0] : q || "";
      if (query.trim().length >= 2) {
        const matches = await searchMessages(query);
        onMessageResultsLoaded?.(matches);
      }
    } catch (error) {
      console.error("Error al refrescar conversaciones:", error);
    }
  }, [filters, router.isReady, router.query.q, onConversationsLoaded, onMessageResultsLoaded]);

  const performSearch = useCallback(
    async (queryValue, currentFilters) => {
      try {
        const shouldSearchMessages = queryValue.trim().length >= 3;
        const [conversationData, messageMatchesData] = await Promise.all([
          queryValue ? searchConversations(queryValue, currentFilters) : fetchConversations(currentFilters),
          shouldSearchMessages ? searchMessages(queryValue) : Promise.resolve([]),
        ]);

        onConversationsLoaded?.(conversationData);
        onMessageResultsLoaded?.(messageMatchesData);
        onSearchUpdated?.(queryValue);
      } catch (error) {
        console.error("Error al buscar:", error);
      }
    },
    [onConversationsLoaded, onMessageResultsLoaded, onSearchUpdated]
  );

  return {
    refreshConversations,
    performSearch,
  };
}

