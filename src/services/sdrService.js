import api from './axiosConfig';

/**
 * Servicio para el módulo SDR - Gestión de Contactos
 */
const extensionByMimeType = {
    'audio/webm': '.webm',
    'audio/webm;codecs=opus': '.webm',
    'video/webm': '.webm',
    'audio/mp4': '.m4a',
    'audio/x-m4a': '.m4a',
    'audio/m4a': '.m4a',
    'audio/aac': '.aac',
    'audio/ogg': '.ogg',
    'audio/wav': '.wav',
    'audio/x-wav': '.wav',
    'audio/mpeg': '.mp3',
    'audio/mp3': '.mp3',
};

const getAudioFileName = (audioBlob) => {
    if (audioBlob?.name) return audioBlob.name;
    const extension = extensionByMimeType[audioBlob?.type] || '.webm';
    return `audio_${Date.now()}${extension}`;
};

const SDRService = {
    // ==================== CONTACTOS ====================

    /**
     * Crear un nuevo contacto
     */
    crearContacto: async (data) => {
        const res = await api.post('/sdr/contactos', data);
        return res.data;
    },

    /**
     * Listar contactos con filtros
     */
    listarContactos: async (params = {}) => {
        const res = await api.get('/sdr/contactos', { params });
        return res.data;
    },

    /**
     * Obtener contadores de bandejas (nuevos / reintentos / seguimiento)
     */
    contadorBandejas: async (params = {}) => {
        const res = await api.get('/sdr/contactos/bandejas', { params });
        return res.data;
    },

    /**
     * Obtener un contacto por ID (incluye historial y reuniones)
     */
    obtenerContacto: async (id) => {
        const res = await api.get(`/sdr/contactos/${id}`);
        return res.data;
    },

    /**
     * Actualizar un contacto
     */
    actualizarContacto: async (id, data) => {
        const res = await api.put(`/sdr/contactos/${id}`, data);
        return res.data;
    },

    /**
     * Asignar contactos a un SDR
     */
    asignarContactos: async (contactoIds, sdrId, sdrNombre, empresaId, proximoContacto = null) => {
        const res = await api.post('/sdr/contactos/asignar', { contactoIds, sdrId, sdrNombre, empresaId, proximoContacto });
        return res.data;
    },

    /**
     * Desasignar contactos
     */
    desasignarContactos: async (contactoIds, empresaId) => {
        const res = await api.post('/sdr/contactos/desasignar', { contactoIds, empresaId });
        return res.data;
    },

    /**
     * Eliminar contactos (masivo)
     */
    eliminarContactos: async (contactoIds) => {
        const res = await api.post('/sdr/contactos/eliminar', { contactoIds });
        return res.data;
    },

    /**
     * Eliminar TODOS los contactos de una empresa (reset completo)
     */
    eliminarTodosContactos: async (empresaId) => {
        const res = await api.post('/sdr/contactos/eliminar-todos', { 
            empresaId, 
            confirmacion: 'ELIMINAR_TODO' 
        });
        return res.data;
    },

    // ==================== ACCIONES RÁPIDAS ======================================

    /**
     * Registrar intento de contacto
     */
    registrarIntento: async (contactoId, data) => {
        const res = await api.post('/sdr/acciones/intento', { contactoId, ...data });
        return res.data;
    },

    /**
     * Recalcular contadores de contactos basándose en el historial real
     * @param {string[]} contactoIds - Array de IDs de contactos
     */
    recalcularContadores: async (contactoIds) => {
        const res = await api.post('/sdr/acciones/recalcular-contadores', { contactoIds });
        return res.data;
    },

    /**
     * Subir audio grabado y asociarlo a un contacto
     * @param {string} contactoId - ID del contacto
     * @param {Blob} audioBlob - Blob del audio grabado
     * @param {object} opts - { duracion, nota, empresaId }
     */
    subirAudio: async (contactoId, audioBlob, opts = {}) => {
        const formData = new FormData();
        const fileName = getAudioFileName(audioBlob);
        formData.append('audio', audioBlob, fileName);
        formData.append('contactoId', contactoId);
        if (opts.duracion) formData.append('duracion', String(opts.duracion));
        if (opts.nota) formData.append('nota', opts.nota);
        if (opts.empresaId) formData.append('empresaId', opts.empresaId);
        if (opts.promptOverride) formData.append('promptOverride', opts.promptOverride);
        if (opts.guardarComoDefault) formData.append('guardarComoDefault', 'true');
        
        const res = await api.post('/sdr/acciones/audio', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 120000 // 2 min para audios largos + transcripción
        });
        return res.data;
    },

    /**
     * Re-analizar un audio existente con GPT-4o
     */
    reanalizarAudio: async (eventoId, comentarioExtra = '', opts = {}) => {
        const res = await api.post('/sdr/acciones/audio/reanalizar', {
            eventoId, comentarioExtra,
            promptOverride: opts.promptOverride || undefined,
            guardarComoDefault: opts.guardarComoDefault || undefined
        }, { timeout: 120000 });
        return res.data;
    },

    /**
     * Re-transcribir un audio existente desde el archivo guardado
     */
    retranscribirAudio: async (eventoId, comentarioExtra = '', opts = {}) => {
        const res = await api.post('/sdr/acciones/audio/retranscribir', {
            eventoId, comentarioExtra,
            promptOverride: opts.promptOverride || undefined,
            guardarComoDefault: opts.guardarComoDefault || undefined
        }, { timeout: 120000 });
        return res.data;
    },

    /**
     * Marcar como "No califica"
     */
    marcarNoCalifica: async (contactoId, data) => {
        const res = await api.post('/sdr/acciones/no-califica', { contactoId, ...data });
        return res.data;
    },

    /**
     * Cambiar estado de un contacto
     */
    cambiarEstado: async (contactoId, estado, motivo = null) => {
        const res = await api.post('/sdr/acciones/cambiar-estado', { contactoId, estado, motivo });
        return res.data;
    },

    /**
     * Marcar como "No responde"
     */
    marcarNoResponde: async (contactoId, data) => {
        const res = await api.post('/sdr/acciones/no-responde', { contactoId, ...data });
        return res.data;
    },

    /**
     * Actualizar próximo contacto / próxima tarea
     */
    actualizarProximoContacto: async (contactoId, proximoContacto, empresaId, proximaTarea = null) => {
        const res = await api.post('/sdr/acciones/proximo-contacto', { contactoId, proximoContacto, proximaTarea });
        return res.data;
    },

    // ==================== REUNIONES ====================

    /**
     * Registrar una reunión
     */
    registrarReunion: async (contactoId, data) => {
        const res = await api.post('/sdr/reuniones', { contactoId, ...data });
        return res.data;
    },

    /**
     * Listar reuniones
     */
    listarReuniones: async (params = {}) => {
        const res = await api.get('/sdr/reuniones', { params });
        return res.data;
    },

    /**
     * Evaluar reunión (v2: realizada/no_show/cancelada | legacy: aprobar/rechazar)
     */
    evaluarReunion: async (reunionId, data) => {
        const res = await api.put(`/sdr/reuniones/${reunionId}/evaluar`, data);
        return res.data;
    },

    /**
     * Actualizar datos de una reunión (v2)
     */
    actualizarReunion: async (reunionId, data) => {
        const res = await api.put(`/sdr/reuniones/${reunionId}`, data);
        return res.data;
    },

    /**
     * Obtener reunión por ID (con datos enriquecidos del contacto)
     */
    obtenerReunion: async (reunionId) => {
        const res = await api.get(`/sdr/reuniones/${reunionId}`);
        return res.data;
    },

    /**
     * Eliminar reunión
     */
    eliminarReunion: async (reunionId) => {
        const res = await api.delete(`/sdr/reuniones/${reunionId}`);
        return res.data;
    },

    /**
     * Procesar transcripción de reunión con IA (GPT-4o)
     */
    procesarTranscripcion: async (reunionId, opts = {}) => {
        const res = await api.post(`/sdr/reuniones/${reunionId}/procesar-transcripcion`, {
            promptOverride: opts.promptOverride || undefined,
            guardarComoDefault: opts.guardarComoDefault || undefined
        });
        return res.data;
    },

    /**
     * Generar resumen SDR de un contacto con IA (GPT-4o)
     */
    generarResumenContacto: async (contactoId, opts = {}) => {
        const res = await api.post(`/sdr/contactos/${contactoId}/generar-resumen`, {
            promptOverride: opts.promptOverride || undefined,
            guardarComoDefault: opts.guardarComoDefault || undefined
        });
        return res.data;
    },

    // ==================== SCORING / CALIFICACIÓN (v2) ====================

    /**
     * Actualizar plan estimado de un contacto
     */
    actualizarPlanEstimado: async (contactoId, planEstimado) => {
        const res = await api.post('/sdr/acciones/plan-estimado', { contactoId, planEstimado });
        return res.data;
    },

    /**
     * Actualizar intención de compra de un contacto
     */
    actualizarIntencionCompra: async (contactoId, intencionCompra) => {
        const res = await api.post('/sdr/acciones/intencion-compra', { contactoId, intencionCompra });
        return res.data;
    },

    /**
     * Actualizar prioridad manual (puntos discrecionales)
     */
    actualizarPrioridadManual: async (contactoId, prioridadManual) => {
        const res = await api.post('/sdr/acciones/prioridad-manual', { contactoId, prioridadManual });
        return res.data;
    },

    /**
     * Obtener siguiente contacto para llamar (priorizado por score)
     */
    obtenerSiguienteContacto: async (empresaId, sdrId = null) => {
        const params = { empresaId };
        if (sdrId) params.sdrId = sdrId;
        const res = await api.get('/sdr/contactos/siguiente', { params });
        return res.data;
    },

    /**
     * Obtener funnel/embudo de conversión
     */
    obtenerFunnel: async (empresaId, filtros = {}) => {
        const params = { empresaId, ...filtros };
        const res = await api.get('/sdr/metricas/funnel', { params });
        return res.data;
    },

    /**
     * Webhook para nuevo lead (usado internamente)
     */
    webhookNuevoLead: async (phone, leadData, evento) => {
        const res = await api.post('/sdr/webhook/nuevo-lead', { phone, leadData, evento });
        return res.data;
    },

    // ==================== IMPORTACIÓN ====================

    /**
     * Preview de importación
     */
    previewImportacion: async (contactos, empresaId) => {
        const res = await api.post('/sdr/importar/preview', { contactos, empresaId });
        return res.data;
    },

    /**
     * Importar contactos (asíncrono)
     * Retorna inmediatamente con un importacionId para consultar estado
     */
    importarContactos: async (contactos, empresaId, origen = 'excel') => {
        const res = await api.post('/sdr/importar', { contactos, empresaId, origen });
        return res.data;
    },

    /**
     * Consultar estado de una importación en progreso
     */
    estadoImportacion: async (importacionId) => {
        const res = await api.get(`/sdr/importar/${importacionId}/estado`);
        return res.data;
    },

    /**
     * Importar contactos con polling de progreso
     * @param {Function} onProgreso - Callback que recibe { estado, procesados, total, importados, duplicados }
     * @returns {Promise} - Resuelve cuando la importación termina
     */
    importarContactosConProgreso: async (contactos, empresaId, origen = 'excel', onProgreso = null) => {
        // Iniciar importación
        const { importacionId, total } = await SDRService.importarContactos(contactos, empresaId, origen);
        
        if (!importacionId) {
            throw new Error('No se recibió ID de importación');
        }
        
        // Polling cada 2 segundos
        return new Promise((resolve, reject) => {
            const intervalo = setInterval(async () => {
                try {
                    const estado = await SDRService.estadoImportacion(importacionId);
                    
                    if (onProgreso) {
                        onProgreso(estado);
                    }
                    
                    if (estado.estado === 'completado') {
                        clearInterval(intervalo);
                        resolve(estado);
                    } else if (estado.estado === 'error') {
                        clearInterval(intervalo);
                        reject(new Error(estado.error || 'Error en importación'));
                    }
                } catch (error) {
                    // Si es 404, la importación expiró
                    if (error.response?.status === 404) {
                        clearInterval(intervalo);
                        resolve({ estado: 'completado', mensaje: 'Importación finalizada' });
                    }
                }
            }, 2000);
            
            // Timeout máximo de 10 minutos
            setTimeout(() => {
                clearInterval(intervalo);
                resolve({ estado: 'timeout', mensaje: 'Importación en progreso (verificar manualmente)' });
            }, 10 * 60 * 1000);
        });
    },

    // ==================== NOTION ====================

    /**
     * Consultar contactos desde Notion (asíncrono - devuelve consultaId)
     */
    consultarNotionAsync: async (databaseId, empresaId, filtros = {}, salesFilter = null) => {
        const res = await api.post('/sdr/notion/consultar', { databaseId, empresaId, filtros, salesFilter });
        return res.data;
    },

    /**
     * Consultar estado de una consulta Notion
     */
    estadoConsultaNotion: async (consultaId) => {
        const res = await api.get(`/sdr/notion/consultar/${consultaId}/estado`);
        return res.data;
    },

    /**
     * Consultar contactos desde Notion con polling (espera resultado)
     * @param {string} databaseId - ID de la DB (opcional, usa env del server)
     * @param {string} empresaId - ID de la empresa
     * @param {Object} filtros - Filtros adicionales
     * @param {string} salesFilter - Filtro de Sales: 'Outbound', 'Inbound', etc
     * @param {Function} onProgreso - Callback opcional de progreso
     */
    consultarNotion: async (databaseId, empresaId, filtros = {}, salesFilter = null, onProgreso = null) => {
        // Iniciar consulta asíncrona
        const { consultaId } = await SDRService.consultarNotionAsync(databaseId, empresaId, filtros, salesFilter);
        
        if (!consultaId) {
            throw new Error('No se recibió ID de consulta');
        }
        
        // Polling cada 2 segundos
        return new Promise((resolve, reject) => {
            const intervalo = setInterval(async () => {
                try {
                    const estado = await SDRService.estadoConsultaNotion(consultaId);
                    
                    if (onProgreso) onProgreso(estado);
                    
                    if (estado.estado === 'completado') {
                        clearInterval(intervalo);
                        resolve(estado);
                    } else if (estado.estado === 'error') {
                        clearInterval(intervalo);
                        reject(new Error(estado.error || 'Error en consulta Notion'));
                    }
                } catch (error) {
                    if (error.response?.status === 404) {
                        clearInterval(intervalo);
                        reject(new Error('Consulta expirada'));
                    }
                }
            }, 2000);
            
            // Timeout máximo de 5 minutos
            setTimeout(() => {
                clearInterval(intervalo);
                reject(new Error('Timeout: la consulta tardó demasiado'));
            }, 5 * 60 * 1000);
        });
    },

    /**
     * Importar una sola página de Notion por su ID o link
     */
    importarPaginaNotion: async (pageId, empresaId) => {
        const res = await api.post('/sdr/notion/importar-pagina', { pageId, empresaId });
        return res.data;
    },

    /**
     * Obtener schema de una base de datos de Notion
     */
    obtenerSchemaNotion: async (databaseId) => {
        const res = await api.get('/sdr/notion/schema', { params: { databaseId } });
        return res.data;
    },

    // ==================== MÉTRICAS ====================

    /**
     * Obtener métricas del día
     */
    obtenerMetricasDiarias: async (empresaId, fecha = null, sdrId = null, desde = null, hasta = null) => {
        const params = { empresaId };
        if (fecha) params.fecha = fecha;
        if (sdrId) params.sdrId = sdrId;
        if (desde) params.desde = desde;
        if (hasta) params.hasta = hasta;
        const res = await api.get('/sdr/metricas/diarias', { params });
        return res.data;
    },

    /**
     * Obtener métricas por período
     */
    obtenerMetricasPeriodo: async (empresaId, desde, hasta, sdrId = null) => {
        const params = { empresaId, desde, hasta };
        if (sdrId) params.sdrId = sdrId;
        const res = await api.get('/sdr/metricas/periodo', { params });
        return res.data;
    },

    // ==================== EXPORTACIÓN ====================

    /**
     * Exportar contactos
     */
    exportarContactos: async (empresaId, filtros = {}) => {
        const res = await api.get('/sdr/exportar/contactos', { params: { empresaId, ...filtros } });
        return res.data;
    },

    /**
     * Exportar métricas
     */
    exportarMetricas: async (empresaId, desde, hasta) => {
        const res = await api.get('/sdr/exportar/metricas', { params: { empresaId, desde, hasta } });
        return res.data;
    },

    // ==================== HISTORIAL ====================

    /**
     * Obtener historial de un contacto
     */
    obtenerHistorial: async (contactoId, limit = 100) => {
        const res = await api.get(`/sdr/historial/${contactoId}`, { params: { limit } });
        return res.data;
    },

    /**
     * Eliminar un evento del historial
     */
    eliminarEventoHistorial: async (eventoId) => {
        const res = await api.delete(`/sdr/historial/${eventoId}`);
        return res.data;
    },

    // ==================== SDRs ====================

    /**
     * Obtener SDRs disponibles para asignación
     */
    obtenerSDRsDisponibles: async (empresaId) => {
        const res = await api.get('/sdr/sdrs', { params: { empresaId } });
        return res.data;
    },

    // ==================== TEMPLATES WHATSAPP ====================

    /**
     * Listar templates de WhatsApp por empresa
     * @param {string} empresaId 
     * @param {string} tipo - Opcional: 'cadencia' o 'post_llamada'
     */
    listarTemplatesWhatsApp: async (empresaId, tipo = null) => {
        try {
            const params = { empresaId };
            if (tipo) params.tipo = tipo;
            const res = await api.get('/sdr/templates/whatsapp', { params });
            return res.data;
        } catch (error) {
            // Si no existe el endpoint, retornar templates por defecto
            console.log('Templates endpoint no disponible, usando defaults');
            const allTemplates = [
                // Cadencia
                {
                    _id: 'default-cadencia-1',
                    empresaId,
                    tipo: 'cadencia',
                    cadencia_step: 1,
                    label: 'Primer contacto',
                    body: '¡Hola {{first_name}}! 👋\n\nSoy {{assigned_to}} de Sorby. Vi que podrías estar interesado en optimizar la gestión de tu negocio.\n\n¿Tenés 5 minutos para que te cuente cómo podemos ayudarte?',
                    active: true
                },
                {
                    _id: 'default-cadencia-2',
                    empresaId,
                    tipo: 'cadencia',
                    cadencia_step: 2,
                    label: 'Follow-up',
                    body: '¡Hola {{first_name}}! 👋\n\nTe escribo de nuevo porque no quería que te pierdas la oportunidad de conocer Sorby.\n\n¿Te gustaría agendar una llamada rápida esta semana?',
                    active: true
                },
                {
                    _id: 'default-cadencia-3',
                    empresaId,
                    tipo: 'cadencia',
                    cadencia_step: 3,
                    label: 'Último intento',
                    body: 'Hola {{first_name}},\n\nÚltimo mensaje 😊 No quiero ser insistente, pero realmente creo que Sorby podría ayudarte.\n\nSi en algún momento querés conocer más, acá estoy.\n\n¡Éxitos!',
                    active: true
                },
                // Post llamada
                {
                    _id: 'default-post-1',
                    empresaId,
                    tipo: 'post_llamada',
                    label: 'Intentamos contactarte',
                    body: 'Hola {{first_name}}! 👋 Te estuvimos llamando pero no pudimos comunicarnos. ¿Tenés un momento para conversar?',
                    active: true
                },
                {
                    _id: 'default-post-2',
                    empresaId,
                    tipo: 'post_llamada',
                    label: 'Mensaje corto',
                    body: 'Hola {{first_name}}! Te llamé recién pero no pude comunicarme. ¿Cuándo te queda bien que hablemos?',
                    active: true
                },
                {
                    _id: 'default-post-3',
                    empresaId,
                    tipo: 'post_llamada',
                    label: 'Proponer horario',
                    body: 'Hola {{first_name}}! Intenté llamarte sin éxito. ¿Te parece si coordinamos un horario que te quede cómodo?',
                    active: true
                }
            ];
            
            return {
                templates: tipo ? allTemplates.filter(t => t.tipo === tipo) : allTemplates
            };
        }
    },

    /**
     * Crear template de WhatsApp
     */
    crearTemplateWhatsApp: async (empresaId, data) => {
        const res = await api.post('/sdr/templates/whatsapp', { ...data, empresaId });
        return res.data;
    },

    /**
     * Actualizar template de WhatsApp
     */
    actualizarTemplateWhatsApp: async (templateId, data) => {
        const res = await api.put(`/sdr/templates/whatsapp/${templateId}`, data);
        return res.data;
    },

    /**
     * Eliminar template de WhatsApp
     */
    eliminarTemplateWhatsApp: async (templateId) => {
        const res = await api.delete(`/sdr/templates/whatsapp/${templateId}`);
        return res.data;
    },

    // ==================== IMPORTACIÓN EXCEL MEJORADA ====================

    /**
     * Importar contactos desde Excel con validación y deduplicación
     * @param {Array} contactos - Array de contactos a importar
     * @param {string} empresaId - ID de la empresa
     * @param {Object} options - Opciones de importación
     */
    importarContactosExcel: async (contactos, empresaId, options = {}) => {
        const res = await api.post('/sdr/importar/excel', { 
            contactos, 
            empresaId,
            normalizePhone: options.normalizePhone !== false,
            deduplicateByPhone: options.deduplicateByPhone !== false,
            upsert: options.upsert || false
        });
        return res.data;
    },

    /**
     * Validar archivo Excel antes de importar
     */
    validarExcel: async (contactos, empresaId) => {
        const res = await api.post('/sdr/importar/validar', { contactos, empresaId });
        return res.data;
    },

    // ==================== TIPOS DE TEMPLATES ====================

    /**
     * Listar tipos de templates por empresa
     */
    listarTiposTemplate: async (empresaId) => {
        try {
            const res = await api.get('/sdr/templates/tipos', { params: { empresaId } });
            return res.data;
        } catch (error) {
            console.log('Tipos endpoint no disponible, usando defaults');
            return {
                tipos: [
                    { _id: 'tipo-cadencia', id: 'cadencia', label: 'Cadencia', tieneSteps: true, isDefault: true },
                    { _id: 'tipo-post_llamada', id: 'post_llamada', label: 'Post llamada', tieneSteps: false, isDefault: true }
                ]
            };
        }
    },

    /**
     * Crear tipo de template
     */
    crearTipoTemplate: async (empresaId, data) => {
        const res = await api.post('/sdr/templates/tipos', { ...data, empresaId });
        return res.data;
    },

    /**
     * Actualizar tipo de template
     */
    actualizarTipoTemplate: async (tipoId, data) => {
        const res = await api.put(`/sdr/templates/tipos/${tipoId}`, data);
        return res.data;
    },

    /**
     * Eliminar tipo de template
     */
    eliminarTipoTemplate: async (tipoId) => {
        const res = await api.delete(`/sdr/templates/tipos/${tipoId}`);
        return res.data;
    },

    // ==================== CADENCIAS ====================

    /**
     * Listar cadencias disponibles (globales)
     */
    listarCadencias: async () => {
        const res = await api.get('/sdr/cadencias');
        return res.data;
    },

    /**
     * Crear nueva cadencia
     */
    crearCadencia: async (data) => {
        const res = await api.post('/sdr/cadencias', data);
        return res.data;
    },

    /**
     * Actualizar cadencia
     */
    actualizarCadencia: async (cadenciaId, data) => {
        const res = await api.put(`/sdr/cadencias/${cadenciaId}`, data);
        return res.data;
    },

    /**
     * Eliminar cadencia
     */
    eliminarCadencia: async (cadenciaId) => {
        const res = await api.delete(`/sdr/cadencias/${cadenciaId}`);
        return res.data;
    },

    /**
     * Asignar cadencia a un contacto
     */
    asignarCadencia: async (contactoId, cadenciaId) => {
        const res = await api.post('/sdr/cadencias/asignar', { contactoId, cadenciaId });
        return res.data;
    },

    /**
     * Asignar cadencia a múltiples contactos
     */
    asignarCadenciaMasiva: async (contactoIds, cadenciaId) => {
        const res = await api.post('/sdr/cadencias/asignar-masiva', { contactoIds, cadenciaId });
        return res.data;
    },

    /**
     * Detener cadencia de un contacto
     */
    detenerCadencia: async (contactoId, motivo) => {
        const res = await api.post('/sdr/cadencias/detener', { contactoId, motivo });
        return res.data;
    },

    /**
     * Obtener paso actual con templates resueltos
     */
    obtenerPasoActual: async (contactoId) => {
        const res = await api.get(`/sdr/cadencias/paso-actual/${contactoId}`);
        return res.data;
    },

    /**
     * Avanzar al siguiente paso de cadencia
     */
    avanzarPasoCadencia: async (contactoId, proximoContacto) => {
        const res = await api.post('/sdr/cadencias/avanzar', { contactoId, proximoContacto });
        return res.data;
    },

    // ==================== VISTAS GUARDADAS ====================

    /**
     * Listar vistas guardadas (propias + compartidas)
     */
    listarVistas: async (empresaId) => {
        const res = await api.get('/sdr/vistas', { params: { empresaId } });
        return res.data;
    },

    /**
     * Crear nueva vista guardada
     */
    crearVista: async (data) => {
        const res = await api.post('/sdr/vistas', data);
        return res.data;
    },

    /**
     * Actualizar vista guardada
     */
    actualizarVista: async (vistaId, data) => {
        const res = await api.put(`/sdr/vistas/${vistaId}`, data);
        return res.data;
    },

    /**
     * Eliminar vista guardada
     */
    eliminarVista: async (vistaId) => {
        const res = await api.delete(`/sdr/vistas/${vistaId}`);
        return res.data;
    },

    // ==================== DOCUMENTOS ====================

    /**
     * Subir documento adjunto y asociarlo a un contacto
     * @param {string} contactoId - ID del contacto
     * @param {File} file - Archivo a subir
     * @param {object} opts - { nota, empresaId }
     */
    subirDocumento: async (contactoId, file, opts = {}) => {
        const formData = new FormData();
        formData.append('documento', file, file.name);
        formData.append('contactoId', contactoId);
        if (opts.nota) formData.append('nota', opts.nota);
        if (opts.empresaId) formData.append('empresaId', opts.empresaId);
        
        const res = await api.post('/sdr/acciones/documento', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 60000
        });
        return res.data;
    },

    /**
     * Eliminar documento adjunto
     */
    eliminarDocumento: async (eventoId) => {
        const res = await api.delete(`/sdr/acciones/documento/${eventoId}`);
        return res.data;
    },

    // ==================== CONFIGURACIÓN ====================

    /**
     * Obtener configuración SDR de la empresa
     */
    obtenerConfig: async (empresaId) => {
        const res = await api.get('/sdr/config', { params: { empresaId } });
        return res.data;
    },

    /**
     * Actualizar configuración SDR de la empresa
     */
    actualizarConfig: async (data) => {
        const res = await api.put('/sdr/config', data);
        return res.data;
    },

    // ==================== DISTRIBUCIÓN AUTOMÁTICA ====================

    /**
     * Obtener configuración de distribución de leads
     */
    obtenerDistribucion: async () => {
        const res = await api.get('/sdr/distribucion');
        return res.data;
    },

    /**
     * Actualizar configuración de distribución de leads
     */
    actualizarDistribucion: async (data) => {
        const res = await api.put('/sdr/distribucion', data);
        return res.data;
    },

    // ==================== CALENDAR SYNC ====================

    listarCalendarPendientes: async (params = {}) => {
        const res = await api.get('/sdr/calendar-sync/pendientes', { params });
        return res.data;
    },
    vincularCalendarEvento: async (syncEventId, contactoId) => {
        const res = await api.post('/sdr/calendar-sync/vincular', { syncEventId, contactoId });
        return res.data;
    },
    ignorarCalendarEvento: async (syncEventId) => {
        const res = await api.post('/sdr/calendar-sync/ignorar', { syncEventId });
        return res.data;
    },
    forzarCalendarSync: async () => {
        const res = await api.post('/sdr/calendar-sync/forzar');
        return res.data;
    },
    buscarCalendarPorLink: async (link) => {
        const res = await api.get('/sdr/calendar-sync/buscar-por-link', { params: { link } });
        return res.data;
    },

    // ==================== ADMIN ====================
    adminListarCalendarios: async () => {
        const res = await api.get('/sdr/admin/calendarios');
        return res.data;
    },
    adminAgregarCalendario: async (data) => {
        const res = await api.post('/sdr/admin/calendarios', data);
        return res.data;
    },
    adminToggleCalendario: async (id, activo) => {
        const res = await api.put(`/sdr/admin/calendarios/${id}/toggle`, { activo });
        return res.data;
    },
    adminActualizarCalendarUrl: async (id, calendarUrl) => {
        const res = await api.put(`/sdr/admin/calendarios/${id}/url`, { calendarUrl });
        return res.data;
    },
    adminEliminarCalendario: async (id) => {
        const res = await api.delete(`/sdr/admin/calendarios/${id}`);
        return res.data;
    },
    adminVerificarCalendario: async (calendarId) => {
        const res = await api.post('/sdr/admin/calendarios/verificar', { calendarId });
        return res.data;
    },
    adminObtenerEmailsInternos: async () => {
        const res = await api.get('/sdr/admin/emails-internos');
        return res.data;
    },
    adminActualizarEmailsInternos: async (emails) => {
        const res = await api.put('/sdr/admin/emails-internos', { emails });
        return res.data;
    },
    adminObtenerSyncStatus: async () => {
        const res = await api.get('/sdr/admin/sync-status');
        return res.data;
    },
    adminObtenerEquipoSDR: async () => {
        const res = await api.get('/sdr/admin/equipo');
        return res.data;
    },

    /**
     * Revertir opt-out WhatsApp de un contacto
     */
    revertirOptOut: async (contactoId) => {
        const res = await api.patch(`/sdr/contactos/${contactoId}/revertir-optout`);
        return res.data;
    }
};

export default SDRService;
