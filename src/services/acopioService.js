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
  
  

  extraerDatosDesdeArchivo: async (acopioId, archivo, archivo_url) => {
    try {
      const formData = new FormData();
      formData.append('archivo', archivo);
      formData.append('archivo_url', archivo_url);
  
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





};

export default AcopioService;
