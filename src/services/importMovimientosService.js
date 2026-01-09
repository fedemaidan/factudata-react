import Papa from 'papaparse';
import config from 'src/config/config';

// Configuración del backend - usar la misma config que los demás servicios
// config.apiUrl ya incluye '/api' al final, así que lo removemos para construir la URL base
const API_BASE_URL = config.apiUrl.replace(/\/api$/, '');

/**
 * Service para manejar la importación masiva de movimientos desde CSV
 */
class ImportMovimientosService {
  
  /**
   * Analiza archivos y detecta entidades únicas usando el backend
   * @param {FileList} files - Archivos a analizar
   * @param {string} empresaId - ID de la empresa
   * @param {string} especificacionUsuario - Instrucciones del usuario
   * @returns {Promise<object>} Análisis de los archivos con entidades detectadas
   */
  async analizarArchivos(files, empresaId, especificacionUsuario = '') {
    try {
      console.log('[ImportMovimientosService] Analizando archivos:', files.length);
      console.log('[ImportMovimientosService] URL del backend:', `${API_BASE_URL}/api/importar-movimientos/extraerData`);
      
      // Crear FormData para enviar archivos
      const formData = new FormData();
      
      // Agregar archivos
      for (let i = 0; i < files.length; i++) {
        formData.append('archivos', files[i]);
        console.log('[ImportMovimientosService] Agregando archivo:', files[i].name);
      }
      
      // Agregar parámetros
      formData.append('empresaId', empresaId);
      if (especificacionUsuario) {
        formData.append('especificacionUsuario', especificacionUsuario);
      }
      
      console.log('[ImportMovimientosService] Enviando petición al backend...');
      
      // Llamar al backend
      const response = await fetch(`${API_BASE_URL}/api/importar-movimientos/extraerData`, {
        method: 'POST',
        body: formData,
        // No agregar Content-Type, el browser lo configura automáticamente para FormData
      });
      
      console.log('[ImportMovimientosService] Respuesta del servidor:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('[ImportMovimientosService] Error response:', errorText);
        throw new Error(`Error del servidor (${response.status}): ${errorText}`);
      }
      
      const resultado = await response.json();
      
      if (!resultado.success) {
        throw new Error(resultado.error || 'Error en el análisis');
      }
      
      // Transformar respuesta del backend al formato esperado por el frontend
      return this._transformarRespuestaBackend(resultado.data);
      
    } catch (error) {
      console.error('[ImportMovimientosService] Error analizando archivos:', error);
      throw new Error(`Error analizando archivos: ${error.message}`);
    }
  }

  /**
   * Transforma la respuesta del backend al formato esperado por el frontend
   * @private
   */
  _transformarRespuestaBackend(data) {
    console.log('[ImportMovimientosService] Datos recibidos del backend:', data);
    
    const analisisDatos = data.analisis_datos;
    const analisisComparacion = data.analisis_comparacion;
    
    console.log('[ImportMovimientosService] analisisDatos:', analisisDatos);
    console.log('[ImportMovimientosService] analisisComparacion:', analisisComparacion);
    
    // Manejar ambos casos: datos anidados o datos directos
    const categorias = analisisDatos?.analisis?.categorias || analisisDatos?.categorias || [];
    const subcategorias = analisisDatos?.analisis?.subcategorias || analisisDatos?.subcategorias || [];
    const proveedores = analisisDatos?.analisis?.proveedores || analisisDatos?.proveedores || [];
    const proyectos = analisisDatos?.analisis?.proyectos || analisisDatos?.proyectos || [];
    
    const transformedData = {
      // Datos del análisis de archivos
      archivos: data.urls_archivos || [],
      totalFilas: analisisDatos?.total_filas || 0,
      movimientosValidos: analisisDatos?.movimientos_validos || 0,
      categorias: categorias,
      subcategorias: subcategorias,
      proveedores: proveedores,
      proyectos: proyectos,
      movimientosMuestra: analisisDatos?.movimientos_muestra || [],
      todosMovimientos: analisisDatos?.movimientos_muestra || [], // Por ahora usar muestra
      
      // Datos de comparación con entidades existentes
      comparacion: {
        categorias: analisisComparacion?.categorias || [],
        subcategorias: analisisComparacion?.subcategorias || [],
        proveedores: analisisComparacion?.proveedores || [],
        proyectos: analisisComparacion?.proyectos || []
      },
      
      // Metadata
      metadata: {
        archivos_procesados: data.archivos_procesados,
        contexto_empresa: data.contexto_empresa,
        timestamp: data.timestamp
      }
    };
    
    console.log('[ImportMovimientosService] Datos transformados:', transformedData);
    return transformedData;
  }



