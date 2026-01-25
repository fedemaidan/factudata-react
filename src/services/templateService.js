import api from './axiosConfig';

const templateService = {
  /**
   * Envía el template de bienvenida para primer egreso
   * @param {Object} data - { phone, nombre, proveedorEjemplo, proyectoEjemplo, fechaEnvio? }
   */
  sendBienvenidaPrimerEgreso: async (data) => {
    const response = await api.post('/templates/bienvenida-primer-egreso', data);
    return response.data;
  },

  /**
   * Envía templates de bienvenida a múltiples usuarios
   * @param {Object} data - { usuarios: [{ phone, nombre, proveedorEjemplo, proyectoEjemplo }], fechaEnvio? }
   */
  sendBienvenidaPrimerEgresoBulk: async (data) => {
    const response = await api.post('/templates/bienvenida-primer-egreso/bulk', data);
    return response.data;
  },

  /**
   * Envía un template genérico
   * @param {Object} data - { phone, templateData, fallbackText?, fechaEnvio?, createdFor? }
   */
  sendTemplate: async (data) => {
    const response = await api.post('/templates/send', data);
    return response.data;
  }
};

export default templateService;
