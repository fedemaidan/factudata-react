import api from './axiosConfig';

const base = (empresaId) => `/empresa/${empresaId}/gastos-recurrentes`;

/** Gastos recurrentes (egresos que se repiten). Ver docs/GASTOS_RECURRENTES_TECNICO.md */
const gastoRecurrenteService = {
  async listar(empresaId, { activo } = {}) {
    const qs = activo === undefined ? '' : `?activo=${activo}`;
    const { data } = await api.get(`${base(empresaId)}${qs}`);
    return data;
  },
  async crear(empresaId, payload) {
    const { data } = await api.post(base(empresaId), payload);
    return data;
  },
  async editar(empresaId, id, payload) {
    const { data } = await api.put(`${base(empresaId)}/${id}`, payload);
    return data;
  },
  async archivar(empresaId, id) {
    const { data } = await api.delete(`${base(empresaId)}/${id}`);
    return data;
  },
  async omitir(empresaId, id, periodo) {
    const { data } = await api.post(`${base(empresaId)}/${id}/omitir`, { periodo });
    return data;
  },
  async aCargar(empresaId) {
    const { data } = await api.get(`${base(empresaId)}/a-cargar`);
    return data;
  },
  async registrar(empresaId, id, payload) {
    const { data } = await api.post(`${base(empresaId)}/${id}/registrar`, payload);
    return data;
  },
  async confirmarLote(empresaId, items) {
    const { data } = await api.post(`${base(empresaId)}/confirmar-lote`, { items });
    return data;
  },
  async historial(empresaId, id) {
    const { data } = await api.get(`${base(empresaId)}/${id}/historial`);
    return data;
  },
  async sugerencias(empresaId) {
    const { data } = await api.get(`${base(empresaId)}/sugerencias`);
    return data;
  },
  async descartarSugerencia(empresaId, clave) {
    const { data } = await api.post(`${base(empresaId)}/sugerencias/descartar`, { clave });
    return data;
  },
  async desdeMovimiento(empresaId, movId) {
    const { data } = await api.post(`${base(empresaId)}/desde-movimiento/${movId}`);
    return data;
  },
};

export default gastoRecurrenteService;