  /**
   * DEPRECADO: El backend ya procesa la comparación completamente
   * Este método solo devuelve los datos tal cual para compatibilidad
   * @param {object} datosComparacion - Datos de comparación del backend
   * @param {object} entidadesExistentes - Entidades actuales de la empresa (no se usa)
   * @returns {object} Datos de comparación sin transformación adicional
   */
  async compararConExistentes(datosComparacion, entidadesExistentes) {
    // El backend YA procesó todo: comparación, estado, accion, mapeoA
    // Solo devolvemos los datos directamente sin transformación
    console.log('[compararConExistentes] Datos recibidos del backend:', datosComparacion);
    
    return {
      categorias: datosComparacion?.categorias || [],
      subcategorias: datosComparacion?.subcategorias || [],
      proveedores: datosComparacion?.proveedores || [],
      proyectos: datosComparacion?.proyectos || []
    };
  }









  /**
   * Utility para simular delay en operaciones async
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===== NUEVOS MÉTODOS SEPARADOS POR ENTIDADES =====

  /**
   * Analiza archivos y los sube a Firebase Storage
   * @param {FileList} files - Archivos a subir
   * @param {string} empresaId - ID de la empresa
   * @param {string} especificacionUsuario - Instrucciones del usuario
   * @returns {Promise<object>} URLs de archivos subidos
   */
  async subirArchivos(files, empresaId, especificacionUsuario = '') {
    try {
      const formData = new FormData();
      
      // Agregar archivos
      Array.from(files).forEach(file => {
        formData.append('archivos', file);
      });
      
      // Agregar parámetros
      formData.append('empresaId', empresaId);
      if (especificacionUsuario) {
        formData.append('especificacionUsuario', especificacionUsuario);
      }
      
      const response = await fetch(`${API_BASE_URL}/api/importar-movimientos/extraerData`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('[ImportMovimientosService] Error response:', errorText);
        throw new Error(`Error del servidor (${response.status}): ${errorText}`);
      }
      
      const resultado = await response.json();
      
      if (!resultado.success) {
        throw new Error(resultado.error || 'Error subiendo archivos');
      }
      
      return resultado.data;
      
    } catch (error) {
      console.error('[ImportMovimientosService] Error subiendo archivos:', error);
      throw new Error(`Error subiendo archivos: ${error.message}`);
    }
  }

  /**
   * Extrae categorías y subcategorías de archivos ya subidos
   * @param {Array} archivosUrls - URLs de archivos en Firebase
   * @param {string} empresaId - ID de la empresa
   * @param {string} especificacionUsuario - Instrucciones del usuario
   * @returns {Promise<object>} Categorías detectadas y comparación
   */
  async extraerCategorias(archivosUrls, empresaId, especificacionUsuario = '') {
    try {
      const params = new URLSearchParams({
        empresaId,
        archivosUrls: JSON.stringify(archivosUrls)
      });
      
      if (especificacionUsuario) {
        params.append('especificacionUsuario', especificacionUsuario);
      }
      
      const response = await fetch(`${API_BASE_URL}/api/importar-movimientos/categorias?${params}`, {
        method: 'GET'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error del servidor (${response.status}): ${errorText}`);
      }
      
      const resultado = await response.json();
      
      if (!resultado.success) {
        throw new Error(resultado.error || 'Error extrayendo categorías');
      }
      
      return resultado.data;
      
    } catch (error) {
      console.error('[ImportMovimientosService] Error extrayendo categorías:', error);
      throw new Error(`Error extrayendo categorías: ${error.message}`);
    }
  }

  /**
   * Persiste categorías y subcategorías según mapeos del usuario
   * @param {string} empresaId - ID de la empresa
   * @param {Array} mapeosCategorias - Mapeos de categorías
   * @param {Array} mapeosSubcategorias - Mapeos de subcategorías
   * @returns {Promise<object>} Resultado de la persistencia
   */
  async persistirCategorias(empresaId, mapeosCategorias, mapeosSubcategorias = []) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/importar-movimientos/categorias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          empresaId,
          mapeosCategorias,
          mapeosSubcategorias
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error del servidor (${response.status}): ${errorText}`);
      }
      
      const resultado = await response.json();
      
      if (!resultado.success) {
        throw new Error(resultado.error || 'Error persistiendo categorías');
      }
      
      return resultado.data;
      
    } catch (error) {
      console.error('[ImportMovimientosService] Error persistiendo categorías:', error);
      throw new Error(`Error persistiendo categorías: ${error.message}`);
    }
  }

