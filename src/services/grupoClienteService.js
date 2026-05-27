import api from './axiosConfig';

/**
 * Servicio HTTP de Grupos de Cliente (Fase 4 corralones).
 * Agrupa clientes que pertenecen a un mismo dueño real (opt-in).
 */
const grupoClienteService = {
  async getByEmpresa(empresaId, { incluirArchivados = false } = {}) {
    const params = incluirArchivados ? '?incluirArchivados=true' : '';
    const { data } = await api.get(`/empresa/${empresaId}/grupos-cliente${params}`);
    return data;
  },

  async getById(empresaId, grupoId) {
    const { data } = await api.get(`/empresa/${empresaId}/grupos-cliente/${grupoId}`);
    return data;
  },

  async crear(empresaId, grupo) {
    const { data } = await api.post(`/empresa/${empresaId}/grupos-cliente`, grupo);
    return data;
  },

  async actualizar(empresaId, grupoId, updates) {
    const { data } = await api.put(`/empresa/${empresaId}/grupos-cliente/${grupoId}`, updates);
    return data;
  },

  async archivar(empresaId, grupoId) {
    const { data } = await api.delete(`/empresa/${empresaId}/grupos-cliente/${grupoId}`);
    return data;
  },

  async getClientesDelGrupo(empresaId, grupoId) {
    const { data } = await api.get(`/empresa/${empresaId}/grupos-cliente/${grupoId}/clientes`);
    return data;
  },

  async getCuentaCorrienteAgregada(empresaId, grupoId) {
    const { data } = await api.get(
      `/empresa/${empresaId}/grupos-cliente/${grupoId}/cuenta-corriente-agregada`
    );
    return data;
  },
};

export default grupoClienteService;
