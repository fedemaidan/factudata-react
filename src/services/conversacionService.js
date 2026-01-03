import api from './axiosConfig';
const artificialDelay = (ms = 300) => new Promise((res) => setTimeout(res, ms));

function buildFilterParams(filters = {}) {
  const params = {};
  if (filters?.fechaDesde) {
    params.fechaDesde = filters.fechaDesde;
  }
  if (filters?.fechaHasta) {
    params.fechaHasta = filters.fechaHasta;
  }
  if (filters?.empresaId) {
    params.empresaId = filters.empresaId;
  }
  if (filters?.tipoContacto && filters.tipoContacto !== "todos") {
    params.tipoContacto = filters.tipoContacto;
  }
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

export function getMessagePreview(message) {
  return getTextFromMessage(message);
}

export function getConversationTitle(conversation) {
  return conversation.displayName || conversation.userId || '';
}
