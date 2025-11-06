import api from './axiosConfig';

const AcopioService = {
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
        return response.data.materiales;
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
    
  
  extraerCompraInit: async (archivo, archivo_url) => {
    try {
      const formData = new FormData();
      if (archivo) formData.append('archivo', archivo);
      if (archivo_url) formData.append('archivo_url', archivo_url);
  
      const response = await api.post(`/acopio/compra/extraer/init`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
  
      return response.data.taskId;
    } catch (error) {
      console.error('❌ Error al iniciar extracción asincrónica:', error);
      throw error;
    }
  },
  
  consultarEstadoExtraccion: async (taskId) => {
    try {
      const response = await api.get(`/acopio/compra/extraer/status/${taskId}`);
      console.log(response.data)
      return response.data;
    } catch (error) {
      console.error('❌ Error al consultar estado de extracción:', error);
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
 * Edita los datos de un acopio existente
 * @param {string} acopioId - ID del acopio a editar
 * @param {Object} acopioData - Nuevos datos del acopio
 * @returns {Promise<boolean>}
 */
editarAcopio: async (acopioId, acopioData) => {
  try {
    const response = await api.put(`/acopio/${acopioId}`, acopioData);
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

};

export default AcopioService;
