import api from './axiosConfig';

const getDocuments = async (empresaId, status) => {
  const response = await api.get('/bejerman/documents', { params: { empresaId, status } });
  return response.data.documents || [];
};

const validateDocument = async (id, payload) => {
  const response = await api.put(`/bejerman/documents/${id}/validate`, payload);
  return response.data;
};

const sendDocument = async (id) => {
  const response = await api.post(`/bejerman/documents/${id}/send`);
  return response.data.response;
};

const createDocument = async (payload) => {
  const response = await api.post('/bejerman/documents', payload);
  return response.data.document;
};

const getConfig = async (empresaId) => {
  const response = await api.get(`/bejerman/config/${empresaId}`);
  return response.data.config;
};

const saveConfig = async (empresaId, payload) => {
  const response = await api.post(`/bejerman/config/${empresaId}`, payload);
  return response.data.config;
};

const query = async (payload) => {
  const response = await api.post('/bejerman/query', payload);
  return response.data.response;
};

export default {
  getDocuments,
  validateDocument,
  sendDocument,
  createDocument,
  getConfig,
  saveConfig,
  query
};
