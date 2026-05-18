import api from './axiosConfig';

const pagoProveedorService = {
  async listar(empresaId, params = {}) {
    const { data } = await api.get(`/empresa/${empresaId}/pagos-proveedor`, { params });
    return data;
  },

  async obtener(empresaId, pagoId) {
    const { data } = await api.get(`/empresa/${empresaId}/pagos-proveedor/${pagoId}`);
    return data;
  },

  async registrar(empresaId, pagoData) {
    const { data } = await api.post(`/empresa/${empresaId}/pagos-proveedor`, pagoData);
    return data;
  },

  async anular(empresaId, pagoId, { motivo, accion_movimientos }) {
    const { data } = await api.post(`/empresa/${empresaId}/pagos-proveedor/${pagoId}/anular`, { motivo, accion_movimientos });
    return data;
  },

  async subirComprobantes(empresaId, pagoId, archivos) {
    const formData = new FormData();
    Array.from(archivos).forEach((f) => formData.append('archivos', f));
    const { data } = await api.post(
      `/empresa/${empresaId}/pagos-proveedor/${pagoId}/comprobantes`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
  },
};

export default pagoProveedorService;
