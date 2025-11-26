import api from './axiosChatBot';
const artificialDelay = (ms = 300) => new Promise((res) => setTimeout(res, ms));

function getTextFromMessage(message) {
  if (!message) return '';
  if (typeof message.mensaje === 'string') return message.mensaje;
  return '';
}

export async function fetchConversations(params = {}) {
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

export async function searchConversations(query) {
  return fetchConversations({ search: query });
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
