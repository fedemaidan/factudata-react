import api from './axiosConfig';

/**
 * Servicio de Analytics para obtener estadísticas de empresas y usuarios
 */
const analyticsService = {
  /**
   * Obtiene lista básica de empresas (solo datos estáticos, muy rápido)
   * @returns {Promise<object>} - Lista de empresas con datos básicos
   */
  getEmpresasLista: async () => {
    try {
      const response = await api.get('/analytics/empresas/lista');
      return response.data;
    } catch (error) {
      console.error('Error al obtener lista de empresas:', error);
      throw error;
    }
  },

  /**
   * Obtiene métricas de una empresa específica para un periodo
   * @param {string} empresaId - ID de la empresa
   * @param {Date} fechaDesde - Fecha inicio del periodo
   * @param {Date} fechaHasta - Fecha fin del periodo
   * @returns {Promise<object>} - Métricas de la empresa
   */
  getEmpresaMetricas: async (empresaId, fechaDesde, fechaHasta) => {
    try {
      const response = await api.get(`/analytics/empresa/${empresaId}/metricas`, {
        params: {
          fechaDesde: fechaDesde.toISOString(),
          fechaHasta: fechaHasta.toISOString()
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error al obtener métricas de empresa ${empresaId}:`, error);
      // No lanzar error, devolver objeto de error para manejo en batch
      return { error: true, empresaId, msg: error.message };
    }
  },

  /**
   * Carga métricas de múltiples empresas en paralelo (batches de N)
   * @param {Array<string>} empresaIds - IDs de empresas
   * @param {Date} fechaDesde - Fecha inicio del periodo
   * @param {Date} fechaHasta - Fecha fin del periodo
   * @param {number} batchSize - Tamaño del batch (default: 5)
   * @param {Function} onProgress - Callback para reportar progreso
   * @returns {Promise<Map>} - Map de empresaId -> métricas
   */
  getMetricasBatch: async (empresaIds, fechaDesde, fechaHasta, batchSize = 5, onProgress = null) => {
    const resultados = new Map();
    const total = empresaIds.length;
    let procesadas = 0;
    
    // Procesar en batches
    for (let i = 0; i < total; i += batchSize) {
      const batch = empresaIds.slice(i, i + batchSize);
      
      // Ejecutar batch en paralelo
      const batchResults = await Promise.all(
        batch.map(id => analyticsService.getEmpresaMetricas(id, fechaDesde, fechaHasta))
      );
      
      // Guardar resultados
      batchResults.forEach(result => {
        if (result && result.empresaId) {
          resultados.set(result.empresaId, result);
        }
      });
      
      procesadas += batch.length;
      
      // Reportar progreso
      if (onProgress) {
        onProgress({
          procesadas,
          total,
          porcentaje: Math.round((procesadas / total) * 100),
          ultimoBatch: batchResults
        });
      }
    }
    
    return resultados;
  },

  /**
   * Obtiene estadísticas completas de una empresa
   * @param {string} empresaId - ID de la empresa
   * @returns {Promise<object>} - Estadísticas completas
   */
  getEmpresaStats: async (empresaId) => {
    try {
      const response = await api.get(`/analytics/empresa/${empresaId}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener estadísticas de empresa:', error);
      throw error;
    }
  },

  /**
   * Obtiene resumen de todas las empresas (admin) - DEPRECADO, usar getEmpresasLista + getMetricasBatch
   * @param {Date} fechaDesde - Fecha inicio del periodo
   * @param {Date} fechaHasta - Fecha fin del periodo
   * @returns {Promise<object>} - Lista de empresas con resumen
   */
  getAllEmpresasResumen: async (fechaDesde, fechaHasta) => {
    try {
      const response = await api.get('/analytics/empresas', {
        params: {
          fechaDesde: fechaDesde.toISOString(),
          fechaHasta: fechaHasta.toISOString()
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error al obtener resumen de empresas:', error);
      throw error;
    }
  },

  /**
   * Obtiene estadísticas de movimientos de caja
   * @param {string} empresaId - ID de la empresa
   * @param {number} dias - Cantidad de días a analizar (default: 7)
   * @returns {Promise<object>} - Estadísticas de movimientos
   */
  getMovimientosStats: async (empresaId, dias = 7) => {
    try {
      const response = await api.get(`/analytics/empresa/${empresaId}/movimientos`, {
        params: { dias }
      });
      return response.data;
    } catch (error) {
      console.error('Error al obtener estadísticas de movimientos:', error);
      throw error;
    }
  },

  /**
   * Obtiene estadísticas de acopios y remitos
   * @param {string} empresaId - ID de la empresa
   * @param {number} dias - Cantidad de días a analizar (default: 7)
   * @returns {Promise<object>} - Estadísticas de acopios
   */
  getAcopiosStats: async (empresaId, dias = 7) => {
    try {
      const response = await api.get(`/analytics/empresa/${empresaId}/acopios`, {
        params: { dias }
      });
      return response.data;
    } catch (error) {
      console.error('Error al obtener estadísticas de acopios:', error);
      throw error;
    }
  },

  /**
   * Obtiene estadísticas de usuarios
   * @param {string} empresaId - ID de la empresa
   * @param {number} dias - Cantidad de días a analizar (default: 7)
   * @returns {Promise<object>} - Estadísticas de usuarios
   */
  getUsuariosStats: async (empresaId, dias = 7) => {
    try {
      const response = await api.get(`/analytics/empresa/${empresaId}/usuarios`, {
        params: { dias }
      });
      return response.data;
    } catch (error) {
      console.error('Error al obtener estadísticas de usuarios:', error);
      throw error;
    }
  },

  /**
   * Obtiene métricas de onboarding de una empresa
   * Usa el endpoint de métricas existente con el rango de fechas de onboarding
   * @param {string} empresaId - ID de la empresa
   * @param {Date} fechaRegistro - Fecha de registro como cliente
   * @param {number} diasAnalisis - Cantidad de días a analizar (default: 7)
   * @returns {Promise<object>} - Métricas del periodo de onboarding
   */
  getOnboardingMetricas: async (empresaId, fechaRegistro, diasAnalisis = 7) => {
    try {
      const fechaDesde = new Date(fechaRegistro);
      const fechaHasta = new Date(fechaRegistro);
      fechaHasta.setDate(fechaHasta.getDate() + diasAnalisis);
      
      // Usar el endpoint de métricas existente
      const response = await api.get(`/analytics/empresa/${empresaId}/metricas`, {
        params: {
          fechaDesde: fechaDesde.toISOString(),
          fechaHasta: fechaHasta.toISOString()
        }
      });
      
      // Adaptar la respuesta para el formato de onboarding
      const data = response.data;
      return {
        empresaId: data.empresaId || empresaId,
        totalUsuarios: data.totalUsuarios || 0,
        usuariosValidados: data.usuariosValidados || 0,
        usuariosConMovimientos: data.usuariosConMovimientos || 0,
        movimientosOnboarding: data.movimientosEnPeriodo || 0,
        movimientosPorOrigen: data.movimientosPorOrigen || { web: 0, whatsapp: 0, otro: 0 },
        insightsOnboarding: data.insightsEnPeriodo || 0,
        usuarios: data.usuarios || []
      };
    } catch (error) {
      console.error(`Error al obtener métricas de onboarding de empresa ${empresaId}:`, error);
      return { error: true, empresaId, msg: error.message };
    }
  },

  /**
   * Carga métricas de onboarding de múltiples empresas en paralelo
   * @param {Array<{id: string, fechaRegistro: Date}>} empresas - Empresas con su fecha de registro
   * @param {number} diasAnalisis - Cantidad de días a analizar (default: 7)
   * @param {number} batchSize - Tamaño del batch (default: 5)
   * @param {Function} onProgress - Callback para reportar progreso
   * @returns {Promise<Map>} - Map de empresaId -> métricas
   */
  getOnboardingBatch: async (empresas, diasAnalisis = 7, batchSize = 5, onProgress = null) => {
    const resultados = new Map();
    const total = empresas.length;
    let procesadas = 0;
    
    for (let i = 0; i < total; i += batchSize) {
      const batch = empresas.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(emp => analyticsService.getOnboardingMetricas(emp.id, emp.fechaRegistro, diasAnalisis))
      );
      
      batchResults.forEach(result => {
        if (result && result.empresaId) {
          resultados.set(result.empresaId, result);
        }
      });
      
      procesadas += batch.length;
      
      if (onProgress) {
        onProgress({
          procesadas,
          total,
          porcentaje: Math.round((procesadas / total) * 100),
          ultimoBatch: batchResults
        });
      }
    }
    
    return resultados;
  }
};

export default analyticsService;
