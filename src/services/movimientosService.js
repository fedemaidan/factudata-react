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

  addComentario: async (movimientoId, comment) => {
    try {
      const response = await api.post(`movimiento/${movimientoId}/comentarios`, { comment });
      if (response.status === 201) {
        return response.data?.comentario ?? response.data;
      }
      return null;
    } catch (err) {
      console.error('Error al agregar comentario:', err);
      throw err;
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
      formData.append('nuevoArchivo', archivo);
      const response = await api.put(`/reemplazar-imagen/${movimientoId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 200) {
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

      if (datosContexto?.proyecto_id) formData.append('proyecto_id', datosContexto.proyecto_id);
      if (datosContexto?.proyecto_nombre) formData.append('proyecto_nombre', datosContexto.proyecto_nombre);
      
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

  // Panel de validación: listar borradores
  getBorradores: async (empresaId, filters = {}) => {
    try {
      const params = new URLSearchParams({ empresa_id: empresaId });
      if (filters.fechaDesde) params.append('fechaDesde', filters.fechaDesde);
      if (filters.fechaHasta) params.append('fechaHasta', filters.fechaHasta);
      if (filters.proveedor) params.append('proveedor', filters.proveedor);
      if (filters.nombre_user) params.append('nombre_user', filters.nombre_user);
      if (filters.texto) params.append('texto', filters.texto);
      if (filters.sin_proyecto) params.append('sin_proyecto', 'true');
      if (filters.estado_procesamiento) params.append('estado_procesamiento', filters.estado_procesamiento);
      if (filters.estado_borrador) params.append('estado_borrador', filters.estado_borrador);
      if (filters.rechazados) params.append('rechazados', filters.rechazados);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.offset) params.append('offset', filters.offset);
      const response = await api.get(`panel-validacion/borradores?${params.toString()}`);
      return response.data;
    } catch (err) {
      console.error('Error listando borradores:', err);
      const msg = err?.response?.data?.error || err?.message || 'Error al cargar borradores';
      throw new Error(msg);
    }
  },

  // Panel de validación: editar borrador
  updateBorrador: async (movimientoId, campos) => {
    try {
      const response = await api.put(`panel-validacion/borrador/${movimientoId}`, campos);
      return { error: false, data: response.data };
    } catch (err) {
      console.error('Error editando borrador:', err);
      return { error: true, message: err.response?.data?.error || err.message };
    }
  },

  // Panel de validación: confirmar borradores (individual o masivo)
  confirmarBorradores: async (ids) => {
    try {
      const response = await api.post('panel-validacion/confirmar', { ids });
      return { error: false, data: response.data };
    } catch (err) {
      console.error('Error confirmando borradores:', err);
      return { error: true, message: err.response?.data?.error || err.message };
    }
  },

  // Panel de validación: rechazar borradores (no contabiliza; desaparecen del listado)
  rechazarBorradores: async (ids) => {
    try {
      const response = await api.post('panel-validacion/rechazar', { ids });
      return { error: false, data: response.data };
    } catch (err) {
      console.error('Error rechazando borradores:', err);
      return { error: true, message: err.response?.data?.error || err.message };
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

  /**
   * Genera preguntas dinámicas con GPT (muestra de archivos + metadata del lote).
   * @param {File[]} archivosMuestra - hasta 5 archivos
   * @param {object} metadata_lote - { total, archivos: [{ name, type, size }] }
   */
  sugerirPreguntasCargaMasiva: async (archivosMuestra, metadata_lote = {}) => {
    try {
      const formData = new FormData();
      (archivosMuestra || []).forEach((f) => {
        formData.append('muestra', f);
      });
      formData.append('metadata_lote', JSON.stringify(metadata_lote || {}));
      const response = await api.post('/movimiento/carga-masiva/sugerir-preguntas', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (response.status === 200) {
        return { error: false, data: response.data };
      }
      return { error: true, message: 'Error al generar preguntas' };
    } catch (err) {
      console.error('sugerirPreguntasCargaMasiva:', err);
      return {
        error: true,
        message: err.response?.data?.error || err.response?.data?.details || err.message,
      };
    }
  },

  /**
   * Analiza un lote de archivos (imágenes/PDF) sin crear borradores.
   * Flujo ASÍNCRONO: el backend devuelve 202 con { jobId, total } y procesa
   * en background. Aquí pooleamos GET /jobs/:id hasta status === 'done' o 'error'.
   *
   * @param {File[]} archivos
   * @param {object} contexto_lote
   * @param {object} [opts]
   * @param {(p:{completed:number,total:number}) => void} [opts.onProgress]
   * @param {AbortSignal} [opts.signal]
   */
  analizarCargaMasiva: async (archivos, contexto_lote = {}, opts = {}) => {
    const { onProgress, signal } = opts;
    try {
      // Pre-flight: Cloudflare (Free/Pro) rechaza body > 100MB con 413.
      // Dejamos margen para overhead de multipart + JSON del contexto.
      const MAX_BATCH_BYTES = 95 * 1024 * 1024;
      const MAX_BATCH_MB = 100;
      const totalBytes = (archivos || []).reduce((acc, f) => acc + (f?.size || 0), 0);
      if (totalBytes > MAX_BATCH_BYTES) {
        const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);
        return {
          error: true,
          message: `El lote pesa ${totalMb}MB y supera el límite de ${MAX_BATCH_MB}MB por subida. Dividilo en lotes más chicos: el proxy (Cloudflare) rechaza requests más grandes con error 413.`,
        };
      }
      const formData = new FormData();
      (archivos || []).forEach((f) => {
        formData.append('archivos', f);
      });
      formData.append('contexto_lote', JSON.stringify(contexto_lote || {}));
      const startRes = await api.post('/movimiento/carga-masiva/analizar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal,
      });
      if (startRes.status !== 202 && startRes.status !== 200) {
        return { error: true, message: 'Error al iniciar análisis del lote' };
      }
      // Compat: si el backend antiguo devolvió 200 con { items }, ya está.
      if (startRes.status === 200 && startRes.data?.items) {
        return { error: false, data: startRes.data };
      }
      const { jobId, total } = startRes.data || {};
      if (!jobId) {
        return { error: true, message: 'El backend no devolvió jobId' };
      }
      if (typeof onProgress === 'function') {
        onProgress({ completed: 0, total: total || archivos.length });
      }

      // Polling: intervalos suaves, sin timeout (axiosConfig ya tiene timeout alto).
      const POLL_MS = 2500;
      const MAX_WAIT_MS = 60 * 60 * 1000; // 60 min — coincide con TTL del job en backend
      const start = Date.now();
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (signal?.aborted) {
          return { error: true, message: 'Cancelado' };
        }
        if (Date.now() - start > MAX_WAIT_MS) {
          return { error: true, message: 'El análisis tardó demasiado y se canceló el polling.' };
        }
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
        let jobRes;
        try {
          // eslint-disable-next-line no-await-in-loop
          jobRes = await api.get(`/jobs/${jobId}`, { signal });
        } catch (e) {
          if (e?.response?.status === 404) {
            return { error: true, message: 'El job expiró o no existe.' };
          }
          throw e;
        }
        const job = jobRes.data || {};
        if (typeof onProgress === 'function') {
          onProgress({ completed: job.completed || 0, total: job.total || total || archivos.length });
        }
        if (job.status === 'done') {
          return { error: false, data: { items: job.result?.items || [] } };
        }
        if (job.status === 'error') {
          return {
            error: true,
            message: job.errors?.[0]?.error || 'Error procesando el lote en background.',
          };
        }
      }
    } catch (err) {
      console.error('analizarCargaMasiva:', err);
      return {
        error: true,
        message: err.response?.data?.error || err.response?.data?.details || err.message,
      };
    }
  },

  /**
   * Crea movimientos reales a partir del payload validado en cliente.
   * @param {object[]} movimientos - incluir omitido: true para saltar ítems
   */
  confirmarCargaMasiva: async (movimientos) => {
    // El backend permite máx. 50 por request; chunkeamos del lado del cliente
    // para soportar lotes grandes (p.ej. PDFs con split-per-page que generan >50 items).
    const CHUNK_SIZE = 50;
    try {
      if (!Array.isArray(movimientos) || movimientos.length === 0) {
        return { error: true, message: 'No hay movimientos para confirmar' };
      }
      const chunks = [];
      for (let i = 0; i < movimientos.length; i += CHUNK_SIZE) {
        chunks.push(movimientos.slice(i, i + CHUNK_SIZE));
      }
      const okTotal = [];
      const erroresTotal = [];
      for (let c = 0; c < chunks.length; c += 1) {
        const offset = c * CHUNK_SIZE;
        // eslint-disable-next-line no-await-in-loop
        const response = await api.post('/movimiento/carga-masiva/confirmar', {
          movimientos: chunks[c],
        });
        if (response.status !== 200) {
          return { error: true, message: 'Error al confirmar el lote' };
        }
        const { ok = [], errores = [] } = response.data || {};
        // Reindexamos `index` al espacio global del lote para que el front pueda
        // mapearlos a sus batchItems.
        ok.forEach((o) => okTotal.push({ ...o, index: (o.index ?? 0) + offset }));
        errores.forEach((e) => erroresTotal.push({ ...e, index: (e.index ?? 0) + offset }));
      }
      return { error: false, data: { ok: okTotal, errores: erroresTotal } };
    } catch (err) {
      console.error('confirmarCargaMasiva:', err);
      return {
        error: true,
        message: err.response?.data?.error || err.response?.data?.details || err.message,
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

  getCajaProyectoDashboard: async (proyectoId, params = {}) => {
    try {
      const response = await api.get(`movimientos/proyecto/${proyectoId}/dashboard`, { params });
      const items = (response.data?.items || []).map((item) => {
        if (item?.tipo === 'grupo_prorrateo') {
          return {
            ...item,
            movimientos: (item.movimientos || []).map((mov) => ({ ...mov, id: mov._id || mov.id })),
          };
        }
        if (item?.data) {
          return {
            ...item,
            data: { ...item.data, id: item.data._id || item.data.id },
          };
        }
        return item;
      });

      return {
        success: !!response.data?.success,
        items,
        pagination: response.data?.pagination || null,
        totals: response.data?.totals || null,
        options: response.data?.options || null,
        appliedFilters: response.data?.appliedFilters || null,
      };
    } catch (err) {
      console.error('Error al obtener dashboard de caja proyecto:', err);
      throw err;
    }
  },

  getCajaProyectoTotales: async (proyectoId, params = {}) => {
    try {
      const response = await api.get(`movimientos/proyecto/${proyectoId}/totales`, { params });
      return {
        success: !!response.data?.success,
        totals: response.data?.totals || null,
        appliedFilters: response.data?.appliedFilters || null,
      };
    } catch (err) {
      console.error('Error al obtener totales de caja proyecto:', err);
      throw err;
    }
  },

  getCajasDashboard: async (params = {}) => {
    try {
      const response = await api.get('movimientos/dashboard', { params });
      const items = (response.data?.items || []).map((item) => {
        if (item?.tipo === 'grupo_prorrateo') {
          return {
            ...item,
            movimientos: (item.movimientos || []).map((mov) => ({ ...mov, id: mov._id || mov.id })),
          };
        }
        if (item?.data) {
          return {
            ...item,
            data: { ...item.data, id: item.data._id || item.data.id },
          };
        }
        return item;
      });

      return {
        success: !!response.data?.success,
        items,
        pagination: response.data?.pagination || null,
        totals: response.data?.totals || null,
        options: response.data?.options || null,
        appliedFilters: response.data?.appliedFilters || null,
        scope: response.data?.scope || null,
      };
    } catch (err) {
      console.error('Error al obtener dashboard de cajas:', err);
      throw err;
    }
  },

  getCajasOptions: async (params = {}) => {
    try {
      const response = await api.get('movimientos/options', { params });
      return {
        success: !!response.data?.success,
        options: response.data?.options || null,
        scope: response.data?.scope || null,
      };
    } catch (err) {
      console.error('Error al obtener options de cajas:', err);
      throw err;
    }
  },

  getCajasTotales: async (params = {}) => {
    try {
      const response = await api.get('movimientos/totales', { params });
      return {
        success: !!response.data?.success,
        totals: response.data?.totals || null,
        appliedFilters: response.data?.appliedFilters || null,
        scope: response.data?.scope || null,
      };
    } catch (err) {
      console.error('Error al obtener totales de cajas:', err);
      throw err;
    }
  },

  getResumenProveedores: async (params = {}) => {
    try {
      const response = await api.get('movimientos/resumen-proveedores', { params });
      return {
        success: !!response.data?.success,
        resumen: response.data?.resumen || [],
      };
    } catch (err) {
      console.error('Error al obtener resumen por proveedor:', err);
      throw err;
    }
  },
  
  
};


export default movimientosService;
