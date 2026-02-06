import api from './axiosConfig';

const AcopioService = {
  /**
   * Extrae datos de una factura con validación doble de cantidades
   * Los materiales con discrepancia tendrán _requiere_confirmacion_usuario = true
   * @param {string} urlFactura - URL de la imagen de la factura
   * @param {function} onProgress - Callback para progreso
   * @returns {Promise<Object>} - { success, materiales, tieneDiscrepancias }
   */
  extraerDatosFacturaConValidacion: async (urlFactura, onProgress) => {
    if (!urlFactura) throw new Error('URL de factura requerida');
    
    const endpoint = '/acopio/factura/extraer-validacion/init';
    console.log('[AcopioSvc][extraerDatosFacturaConValidacion] URL:', urlFactura);

    try {
      // 1) Iniciar la tarea
      const initRes = await api.post(endpoint, { archivo_url: urlFactura });
      console.log(`[AcopioSvc][extraerDatosFacturaConValidacion] Init status=${initRes.status}`);

      const initData = initRes.data;
      const taskId = initData?.taskId;

      if (!taskId) {
        // Respuesta síncrona
        return { success: true, ...initData };
      }

      // 2) Polling para obtener resultado
      const statusEndpoint = `/acopio/factura/extraer-validacion/status/${taskId}`;
      const maxAttempts = 60;
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await new Promise(r => setTimeout(r, 3000));
        
        if (onProgress) {
          onProgress({ attempt, maxAttempts, status: 'polling' });
        }

        const statusRes = await api.get(statusEndpoint);
        const statusData = statusRes.data;
        
        console.log(`[AcopioSvc][extraerDatosFacturaConValidacion] Poll ${attempt}/${maxAttempts} status=${statusData?.status}`);

        if (statusData?.status === 'completado') {
          return {
            success: true,
            materiales: statusData.materiales || [],
            tieneDiscrepancias: statusData.tieneDiscrepancias || false,
            urls: statusData.urls
          };
        }

        if (statusData?.status === 'error') {
          throw new Error(statusData?.error || 'Error en la extracción de datos');
        }
      }

      throw new Error('Tiempo de espera agotado para la extracción de datos');
    } catch (error) {
      console.error('[AcopioSvc][extraerDatosFacturaConValidacion ERR]', error?.response?.data || error);
      throw new Error(
        error?.response?.data?.message || 
        error?.message || 
        'Error al extraer datos de la factura'
      );
    }
  },

  /**
   * Aplica las confirmaciones del usuario para materiales con discrepancia
   * @param {Array} materiales - Lista de materiales con posibles discrepancias
   * @param {Object} confirmaciones - { "Nombre Material": "cantidad_elegida" }
   * @returns {Promise<Array>} - Materiales con cantidades confirmadas
   */
  confirmarCantidades: async (materiales, confirmaciones) => {
    try {
      const response = await api.post('/acopio/factura/confirmar-cantidades', {
        materiales,
        confirmaciones
      });
      return response.data.materiales;
    } catch (error) {
      console.error('[AcopioSvc][confirmarCantidades ERR]', error);
      throw error;
    }
  },

  /**
   * Crea un nuevo acopio a partir de datos (sin archivo CSV)
   * @param {Object} acopioData - Datos del acopio
   * @param {string} acopioData.empresaId
   * @param {string} acopioData.proveedor
   * @param {string} acopioData.proyectoId
   * @param {string} acopioData.codigo
   * @param {Array} acopioData.productos - Lista de productos con {codigo, descripcion, cantidad, valorUnitario}
   * @returns {Promise<Object>} - { message, acopioId }
   */
  crearAcopio: async (acopioData) => {
    try {
      const response = await api.post(`/acopio/crear`, acopioData);
      if (response.status === 201) {
        console.log('✅ Acopio creado con éxito');
        return response.data;
      } else {
        console.error('❌ Error al crear acopio');
        throw new Error('No se pudo crear el acopio.');
      }
    } catch (error) {
      console.error('❌ Error en crearAcopioDesdeDatos:', error);
      throw error;
    }
  },

  /**
 * Cambia el estado (activo/inactivo) de un acopio
 * @param {string} acopioId
 * @param {boolean} activo - true = activar, false = desactivar
 * @returns {Promise<{ok:boolean, message:string}>}
 */
