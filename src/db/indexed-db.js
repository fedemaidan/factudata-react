import Dexie from "dexie";
import { subDays } from "date-fns";
import { toNumber, normalizeDate } from "../utils/parseData";

const DB_NAME = "factudata-conversaciones";
const MESSAGE_WINDOW_DAYS = 14;
const RECENT_CONVERSATION_TTL_MS = 1000 * 60 * 60 * 2; // 2 horas.
const SYNC_INTERVAL_MS = 1000 * 60 * 5; // 5 minutos

const db = new Dexie(DB_NAME);

db.version(1).stores({
  conversations: "&id, updatedAt, recentAt",
  messages: "&_id, conversationId, createdAt, [conversationId+createdAt], type, status",
  syncState: "&conversationId, lastSync, recentAt",
});

const prepareConversationRecord = (conversation, extra = {}) => {
  const id = conversation._id || null
  if (!id) return null;
  const updatedAt =
    normalizeDate(conversation?.ultimoMensaje?.fecha) ||
    normalizeDate(conversation?.ultimoMensaje?.createdAt) ||
    normalizeDate(conversation?.updatedAt) ||
    new Date();
  return {
    ...conversation,
    id,
    updatedAt: toNumber(updatedAt),
    recentAt: toNumber(extra.recentAt) || Date.now(),
  };
};

const normalizeMessage = (message) => {
  if (!message) return null;
  const conversationId = message.id_conversacion || null
  if (!conversationId) return null;
  return {
    ...message,
    _id: String(message._id || message.id || `${conversationId}-${message.createdAt || Date.now()}`),
    conversationId: String(conversationId),
    createdAt: normalizeDate(message.createdAt) || new Date(),
  };
};

export const getMessageWindowCutoff = () =>
  subDays(new Date(), MESSAGE_WINDOW_DAYS);

export const getCachedConversations = async (limit = 30) => {
  return db.conversations
    .orderBy("recentAt")
    .reverse()
    .limit(limit)
    .toArray();
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

export const cacheMessages = async (messages = []) => {
  const prepared = messages
    .map(normalizeMessage)
    .filter((message) => message && message.conversationId);
  if (!prepared.length) return;
  await db.messages.bulkPut(prepared);
};

// cutOff: fecha limite
//
export const deleteOldMessages = async ({ cutoff, conversationId } = {}) => {
  const threshold = cutoff || getMessageWindowCutoff();
  if (conversationId) {
    await db.messages
      .where("[conversationId+createdAt]")
      .between([conversationId, Dexie.minKey], [conversationId, threshold], true, true)
      .delete();
    return;
  }
  await db.messages.where("createdAt").below(threshold).delete();
};

const buildSyncStateRecord = ({ conversationId, cursor, lastSync, recentAt }) => ({
  conversationId,
  cursorCreatedAt: cursor?.createdAt ? toNumber(cursor.createdAt) : null,
  cursorId: cursor?._id || null,
  lastSync: lastSync || Date.now(),
  recentAt: recentAt || Date.now(),
});

export const getSyncCursor = async (conversationId) => {
  if (!conversationId) return null;
  const state = await db.syncState.get(conversationId);
  if (!state) return null;
  return {
    createdAt: state.cursorCreatedAt ? new Date(state.cursorCreatedAt) : null,
    _id: state.cursorId,
  };
};

export const getLastSyncTime = async (conversationId) => {
  if (!conversationId) return null;
  const state = await db.syncState.get(conversationId);
  return state?.lastSync || null;
};

export const saveSyncCursor = async (conversationId, cursor, { recentAt } = {}) => {
  if (!conversationId) return;
  const record = buildSyncStateRecord({ conversationId, cursor, recentAt, lastSync: Date.now() });
  await db.syncState.put(record);
};

export const touchConversation = async (conversationId) => {
  if (!conversationId) return;
  const state = (await db.syncState.get(conversationId)) || {};
  await db.syncState.put({
    ...state,
    conversationId,
    recentAt: Date.now(),
  });
};

export const getRecentConversationIds = async ({ limit = 30, ttlMs = RECENT_CONVERSATION_TTL_MS } = {}) => {
  const threshold = Date.now() - ttlMs;
  const states = await db.syncState
    .where("recentAt")
    .above(threshold)
    .reverse()
    .limit(limit)
    .toArray();
  return states.map((state) => state.conversationId);
};

export const getSyncIntervalMs = () => SYNC_INTERVAL_MS;

export default db;
