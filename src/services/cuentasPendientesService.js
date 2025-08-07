import api from './axiosConfig';

const CuentasPendientesService = {
  /**
   * Crea una nueva cuenta pendiente
   * @param {Object} data - Datos de la cuenta
   * @returns {Promise<Object>}
   */
  crearCuentaPendiente: async (data) => {
    try {
      const response = await api.post('/cuenta_pendiente/crear', data);
      if (response.status === 201) {
        console.log('✅ Cuenta pendiente creada con éxito');
        return response.data;
      } else {
        throw new Error('No se pudo crear la cuenta pendiente.');
      }
    } catch (error) {
      console.error('❌ Error en crearCuentaPendiente:', error);
      throw error;
    }
  },

  /**
   * Agrega una cuota a una cuenta
   * @param {string} cuentaId
   * @param {Object} cuotaData
   * @returns {Promise<Object>}
   */
  agregarCuota: async (cuentaId, cuotaData) => {
    try {
      const response = await api.post(`/cuenta_pendiente/${cuentaId}/cuota`, cuotaData);
      return response.data;
    } catch (error) {
      console.error('❌ Error al agregar cuota:', error);
      throw error;
    }
  },

  /**
   * Registra un pago (parcial o total) sobre una cuota
   * @param {string} cuentaId
   * @param {string} cuotaId
   * @param {Object} pagoData 
   *  *  {
   *       monto: valor del pago,
   *       moneda_pago: moneda del pago,
   *       fecha: fecha del pago (opcional, por defecto es ahora),
   *       monto_real: monto real del pago (opcional, si no se pasa se usa el monto),
   *       moneda_real: moneda real del pago (opcional, si no se pasa se usa la moneda del pago),
   *  }
   * @returns {Promise<Object>}
   */
  registrarPago: async (cuentaId, cuotaId, pagoData) => {
    try {
      const response = await api.post(`/cuenta_pendiente/${cuentaId}/cuota/${cuotaId}/pago`, pagoData);
      return response.data;
    } catch (error) {
      console.error('❌ Error al registrar pago:', error);
      throw error;
    }
  },

  /**
   * Obtiene una cuenta por su ID
   * @param {string} cuentaId
   * @returns {Promise<Object>}
   */
  obtenerCuenta: async (cuentaId) => {
    try {
      const response = await api.get(`/cuenta_pendiente/${cuentaId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error al obtener cuenta:', error);
      throw error;
    }
  },

  /**
   * Obtiene las cuotas de una cuenta
   * @param {string} cuentaId
   * @returns {Promise<Array>}
   */
  obtenerCuotas: async (cuentaId) => {
    try {
      const response = await api.get(`/cuenta_pendiente/${cuentaId}/cuotas`);
      return response.data;
    } catch (error) {
      console.error('❌ Error al obtener cuotas:', error);
      throw error;
    }
  },

  /**
   * Lista todas las cuentas de un proyecto
   * @param {string} proyectoId
   * @returns {Promise<Array>}
   */
  listarCuentasPorProyecto: async (proyectoId) => {
    try {
      const response = await api.get(`/cuenta_pendiente/proyecto/${proyectoId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error al listar cuentas por proyecto:', error);
      throw error;
    }
  },

  listarCuentasPorProyectos: async (proyectoIds) => {
    try {
      const query = proyectoIds.join(',');
      const response = await api.get(`/cuenta_pendiente/proyectos?proyectos=${query}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error al listar cuentas por proyectos:', error);
      throw error;
    }
  },

  listarCuentasPorEmpresa: async (empresaId, conCuotas = true) => {
    try {
      const response = await api.get(`/cuenta_pendiente/empresa/${empresaId}/?con_cuotas=${conCuotas}`);
      console.log('✅ Cuentas obtenidas:', response);
      return response.data;
    } catch (error) {
      console.error('❌ Error al listar cuentas por empresa:', error);
      throw error;
    }
  },

    /**
   * Elimina una cuenta pendiente y sus cuotas
   * @param {string} cuentaId
   * @returns {Promise<Object>}
   */
    eliminarCuenta: async (cuentaId) => {
      try {
        const response = await api.delete(`/cuenta_pendiente/${cuentaId}`);
        return response.data;
      } catch (error) {
        console.error('❌ Error al eliminar cuenta:', error);
        throw error;
      }
    },
  
  /**
   * Edita una cuota existente
   * @param {string} cuentaId
   * @param {string} cuotaId
   * @param {Object} nuevosDatos
   * @returns {Promise<Object>}
   */
  editarCuota: async (cuentaId, cuotaId, nuevosDatos) => {
    try {
      const response = await api.put(`/cuenta_pendiente/${cuentaId}/cuota/${cuotaId}`, nuevosDatos);
      return response.data;
    } catch (error) {
      console.error('❌ Error al editar cuota:', error);
      throw error;
    }
  },

  /**
   * Elimina una cuota específica
   * @param {string} cuentaId
   * @param {string} cuotaId
   * @returns {Promise<Object>}
   */
  eliminarCuota: async (cuentaId, cuotaId) => {
    try {
      const response = await api.delete(`/cuenta_pendiente/${cuentaId}/cuota/${cuotaId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error al eliminar cuota:', error);
      throw error;
    }
  },

  
};

export default CuentasPendientesService;
