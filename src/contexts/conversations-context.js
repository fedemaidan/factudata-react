import { createContext, useCallback, useContext, useMemo, useReducer, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { useConversationsFetch } from "src/hooks/useConversationsFetch";
import { useMessagesFetch } from "src/hooks/useMessagesFetch";
import { useMessageScroll } from "src/hooks/useMessageScroll";
import { useInsightNavigation } from "src/hooks/useErrorNavigation";
import { addNoteToMessage } from "src/services/conversacionService";

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
  SET_LOADING: "SET_LOADING",
  SET_INSIGHT_MESSAGE_IDS: "SET_INSIGHT_MESSAGE_IDS",
  SET_CURRENT_INSIGHT_INDEX: "SET_CURRENT_INSIGHT_INDEX",
  UPDATE_MESSAGE_NOTES: "UPDATE_MESSAGE_NOTES",
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
  loading: false,
  insightMessageIds: [],
  currentInsightIndex: -1,
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
    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };
    case ACTIONS.SET_INSIGHT_MESSAGE_IDS:
      return { ...state, insightMessageIds: action.payload };
    case ACTIONS.SET_CURRENT_INSIGHT_INDEX:
      return { ...state, currentInsightIndex: action.payload };
    case ACTIONS.UPDATE_MESSAGE_NOTES:
      return {
        ...state,
        messages: state.messages.map(msg => {
          const msgId = String(msg._id || msg.id);
          const targetId = String(action.payload.messageId);
          if (msgId === targetId) {
            return { ...msg, notas: action.payload.notas };
          }
          return msg;
        })
      };
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
  safeFilters.creadaDesde = toDateTime(filters?.creadaDesde, false);
  safeFilters.creadaHasta = toDateTime(filters?.creadaHasta, true);
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
  const creadaDesde = getStringParam(query.creadaDesde);
  const creadaHasta = getStringParam(query.creadaHasta);
  const empresaId = getStringParam(query.empresaId);
  const tipoContacto = getStringParam(query.tipoContacto);
  const showInsight = query.showInsight === 'true';
  const insightCategory = getStringParam(query.insightCategory);
  const insightTypesRaw = getStringParam(query.insightTypes);
  if (fechaDesde) filters.fechaDesde = fechaDesde;
  if (fechaHasta) filters.fechaHasta = fechaHasta;
  if (creadaDesde) filters.creadaDesde = creadaDesde;
  if (creadaHasta) filters.creadaHasta = creadaHasta;
  if (empresaId) filters.empresaId = empresaId;
  if (tipoContacto) filters.tipoContacto = tipoContacto;
  if (showInsight) filters.showInsight = true;
  if (insightCategory) filters.insightCategory = insightCategory;
  if (insightTypesRaw) filters.insightTypes = insightTypesRaw.split(',').filter(Boolean);
  return filters;
};

export const ConversationsContext = createContext(undefined);