  /**
   * Extrae proveedores de archivos ya subidos
   * @param {Array} archivosUrls - URLs de archivos en Firebase
   * @param {string} empresaId - ID de la empresa
   * @param {string} especificacionUsuario - Instrucciones del usuario
   * @returns {Promise<object>} Proveedores detectados y comparación
   */
  async extraerProveedores(archivosUrls, empresaId, especificacionUsuario = '') {
    try {
      const params = new URLSearchParams({
        empresaId,
        archivosUrls: JSON.stringify(archivosUrls)
      });
      
      if (especificacionUsuario) {
        params.append('especificacionUsuario', especificacionUsuario);
      }
      
      const response = await fetch(`${API_BASE_URL}/api/importar-movimientos/proveedores?${params}`, {
        method: 'GET'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error del servidor (${response.status}): ${errorText}`);
      }
      
      const resultado = await response.json();
      
      if (!resultado.success) {
        throw new Error(resultado.error || 'Error extrayendo proveedores');
      }
      
      return resultado.data;
      
    } catch (error) {
      console.error('[ImportMovimientosService] Error extrayendo proveedores:', error);
      throw new Error(`Error extrayendo proveedores: ${error.message}`);
    }
  }

  /**
   * Persiste proveedores según mapeos del usuario
   * @param {string} empresaId - ID de la empresa
   * @param {Array} mapeosProveedores - Mapeos de proveedores
   * @returns {Promise<object>} Resultado de la persistencia
   */
  async persistirProveedores(empresaId, mapeosProveedores) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/importar-movimientos/proveedores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          empresaId,
          mapeosProveedores
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error del servidor (${response.status}): ${errorText}`);
      }
      
      const resultado = await response.json();
      
      if (!resultado.success) {
        throw new Error(resultado.error || 'Error persistiendo proveedores');
      }
      
      return resultado.data;
      
    } catch (error) {
      console.error('[ImportMovimientosService] Error persistiendo proveedores:', error);
      throw new Error(`Error persistiendo proveedores: ${error.message}`);
    }
  }

  /**
   * Extrae movimientos finales de archivos ya subidos
   * @param {Array} archivosUrls - URLs de archivos en Firebase
   * @param {string} empresaId - ID de la empresa
   * @param {string} especificacionUsuario - Instrucciones del usuario
   * @returns {Promise<object>} Movimientos detectados listos para persistir
   */
  async extraerMovimientos(archivosUrls, empresaId, especificacionUsuario = '') {
    try {
      const params = new URLSearchParams({
        empresaId,
        archivosUrls: JSON.stringify(archivosUrls)
      });
      
      if (especificacionUsuario) {
        params.append('especificacionUsuario', especificacionUsuario);
      }
      
      const response = await fetch(`${API_BASE_URL}/api/importar-movimientos/movimientos?${params}`, {
        method: 'GET'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error del servidor (${response.status}): ${errorText}`);
      }
      
      const resultado = await response.json();
      
      if (!resultado.success) {
        throw new Error(resultado.error || 'Error extrayendo movimientos');
      }
      
      return resultado.data;
      
    } catch (error) {
      console.error('[ImportMovimientosService] Error extrayendo movimientos:', error);
      throw new Error(`Error extrayendo movimientos: ${error.message}`);
    }
  }

  /**
   * Persiste movimientos finales
   * @param {string} empresaId - ID de la empresa
   * @param {Array} movimientos - Movimientos a persistir
   * @param {Object} mapeosEntidades - Mapeos de todas las entidades
   * @returns {Promise<object>} Resultado de la persistencia
   */
  async persistirMovimientos(empresaId, movimientos, mapeosEntidades = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/importar-movimientos/movimientos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          empresaId,
          movimientos,
          mapeosEntidades
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error del servidor (${response.status}): ${errorText}`);
      }
      
      const resultado = await response.json();
      
      if (!resultado.success) {
        throw new Error(resultado.error || 'Error persistiendo movimientos');
      }
      
      return resultado.data;
      
    } catch (error) {
      console.error('[ImportMovimientosService] Error persistiendo movimientos:', error);
      throw new Error(`Error persistiendo movimientos: ${error.message}`);
    }
  }

