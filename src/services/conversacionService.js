import api from './axiosChatBot';
const artificialDelay = (ms = 300) => new Promise((res) => setTimeout(res, ms));

function getTextFromMessage(message) {
  if (!message) return '';
  if (typeof message.mensaje === 'string') return message.mensaje;
  return '';
}

export async function fetchConversations() {
  const response = await api.get('/conversaciones');
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
  await artificialDelay(150);
  const q = (query || '').toLowerCase();
  if (!q) return fetchConversations();
  return mockConversations.filter((c) => {
    return (
      c.displayName.toLowerCase().includes(q) ||
      c.userId.toLowerCase().includes(q) ||
      (c.lastMessage || '').toLowerCase().includes(q)
    );
  });
}

export function getMessagePreview(message) {
  return getTextFromMessage(message);
}

export function getConversationTitle(conversation) {
  return conversation.displayName || conversation.userId || '';
}
