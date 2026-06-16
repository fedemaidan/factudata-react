import api from './axiosConfig';

// Reserva de Obra: reserva interna de fondos de una obra/proyecto.
// Concepto distinto de la Caja Chica personal. Ver docs/RESERVA_DE_OBRA_TECNICO.md.
const reservaObraService = {
  async listar({ empresaId, estado, activa, q } = {}) {
    const params = { empresaId };
    if (estado) params.estado = estado;
    if (activa !== undefined && activa !== null) params.activa = activa;
    if (q) params.q = q;
    const { data } = await api.get('/reservas', { params });
    return data?.items || [];
  },

  async obtener(id) {
    const { data } = await api.get(`/reservas/${id}`);
    return data;
  },

  async obtenerPorProyecto(empresaId, proyectoId) {
    const { data } = await api.get(`/reservas/proyecto/${proyectoId}`, { params: { empresaId } });
    return data; // { reservado: {ARS, USD}, reservas: [...] }
  },

  async crear({ empresaId, proyectoId, proyectoNombre, responsableId, responsableNombre, participantes }) {
    const { data } = await api.post('/reservas', {
      empresaId, proyectoId, proyectoNombre, responsableId, responsableNombre, participantes,
    });
    return data;
  },

  async actualizar(id, { responsableId, responsableNombre, estado, activa, nombre } = {}) {
    const { data } = await api.put(`/reservas/${id}`, {
      responsableId, responsableNombre, estado, activa, nombre,
    });
    return data;
  },

  async archivar(id) {
    const { data } = await api.delete(`/reservas/${id}`);
    return data;
  },

  async movimientos(id) {
    const { data } = await api.get(`/reservas/${id}/movimientos`);
    return data?.items || [];
  },

  async asignarFondos(id, { moneda, monto, observacion }) {
    const { data } = await api.post(`/reservas/${id}/asignar`, { moneda, monto, observacion });
    return data;
  },

  async registrarAjuste(id, { moneda, monto, observacion }) {
    const { data } = await api.post(`/reservas/${id}/ajuste`, { moneda, monto, observacion });
    return data;
  },

  async registrarReposicion(id, { moneda, monto, observacion }) {
    const { data } = await api.post(`/reservas/${id}/reposicion`, { moneda, monto, observacion });
    return data;
  },

  async registrarGasto(id, { moneda, monto, categoria, subcategoria, nombreProveedor, observacion, fechaFactura }) {
    const { data } = await api.post(`/reservas/${id}/gasto`, {
      moneda, monto, categoria, subcategoria, nombreProveedor, observacion, fechaFactura,
    });
    return data; // { movimiento, reserva }
  },

  async agregarParticipante(id, { userId, userPhone, nombre, rol }) {
    const { data } = await api.post(`/reservas/${id}/participantes`, { userId, userPhone, nombre, rol });
    return data;
  },

  async quitarParticipante(id, userId) {
    const { data } = await api.delete(`/reservas/${id}/participantes/${userId}`);
    return data;
  },
};

export default reservaObraService;
