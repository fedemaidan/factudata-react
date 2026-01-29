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
  { limit = 20, offset = 0, sort = 'desc' } = {}
) {
  const { data } = await api.get(`/conversaciones/${conversationId}`, {
    params: { limit, offset, sort },
  });
  return data;
}

export async function sendMessage({ conversationId, text }) {
  const response = await api.post('/conversaciones/message', {
    conversationId,
    text,
  });
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
