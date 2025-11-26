import api from './axiosChatBot';

export async function fetchAnalisis({ fechaInicio, fechaFin, empresaId, empresaNombre, usuario, limit = 100, offset = 0 } = {}) {
  const params = { limit, offset };
  if (fechaInicio) params.fechaInicio = fechaInicio;
  if (fechaFin) params.fechaFin = fechaFin;
  if (empresaId) params.empresaId = empresaId;
  if (empresaNombre) params.empresaNombre = empresaNombre;
  if (usuario) params.usuario = usuario;

  const { data } = await api.get('/analisis', { params });
  return data;
}

export async function exportConversacion(id) {
  const response = await api.get(`/analisis/${id}/export`, {
    responseType: 'blob'
  });
  return response;
}