export function ConversationsProvider({ children }) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, initialState);
  const skipDefaultLoadRef = useRef(false);
  const isManualSelectionRef = useRef(false);
  const { selected, conversations, messages, offset, hasMore, scrollToMessageId, highlightedMessageId, scrollToBottom, messageResults, loading, insightMessageIds, currentInsightIndex } =
    state;

  const search = useMemo(() => {
    const q = router.query.q;
    return Array.isArray(q) ? q[0] : q || "";
  }, [router.query.q]);

  const filters = useMemo(() => {
    return normalizeFilterDates(getFiltersFromQuery(router.query));
  }, [router.query.fechaDesde, router.query.fechaHasta, router.query.creadaDesde, router.query.creadaHasta, router.query.empresaId, router.query.tipoContacto, router.query.showInsight, router.query.insightCategory, router.query.insightTypes]);

  // Callbacks para los hooks
  const handleConversationsLoaded = useCallback((data) => {
    dispatch({ type: ACTIONS.SET_CONVERSATIONS, payload: data });
  }, []);

  const handleMessageResultsLoaded = useCallback((data) => {
    dispatch({ type: ACTIONS.SET_MESSAGE_RESULTS, payload: data });
  }, []);

  const handleLoadingUpdated = useCallback((isLoading) => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: isLoading });
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

  const handleInsightMessageIdsLoaded = useCallback((ids) => {
    dispatch({ type: ACTIONS.SET_INSIGHT_MESSAGE_IDS, payload: ids });
    dispatch({ type: ACTIONS.SET_CURRENT_INSIGHT_INDEX, payload: -1 });
  }, []);

  const { refreshConversations, performSearch } = useConversationsFetch({
    filters,
    onConversationsLoaded: handleConversationsLoaded,
    onMessageResultsLoaded: handleMessageResultsLoaded,
    onLoadingUpdated: handleLoadingUpdated,
  });

  useEffect(() => {
    if (!router.isReady || conversations.length === 0) {
      return;
    }

    if (isManualSelectionRef.current) {
      isManualSelectionRef.current = false;
      return;
    }

    const urlConversationId = getStringParam(router.query.conversationId);
    const currentSelectedId = selected?.ultimoMensaje?.id_conversacion;

    if (urlConversationId && urlConversationId !== currentSelectedId) {
      const conversationToSelect = conversations.find(
        (conv) => conv.ultimoMensaje?.id_conversacion === urlConversationId
      );

      if (conversationToSelect) {
        dispatch({ type: ACTIONS.SET_SCROLL_TO_MESSAGE_ID, payload: null });
        dispatch({ type: ACTIONS.SET_HIGHLIGHTED_MESSAGE_ID, payload: null });
        dispatch({ type: ACTIONS.SET_INSIGHT_MESSAGE_IDS, payload: [] });
        dispatch({ type: ACTIONS.SET_CURRENT_INSIGHT_INDEX, payload: -1 });
        skipDefaultLoadRef.current = false;
        dispatch({ type: ACTIONS.SET_SELECTED, payload: conversationToSelect });
      }
    }
  }, [router.isReady, router.query.conversationId, conversations, selected]);

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

  // Hook para cargar IDs de insights
  useInsightNavigation({
    selected,
    filters,
    onInsightIdsLoaded: handleInsightMessageIdsLoaded,
  });

  const handleSelectConversation = useCallback(
    (conversation) => {
      if (!conversation) {
        return;
      }

      // Marcar como selección manual para evitar que el useEffect se dispare
      isManualSelectionRef.current = true;

      dispatch({ type: ACTIONS.SET_SCROLL_TO_MESSAGE_ID, payload: null });
      dispatch({ type: ACTIONS.SET_HIGHLIGHTED_MESSAGE_ID, payload: null });
      dispatch({ type: ACTIONS.SET_INSIGHT_MESSAGE_IDS, payload: [] });
      dispatch({ type: ACTIONS.SET_CURRENT_INSIGHT_INDEX, payload: -1 });
      skipDefaultLoadRef.current = false;
      dispatch({ type: ACTIONS.SET_SELECTED, payload: conversation });

      const conversationId = conversation.ultimoMensaje?.id_conversacion;
      if (conversationId) {
        const newQuery = { ...router.query, conversationId };
        router.replace({ pathname: router.pathname, query: newQuery }, undefined, { shallow: true });
      }
    },
    [dispatch, router]
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
        // Marcar como selección manual para evitar que el useEffect se dispare
        isManualSelectionRef.current = true;
        
        skipDefaultLoadRef.current = true;
        dispatch({ type: ACTIONS.SET_SELECTED, payload: result.conversation });
        dispatch({ type: ACTIONS.SET_SCROLL_TO_MESSAGE_ID, payload: targetMessageId });
        dispatch({ type: ACTIONS.SET_HIGHLIGHTED_MESSAGE_ID, payload: targetMessageId });

        const conversationId = result.conversationId;
        if (conversationId) {
          const newQuery = { ...router.query, conversationId };
          router.replace({ pathname: router.pathname, query: newQuery }, undefined, { shallow: true });
        }

        await loadMessageById(result.conversationId, targetMessageId, result.conversation);
      } catch (error) {
        console.error("Error al cargar el mensaje buscado:", error);
      }
    },
    [loadMessageById, router]
  );

  const loadMore = useCallback(async () => {
    await loadMoreMessages(messages, offset, hasMore);
  }, [loadMoreMessages, messages, offset, hasMore]);

  const handleNavigateToInsight = useCallback(async (direction = 'next') => {
    const insightIds = state.insightMessageIds;
    if (!insightIds || insightIds.length === 0 || !selected) return;

    let newIndex;
    if (direction === 'next') {
      newIndex = (state.currentInsightIndex + 1) % insightIds.length;
    } else {
      newIndex = state.currentInsightIndex <= 0 ? insightIds.length - 1 : state.currentInsightIndex - 1;
    }

    const targetMessageId = insightIds[newIndex];
    dispatch({ type: ACTIONS.SET_CURRENT_INSIGHT_INDEX, payload: newIndex });

    const isMessageLoaded = messages.some(m => String(m._id || m.id) === String(targetMessageId));

    if (isMessageLoaded) {
      dispatch({ type: ACTIONS.SET_SCROLL_TO_MESSAGE_ID, payload: targetMessageId });
      dispatch({ type: ACTIONS.SET_HIGHLIGHTED_MESSAGE_ID, payload: targetMessageId });
      dispatch({ type: ACTIONS.SET_SCROLL_TO_BOTTOM, payload: false });
    } else {
      try {
        dispatch({ type: ACTIONS.SET_SCROLL_TO_MESSAGE_ID, payload: targetMessageId });
        dispatch({ type: ACTIONS.SET_HIGHLIGHTED_MESSAGE_ID, payload: targetMessageId });
        await loadMessageById(selected.ultimoMensaje.id_conversacion, targetMessageId, selected);
      } catch (error) {
        console.error("Error al cargar mensaje de insight:", error);
      }
    }
  }, [state.insightMessageIds, state.currentInsightIndex, selected, messages, loadMessageById]);

  const handleSend = useCallback(
    async (text) => {
      try {
        const { updatedConversations } = await sendNewMessage(text, messages, conversations);
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
    async (value, options = {}) => {
      const queryValue = value || "";
      const currentQ = Array.isArray(router.query.q) ? router.query.q[0] : router.query.q || "";
      
      const newQuery = { ...router.query };
      
      if (!queryValue) {
        delete newQuery.q;
        delete newQuery.searchInMessages;
        delete newQuery.msgFechaDesde;
        delete newQuery.msgFechaHasta;
      } else {
        newQuery.q = queryValue;
        
        if (options.searchInMessages) {
          newQuery.searchInMessages = "true";
          if (options.fechaDesde) newQuery.msgFechaDesde = options.fechaDesde;
          if (options.fechaHasta) newQuery.msgFechaHasta = options.fechaHasta;
        } else {
          delete newQuery.searchInMessages;
          delete newQuery.msgFechaDesde;
          delete newQuery.msgFechaHasta;
        }
      }

      // Check if anything actually changed to avoid unnecessary replaces
      const isDifferent = 
        newQuery.q !== router.query.q ||
        newQuery.searchInMessages !== router.query.searchInMessages ||
        newQuery.msgFechaDesde !== router.query.msgFechaDesde ||
        newQuery.msgFechaHasta !== router.query.msgFechaHasta;

      if (isDifferent) {
        router.replace({ pathname: router.pathname, query: newQuery }, undefined, { shallow: true });
      } else {
        // If URL is same, maybe force search? 
        // performSearch relies on router state in our updated hook, so we might need to wait for router update if we used push/replace.
        // But if params are same, performSearch won't see a change.
        // We can call performSearch manually if needed, but usually not required if state matches.
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
      if (normalizedFilters.creadaDesde) {
        newQuery.creadaDesde = normalizedFilters.creadaDesde.split("T")[0];
      } else {
        delete newQuery.creadaDesde;
      }
      if (normalizedFilters.creadaHasta) {
        newQuery.creadaHasta = normalizedFilters.creadaHasta.split("T")[0];
      } else {
        delete newQuery.creadaHasta;
      }
      if (normalizedFilters.empresaId) {
        newQuery.empresaId = normalizedFilters.empresaId;
      } else {
        delete newQuery.empresaId;
      }
      if (normalizedFilters.tipoContacto && normalizedFilters.tipoContacto !== "todos") {
        newQuery.tipoContacto = normalizedFilters.tipoContacto;
      } else {
        delete newQuery.tipoContacto;
      }
      if (normalizedFilters.showInsight) {
        newQuery.showInsight = 'true';
      } else {
        delete newQuery.showInsight;
      }
      if (normalizedFilters.insightCategory && normalizedFilters.insightCategory !== 'todos') {
        newQuery.insightCategory = normalizedFilters.insightCategory;
      } else {
        delete newQuery.insightCategory;
      }
      if (normalizedFilters.insightTypes?.length) {
        newQuery.insightTypes = normalizedFilters.insightTypes.join(',');
      } else {
        delete newQuery.insightTypes;
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

  const handleAddNote = useCallback(async ({ messageId, content, userEmail }) => {
    try {
      const response = await addNoteToMessage({ messageId, content, userEmail });
      dispatch({ 
        type: ACTIONS.UPDATE_MESSAGE_NOTES, 
        payload: { messageId, notas: response.notas } 
      });
      return { success: true };
    } catch (error) {
      console.error("Error al agregar nota:", error);
      return { success: false, error: error.message || 'Error al agregar nota' };
    }
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
      loading,
      insightMessageIds,
      currentInsightIndex,
      onSelectConversation: handleSelectConversation,
      onMessageSelect: handleSelectMessageResult,
      onSearch: handleSearch,
      onRefreshConversations: handleRefreshConversations,
      onFiltersChange: handleFiltersChange,
      onRefreshCurrentConversation: handleRefreshCurrentConversation,
      onSend: handleSend,
      loadMore,
      handleScrollToMessageHandled,
      onInsightMessageIdsLoaded: handleInsightMessageIdsLoaded,
      onNavigateToInsight: handleNavigateToInsight,
      onAddNote: handleAddNote,
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
      insightMessageIds,
      currentInsightIndex,
      handleSelectConversation,
      handleSelectMessageResult,
      handleSearch,
      handleRefreshConversations,
      handleFiltersChange,
      handleRefreshCurrentConversation,
      handleSend,
      loadMore,
      handleScrollToMessageHandled,
      handleInsightMessageIdsLoaded,
      handleNavigateToInsight,
      handleAddNote,
    ]
  );

  return <ConversationsContext.Provider value={value}>{children}</ConversationsContext.Provider>;
}

export const useConversationsContext = () => {
  const context = useContext(ConversationsContext);
  if (!context) {
    throw new Error("useConversationsContext must be used within a ConversationsProvider");
  }
  return context;
};

