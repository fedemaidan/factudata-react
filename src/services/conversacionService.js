import api from './axiosConfig';
const artificialDelay = (ms = 300) => new Promise((res) => setTimeout(res, ms));

function buildFilterParams(filters = {}) {
  const params = {};
  if (filters?.fechaDesde) params.fechaDesde = filters.fechaDesde;
  if (filters?.fechaHasta) params.fechaHasta = filters.fechaHasta;
  if (filters?.creadaDesde) params.creadaDesde = filters.creadaDesde;
  if (filters?.creadaHasta) params.creadaHasta = filters.creadaHasta;
  if (filters?.empresaId) params.empresaId = filters.empresaId;
  if (filters?.estadoCliente && filters.estadoCliente !== "todos") params.estadoCliente = filters.estadoCliente;
  if (filters?.tipoContacto && filters.tipoContacto !== "todos") params.tipoContacto = filters.tipoContacto;
  if (filters?.showInsight) params.showInsight = filters.showInsight;
  if (filters?.insightCategory && filters.insightCategory !== 'todos') params.insightCategory = filters.insightCategory;
  if (filters?.insightTypes?.length) params.insightTypes = filters.insightTypes.join(',');
  return params;
}

function getTextFromMessage(message) {
  if (!message) return '';
  if (typeof message.mensaje === 'string') return message.mensaje;
  return '';
}

export async function fetchConversations(filters = {}) {
  const params = buildFilterParams(filters);
  const response = await api.get('/conversaciones', { params });
  return response.data;
}

export async function fetchMessages(
  conversationId,
  { limit = 20, offset = 0, sort = 'desc', sinceCreatedAt, sinceId } = {}
) {
  const params = { limit, offset, sort };
  if (sinceCreatedAt) params.sinceCreatedAt = sinceCreatedAt;
  if (sinceId) params.sinceId = sinceId;
  const { data } = await api.get(`/conversaciones/${conversationId}`, {
    params,
  });
  return data;
}

export async function fetchRecentMessages({ sinceUpdatedAt, limit = 1000 } = {}) {
  const params = { limit };
  if (sinceUpdatedAt) params.sinceUpdatedAt = sinceUpdatedAt;
  const { data } = await api.get("/conversaciones/sync", { params });
  return data;
}

export async function fetchRecentConversations({ sinceUpdatedAt, limit = 0 } = {}) {
  const params = {};
  if (sinceUpdatedAt) params.sinceUpdatedAt = sinceUpdatedAt;
  if (limit > 0) params.limit = limit;
  const { data } = await api.get("/conversaciones/sync/conversations", { params });
  return data;
}

export async function sendMessage({ userId, message, conversationId }) {
  const body = { userId, message };
  if (conversationId) {
    body.conversationId = conversationId;
  }
  const response = await api.post('/conversaciones/message', body);
  return response.data;
}

export async function searchConversations(query, filters = {}) {
  const params = { search: query, ...buildFilterParams(filters) };
  const response = await api.get('/conversaciones', { params });
  return response.data;
}

export async function searchMessages(query, filters = {}, limit = 100) {
  const params = { query, limit, ...buildFilterParams(filters) };
  const response = await api.get("/conversaciones/search/messages", {
    params,
  });
  return response.data;
}

export async function getJumpInfo(conversationId, messageId, windowSize = 50) {
  const { data } = await api.get(`/conversaciones/${conversationId}/jump`, {
    params: { messageId, window: windowSize },
  });
  return data;
}

export async function downloadConversation(id, fechaInicio, fechaFin) {
  const response = await api.get(`/conversaciones/${id}/download`, {
    params: { fechaInicio, fechaFin },
    responseType: 'blob'
  });
  return response;
}

export async function getInsightMessageIds(conversationId, filters = {}) {
  const params = {};
  if (filters?.fechaDesde) params.fechaDesde = filters.fechaDesde;
  if (filters?.fechaHasta) params.fechaHasta = filters.fechaHasta;
  if (filters?.insightCategory && filters.insightCategory !== 'todos') params.insightCategory = filters.insightCategory;
  if (filters?.insightTypes?.length) params.insightTypes = filters.insightTypes.join(',');
  const { data } = await api.get(`/conversaciones/${conversationId}/insights`, { params });
  return data || [];
}

export function getMessagePreview(message) {
  return getTextFromMessage(message);
}

export function getConversationTitle(conversation) {
  return conversation.displayName || conversation.userId || '';
}

export async function getInsightPatternsMeta() {
  const { data } = await api.get('/conversaciones/insight-patterns/meta');
  return data;
}

export async function createInsightPattern({ patternText, isError, insightTypeId, errorTypeId, customTypeName }) {
  const response = await api.post('/conversaciones/insight-patterns', {
    patternText,
    isError,
    insightTypeId,
    errorTypeId,
    customTypeName,
  });
  return response.data;
}

export async function addNoteToMessage({ messageId, content, userEmail }) {
  const response = await api.post(`/conversaciones/messages/${messageId}/notes`, {
    content,
    userEmail
  });
  return response.data;
}

/**
 * Actualiza el estado de cliente en todas las conversaciones de una empresa
 * @param {string} empresaId - ID de la empresa
 * @param {object} data - Datos a actualizar (esCliente, estaDadoDeBaja, etc)
 */
export async function updateConversacionesEmpresa(empresaId, data) {
  const response = await api.patch(`/conversaciones/empresa/${empresaId}`, data);
  return response.data;
}

/**
 * Sincroniza el profile de una conversación con los datos actuales de Firestore
 * @param {string} conversationId - ID de la conversación
 */
export async function syncConversationProfile(conversationId) {
  const response = await api.post(`/conversaciones/${conversationId}/sync-profile`);
  return response.data;
}

/**
 * Obtiene los últimos mensajes de una conversación por número de teléfono.
 * Usa GET /conversaciones/last que ya existe en el backend.
 * @param {string} phone - Número de teléfono (ej: "5491162948395")
 * @param {number} limit - Cantidad máxima de mensajes (default 50, max 100)
 */
export async function fetchLastMessages(phone, limit = 50) {
  const { data } = await api.get('/conversaciones/last', {
    params: { phone, limit, sort: 'desc' }
  });
  return data;
}
