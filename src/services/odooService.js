import api from './axiosConfig';

const OdooService = {
  /**
   * Guarda la configuración de Odoo en el backend e inicia la importación de datos
   * @param {string} empresaId - ID de la empresa
   * @param {Object} config - Configuración de Odoo
   * @returns {Promise<boolean>}
   */
  configurarEImportar: async (empresaId, config) => {
    try {
      const response = await api.post(`odoo/configurar-importar`, { empresaId, config });

      if (response.status === 201) {
        console.log('Configuración guardada e importación iniciada con éxito');
        return true;
      } else {
        console.error('Error al configurar e importar datos de Odoo');
        return false;
      }
    } catch (err) {
      console.error('Error en configurar e importar datos de Odoo:', err);
      return false;
    }
  },

  /**
   * Obtiene la configuración actual de Odoo desde el backend
   * @param {string} empresaId - ID de la empresa
   * @returns {Promise<Object | null>}
   */
  obtenerConfiguracion: async (empresaId) => {
    try {
      const response = await api.get(`odoo/configuracion/${empresaId}`);
      if (response.status === 200) {
        console.log('Configuración de Odoo obtenida con éxito');
        return response.data;
      } else {
        console.error('Error al obtener la configuración de Odoo');
        return null;
      }
    } catch (err) {
      console.error('Error al obtener la configuración de Odoo:', err);
      return null;
    }
  },

  /**
   * Obtiene los datos importados desde Odoo
   * @param {string} empresaId - ID de la empresa
   * @returns {Promise<Object | []>}
   */
  obtenerDatos: async (empresaId) => {
    try {
      const response = await api.get(`odoo/datos/${empresaId}`);
      if (response.status === 200) {
        console.log('Datos importados obtenidos con éxito');
        return response.data;
      } else {
        console.error('Error al obtener los datos importados');
        return [];
      }
    } catch (err) {
      console.error('Error al obtener los datos importados:', err);
      return [];
    }
  },

  /**
   * Obtiene todos los datos importados (productos, proveedores e impuestos)
   * @param {string} empresaId - ID de la empresa
   * @returns {Promise<Object>}
   */
  obtenerDatosCompletos: async (empresaId) => {
    try {
      const response = await api.get(`odoo/datos/${empresaId}`);
      if (response.status === 200) {
        console.log('Datos completos obtenidos con éxito');
        return response.data;
      } else {
        console.error('Error al obtener los datos completos de Odoo');
        return {};
      }
    } catch (err) {
      console.error('Error al obtener los datos completos de Odoo:', err);
      return {};
    }
  },

  /**
   * Elimina toda la integración de Odoo para una empresa
   * @param {string} empresaId - ID de la empresa
   * @returns {Promise<boolean>}
   */
  eliminarIntegracion: async (empresaId) => {
    try {
      const response = await api.delete(`odoo/eliminar/${empresaId}`);
      if (response.status === 200) {
        console.log('Integración de Odoo eliminada con éxito');
        return true;
      } else {
        console.error('Error al eliminar la integración de Odoo');
        return false;
      }
    } catch (err) {
      console.error('Error al eliminar la integración de Odoo:', err);
      return false;
    }
  },

    /**
   * Activa o desactiva un producto, proveedor o impuesto en Odoo
   * @param {string} empresaId - ID de la empresa
   * @param {string} tipo - 'productos', 'proveedores' o 'taxes'
   * @param {number} id - ID del elemento a modificar
   * @param {boolean} activo - Estado a asignar (true para activo, false para inactivo)
   * @returns {Promise<boolean>}
   */
    setActive: async (empresaId, tipo, id, activo) => {
      try {
        const response = await api.put(`odoo/${tipo}/set-active`, { empresaId, id, activo });
        return response.status === 200;
      } catch (err) {
        console.error(`Error al cambiar estado de ${tipo} con ID ${id}:`, err);
        return false;
      }
    },
  
    /**
     * Agrega un alias a un producto, proveedor o impuesto en Odoo
     * @param {string} empresaId - ID de la empresa
     * @param {string} tipo - 'productos', 'proveedores' o 'taxes'
     * @param {number} id - ID del elemento
     * @param {string} alias - Alias a agregar
     * @returns {Promise<boolean>}
     */
    agregarAlias: async (empresaId, tipo, id, alias) => {
      try {
        const response = await api.post(`odoo/${tipo}/alias`, { empresaId, id, alias });
        return response.status === 201;
      } catch (err) {
        console.error(`Error al agregar alias a ${tipo} con ID ${id}:`, err);
        return false;
      }
    },
  
    /**
     * Elimina un alias de un producto, proveedor o impuesto en Odoo
     * @param {string} empresaId - ID de la empresa
     * @param {string} tipo - 'productos', 'proveedores' o 'taxes'
     * @param {number} id - ID del elemento
     * @param {string} alias - Alias a eliminar
     * @returns {Promise<boolean>}
     */
    eliminarAlias: async (empresaId, tipo, id, alias) => {
      try {
        const response = await api.delete(`odoo/${tipo}/alias`, { data: { empresaId, id, alias } });
        return response.status === 200;
      } catch (err) {
        console.error(`Error al eliminar alias de ${tipo} con ID ${id}:`, err);
        return false;
      }
    },

      /**
   * Obtiene los diarios de compra desde Odoo
   * @param {string} empresaId - ID de la empresa
   * @returns {Promise<Array>}
   */
  obtenerDiariosCompra: async (empresaId) => {
    try {
      const response = await api.get(`odoo/diarios/${empresaId}`);
      if (response.status === 200) {
        console.log('Diarios de compra obtenidos con éxito');
        return response.data;
      } else {
        console.error('Error al obtener los diarios de compra');
        return [];
      }
    } catch (err) {
      console.error('Error al obtener los diarios de compra:', err);
      return [];
    }
  },

  
};



export default OdooService;
