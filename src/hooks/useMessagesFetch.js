import { useCallback, useEffect, useRef } from "react";
import { fetchMessages, fetchRecentMessages, sendMessage, getJumpInfo } from "src/services/conversacionService";
import {
  cacheMessages,
  getCachedMessagesForConversation,
  countCachedMessagesForConversation,
  getGlobalSyncTime,
  getMessageWindowCutoff,
  saveGlobalSyncTime,
  getSyncIntervalMs,
} from "src/db/indexed-db";

const PAGE = 50;

const resolveConversationUserId = (conversation) => {
  if (!conversation) return null;
  if (conversation.wPid) return conversation.wPid;
  if (conversation.lid) return conversation.lid;
  if (conversation.ultimoMensaje?.receptor) return conversation.ultimoMensaje.receptor;
  if (conversation.profile?.phone) return conversation.profile.phone;
  return null;
};

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

    const loadAndSync = async () => {
      try {
        const cachedMessages = await getCachedMessagesForConversation(conversationId, {
          limit: PAGE * 4,
        });
        if (!activeRef.current) return;

        onMessagesLoaded?.(cachedMessages);
        onOffsetUpdated?.(cachedMessages.length);
        onHasMoreUpdated?.(false);

        const [localCount, globalLastSync] = await Promise.all([
          countCachedMessagesForConversation(conversationId),
          getGlobalSyncTime(),
        ]);
        const lastSync = globalLastSync ? Number(globalLastSync) : 0;
        const windowCutoff = getMessageWindowCutoff().getTime();
        const needsFullWindow = localCount < 1000;
        const now = Date.now();
        const baseSince = needsFullWindow ? windowCutoff : Math.max(lastSync, now - 30_000);
        const sinceTimestamp = Math.max(baseSince, windowCutoff);
        const sinceDate = new Date(Math.max(0, sinceTimestamp));

        const params = {
          limit: needsFullWindow ? 1000 : PAGE * 2,
          sort: "desc",
        };
        if (sinceDate.getTime()) {
          params.sinceCreatedAt = sinceDate.toISOString();
        }

        const { items = [] } = await fetchMessages(conversationId, params);
        if (!activeRef.current) return;

        let fetchedItems = items;
        if (
          !fetchedItems.length &&
          needsFullWindow &&
          !cachedMessages.length &&
          activeRef.current
        ) {
          const fallback = await fetchMessages(conversationId, {
            limit: 500,
            sort: "desc",
          });
          fetchedItems = fallback?.items?.length ? fallback.items : fetchedItems;
        }

        if (fetchedItems.length) {
          const cacheOptions = needsFullWindow && !cachedMessages.length ? { ignoreWindow: true } : undefined;
          await cacheMessages(fetchedItems, cacheOptions);
          const finalLimit = Math.max(
            cachedMessages.length + fetchedItems.length,
            1000,
            PAGE * 4
          );
          const refreshedMessages = await getCachedMessagesForConversation(conversationId, {
            limit: finalLimit,
          });
          if (!activeRef.current) return;
          onMessagesLoaded?.(refreshedMessages);
          onOffsetUpdated?.(refreshedMessages.length);
        }

        onHasMoreUpdated?.(false);
        onScrollToBottom?.(true);
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

  const runImmediateSync = useCallback(
    async (currentMessageCount = 0) => {
      if (!selected) return;

      try {
        const intervalMs = getSyncIntervalMs();
        const windowCutoff = getMessageWindowCutoff().getTime();
        const globalLastSync = Number((await getGlobalSyncTime()) || 0);
        const now = Date.now();
        const baseSince = globalLastSync ? Math.max(globalLastSync, now - intervalMs) : windowCutoff;
        const sinceTimestamp = Math.max(baseSince, windowCutoff);
        const params = { limit: 2000 };
        if (sinceTimestamp > 0) {
          params.sinceUpdatedAt = new Date(sinceTimestamp).toISOString();
        }

        const { items = [] } = await fetchRecentMessages(params);
        await saveGlobalSyncTime(now);
        if (!items.length) return;

        await cacheMessages(items);
        const activeConversationId = selected?.ultimoMensaje?.id_conversacion;
        if (!activeConversationId) return;

        const limit = Math.max(currentMessageCount + items.length, PAGE * 2, 200);
        const refreshedMessages = await getCachedMessagesForConversation(activeConversationId, { limit });

        if (refreshedMessages.length) {
          onMessagesLoaded?.(refreshedMessages);
          onScrollToBottom?.(true);
        }
      } catch (error) {
        console.error("Error al sincronizar mensajes tras el envío:", error);
      }
    },
    [selected, onMessagesLoaded, onScrollToBottom]
  );

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

      const userId = resolveConversationUserId(selected);
      if (!userId) {
        throw new Error("No se pudo determinar el userId para enviar el mensaje");
      }

      try {
        const { message: savedMessage } = await sendMessage({
          userId,
          message: text,
          conversationId: selected.ultimoMensaje?.id_conversacion,
        });

        const updatedMessages = savedMessage ? [...currentMessages, savedMessage] : [...currentMessages];
        onMessagesLoaded?.(updatedMessages);

        if (savedMessage) {
          await cacheMessages([savedMessage]);
        }

        const updatedConversations = currentConversations.map((cv) => {
          if (cv.id !== selected.id) {
            return cv;
          }
          const updatedAt =
            savedMessage?.fecha || savedMessage?.createdAt || savedMessage?.updatedAt || new Date().toISOString();
          const conversationId = cv.ultimoMensaje?.id_conversacion || selected.ultimoMensaje?.id_conversacion;
          return {
            ...cv,
            lastMessage: text,
            updatedAt,
            ultimoMensaje: savedMessage
              ? {
                  ...savedMessage,
                  id_conversacion: conversationId,
                }
              : { ...cv.ultimoMensaje, message: text },
          };
        });

        await runImmediateSync(updatedMessages.length);

        return { updatedMessages, updatedConversations };
      } catch (error) {
        console.error("Error al enviar mensaje:", error);
        throw error;
      }
    },
    [selected, onMessagesLoaded, runImmediateSync]
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
      }
    } catch (error) {
      console.error("Error al refrescar conversación actual:", error);
    }
  }, [selected, onMessagesLoaded, onOffsetUpdated, onHasMoreUpdated, onScrollToBottom]);

  const refreshMessagesFromCache = useCallback(async () => {
    if (!selected) return;
    const conversationId = selected.ultimoMensaje?.id_conversacion;
    if (!conversationId) return;

    try {
      const refreshedMessages = await getCachedMessagesForConversation(conversationId, {
        limit: PAGE * 4,
      });
      onMessagesLoaded?.(refreshedMessages);
      onOffsetUpdated?.(refreshedMessages.length);
      onHasMoreUpdated?.(false);
      onScrollToBottom?.(true);
    } catch (error) {
      console.error("Error al recargar mensajes desde cache:", error);
    }
  }, [selected, onMessagesLoaded, onOffsetUpdated, onHasMoreUpdated, onScrollToBottom]);

  return {
    loadMore,
    sendNewMessage,
    loadMessageById,
    refreshCurrentConversation,
    refreshMessagesFromCache,
  };
}

