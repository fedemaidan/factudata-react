import api from './axiosConfig';

const proveedorService = {
  /**
   * Lista todos los proveedores de una empresa.
   * @param {string} empresaId
   * @returns {Promise<Array>}
   */
  async getByEmpresa(empresaId) {
    const { data } = await api.get(`/empresa/${empresaId}/proveedores`);
    return data;
  },

  /**
   * Crea un proveedor (o devuelve el existente si ya existe por nombre/alias).
   * @param {string} empresaId
   * @param {object} proveedor - { nombre, razon_social, cuit, direccion, alias, categorias }
   * @returns {Promise<object>} - { proveedor_id, nombre, wasCreated, wasUpdated }
   */
  async crear(empresaId, proveedor) {
    const { data } = await api.post(`/empresa/${empresaId}/proveedores`, proveedor);
    return data;
  },

  /**
   * Actualiza un proveedor existente.
   * @param {string} empresaId
   * @param {string} proveedorId
   * @param {object} updates - campos a actualizar
   * @returns {Promise<object>}
   */
  async actualizar(empresaId, proveedorId, updates) {
    const { data } = await api.put(`/empresa/${empresaId}/proveedores/${proveedorId}`, updates);
    return data;
  },

  /**
   * Elimina un proveedor.
   * @param {string} empresaId
   * @param {string} proveedorId
   * @returns {Promise<object>}
   */
  async eliminar(empresaId, proveedorId) {
    const { data } = await api.delete(`/empresa/${empresaId}/proveedores/${proveedorId}`);
    return data;
  },

  /**
   * Importa un lote de proveedores (crea los que no existen).
   * @param {string} empresaId
   * @param {Array<object>} proveedores
   * @returns {Promise<object>} - { imported, results }
   */
  async importar(empresaId, proveedores) {
    const { data } = await api.post(`/empresa/${empresaId}/proveedores/import`, { proveedores });
    return data;
  },

  /**
   * Lista proveedores, opcionalmente incluyendo archivados.
   * @param {string} empresaId
   * @param {{ incluirArchivados?: boolean }} opts
   */
  async getByEmpresaFull(empresaId, { incluirArchivados = false } = {}) {
    const params = incluirArchivados ? '?incluirArchivados=true' : '';
    const { data } = await api.get(`/empresa/${empresaId}/proveedores${params}`);
    return data;
  },

  /**
   * Resumen financiero por proveedor:
   * [{ proveedor_id, deuda_actual, cantidad_facturas_abiertas, tiene_vencidas,
   *    ultimo_movimiento, ultimo_pago }]
   */
  async getResumenFinanciero(empresaId) {
    const { data } = await api.get(`/empresa/${empresaId}/proveedores/resumen-financiero`);
    return data;
  },

  /**
   * Combina dos proveedores. `sourceId` se elimina y todos sus datos
   * (movimientos, pagos, presupuestos, pretendidos) pasan a `targetId`.
   * El nombre del source queda como alias del target.
   * @returns {Promise<{ ok, target, source, movimientos_actualizados, pagos_actualizados, presupuestos_actualizados, pretendidos_actualizados }>}
   */
  async mergear(empresaId, targetId, sourceId) {
    const { data } = await api.post(
      `/empresa/${empresaId}/proveedores/${targetId}/merge`,
      { sourceId }
    );
    return data;
  },

  /**
   * Devuelve solo los nombres de proveedores (para autocomplete).
   * @param {string} empresaId
   * @returns {Promise<string[]>}
   */
  async getNombres(empresaId) {
    const proveedores = await this.getByEmpresa(empresaId);
    return proveedores.map(p => p.nombre).sort();
  },

  /**
   * Devuelve cuenta corriente completa de un proveedor:
   * { proveedor, movimientos, presupuesto, pretendidos }
   * @param {string} empresaId
   * @param {string} proveedorId
   * @param {string} [proyectoId]
   */
  async getCuentaCorriente(empresaId, proveedorId, proyectoId, nombreHint) {
    const qs = new URLSearchParams();
    if (proyectoId) qs.set('proyectoId', proyectoId);
    if (nombreHint) qs.set('nombre', nombreHint);
    const params = qs.toString() ? `?${qs.toString()}` : '';
    const { data } = await api.get(`/empresa/${empresaId}/proveedores/${proveedorId}/cuenta-corriente${params}`);
    return data;
  },

  /**
   * Cierra el saldo de uno o varios proveedores generando un PagoProveedor
   * de "Ajuste inicial" por cada uno que imputa todo el pendiente.
   * @param {string} empresaId
   * @param {string[]} proveedor_ids
   * @param {{ fecha_pago?: string, descripcion?: string }} [opts]
   * @returns {Promise<{ ok, totals, resultados }>}
   */
  async ajustarCuentas(empresaId, proveedor_ids, opts = {}) {
    const { data } = await api.post(
      `/empresa/${empresaId}/proveedores/ajustar-cuentas`,
      { proveedor_ids, ...opts }
    );
    return data;
  },
};

export default proveedorService;
