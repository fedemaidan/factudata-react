import Dexie from "dexie";
import { subDays } from "date-fns";
import { toNumber, normalizeDate } from "../utils/parseData";

const DB_NAME = "factudata-conversaciones";
const MESSAGE_WINDOW_DAYS = 14;
const SYNC_INTERVAL_MS = 1000 * 30; // 30 segundos

const db = new Dexie(DB_NAME);

db.version(1).stores({
  conversations: "&id, updatedAt, recentAt",
  messages: "&_id, conversationId, createdAt, [conversationId+createdAt], type, status",
  syncState: "&conversationId, lastSync, recentAt",
});

db.version(2).stores({
  conversations: "&id, updatedAt",
  messages: "&_id, conversationId, createdAt, [conversationId+createdAt], type, status",
  syncState: "&conversationId, lastSync",
});

const prepareConversationRecord = (conversation) => {
  const id = conversation._id || null;
  if (!id) return null;
  const updatedAt =
    normalizeDate(conversation?.updatedAt) ||
    normalizeDate(conversation?.ultimoMensaje?.fecha) ||
    normalizeDate(conversation?.ultimoMensaje?.createdAt) ||
    new Date();
  return {
    ...conversation,
    id,
    updatedAt: toNumber(updatedAt),
  };
};

const buildMessageRecord = (message) => {
  if (!message) return null;
  const conversationId = String(message.id_conversacion || message.conversationId || "");
  if (!conversationId) return null;
  const createdAtValue = message.createdAt
  const createdAt = normalizeDate(createdAtValue) || new Date();
  return {
    ...message,
    _id: String(message._id),
    conversationId,
    createdAt,
  };
};

const normalizeMessage = (message) => {
  return buildMessageRecord(message);
};

export const getMessageWindowCutoff = () =>
  subDays(new Date(), MESSAGE_WINDOW_DAYS);

const parseDateRange = (value, endOfDay = false) => {
  if (!value) return null;
  const base = value.includes("T") ? value.split("T")[0] : value;
  const date = new Date(`${base}T00:00:00`);
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  }
  return date;
};

const matchesTipoContacto = (conversation, tipoContacto) => {
  if (!tipoContacto || tipoContacto === "todos") return true;
  const hasProfile = conversation?.profile && Object.keys(conversation.profile || {}).length;
  if (tipoContacto === "cliente") {
    return Boolean(hasProfile);
  }
  return !hasProfile;
};

const matchesEstadoCliente = (conversation, estadoCliente) => {
  if (!estadoCliente || estadoCliente === "todos") return true;
  const empresa = conversation?.empresa;
  if (!empresa) return estadoCliente === "no_cliente";
  if (!empresa.esCliente) return estadoCliente === "no_cliente";
  if (empresa.estaDadoDeBaja) return estadoCliente === "dado_de_baja";
  return estadoCliente === "cliente_activo";
};

const getDateFromConversation = (conversation) => {
  const value =
    conversation?.ultimoMensaje?.fecha ||
    conversation?.ultimoMensaje?.createdAt ||
    conversation?.createdAt ||
    conversation?.updatedAt ||
    null;
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
};

const matchesDateRange = (conversation, { fechaDesde, fechaHasta, creadaDesde, creadaHasta }) => {
  const target = getDateFromConversation(conversation);
  if (!target) return true;
  const fechaDesdeDate = parseDateRange(fechaDesde);
  const fechaHastaDate = parseDateRange(fechaHasta, true);
  const creadaDesdeDate = parseDateRange(creadaDesde);
  const creadaHastaDate = parseDateRange(creadaHasta, true);
  if (fechaDesdeDate && target < fechaDesdeDate) return false;
  if (fechaHastaDate && target > fechaHastaDate) return false;
  if (creadaDesdeDate && target < creadaDesdeDate) return false;
  if (creadaHastaDate && target > creadaHastaDate) return false;
  return true;
};

const filterConversations = (conversations = [], filters = {}) => {
  return (conversations || []).filter((conversation) => {
    if (!matchesEstadoCliente(conversation, filters.estadoCliente)) return false;
    if (!matchesTipoContacto(conversation, filters.tipoContacto)) return false;
    if (filters.empresaId && String(filters.empresaId) !== String(conversation?.empresa?.id)) {
      return false;
    }
    if (!matchesDateRange(conversation, filters)) return false;
    if (filters.showInsight) {
      const count = Number(conversation?.insightCount ?? 0);
      if (count <= 0) return false;
    }
    return true;
  });
};

export const getCachedConversations = async ({ filters = {}, limit = 30 } = {}) => {
  const all = await db.conversations
    .orderBy("updatedAt")
    .reverse()
    .toArray();
  const filtered = filterConversations(all, filters);
  return filtered.slice(0, limit);
};

export const cacheConversations = async (conversations = []) => {
  const records = conversations
    .map((conversation) => prepareConversationRecord(conversation))
    .filter(Boolean);
  if (!records.length) return;
  await db.conversations.bulkPut(records);
};

export const cacheConversation = async (conversation) => {
  const record = prepareConversationRecord(conversation);
  if (!record) return;
  await db.conversations.put(record);
};

export const countCachedConversations = () => db.conversations.count();

