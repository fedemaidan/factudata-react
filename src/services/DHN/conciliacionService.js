import api from 'src/services/axiosConfig';

const conciliacionService = {
  async crearConciliacion(sheetLink) {
    const { data } = await api.post('/dhn/conciliacion', { sheetLink });
    return data;
  },

  async getConciliaciones({ limit, offset, sheetId } = {}) {
    const params = {};
    if (limit != null) params.limit = limit;
    if (offset != null) params.offset = offset;
    if (sheetId) params.sheetId = sheetId;
    const { data } = await api.get('/dhn/conciliacion', { params });
    // Normalizamos respuesta a array simple para DataTable
    const lista = Array.isArray(data) ? data : (data?.data || []);
    return lista;
  },

  async getConciliacionRows(id, { estado, text, limit, offset } = {}) {
    const params = {};
    if (estado) params.estado = estado;
    if (text) params.text = text;
    if (limit != null) params.limit = limit;
    if (offset != null) params.offset = offset;
    const { data } = await api.get(`/dhn/conciliacion/${id}/rows`, { params });
    return data;
  }
};

export default conciliacionService;


