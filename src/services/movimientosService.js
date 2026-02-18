import { doc, getDoc } from 'firebase/firestore';
import { db, storage } from 'src/config/firebase';
import api from './axiosConfig';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

const movimientosService = {
  // Método para obtener un movimiento por su ID
  getMovimientoById: async (movimientoId) => {
    try {
      const response = await api.get(`movimiento/${movimientoId}`);

      if (response.status === 200) {
        const payload = response.data?.data ?? response.data;
        if (!payload) {
          console.error('Respuesta de API sin datos de movimiento');
          return null;
        }
        return payload; // { id, ...campos }
      } else {
        console.error('Error al obtener el movimiento (status)', response.status);
        return null;
      }
    } catch (err) {
      console.error('Error al obtener el movimiento desde API:', err);
      return null;
    }
  },
  
  updateMovimiento: async (movimientoId, nuevosDatos, nombreUsuario) => {
    try {
      console.log(nuevosDatos)
      const payload = {
        ...nuevosDatos,
        nombreUsuario,
      };
      const response = await api.put(`movimiento/${movimientoId}`, payload);
      if (response.status === 201) {
          console.log('Movimiento editado con éxito');
          return {error: false, data: response.data};
      } else {
          console.error('Error al editar el movimiento');
          return {error: true};
      }
    } catch (err) {
        console.error('Error al editar el movimiento:', err);
        return {error: true};
    }
  },

  /**
   * Edición masiva: envía el pedido y devuelve un jobId para polling
   * @param {string[]} ids - IDs de los movimientos a editar
   * @param {Object} campos - Campos y valores a aplicar
   * @returns {Promise<{ ok: boolean, jobId?: string, total?: number, error?: string }>}
   */
  bulkUpdate: async (ids, campos) => {
    try {
      const response = await api.put('movimientos/bulk-update', { ids, campos });
      return { ok: true, jobId: response.data.jobId, total: response.data.total };
    } catch (err) {
      console.error('Error en edición masiva:', err);
      return { ok: false, error: err.message };
    }
  },

  /**
   * Consultar estado de un job
   * @param {string} jobId
   * @returns {Promise<Object|null>} - { id, status, total, completed, errors, result }
   */
  getJobStatus: async (jobId) => {
    try {
      const response = await api.get(`jobs/${jobId}`);
      return response.data;
    } catch (err) {
      console.error('Error consultando job:', err);
      return null;
    }
  },

  deleteMovimientoById: async (movimientoId) => {
    try {
      const response = await api.delete(`movimiento/${movimientoId}`);
      if (response.status === 201) {
          console.log('Movimiento borrado con éxito');
          return true;
      } else {
          console.error('Error al borrar el movimiento');
          return false;
      }
    } catch (err) {
        console.error('Error al borrar el movimiento:', err);
        return false;
    }
  },
  comprarDolares: async (data) => {
    try {
      const response = await api.post('intercambio-monedas/comprar-dolares', data);
      if (response.status === 201) {
        return response.data;
      } else {
        return { error: 'Error en la respuesta del servidor' };
      }
    } catch (err) {
      console.error('Error al comprar dólares:', err);
      return { error: err.response?.data?.error || err.message };
    }
  },

  venderDolares: async (data) => {
    try {
      const response = await api.post('intercambio-monedas/vender-dolares', data);
      if (response.status === 201) {
        return response.data;
      } else {
        return { error: 'Error en la respuesta del servidor' };
      }
    } catch (err) {
      console.error('Error al vender dólares:', err);
      return { error: err.response?.data?.error || err.message };
    }
  },
  addMovimiento: async (datosMovimiento) => {
    try {
        const nuevoMovimiento = {
              ...datosMovimiento
            };
        const response = await api.post(`movimiento/`, nuevoMovimiento);

        if (response.status === 201) {
            console.log('Movimiento agregado con éxito');
            return {error: false, data: response.data};
        } else {
            console.error('Error al agregar el movimiento');
            return {error: true};
        }
    } catch (err) {
        console.error('Error al agregar el movimiento:', err);
        return {error: true};
    }
  },

  // Nuevo método para reemplazar la imagen de un movimiento
  reemplazarImagen: async (movimientoId, archivo) => {
    try {
      const formData = new FormData();
      formData.append('nuevoArchivo', archivo);  // El archivo seleccionado por el usuario
      console.log(archivo)
      const response = await api.put(`/reemplazar-imagen/${movimientoId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 200) {
        console.log('Imagen reemplazada con éxito');
        return response.data;
      } else {
        console.error('Error al reemplazar la imagen');
        return null;
      }
    } catch (err) {
      console.error('Error al reemplazar la imagen:', err);
      throw new Error('Error al reemplazar la imagen');
    }
  },

  extraerDatosDesdeImagen: async (archivoUrl, archivoFile, datosContexto) => {
    try {
      const formData = new FormData();
      if (archivoFile) {
        formData.append('archivo', archivoFile);
      } else if (archivoUrl) {
        formData.append('archivo_url', archivoUrl);
      }
  
      formData.append('proveedores', JSON.stringify(datosContexto.proveedores));
      formData.append('categorias', JSON.stringify(datosContexto.categorias));
      formData.append('medios_pago', JSON.stringify(datosContexto.medios_pago));
      formData.append('medio_pago_default', datosContexto.medio_pago_default);
      formData.append('proyecto_id', datosContexto.proyecto_id);
      formData.append('proyecto_nombre', datosContexto.proyecto_nombre);
      
      const response = await api.post(`/movimiento/extraer`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
  
      if (response.status === 200) {
        return response.data;
      } else {
        throw new Error('Error al extraer datos');
      }
    } catch (err) {
      console.error('Error al extraer datos desde imagen:', err);
      throw err;
    }
  },

  subirImagenTemporal: async (archivo) => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const userId = user?.id || 'generico';
  
      const filename = `movimientos_temp/${userId}/${archivo.name}`;
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, archivo);
      const url = await getDownloadURL(storageRef);
  
      return { url_imagen: url };
    } catch (err) {
      console.error('Error al subir imagen temporal a Firebase Storage:', err);
      throw err;
    }
  },
  recalcularEquivalenciasPorProyecto: async (proyectoId) => {
    try {
      const response = await api.post(`/proyecto/${proyectoId}/recalcular-equivalencias`);
      if (response.status === 200) {
        console.log('✅ Equivalencias recalculadas');
        return { error: false };
      } else {
        console.error('❌ Error al recalcular equivalencias');
        return { error: true };
      }
    } catch (err) {
      console.error('❌ Error al recalcular equivalencias:', err);
      return { error: true };
    }
  },

  // Crear movimientos prorateados
  crearMovimientoProrrateo: async (datosBase, distribuciones) => {
    try {
      console.log('📊 Enviando datos de prorrateo:', { datosBase, distribuciones });
      
      const response = await api.post('/movimiento/prorrateo', {
        datosBase,
        distribuciones
      });

      if (response.status === 201) {
        console.log('✅ Movimientos prorrateo creados con éxito');
        return { error: false, data: response.data };
      } else {
        console.error('❌ Error al crear movimientos prorrateo');
        return { error: true, message: 'Error en la respuesta del servidor' };
      }
    } catch (err) {
      console.error('❌ Error al crear movimientos prorrateo:', err);
      return { 
        error: true, 
        message: err.response?.data?.error || 'Error de conexión',
        details: err.response?.data
      };
    }
  },

  // Obtener movimientos por grupo de prorrateo
  getMovimientosByGrupoProrrateo: async (grupoId) => {
    try {
      const response = await api.get(`/movimientos/prorrateo/${grupoId}`);
      
      if (response.status === 200) {
        return response.data?.data || response.data || [];
      } else {
        console.error('Error al obtener movimientos de prorrateo');
        return [];
      }
    } catch (err) {
      console.error('Error al obtener movimientos de prorrateo:', err);
      return [];
    }
  },

  // Método para crear transferencia interna entre proyectos
  createTransferenciaInterna: async (transferencia) => {
    try {
      const response = await api.post('transferencia-interna/', transferencia);
      
      if (response.status === 201) {
        console.log('Transferencia interna creada con éxito');
        return { error: false, data: response.data };
      } else {
        console.error('Error al crear la transferencia interna');
        return { error: true, message: 'Error al crear la transferencia' };
      }
    } catch (err) {
      console.error('Error al crear transferencia interna:', err);
      return { 
        error: true, 
        message: err.response?.data?.error || 'Error al procesar la transferencia'
      };
    }
  },

  createEgresoConCajaPagadora: async (datosEgreso, proyectoPagadorId, proyectoPagadorNombre) => {
    try {
      const payload = {
        datosEgreso,
        proyectoPagadorId,
        proyectoPagadorNombre
      };

      const response = await api.post('egreso-con-caja-pagadora/', payload);
      
      if (response.status === 201) {
        console.log('Egreso con caja pagadora creado con éxito');
        return { error: false, data: response.data };
      } else {
        console.error('Error al crear el egreso con caja pagadora');
        return { error: true, message: 'Error al crear el egreso' };
      }
    } catch (err) {
      console.error('Error al crear egreso con caja pagadora:', err);
      return { 
        error: true, 
        message: err.response?.data?.error || 'Error al procesar el egreso'
      };
    }
  },
  
  
};


export default movimientosService;
