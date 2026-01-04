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
  onLoadingUpdated,
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
    
    const searchInMessages = router.query.searchInMessages === "true";
    const msgFechaDesde = router.query.msgFechaDesde;
    const msgFechaHasta = router.query.msgFechaHasta;

    const loadConversations = async () => {
      onLoadingUpdated?.(true);
      try {
        // Prepare filters for message search if needed
        const messageFilters = { ...filters };
        if (msgFechaDesde) messageFilters.fechaDesde = msgFechaDesde;
        if (msgFechaHasta) messageFilters.fechaHasta = msgFechaHasta;

        const [conversationData, messageMatchesData] = await Promise.all([
          query ? searchConversations(query, filters) : fetchConversations(filters),
          (query && searchInMessages) ? searchMessages(query, messageFilters) : Promise.resolve([]),
        ]);

        if (!activeRef.current) {
          return;
        }

        onConversationsLoaded?.(conversationData);
        onMessageResultsLoaded?.(messageMatchesData);
        onSearchUpdated?.(query);
      } catch (error) {
        console.error("Error al cargar conversaciones:", error);
      } finally {
        if (activeRef.current) {
          onLoadingUpdated?.(false);
        }
      }
    };

    loadConversations();

    return () => {
      activeRef.current = false;
    };
  }, [filters, router.isReady, router.query.q, router.query.searchInMessages, router.query.msgFechaDesde, router.query.msgFechaHasta, onConversationsLoaded, onMessageResultsLoaded, onSearchUpdated, onLoadingUpdated]);

  const refreshConversations = useCallback(async () => {
    if (!router.isReady) {
      return;
    }
    onLoadingUpdated?.(true);
    try {
      const data = await fetchConversations(filters);
      onConversationsLoaded?.(data);

      const q = router.query.q;
      const query = Array.isArray(q) ? q[0] : q || "";
      const searchInMessages = router.query.searchInMessages === "true";
      
      if (query && searchInMessages) {
        const msgFechaDesde = router.query.msgFechaDesde;
        const msgFechaHasta = router.query.msgFechaHasta;
        const messageFilters = { ...filters };
        if (msgFechaDesde) messageFilters.fechaDesde = msgFechaDesde;
        if (msgFechaHasta) messageFilters.fechaHasta = msgFechaHasta;

        const matches = await searchMessages(query, messageFilters);
        onMessageResultsLoaded?.(matches);
      }
    } catch (error) {
      console.error("Error al refrescar conversaciones:", error);
    } finally {
      onLoadingUpdated?.(false);
    }
  }, [filters, router.isReady, router.query.q, router.query.searchInMessages, router.query.msgFechaDesde, router.query.msgFechaHasta, onConversationsLoaded, onMessageResultsLoaded, onLoadingUpdated]);

  const performSearch = useCallback(
    async (queryValue, currentFilters) => {
      // This function might be redundant if we rely on URL updates, 
      // but keeping it for manual calls if any.
      // It doesn't have access to the new message search params unless passed in currentFilters or read from router.
      // For consistency, let's make it read from router or just rely on the effect.
      // But since it takes queryValue argument, it implies an imperative call.
      
      // Let's just log a warning or update it to respect the router state for message search flags
      // or assume this is only called when URL changes are not desired (which is rare in this app structure).
      
      onLoadingUpdated?.(true);
      try {
        const searchInMessages = router.query.searchInMessages === "true";
        const msgFechaDesde = router.query.msgFechaDesde;
        const msgFechaHasta = router.query.msgFechaHasta;
        
        const messageFilters = { ...currentFilters };
        if (msgFechaDesde) messageFilters.fechaDesde = msgFechaDesde;
        if (msgFechaHasta) messageFilters.fechaHasta = msgFechaHasta;

        const [conversationData, messageMatchesData] = await Promise.all([
          queryValue ? searchConversations(queryValue, currentFilters) : fetchConversations(currentFilters),
          (queryValue && searchInMessages) ? searchMessages(queryValue, messageFilters) : Promise.resolve([]),
        ]);

        onConversationsLoaded?.(conversationData);
        onMessageResultsLoaded?.(messageMatchesData);
        onSearchUpdated?.(queryValue);
      } catch (error) {
        console.error("Error al buscar:", error);
      } finally {
        onLoadingUpdated?.(false);
      }
    },
    [onConversationsLoaded, onMessageResultsLoaded, onSearchUpdated, router.query, onLoadingUpdated]
  );

  return {
    refreshConversations,
    performSearch,
  };
}

