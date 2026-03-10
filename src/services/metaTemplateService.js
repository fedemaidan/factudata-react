import api from './axiosConfig';

// === CRUD de Meta Templates ===

export async function fetchMetaTemplates(filters = {}) {
  const params = {};
  if (typeof filters.activo === 'boolean') params.activo = filters.activo;
  if (filters.category) params.category = filters.category;
  if (filters.search) params.search = filters.search;

  const { data } = await api.get('/meta-templates', { params });
  return data;
}

export async function getMetaTemplate(id) {
  const { data } = await api.get(`/meta-templates/${id}`);
  return data;
}

export async function createMetaTemplate(templateData) {
  const { data } = await api.post('/meta-templates', templateData);
  return data;
}

export async function updateMetaTemplate(id, templateData) {
  const { data } = await api.put(`/meta-templates/${id}`, templateData);
  return data;
}

export async function deleteMetaTemplate(id) {
  const { data } = await api.delete(`/meta-templates/${id}`);
  return data;
}

// === Envío de template desde conversaciones ===

export async function sendTemplateFromConversation({ phone, templateId, parameterValues, fechaEnvio, empresaId }) {
  const body = { phone, templateId, parameterValues };
  if (fechaEnvio) body.fechaEnvio = fechaEnvio;
  if (empresaId) body.empresaId = empresaId;
  const { data } = await api.post('/meta-templates/send-from-conversation', body);
  return data;
}