cambiarEstadoAcopio: async (acopioId, activo) => {
  try {
    if (!acopioId) throw new Error('Falta acopioId');
    if (typeof activo !== 'boolean') throw new Error('El campo activo debe ser true o false');

    const response = await api.put(`/acopio/${acopioId}/estado`, { activo });

    if (response?.status === 200 && response.data?.ok) {
      console.log(`✅ ${response.data.message}`);
      return response.data; // { ok: true, message: 'Acopio activado/desactivado correctamente.' }
    }

    throw new Error(response?.data?.msg || 'No se pudo cambiar el estado del acopio.');
  } catch (error) {
    console.error('❌ Error en cambiarEstadoAcopio:', error);
    throw error;
  }
},

  crearRemitoConMovimientos: async (acopioId, materiales, remitoData) => {
    try {
      const formData = new FormData();
      formData.append('fecha', remitoData.fecha);
      formData.append('numero_remito', remitoData.numero_remito);
      formData.append('archivo', remitoData.archivo); // archivo es obligatorio ahora
      formData.append('materiales', JSON.stringify(materiales));
  
      const response = await api.post(
        `/acopio/${acopioId}/remito/crear-con-movimientos`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
  
      if (response.status === 201) {
        console.log('✅ Remito creado con éxito');
        return response.data;
      } else {
        console.error('❌ Error al crear el remito con movimientos');
        throw new Error('No se pudo crear el remito.');
      }
    } catch (error) {
      console.error('❌ Error en crearRemitoConMovimientos:', error);
      throw error;
    }
  },
  
  

  extraerDatosDesdeArchivo: async (acopioId, archivo, archivo_url, opts = {}) => {
    try {
      const formData = new FormData();
      formData.append('archivo', archivo);
      formData.append('archivo_url', archivo_url);
      console.log('opts', opts);
      if (opts.sinMateriales) formData.append('sin_materiales', '1');
  
      const response = await api.post(`/acopio/${acopioId}/remito/extraer`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
  
      return response.data;
    } catch (error) {
      console.error('Error al extraer datos del remito:', error);
      throw error;
    }
  },

  extraerDatosCompraDesdeArchivo: async (archivo, archivo_url) => {
    try {
      const formData = new FormData();
      if (archivo) formData.append('archivo', archivo);
      if (archivo_url) formData.append('archivo_url', archivo_url);
  
      const response = await api.post(`/acopio/compra/extraer`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
  
      if (response.status === 200) {
        console.log('✅ Datos de compra extraídos con éxito');
        return {
          materiales: response.data.materiales || [],
          tieneDiscrepancias: response.data.tieneDiscrepancias || false
        };
      } else {
        console.error('❌ Error al extraer datos de la compra');
        throw new Error('No se pudo extraer la información de la compra.');
      }
    } catch (error) {
      console.error('❌ Error en extraerDatosCompraDesdeArchivo:', error);
      throw error;
    }
  },

  interpretarInstruccionRemito: async (acopioId, instruccion, items, contexto={}) => {
    try {
      const resp = await api.post(`/acopio/${acopioId}/remito/interpretar-instruccion`, {
        instruccion, items, contexto
      });
      // { ok, resumen, cambios, items }
      return resp.data;
    } catch (e) {
      console.error('interpretarInstruccionRemito error', e);
      return { ok:false, resumen:'No se pudo interpretar la instrucción.', cambios:[], items };
    }
  },

  
  buscarMaterialesListaPrecios: async (acopioId, q) => {
     const resp = await api.get(`/acopio/${acopioId}/lista-precios/buscar`, { params: { q }});
     return resp.data?.materiales || [];
  },
    
  
  extraerCompraInit: async (archivo, meta = {}) => {
    try {
      const formData = new FormData();
      if (archivo) formData.append('archivo', archivo);
      // Pasar tipoLista para que el backend sepa si verificar cantidades
      if (meta.tipoLista) formData.append('tipoLista', meta.tipoLista);
      // Pasar modo de extracción: 'rapido', 'balanceado', 'preciso'
      if (meta.modo) formData.append('modo', meta.modo);
  
      const response = await api.post(`/acopio/compra/extraer/init`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
  
      return response.data.taskId;
    } catch (error) {
      console.error('❌ Error al iniciar extracción asincrónica:', error);
      throw error;
    }
  },

  /**
   * Obtiene los modos de extracción disponibles con sus tiempos estimados
   * @param {number} cantidadHojas - Cantidad de hojas del documento
   * @returns {Promise<Object>} - { ok, modos: [{ id, nombre, descripcion, tiempoEstimado }] }
   */
  obtenerModosExtraccion: async (cantidadHojas = 1) => {
    try {
      const response = await api.get('/acopio/compra/modos-extraccion', {
        params: { cantidadHojas }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error al obtener modos de extracción:', error);
      // Devolver modos por defecto en caso de error
      return {
        ok: false,
        modos: [
          { id: 'rapido', nombre: '⚡ Rápido', descripcion: 'OCR + IA estructuración', tiempoEstimado: '~15s' },
          { id: 'agil', nombre: '🚀 Ágil', descripcion: 'OCR + IA + verificación completa', tiempoEstimado: '~25s' },
          { id: 'balanceado', nombre: '⚖️ Balanceado', descripcion: 'GPT-4o paralelo + O3 verificación', tiempoEstimado: '~30s' },
          { id: 'preciso', nombre: '🎯 Preciso', descripcion: 'O3 paralelo + O3 verificación', tiempoEstimado: '~1min' }
        ]
      };
    }
  },
  
  consultarEstadoExtraccion: async (taskId) => {
    try {
      const response = await api.get(`/acopio/compra/extraer/status/${taskId}`);
      console.log(response.data);
      // Ahora incluye tieneDiscrepancias
      return {
        status: response.data.status,
        materiales: response.data.materiales,
        tieneDiscrepancias: response.data.tieneDiscrepancias || false,
        urls: response.data.urls,
        error: response.data.error
      };
    } catch (error) {
      console.error('❌ Error al consultar estado de extracción:', error);
      throw error;
    }
  },

  /**
   * Aplica las confirmaciones del usuario para materiales con discrepancia (flujo compra)
   * @param {Array} materiales - Lista de materiales con posibles discrepancias
   * @param {Object} confirmaciones - { "Nombre Material": "cantidad_elegida" }
   * @returns {Promise<Array>} - Materiales con cantidades confirmadas
   */
  confirmarCantidadesCompra: async (materiales, confirmaciones) => {
    try {
      const response = await api.post('/acopio/compra/confirmar-cantidades', {
        materiales,
        confirmaciones
      });
      return response.data.materiales;
    } catch (error) {
      console.error('[AcopioSvc][confirmarCantidadesCompra ERR]', error);
      throw error;
    }
  },
  

  /**
   * Obtiene la lista de acopios de una empresa
   * @param {string} empresaId - ID de la empresa
   * @returns {Promise<Array>}
   */
  listarAcopios: async (empresaId) => {
    try {
      const response = await api.get(`acopio/listar/${empresaId}`);
      if (response.status === 200) {
        console.log('Acopios obtenidos con éxito');
        return response.data;
      } else {
        console.error('Error al obtener acopios');
        return [];
      }
    } catch (err) {
      console.error('Error al obtener acopios:', err);
      return [];
    }
  },

  /**
 * Obtiene los materiales disponibles (acopiados) de un acopio
 * @param {string} acopioId - ID del acopio
 * @returns {Promise<Array>} - Lista de materiales con { codigo, descripcion, valorUnitario }
 */
getMaterialesAcopiados: async (acopioId) => {
  try {
    const response = await api.get(`/acopio/${acopioId}/materiales`);
    if (response.status === 200) {
      return response.data.materiales;
    } else {
      console.error('Error al obtener materiales acopiados');
      return [];
    }
  } catch (error) {
    console.error('Error al obtener materiales acopiados:', error);
    return [];
  }
},


  /**
   * Obtiene los detalles de un acopio específico
   * @param {string} acopioId - ID del acopio
   * @returns {Promise<Object | null>}
   */
  obtenerAcopio: async (acopioId) => {
    try {
      const response = await api.get(`acopio/${acopioId}`);
      if (response.status === 200) {
        console.log('Acopio obtenido con éxito');
        return response.data;
      } else {
        console.error('Error al obtener el acopio');
        return null;
      }
    } catch (err) {
      console.error('Error al obtener el acopio:', err);
      return null;
    }
  },

  /**
   * Agrega un nuevo movimiento a un acopio
   * @param {string} acopioId - ID del acopio
   * @param {Object} movimiento - Datos del movimiento (codigo, descripcion, cantidad, valor_unitario, tipo)
   * @returns {Promise<boolean>}
   */
  agregarMovimiento: async (acopioId, movimiento) => {
    try {
      const response = await api.post(`acopio/${acopioId}/movimiento`, movimiento);
      if (response.status === 201) {
        console.log('Movimiento agregado con éxito');
        return true;
      } else {
        console.error('Error al agregar movimiento');
        return false;
      }
    } catch (err) {
      console.error('Error al agregar movimiento:', err);
      return false;
    }
  },

  /**
   * Modifica un movimiento existente en un acopio
   * @param {string} acopioId - ID del acopio
   * @param {string} movimientoId - ID del movimiento
   * @param {Object} datosActualizados - Campos a actualizar en el movimiento
   * @returns {Promise<boolean>}
   */
  modificarMovimiento: async (acopioId, movimientoId, datosActualizados) => {
    try {
      const response = await api.put(`acopio/${acopioId}/movimiento/${movimientoId}`, datosActualizados);
      if (response.status === 200) {
        console.log('Movimiento actualizado con éxito');
        return true;
      } else {
        console.error('Error al modificar movimiento');
        return false;
      }
    } catch (err) {
      console.error('Error al modificar movimiento:', err);
      return false;
    }
  },

  /**
   * Elimina un movimiento de un acopio
   * @param {string} acopioId - ID del acopio
   * @param {string} movimientoId - ID del movimiento
   * @returns {Promise<boolean>}
   */
  eliminarMovimiento: async (acopioId, movimientoId) => {
    try {
      const response = await api.delete(`acopio/${acopioId}/movimiento/${movimientoId}`);
      if (response.status === 200) {
        console.log('Movimiento eliminado con éxito');
        return true;
      } else {
        console.error('Error al eliminar movimiento');
        return false;
      }
    } catch (err) {
      console.error('Error al eliminar movimiento:', err);
      return false;
    }
  },

  /**
       * Obtiene los movimientos de un acopio específico.
       * @param {string} acopioId - ID del acopio.
       * @returns {Promise<Array>} - Lista de movimientos.
       */
      obtenerMovimientos: async (acopioId) => {
        try {
          const response = await api.get(`/acopio/${acopioId}/movimientos`);
          return response.data;
        } catch (error) {
          console.error('Error al obtener movimientos del acopio:', error);
          return [];
        }
      },

        /**
   * Obtiene los remitos de un acopio específico
   * @param {string} acopioId - ID del acopio
   * @returns {Promise<Array>} - Lista de remitos
   */
  obtenerRemitos: async (acopioId) => {
    try {
      const response = await api.get(`/acopio/${acopioId}/remitos`);
      if (response.status === 200) {
        return response.data.remitos;
      } else {
        console.error('Error al obtener remitos del acopio');
        return [];
      }
    } catch (error) {
      console.error('Error al obtener remitos del acopio:', error);
      return [];
    }
  },

    /**
   * Obtiene las compras de un acopio específico
   * @param {string} acopioId - ID del acopio
   * @returns {Promise<Array>} - Lista de compras
   */
    obtenerCompras: async (acopioId) => {
      try {
        const response = await api.get(`/acopio/${acopioId}/compras`);
        if (response.status === 200) {
          return response.data;
        } else {
          console.error('Error al obtener compras del acopio');
          return [];
        }
      } catch (error) {
        console.error('Error al obtener compras del acopio:', error);
        return [];
      }
    },

    obtenerMovimientosDeRemito: async (acopioId, remitoId) => {
      try {
        const response = await api.get(`/acopio/${acopioId}/remito/${remitoId}/movimientos`);
        if (response.status === 200) {
          return response.data.movimientos;
        } else {
          console.error('Error al obtener movimientos del remito');
          return [];
        }
      } catch (error) {
        console.error('Error al obtener movimientos del remito:', error);
        return [];
      }
    },

    /**
 * Obtiene un remito específico por su ID
 * @param {string} acopioId - ID del acopio
 * @param {string} remitoId - ID del remito
 * @returns {Promise<Object>} - Datos del remito
 */
obtenerRemito: async (acopioId, remitoId) => {
  try {
    const response = await api.get(`/acopio/${acopioId}/remito/${remitoId}`);
    if (response.status === 200) {
      return response.data;
    } else {
      console.error('Error al obtener el remito');
      return null;
    }
  } catch (error) {
    console.error('Error al obtener el remito:', error);
    return null;
  }
},

editarRemito: async (acopioId, remitoId, movimientos, remitoData, archivoFile = null) => {
  try {
    remitoData.movimientos = movimientos;
    // 1. Actualizar datos del remito (fecha, valorOperacion, etc.)
    const response = await api.put(`/acopio/${acopioId}/remito/${remitoId}`, remitoData);

    if (response.status !== 200) {
      console.error('❌ Error al actualizar remito');
      return false;
    }

    // 2. Si hay archivo nuevo, lo subimos
    if (archivoFile) {
      const formData = new FormData();
      formData.append('archivo', archivoFile);

      const subirArchivo = await api.post(
        `/acopio/${acopioId}/remito/${remitoId}/archivo`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (subirArchivo.status !== 200) {
        console.error('❌ Error al subir nuevo archivo del remito');
        return false;
      }
    }

    console.log('✅ Remito editado con éxito');
    return true;
  } catch (error) {
    console.error('❌ Error en editarRemito:', error);
    return false;
  }
},
  
  /**
   * Elimina un remito de un acopio
   * @param {string} acopioId - ID del acopio
   * @param {string} remitoId - ID del remito
   * @returns {Promise<boolean>}
   */
  eliminarRemito: async (acopioId, remitoId) => {
    try {
      const response = await api.delete(`/acopio/${acopioId}/remito/${remitoId}`);
      if (response.status === 200) {
        console.log('✅ Remito eliminado correctamente');
        return true;
      } else {
        console.error('❌ Error al eliminar remito');
        return false;
      }
    } catch (error) {
      console.error('❌ Error al eliminar remito:', error);
      return false;
    }
  },

  /**
   * Elimina un acopio completo (incluye remitos, compras y movimientos)
   * @param {string} acopioId - ID del acopio
   * @returns {Promise<boolean>}
   */
  eliminarAcopio: async (acopioId) => {
    try {
      const response = await api.delete(`/acopio/${acopioId}`);
      if (response.status === 200) {
        console.log('✅ Acopio eliminado correctamente');
        return true;
      } else {
        console.error('❌ Error al eliminar acopio');
        return false;
      }
    } catch (error) {
      console.error('❌ Error al eliminar acopio:', error);
      return false;
    }
  },

  /**
 * Cambia un remito de un acopio a otro (sin movimientos, solo copia el archivo y crea nuevo remito)
 * @param {string} remitoId - ID del remito a mover
 * @param {string} acopioOrigenId - ID del acopio actual
 * @param {string} acopioDestinoId - ID del nuevo acopio
 * @returns {Promise<string>} - nuevo remitoId
 */
cambiarRemitoDeAcopio: async (remitoId, acopioOrigenId, acopioDestinoId) => {
  try {
    const response = await api.post(`/acopio/remito/${remitoId}/cambiar-acopio`, {
      acopioOrigenId,
      acopioDestinoId,
    });

    if (response.status === 200) {
      console.log('✅ Remito movido de acopio con éxito');
      return response.data.nuevoRemitoId;
    } else {
      console.error('❌ Error al cambiar remito de acopio');
      throw new Error('No se pudo cambiar el remito de acopio.');
    }
  } catch (error) {
    console.error('❌ Error en cambiarRemitoDeAcopio:', error);
    throw error;
  }
},

moverRemitoAotroAcopio: async (remitoId, origenAcopioId, destinoAcopioId) => {
  try {
    const response = await api.post(`/acopio/${origenAcopioId}/remito/${remitoId}/mover`, {
      acopioDestinoId: destinoAcopioId
    });

    if (response.status === 200) {
      console.log('✅ Remito movido correctamente');
      return true;
    } else {
      console.error('❌ Error al mover remito');
      return false;
    }
  } catch (error) {
    console.error('❌ Error al mover remito:', error);
    return false;
  }
},

/**
 * Edita los datos básicos de un acopio (NO toca productos)
 * @param {string} acopioId - ID del acopio a editar
 * @param {Object} datos - { proveedor, proyecto_id, codigo, descripcion }
 * @returns {Promise<boolean>}
 */
editarAcopio: async (acopioId, { proveedor, proyecto_id, codigo, descripcion }) => {
  try {
    const response = await api.put(`/acopio/${acopioId}`, { proveedor, proyecto_id, codigo, descripcion });
    if (response.status === 200) {
      console.log('✅ Acopio actualizado con éxito');
      return true;
    } else {
      console.error('❌ Error al actualizar acopio');
      return false;
    }
  } catch (error) {
    console.error('❌ Error en editarAcopio:', error);
    return false;
  }
},

/**
 * Edita un producto específico del acopio
 * @param {string} acopioId - ID del acopio
 * @param {string} productoId - ID del producto a editar
 * @param {Object} datos - { codigo, descripcion, cantidad, valorUnitario }
 * @returns {Promise<boolean>}
 */
editarProductoAcopio: async (acopioId, productoId, datos) => {
  try {
    const response = await api.put(`/acopio/${acopioId}/producto/${productoId}`, datos);
    if (response.status === 200) {
      console.log('✅ Producto actualizado con éxito');
      return true;
    } else {
      console.error('❌ Error al actualizar producto');
      return false;
    }
  } catch (error) {
    console.error('❌ Error en editarProductoAcopio:', error);
    return false;
  }
},

/**
 * Agrega un nuevo producto al acopio
 * @param {string} acopioId - ID del acopio
 * @param {Object} producto - { codigo, descripcion, cantidad, valorUnitario }
 * @returns {Promise<{success: boolean, productoId?: string}>}
 */
agregarProductoAcopio: async (acopioId, producto) => {
  try {
    const response = await api.post(`/acopio/${acopioId}/producto`, producto);
    if (response.status === 201) {
      console.log('✅ Producto agregado con éxito');
      return { success: true, productoId: response.data.productoId };
    } else {
      console.error('❌ Error al agregar producto');
      return { success: false };
    }
  } catch (error) {
    console.error('❌ Error en agregarProductoAcopio:', error);
    return { success: false };
  }
},

/**
 * Elimina un producto del acopio
 * @param {string} acopioId - ID del acopio
 * @param {string} productoId - ID del producto a eliminar
 * @returns {Promise<boolean>}
 */
eliminarProductoAcopio: async (acopioId, productoId) => {
  try {
    const response = await api.delete(`/acopio/${acopioId}/producto/${productoId}`);
    if (response.status === 200) {
      console.log('✅ Producto eliminado con éxito');
      return true;
    } else {
      console.error('❌ Error al eliminar producto');
      return false;
    }
  } catch (error) {
    console.error('❌ Error en eliminarProductoAcopio:', error);
    return false;
  }
},

/**
 * Sincroniza todos los productos del acopio en una sola llamada.
 * El backend determina qué crear, actualizar o eliminar.
 * @param {string} acopioId - ID del acopio
 * @param {Array} productos - Array de productos con { id, codigo, descripcion, cantidad, valorUnitario }
 * @returns {Promise<{success: boolean, creados?: number, actualizados?: number, eliminados?: number, errores?: string[]}>}
 */
sincronizarProductosAcopio: async (acopioId, productos) => {
  try {
    const response = await api.put(`/acopio/${acopioId}/productos`, { productos });
    if (response.status === 200) {
      console.log('✅ Productos sincronizados:', response.data.message);
      return { 
        success: true, 
        creados: response.data.creados,
        actualizados: response.data.actualizados,
        eliminados: response.data.eliminados,
        errores: response.data.errores || []
      };
    } else {
      console.error('❌ Error al sincronizar productos');
      return { success: false, errores: ['Error desconocido'] };
    }
  } catch (error) {
    console.error('❌ Error en sincronizarProductosAcopio:', error);
    return { success: false, errores: [error.message] };
  }
},

/**
 * Actualiza campos específicos de un acopio (tipo, valorTotal, etc.)
 * @param {string} acopioId - ID del acopio
 * @param {Object} updates - Campos a actualizar
 * @returns {Promise<boolean>}
 */
actualizarCamposAcopio: async (acopioId, updates) => {
  try {
    const response = await api.patch(`/acopio/${acopioId}`, updates);
    if (response.status === 200) {
      console.log('✅ Campos del acopio actualizados con éxito');
      return true;
    } else {
      console.error('❌ Error al actualizar campos del acopio');
      return false;
    }
  } catch (error) {
    console.error('❌ Error en actualizarCamposAcopio:', error);
    return false;
  }
},

  /**
   * Sube 1..N hojas (imágenes o PDF) al acopio. Se usa para “lista de precios” o comprobantes.
   * POST /acopio/:acopioId/hojas  (multipart)
   */
  subirHojasAcopio: async (acopioId, files) => {
    try {
      if (!acopioId) throw new Error('Falta acopioId');
      const formData = new FormData();
      // admite múltiples archivos
      [...files].forEach((f) => formData.append('archivos', f));
      const resp = await api.post(`/acopio/${acopioId}/hojas`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (resp.status === 200) return resp.data;
      throw new Error('No se pudieron subir las hojas del acopio');
    } catch (err) {
      console.error('❌ subirHojasAcopio', err);
      throw err;
    }
  },

  /**
   * Elimina una página/hoja por índice del array url_image
   * DELETE /acopio/:acopioId/hojas/:index
   */
  eliminarHojaAcopio: async (acopioId, index) => {
    try {
      const resp = await api.delete(`/acopio/${acopioId}/hojas/${index}`);
      if (resp.status === 200) return true;
      return false;
    } catch (err) {
      console.error('❌ eliminarHojaAcopio', err);
      return false;
    }
  },


  recalibrarImagenes: async (acopioId) => {
    try {
      const response = await api.post(`/acopio/${acopioId}/recalibrarImagen`, {});
      if (response.status === 201) {
        console.log('✅ Imagen recalibrada con éxito');
        return response.data;
      } else {
        console.error('❌ Error al recalibrar imágenes');
        throw new Error('Error al recalibrar imágenes.');
      }
    } catch (error) {
      console.error('❌ Error en crearAcopioDesdeDatos:', error);
      throw error;
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DOCUMENTOS COMPLEMENTARIOS
  // Documentos adicionales como vencimientos, direcciones, datos relevantes, etc.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Sube documentos complementarios al acopio (imágenes o PDFs)
   * POST /acopio/:acopioId/documentos-complementarios (multipart)
   * @param {string} acopioId - ID del acopio
   * @param {FileList|File[]} files - Archivos a subir
   * @param {string} descripcion - Descripción opcional de los documentos
   * @returns {Promise<{ok: boolean, documentos: Array}>}
   */
  subirDocumentosComplementarios: async (acopioId, files, descripcion = '') => {
    try {
      if (!acopioId) throw new Error('Falta acopioId');
      const formData = new FormData();
      [...files].forEach((f) => formData.append('archivos', f));
      if (descripcion) formData.append('descripcion', descripcion);
      
      const resp = await api.post(`/acopio/${acopioId}/documentos-complementarios`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (resp.status === 200) return resp.data;
      throw new Error('No se pudieron subir los documentos complementarios');
    } catch (err) {
      console.error('❌ subirDocumentosComplementarios', err);
      throw err;
    }
  },

  /**
   * Obtiene los documentos complementarios de un acopio
   * GET /acopio/:acopioId/documentos-complementarios
   * @param {string} acopioId - ID del acopio
   * @returns {Promise<{ok: boolean, documentos: Array}>}
   */
  obtenerDocumentosComplementarios: async (acopioId) => {
    try {
      if (!acopioId) throw new Error('Falta acopioId');
      const resp = await api.get(`/acopio/${acopioId}/documentos-complementarios`);
      if (resp.status === 200) return resp.data;
      throw new Error('No se pudieron obtener los documentos complementarios');
    } catch (err) {
      console.error('❌ obtenerDocumentosComplementarios', err);
      throw err;
    }
  },

  /**
   * Elimina un documento complementario por índice
   * DELETE /acopio/:acopioId/documentos-complementarios/:index
   * @param {string} acopioId - ID del acopio
   * @param {number} index - Índice del documento a eliminar
   * @returns {Promise<boolean>}
   */
  eliminarDocumentoComplementario: async (acopioId, index) => {
    try {
      const resp = await api.delete(`/acopio/${acopioId}/documentos-complementarios/${index}`);
      if (resp.status === 200) return true;
      return false;
    } catch (err) {
      console.error('❌ eliminarDocumentoComplementario', err);
      return false;
    }
  },

  /**
   * Actualiza la descripción de un documento complementario
   * PATCH /acopio/:acopioId/documentos-complementarios/:index
   * @param {string} acopioId - ID del acopio
   * @param {number} index - Índice del documento
   * @param {string} descripcion - Nueva descripción
   * @returns {Promise<boolean>}
   */
  actualizarDescripcionDocumentoComplementario: async (acopioId, index, descripcion) => {
    try {
      const resp = await api.patch(`/acopio/${acopioId}/documentos-complementarios/${index}`, { descripcion });
      if (resp.status === 200) return true;
      return false;
    } catch (err) {
      console.error('❌ actualizarDescripcionDocumentoComplementario', err);
      return false;
    }
  },

  // ==========================================
  // SISTEMA DE EVENTOS / HISTORIAL
  // Los eventos se crean automáticamente en el backend
  // El frontend solo los lee del campo 'eventos' del acopio
  // ==========================================

  /**
   * Agrega un comentario al historial del acopio
   * POST /acopio/:acopioId/comentario
   * @param {string} acopioId - ID del acopio
   * @param {string} texto - Texto del comentario
   * @param {string} usuario - Nombre del usuario (opcional)
   * @returns {Promise<boolean>}
   */
  agregarComentario: async (acopioId, texto, usuario = null) => {
    try {
      const resp = await api.post(`/acopio/${acopioId}/comentario`, { 
        texto, 
        usuario: usuario || 'Usuario' 
      });
      if (resp.status === 200) {
        console.log('✅ Comentario agregado');
        return true;
      }
      return false;
    } catch (err) {
      console.error('❌ agregarComentario:', err);
      return false;
    }
  },

};

export default AcopioService;