  /**
   * Persiste movimientos en batch usando el sistema existente de addMovimientoEgreso
   * @param {Array} movimientos - Array de movimientos a persistir
   * @param {string} empresaId - ID de la empresa
   * @param {string} userId - ID del usuario
   * @param {string} userName - Nombre del usuario
   * @param {string} userPhone - Teléfono del usuario
   * @returns {Promise<object>} Resultado de la persistencia
   */
  async persistirMovimientosBatch(movimientos, empresaId, userId, userName, userPhone) {
    try {
      console.log('[ImportMovimientosService] Persistiendo movimientos en batch:', movimientos.length);
      
      const response = await fetch(`${API_BASE_URL}/api/importar-movimientos/persistir-movimientos-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          movimientos,
          empresaId,
          userId,
          userName,
          userPhone
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error del servidor (${response.status}): ${errorText}`);
      }

      const resultado = await response.json();

      if (!resultado.success) {
        throw new Error(resultado.error || 'Error persistiendo movimientos en batch');
      }

      console.log('[ImportMovimientosService] Movimientos en batch persistidos:', resultado);
      return resultado.data;

    } catch (error) {
      console.error('[ImportMovimientosService] Error persistirMovimientosBatch:', error);
      throw new Error(`Error persistiendo movimientos en batch: ${error.message}`);
    }
  }

  /**
   * Importa movimientos directamente parseando CSV/Excel línea por línea (NO BLOQUEANTE)
   * Retorna inmediatamente con un código para hacer polling
   * @param {Array} archivosUrls - URLs de archivos en Firebase Storage
   * @param {string} empresaId - ID de la empresa
   * @param {string} userId - ID del usuario
   * @param {string} userName - Nombre del usuario
   * @param {string|null} proyectoId - ID del proyecto específico (null = detectar del CSV)
   * @param {string} aclaracionesUsuario - Instrucciones prioritarias para el prompt de análisis
   * @param {Array} mapeosCategoriasDescartadas - Mapeo de categorías descartadas a existentes
   * @returns {Promise<object>} { codigo, resultado: null }
   */
  async importarDirecto(archivosUrls, empresaId, userId, userName, proyectoId = null, aclaracionesUsuario = '', mapeosCategoriasDescartadas = []) {
    try {
      console.log('[ImportMovimientosService] Iniciando importación directa:', {
        archivos: archivosUrls.length,
        empresaId,
        userId,
        userName,
        proyectoId,
        tieneAclaraciones: !!aclaracionesUsuario,
        mapeosCategoriasDescartadas: mapeosCategoriasDescartadas.length
      });
      
      const response = await fetch(`${API_BASE_URL}/api/importar-movimientos/importar-directo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          archivosUrls,
          empresaId,
          userId,
          userName,
          proyectoId,
          aclaracionesUsuario,
          mapeosCategoriasDescartadas
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error del servidor (${response.status}): ${errorText}`);
      }

      const resultado = await response.json();

      if (!resultado.success) {
        throw new Error(resultado.error || 'Error iniciando importación');
      }

      console.log('[ImportMovimientosService] Importación iniciada:', resultado.data);
      // resultado.data = { codigo: "N242R", resultado: null }
      return resultado.data;

    } catch (error) {
      console.error('[ImportMovimientosService] Error importarDirecto:', error);
      throw new Error(`Error importando movimientos: ${error.message}`);
    }
  }

  /**
   * Elimina movimientos por código de sincronización
   * @param {string} codigoSync - Código de sincronización de la importación
   * @returns {Promise<object>} Resultado de la eliminación
   */
  async eliminarMovimientosPorCodigo(codigoSync) {
    try {
      console.log('[ImportMovimientosService] Eliminando movimientos con código:', codigoSync);
      
      const response = await fetch(`${API_BASE_URL}/api/importar-movimientos/eliminar/${codigoSync}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al eliminar movimientos');
      }

      console.log('[ImportMovimientosService] Movimientos eliminados:', data);
      return data;
      
    } catch (error) {
      console.error('[ImportMovimientosService] Error eliminando movimientos:', error);
      throw error;
    }
  }

  /**
   * Consulta el estado de una importación por código
   * @param {string} codigo - Código de la importación (ej: "N242R")
   * @returns {Promise<object>} { codigo, resultado } donde resultado puede ser null o el summary
   */
  async consultarEstadoImportacion(codigo) {
    try {
      console.log('[ImportMovimientosService] Consultando estado:', codigo);
      
      const response = await fetch(`${API_BASE_URL}/api/importar-movimientos/status/${codigo}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Código de importación no encontrado');
        }
        const errorText = await response.text();
        throw new Error(`Error del servidor (${response.status}): ${errorText}`);
      }

      const resultado = await response.json();

      if (!resultado.success) {
        throw new Error(resultado.error || 'Error consultando estado');
      }

      console.log('[ImportMovimientosService] Estado:', resultado.data);
      // resultado.data = { codigo: "N242R", resultado: {...} o null }
      return resultado.data;

    } catch (error) {
      console.error('[ImportMovimientosService] Error consultarEstadoImportacion:', error);
      throw error;
    }
  }
}

export default new ImportMovimientosService();