import { createContext, useCallback, useContext, useMemo, useReducer, useRef } from "react";
import PropTypes from "prop-types";
import { useRouter } from "next/router";
import { useConversationsFetch } from "src/hooks/useConversationsFetch";
import { useMessagesFetch } from "src/hooks/useMessagesFetch";
import { useMessageScroll } from "src/hooks/useMessageScroll";

const ACTIONS = {
  SET_CONVERSATIONS: "SET_CONVERSATIONS",
  SET_MESSAGES: "SET_MESSAGES",
  SET_SELECTED: "SET_SELECTED",
  SET_SEARCH: "SET_SEARCH",
  SET_FILTERS: "SET_FILTERS",
  SET_MESSAGE_RESULTS: "SET_MESSAGE_RESULTS",
  SET_OFFSET: "SET_OFFSET",
  SET_HAS_MORE: "SET_HAS_MORE",
  SET_SCROLL_TO_BOTTOM: "SET_SCROLL_TO_BOTTOM",
  SET_SCROLL_TO_MESSAGE_ID: "SET_SCROLL_TO_MESSAGE_ID",
  SET_HIGHLIGHTED_MESSAGE_ID: "SET_HIGHLIGHTED_MESSAGE_ID",
};

const initialState = {
  conversations: [],
  messages: [],
  selected: null,
  search: "",
  messageResults: [],
  offset: 0,
  hasMore: false,
  scrollToBottom: true,
  scrollToMessageId: null,
  highlightedMessageId: null,
};

const reducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_CONVERSATIONS:
      return { ...state, conversations: action.payload };
    case ACTIONS.SET_MESSAGES:
      return { ...state, messages: action.payload };
    case ACTIONS.SET_SELECTED:
      return { ...state, selected: action.payload };
    case ACTIONS.SET_SEARCH:
      return { ...state, search: action.payload };
    case ACTIONS.SET_MESSAGE_RESULTS:
      return { ...state, messageResults: action.payload };
    case ACTIONS.SET_OFFSET:
      return { ...state, offset: action.payload };
    case ACTIONS.SET_HAS_MORE:
      return { ...state, hasMore: action.payload };
    case ACTIONS.SET_SCROLL_TO_BOTTOM:
      return { ...state, scrollToBottom: action.payload };
    case ACTIONS.SET_SCROLL_TO_MESSAGE_ID:
      return { ...state, scrollToMessageId: action.payload };
    case ACTIONS.SET_HIGHLIGHTED_MESSAGE_ID:
      return { ...state, highlightedMessageId: action.payload };
    default:
      return state;
  }
};

const normalizeFilterDates = (filters) => {
  const safeFilters = { ...filters };
  const toDateTime = (value, end = false) => {
    if (!value) return "";
    const base = value.includes("T") ? value.split("T")[0] : value;
    const time = end ? "23:59:59" : "00:00:00";
    return `${base}T${time}`;
  };

  safeFilters.fechaDesde = toDateTime(filters?.fechaDesde, false);
  safeFilters.fechaHasta = toDateTime(filters?.fechaHasta, true);
  return safeFilters;
};

const getStringParam = (value) => {
  if (!value) return "";
  return Array.isArray(value) ? (value[0] || "") : value;
};

const getFiltersFromQuery = (query) => {
  const filters = {};
  const fechaDesde = getStringParam(query.fechaDesde);
  const fechaHasta = getStringParam(query.fechaHasta);
  const empresaId = getStringParam(query.empresaId);
  if (fechaDesde) filters.fechaDesde = fechaDesde;
  if (fechaHasta) filters.fechaHasta = fechaHasta;
  if (empresaId) filters.empresaId = empresaId;
  return filters;
};

export const ConversationsContext = createContext(undefined);

