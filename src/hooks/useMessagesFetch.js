import { useCallback, useEffect, useRef } from "react";
import { fetchMessages, sendMessage, getJumpInfo } from "src/services/conversacionService";
import {
  cacheMessages,
  getCachedMessagesForConversation,
  getSyncCursor,
  deleteOldMessages,
  saveSyncCursor,
  touchConversation,
} from "src/db/indexed-db";
import { filterUniqueMessages, resolveLatestCursor } from "src/utils/messageCache";

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

    const conversationId = selected.ultimoMensaje?.id_conversacion;
    if (!conversationId) {
      return;
    }

    activeRef.current = true;
    onScrollToMessageIdCleared?.();
    onHighlightedMessageIdCleared?.();
    touchConversation(conversationId).catch(() => {});

    const loadAndSync = async () => {
      try {
        const cachedMessages = await getCachedMessagesForConversation(conversationId, { limit: PAGE * 2 });
        if (!activeRef.current) {
          return;
        }

        if (cachedMessages.length) {
          onMessagesLoaded?.(cachedMessages);
          onOffsetUpdated?.(cachedMessages.length);
          onHasMoreUpdated?.(false);
        }

        const cursor = await getSyncCursor(conversationId);
        const hasCursor = Boolean(cursor?.createdAt);
        const params = hasCursor
          ? {
              sinceCreatedAt: cursor.createdAt.toISOString(),
              sinceId: cursor._id,
              limit: PAGE,
            }
          : { limit: PAGE, offset: 0 };

        const sortOrder = hasCursor ? "asc" : "desc";
        const { items = [], total, cursor: responseCursor } = await fetchMessages(conversationId, {
          ...params,
          sort: sortOrder,
        });

        if (!activeRef.current) {
          return;
        }

        const orderedItems = hasCursor ? items : [...items].reverse();
        const appendedItems = hasCursor ? filterUniqueMessages(cachedMessages, orderedItems) : orderedItems;
        const finalMessages = hasCursor ? [...cachedMessages, ...appendedItems] : orderedItems;

        onMessagesLoaded?.(finalMessages);
        onOffsetUpdated?.(finalMessages.length);
        if (!hasCursor) {
          onHasMoreUpdated?.(orderedItems.length < (total ?? 0));
        }
        onScrollToBottom?.(true);

        if (items.length) {
          await cacheMessages(items);
          await deleteOldMessages({ conversationId });
        }

        const syncCursorValue = responseCursor || resolveLatestCursor(items) || cursor;
        if (syncCursorValue) {
          await saveSyncCursor(conversationId, syncCursorValue, { recentAt: Date.now() });
        }
      } catch (error) {
        console.error("Error al cargar mensajes:", error);
      }
    };

    loadAndSync();

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
        onHasMoreUpdated?.(newOffset < (total ?? 0));

        if (items.length) {
          await cacheMessages(items);
        }
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

        if (message) {
          await cacheMessages([message]);
          const cursor = resolveLatestCursor([message]);
          if (cursor) {
            await saveSyncCursor(selected.ultimoMensaje.id_conversacion, cursor, {
              recentAt: Date.now(),
            });
          }
          await deleteOldMessages({ conversationId: selected.ultimoMensaje.id_conversacion });
          await touchConversation(selected.ultimoMensaje.id_conversacion).catch(() => {});
        }

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
        onHasMoreUpdated?.(reversedItems.length < (total ?? 0));
        onScrollToBottom?.(false);

        if (items.length) {
          await cacheMessages(items);
          const cursor = resolveLatestCursor(items);
          if (cursor) {
            await saveSyncCursor(conversationId, cursor, { recentAt: Date.now() });
          }
          await deleteOldMessages({ conversationId });
          await touchConversation(conversationId).catch(() => {});
        }

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

    const conversationId = selected.ultimoMensaje?.id_conversacion;
    if (!conversationId) return;

    try {
      const { items, total } = await fetchMessages(conversationId, {
        limit: PAGE,
        offset: 0,
      });

      const reversedItems = [...items].reverse();
      onMessagesLoaded?.(reversedItems);
      onOffsetUpdated?.(reversedItems.length);
      onHasMoreUpdated?.(reversedItems.length < (total ?? 0));
      onScrollToBottom?.(true);

      if (items.length) {
        await cacheMessages(items);
        const cursor = resolveLatestCursor(items);
        if (cursor) {
          await saveSyncCursor(conversationId, cursor, { recentAt: Date.now() });
        }
        await deleteOldMessages({ conversationId });
        await touchConversation(conversationId).catch(() => {});
      }
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

