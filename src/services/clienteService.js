import api from './axiosConfig';

/**
 * Servicio HTTP de clientes (vertical corralón).
 * Espejo estructural de `proveedorService.js`.
 */
const clienteService = {
  async getByEmpresa(empresaId) {
    const { data } = await api.get(`/empresa/${empresaId}/clientes`);
    return data;
  },

  async crear(empresaId, cliente) {
    const { data } = await api.post(`/empresa/${empresaId}/clientes`, cliente);
    return data;
  },

  async actualizar(empresaId, clienteId, updates) {
    const { data } = await api.put(`/empresa/${empresaId}/clientes/${clienteId}`, updates);
    return data;
  },

  async eliminar(empresaId, clienteId) {
    const { data } = await api.delete(`/empresa/${empresaId}/clientes/${clienteId}`);
    return data;
  },

  async importar(empresaId, clientes) {
    const { data } = await api.post(`/empresa/${empresaId}/clientes/import`, { clientes });
    return data;
  },

  async getByEmpresaFull(empresaId, { incluirArchivados = false } = {}) {
    const params = incluirArchivados ? '?incluirArchivados=true' : '';
    const { data } = await api.get(`/empresa/${empresaId}/clientes${params}`);
    return data;
  },

  async getResumenFinanciero(empresaId) {
    const { data } = await api.get(`/empresa/${empresaId}/clientes/resumen-financiero`);
    return data;
  },

  async mergear(empresaId, targetId, sourceId) {
    const { data } = await api.post(
      `/empresa/${empresaId}/clientes/${targetId}/merge`,
      { sourceId }
    );
    return data;
  },

  async getNombres(empresaId) {
    const clientes = await this.getByEmpresa(empresaId);
    return (clientes || []).map((c) => c.nombre).sort();
  },

  async getCuentaCorriente(empresaId, clienteId, opts = {}) {
    const qs = new URLSearchParams();
    if (opts.sucursalId) qs.set('sucursalId', opts.sucursalId);
    if (opts.nombre) qs.set('nombre', opts.nombre);
    const params = qs.toString() ? `?${qs.toString()}` : '';
    const { data } = await api.get(
      `/empresa/${empresaId}/clientes/${clienteId}/cuenta-corriente${params}`
    );
    return data;
  },

  /**
   * Genera un token público para que el cliente pueda consultar su saldo
   * sin estar autenticado.
   * @returns {Promise<{ token, url }>}
   */
  async generarTokenPublico(empresaId, clienteId) {
    const { data } = await api.post(
      `/empresa/${empresaId}/clientes/${clienteId}/generar-token-publico`
    );
    return data;
  },

  async invalidarTokenPublico(empresaId, clienteId) {
    const { data } = await api.delete(
      `/empresa/${empresaId}/clientes/${clienteId}/token-publico`
    );
    return data;
  },

  /**
   * Cierra el saldo de uno o varios clientes generando un cobro
   * de "Ajuste inicial" por cada uno.
   */
  async ajustarCuentas(empresaId, cliente_ids, opts = {}) {
    const { data } = await api.post(
      `/empresa/${empresaId}/clientes/ajustar-cuentas`,
      { cliente_ids, ...opts }
    );
    return data;
  },
};

export default clienteService;
