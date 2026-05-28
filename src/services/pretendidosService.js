import api from './axiosConfig';

const pretendidosService = {
  async listar({ empresaId, proyectoId, proveedorId, estado, semana } = {}) {
    const params = {};
    if (empresaId) params.empresaId = empresaId;
    if (proyectoId) params.proyectoId = proyectoId;
    if (proveedorId) params.proveedorId = proveedorId;
    if (estado) params.estado = estado;
    if (semana) params.semana = semana;
    const { data } = await api.get('/pretendidos', { params });
    return data?.items || [];
  },

  async crear({ empresaId, proyectoId, proyectoNombre, proveedorId, semana, montoPretendido, descripcion, presupuestoId }) {
    const { data } = await api.post('/pretendidos', {
      empresaId, proyectoId, proyectoNombre, proveedorId, semana, montoPretendido, descripcion, presupuestoId,
    });
    return data;
  },

  async cerrar(pretendidoId, montoAprobado) {
    const { data } = await api.patch(`/pretendidos/${pretendidoId}/cerrar`, { montoAprobado });
    return data;
  },

  async actualizar(pretendidoId, { semana, montoPretendido, descripcion, proveedorId, proyectoId, proyectoNombre, presupuestoId } = {}) {
    const { data } = await api.put(`/pretendidos/${pretendidoId}`, {
      semana, montoPretendido, descripcion, proveedorId, proyectoId, proyectoNombre, presupuestoId,
    });
    return data;
  },

  async eliminar(pretendidoId) {
    const { data } = await api.delete(`/pretendidos/${pretendidoId}`);
    return data;
  },

  async getCuentaCorriente(empresaId, proveedorId, proyectoId = null) {
    const params = {};
    if (proyectoId) params.proyectoId = proyectoId;
    const { data } = await api.get(`/empresa/${empresaId}/proveedores/${proveedorId}/cuenta-corriente`, { params });
    return data;
  },
};

export default pretendidosService;
