import api from 'src/services/axiosConfig';

const conciliacionService = {
  async crearConciliacion(sheetLink) {
    const { data } = await api.post('/dhn/conciliacion', { sheetLink });
    return data;
  },

  async crearConciliacionConArchivo(archivoExcel) {
    const formData = new FormData();
    formData.append('archivoExcel', archivoExcel);
    const { data } = await api.post('/dhn/conciliacion', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
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

  async getConciliacionRows(id, { estado, text, limit, offset, sortField, sortDirection } = {}) {
    const params = {};
    if (estado) params.estado = estado;
    if (text) params.text = text;
    if (limit != null) params.limit = limit;
    if (offset != null) params.offset = offset;
    if (sortField) params.sortField = sortField;
    if (sortDirection) params.sortDirection = sortDirection;
    const { data } = await api.get(`/dhn/conciliacion/${id}/rows`, { params });
    return data;
  },

  async updateConciliacionRow(conciliacionId, rowId, payload) {
    const { data } = await api.patch(`/dhn/conciliacion/${conciliacionId}/row/${rowId}`, payload);
    return data;
  },

  async seleccionarHorasSistema(conciliacionId, rowId) {
    return this.updateConciliacionRow(conciliacionId, rowId, { estado: "okManual" });
  },

  async seleccionarHorasExcel(conciliacionId, rowId, payload) {
    return this.updateConciliacionRow(conciliacionId, rowId, payload);
  },

  async seleccionarHorasSistemaBulk(conciliacionId, rowIds = []) {
    const items = (Array.isArray(rowIds) ? rowIds : [])
      .filter(Boolean)
      .map((rowId) => ({
        rowId,
        payload: { estado: "okManual" },
      }));
    const { data } = await api.patch(`/dhn/conciliacion/${conciliacionId}/rows/bulk`, { items });
    return data;
  },

  async seleccionarHorasExcelBulk(conciliacionId, items = []) {
    const payload = {
      items: Array.isArray(items) ? items : [],
    };
    const { data } = await api.patch(`/dhn/conciliacion/${conciliacionId}/rows/bulk`, payload);
    return data;
  }
};

export default conciliacionService;


