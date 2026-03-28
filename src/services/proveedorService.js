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
   * Devuelve solo los nombres de proveedores (para autocomplete).
   * @param {string} empresaId
   * @returns {Promise<string[]>}
   */
  async getNombres(empresaId) {
    const proveedores = await this.getByEmpresa(empresaId);
    return proveedores.map(p => p.nombre).sort();
  },
};

export default proveedorService;