export const getCachedMessagesForConversation = async (conversationId, { limit = 200 } = {}) => {
  if (!conversationId) return [];
  const records = await db.messages
    .where("[conversationId+createdAt]")
    .between([conversationId, Dexie.minKey], [conversationId, new Date()], true, true)
    .reverse()
    .limit(limit)
    .toArray();
  return records.reverse();
};

export const cacheMessages = async (messages = [], { ignoreWindow = false } = {}) => {
  const prepared = messages
    .map(normalizeMessage)
    .filter((message) => message && message.conversationId);
  if (!prepared.length) return;
  if (ignoreWindow) {
    await db.messages.bulkPut(prepared);
    return;
  }
  const cutoff = getMessageWindowCutoff();
  const filtered = prepared.filter((message) => {
    const createdAt = message.createdAt instanceof Date ? message.createdAt : new Date(message.createdAt);
    if (Number.isNaN(createdAt.getTime())) return false;
    return createdAt >= cutoff;
  });
  if (!filtered.length) return;
  await db.messages.bulkPut(filtered);
};

export const countCachedMessagesForConversation = async (conversationId) => {
  if (!conversationId) return 0;
  return db.messages.where("conversationId").equals(conversationId).count();
};

export const updateCachedMessageById = async (messageId, updates = {}) => {
  if (!messageId) return null;
  const normalizedId = String(messageId);
  const existing = await db.messages.get(normalizedId);
  if (!existing) return null;
  const merged = buildMessageRecord({
    ...existing,
    ...updates,
    conversationId: existing.conversationId,
  });
  if (!merged) return null;
  await db.messages.put(merged);
  return merged;
};

export const patchInsightIdsInCache = async (conversationId, messageIds = []) => {
  if (!conversationId || !messageIds?.length) return;
  const existingMessages = await db.messages.bulkGet(messageIds);
  const updates = [];

  for (const msg of existingMessages) {
    if (!msg || msg.conversationId !== String(conversationId)) {
      continue;
    }
    if (msg.insightId) {
      continue;
    }
    updates.push({
      ...buildMessageRecord(msg),
      insightId: msg._id || msg.id,
    });
  }

  if (!updates.length) return;
  await db.messages.bulkPut(updates);
};

const GLOBAL_SYNC_KEY = "__GLOBAL_SYNC__";

export const getGlobalSyncTime = async () => {
  const state = await db.syncState.get(GLOBAL_SYNC_KEY);
  return state?.lastSync || null;
};

export const saveGlobalSyncTime = async (timestamp = Date.now()) => {
  await db.syncState.put({
    conversationId: GLOBAL_SYNC_KEY,
    lastSync: timestamp,
  });
};

export const getSyncIntervalMs = () => SYNC_INTERVAL_MS;

/**
 * Borra toda la cache de IndexedDB (conversaciones, mensajes, syncState).
 * Útil para forzar una recarga completa desde el servidor.
 */
export const clearAllCache = async () => {
  await db.conversations.clear();
  await db.messages.clear();
  await db.syncState.clear();
};

export default db;

const normalizeSearchText = (value) => (value || "").toLowerCase().trim();

const matchesQuery = (conversation, query) => {
  const normalized = normalizeSearchText(query);
  if (!normalized) return true;
  const haystack = [
    conversation?.profile?.firstName,
    conversation?.profile?.lastName,
    conversation?.profile?.phone,
    conversation?.empresa?.nombre,
    conversation?.wPid,
    conversation?.lid,
    conversation?.ultimoMensaje?.message,
    conversation?.ultimoMensaje?.caption,
  ]
    .filter(Boolean)
    .map((value) => value.toString().toLowerCase())
    .join(" ");
  return haystack.includes(normalized);
};

export const searchCachedConversations = async (
  query,
  { filters = {}, limit = 100 } = {}
) => {
  const normalizedQuery = normalizeSearchText(query);
  const allConversations = await db.conversations
    .orderBy("updatedAt")
    .reverse()
    .toArray();
  const results = [];
  for (const conversation of allConversations) {
    if (!matchesEstadoCliente(conversation, filters.estadoCliente)) continue;
    if (filters.empresaId && String(filters.empresaId) !== String(conversation.empresa?.id)) {
      continue;
    }
    if (
      normalizedQuery &&
      !matchesQuery(conversation, normalizedQuery)
    ) {
      continue;
    }
    results.push(conversation);
    if (results.length >= limit) break;
  }
  return results;
};

export const searchCachedMessages = async (
  query,
  { filters = {}, limit = 100 } = {}
) => {
  const normalizedQuery = normalizeSearchText(query);
  const startDate = filters.fechaDesde ? new Date(filters.fechaDesde) : null;
  const endDate = filters.fechaHasta ? new Date(filters.fechaHasta) : null;
  const conversations = await db.conversations.toArray();
  const conversationMap = new Map(conversations.map((c) => [c.id, c]));
  const allMessages = await db.messages.orderBy("createdAt").reverse().toArray();
  const matches = [];
  for (const message of allMessages) {
    if (normalizedQuery) {
      const haystack = [
        message.message,
        message.caption,
        message.profile?.name,
        message.empresa?.nombre,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(normalizedQuery)) continue;
    }
    if (startDate && message.createdAt < startDate) continue;
    if (endDate && message.createdAt > endDate) continue;
    matches.push({
      conversationId: message.conversationId,
      matchMessage: message,
      conversation: conversationMap.get(String(message.conversationId)) || null,
    });
    if (matches.length >= limit) break;
  }
  return matches;
};
