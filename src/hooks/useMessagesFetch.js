import { useCallback, useEffect, useRef } from "react";
import { fetchMessages, sendMessage, getJumpInfo } from "src/services/conversacionService";

const PAGE = 50;

export function useMessagesFetch({
  selected,
  skipDefaultLoadRef,
  onMessagesLoaded,
  onOffsetUpdated,
  onHasMoreUpdated,
  onScrollToBottom,
  onScrollToMessageIdCleared,
  onHighlightedMessageIdCleared,
}) {
  const activeRef = useRef(true);

  // Cargar mensajes cuando se selecciona una conversación
  useEffect(() => {
    if (!selected) {
      onMessagesLoaded?.([]);
      onOffsetUpdated?.(0);
      onHasMoreUpdated?.(false);
      onScrollToMessageIdCleared?.();
      onHighlightedMessageIdCleared?.();
      return;
    }

    if (skipDefaultLoadRef?.current) {
      skipDefaultLoadRef.current = false;
      return;
    }

    activeRef.current = true;

    const loadSelectedMessages = async () => {
      try {
        const { items, total } = await fetchMessages(selected.ultimoMensaje.id_conversacion, {
          limit: PAGE,
          offset: 0,
        });

        if (!activeRef.current) {
          return;
        }

        const reversedItems = [...items].reverse();
        onMessagesLoaded?.(reversedItems);
        onOffsetUpdated?.(reversedItems.length);
        onHasMoreUpdated?.(reversedItems.length < total);
        onScrollToBottom?.(true);
        onScrollToMessageIdCleared?.();
        onHighlightedMessageIdCleared?.();
      } catch (error) {
        console.error("Error al cargar mensajes:", error);
      }
    };

    loadSelectedMessages();

    return () => {
      activeRef.current = false;
    };
  }, [
    selected,
    skipDefaultLoadRef,
    onMessagesLoaded,
    onOffsetUpdated,
    onHasMoreUpdated,
    onScrollToBottom,
    onScrollToMessageIdCleared,
    onHighlightedMessageIdCleared,
  ]);

  const loadMore = useCallback(
    async (currentMessages, currentOffset, currentHasMore) => {
      if (!selected || !currentHasMore) {
        return;
      }

      onScrollToBottom?.(false);

      try {
        const { items, total } = await fetchMessages(selected.ultimoMensaje.id_conversacion, {
          limit: PAGE,
          offset: currentOffset,
        });

        const reversedItems = [...items].reverse();
        const newMessages = [...reversedItems, ...currentMessages];
        const newOffset = currentOffset + reversedItems.length;

        onMessagesLoaded?.(newMessages);
        onOffsetUpdated?.(newOffset);
        onHasMoreUpdated?.(newOffset < total);
      } catch (error) {
        console.error("Error al cargar más mensajes:", error);
      }
    },
    [selected, onMessagesLoaded, onOffsetUpdated, onHasMoreUpdated, onScrollToBottom]
  );

  const sendNewMessage = useCallback(
    async (text, currentMessages, currentConversations) => {
      if (!selected) {
        return;
      }

      try {
        const { message } = await sendMessage({
          conversationId: selected.ultimoMensaje.id_conversacion,
          text,
        });

        const updatedMessages = [...currentMessages, message];
        onMessagesLoaded?.(updatedMessages);

        const updatedConversations = currentConversations.map((cv) =>
          cv.id === selected.id ? { ...cv, lastMessage: text, updatedAt: message.fecha } : cv
        );

        return { updatedMessages, updatedConversations };
      } catch (error) {
        console.error("Error al enviar mensaje:", error);
        throw error;
      }
    },
    [selected, onMessagesLoaded]
  );

  const loadMessageById = useCallback(
    async (conversationId, messageId, conversation) => {
      try {
        const { limitToFetch } = await getJumpInfo(conversationId, messageId);
        const { items, total } = await fetchMessages(conversationId, {
          limit: limitToFetch,
          offset: 0,
          sort: "desc",
        });

        const reversedItems = [...items].reverse();
        onMessagesLoaded?.(reversedItems);
        onOffsetUpdated?.(reversedItems.length);
        onHasMoreUpdated?.(reversedItems.length < total);
        onScrollToBottom?.(false);

        return { messages: reversedItems, conversation };
      } catch (error) {
        console.error("Error al cargar el mensaje buscado:", error);
        throw error;
      }
    },
    [onMessagesLoaded, onOffsetUpdated, onHasMoreUpdated, onScrollToBottom]
  );

  const refreshCurrentConversation = useCallback(async () => {
    if (!selected) {
      return;
    }

    try {
      const { items, total } = await fetchMessages(selected.ultimoMensaje.id_conversacion, {
        limit: PAGE,
        offset: 0,
      });

      const reversedItems = [...items].reverse();
      onMessagesLoaded?.(reversedItems);
      onOffsetUpdated?.(reversedItems.length);
      onHasMoreUpdated?.(reversedItems.length < total);
      onScrollToBottom?.(true);
    } catch (error) {
      console.error("Error al refrescar conversación actual:", error);
    }
  }, [selected, onMessagesLoaded, onOffsetUpdated, onHasMoreUpdated, onScrollToBottom]);

  return {
    loadMore,
    sendNewMessage,
    loadMessageById,
    refreshCurrentConversation,
  };
}