export function ConversationsProvider({ children }) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, initialState);
  const skipDefaultLoadRef = useRef(false);
  const { selected, conversations, messages, offset, hasMore, scrollToMessageId, highlightedMessageId, scrollToBottom, messageResults } =
    state;

  const search = useMemo(() => {
    const q = router.query.q;
    return Array.isArray(q) ? q[0] : q || "";
  }, [router.query.q]);

  const filters = useMemo(() => {
    return normalizeFilterDates(getFiltersFromQuery(router.query));
  }, [router.query.fechaDesde, router.query.fechaHasta, router.query.empresaId]);

  // Callbacks para los hooks
  const handleConversationsLoaded = useCallback((data) => {
    dispatch({ type: ACTIONS.SET_CONVERSATIONS, payload: data });
  }, []);

  const handleMessageResultsLoaded = useCallback((data) => {
    dispatch({ type: ACTIONS.SET_MESSAGE_RESULTS, payload: data });
  }, []);

  const handleSearchUpdated = useCallback((query) => {
    // Ya no necesitamos actualizar el estado, viene de query params
  }, []);

  const handleMessagesLoaded = useCallback((data) => {
    dispatch({ type: ACTIONS.SET_MESSAGES, payload: data });
  }, []);

  const handleOffsetUpdated = useCallback((value) => {
    dispatch({ type: ACTIONS.SET_OFFSET, payload: value });
  }, []);

  const handleHasMoreUpdated = useCallback((value) => {
    dispatch({ type: ACTIONS.SET_HAS_MORE, payload: value });
  }, []);

  const handleScrollToBottom = useCallback((value) => {
    dispatch({ type: ACTIONS.SET_SCROLL_TO_BOTTOM, payload: value });
  }, []);

  const handleScrollToMessageIdCleared = useCallback(() => {
    dispatch({ type: ACTIONS.SET_SCROLL_TO_MESSAGE_ID, payload: null });
  }, []);

  const handleHighlightedMessageIdCleared = useCallback(() => {
    dispatch({ type: ACTIONS.SET_HIGHLIGHTED_MESSAGE_ID, payload: null });
  }, []);

  const { refreshConversations, performSearch } = useConversationsFetch({
    filters,
    onConversationsLoaded: handleConversationsLoaded,
    onMessageResultsLoaded: handleMessageResultsLoaded,
    onSearchUpdated: handleSearchUpdated,
  });

  const { loadMore: loadMoreMessages, sendNewMessage, loadMessageById, refreshCurrentConversation } = useMessagesFetch({
    selected,
    skipDefaultLoadRef,
    onMessagesLoaded: handleMessagesLoaded,
    onOffsetUpdated: handleOffsetUpdated,
    onHasMoreUpdated: handleHasMoreUpdated,
    onScrollToBottom: handleScrollToBottom,
    onScrollToMessageIdCleared: handleScrollToMessageIdCleared,
    onHighlightedMessageIdCleared: handleHighlightedMessageIdCleared,
  });

  // Hook para scroll y highlight
  useMessageScroll({
    highlightedMessageId,
    onHighlightedMessageIdCleared: handleHighlightedMessageIdCleared,
  });

  const handleSelectConversation = useCallback(
    (conversation) => {
      if (!conversation) {
        return;
      }

      dispatch({ type: ACTIONS.SET_SCROLL_TO_MESSAGE_ID, payload: null });
      dispatch({ type: ACTIONS.SET_HIGHLIGHTED_MESSAGE_ID, payload: null });
      skipDefaultLoadRef.current = false;
      dispatch({ type: ACTIONS.SET_SELECTED, payload: conversation });
    },
    [dispatch]
  );

  const handleSelectMessageResult = useCallback(
    async (result) => {
      if (!result) {
        return;
      }

      const targetMessageId = result?.matchMessage?.id || result?.matchMessage?._id;
      if (!targetMessageId) {
        return;
      }

      try {
        skipDefaultLoadRef.current = true;
        dispatch({ type: ACTIONS.SET_SELECTED, payload: result.conversation });
        dispatch({ type: ACTIONS.SET_SCROLL_TO_MESSAGE_ID, payload: targetMessageId });
        dispatch({ type: ACTIONS.SET_HIGHLIGHTED_MESSAGE_ID, payload: targetMessageId });

        await loadMessageById(result.conversationId, targetMessageId, result.conversation);
      } catch (error) {
        console.error("Error al cargar el mensaje buscado:", error);
      }
    },
    [loadMessageById]
  );

  const loadMore = useCallback(async () => {
    await loadMoreMessages(messages, offset, hasMore);
  }, [loadMoreMessages, messages, offset, hasMore]);

  const handleSend = useCallback(
    async (text) => {
      try {
        const { updatedMessages, updatedConversations } = await sendNewMessage(text, messages, conversations);
        if (updatedConversations) {
          dispatch({ type: ACTIONS.SET_CONVERSATIONS, payload: updatedConversations });
        }
        dispatch({ type: ACTIONS.SET_SCROLL_TO_BOTTOM, payload: true });
      } catch (error) {
        console.error("Error al enviar mensaje:", error);
      }
    },
    [sendNewMessage, messages, conversations]
  );

  const handleSearch = useCallback(
    async (value) => {
      const queryValue = value || "";
      const currentQ = Array.isArray(router.query.q) ? router.query.q[0] : router.query.q || "";
      
      if (currentQ !== queryValue) {
        const newQuery = { ...router.query };
        if (!queryValue) {
          delete newQuery.q;
        } else {
          newQuery.q = queryValue;
        }

        router.replace({ pathname: router.pathname, query: newQuery }, undefined, { shallow: true });
      } else {
        // Si ya está en la URL, solo ejecutar la búsqueda
        await performSearch(queryValue, filters);
      }
    },
    [filters, router, performSearch]
  );

  const handleRefreshConversations = useCallback(async () => {
    await refreshConversations();
  }, [refreshConversations]);

  const handleFiltersChange = useCallback(
    async (newFilters) => {
      const normalizedFilters = normalizeFilterDates(newFilters);

      // Actualizar query params (guardamos solo YYYY-MM-DD para URLs limpias)
      const newQuery = { ...router.query };
      if (normalizedFilters.fechaDesde) {
        newQuery.fechaDesde = normalizedFilters.fechaDesde.split("T")[0];
      } else {
        delete newQuery.fechaDesde;
      }
      if (normalizedFilters.fechaHasta) {
        newQuery.fechaHasta = normalizedFilters.fechaHasta.split("T")[0];
      } else {
        delete newQuery.fechaHasta;
      }
      if (normalizedFilters.empresaId) {
        newQuery.empresaId = normalizedFilters.empresaId;
      } else {
        delete newQuery.empresaId;
      }

      router.replace({ pathname: router.pathname, query: newQuery }, undefined, { shallow: true });
      const query = search || "";
      await performSearch(query, normalizedFilters);
    },
    [search, router, performSearch]
  );

  const handleRefreshCurrentConversation = useCallback(async () => {
    await refreshCurrentConversation();
  }, [refreshCurrentConversation]);

  const handleScrollToMessageHandled = useCallback(() => {
    dispatch({ type: ACTIONS.SET_SCROLL_TO_MESSAGE_ID, payload: null });
  }, []);

  const value = useMemo(
    () => ({
      conversations,
      messages,
      selected,
      search,
      filters,
      messageResults,
      hasMore,
      scrollToBottom,
      scrollToMessageId,
      highlightedMessageId,
      onSelectConversation: handleSelectConversation,
      onMessageSelect: handleSelectMessageResult,
      onSearch: handleSearch,
      onRefreshConversations: handleRefreshConversations,
      onFiltersChange: handleFiltersChange,
      onRefreshCurrentConversation: handleRefreshCurrentConversation,
      onSend: handleSend,
      loadMore,
      handleScrollToMessageHandled,
    }),
    [
      conversations,
      messages,
      selected,
      search,
      filters,
      messageResults,
      hasMore,
      scrollToBottom,
      scrollToMessageId,
      highlightedMessageId,
      handleSelectConversation,
      handleSelectMessageResult,
      handleSearch,
      handleRefreshConversations,
      handleFiltersChange,
      handleRefreshCurrentConversation,
      handleSend,
      loadMore,
      handleScrollToMessageHandled,
    ]
  );

  return <ConversationsContext.Provider value={value}>{children}</ConversationsContext.Provider>;
}

ConversationsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useConversationsContext = () => {
  const context = useContext(ConversationsContext);
  if (!context) {
    throw new Error("useConversationsContext must be used within a ConversationsProvider");
  }
  return context;
};

