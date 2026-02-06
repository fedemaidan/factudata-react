import api from './axiosConfig';

/**
 * Servicio para el módulo SDR - Gestión de Contactos
 */
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
     * Actualizar próximo contacto
     */
    actualizarProximoContacto: async (contactoId, proximoContacto) => {
        const res = await api.post('/sdr/acciones/proximo-contacto', { contactoId, proximoContacto });
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
     * Evaluar reunión (aprobar/rechazar)
     */
    evaluarReunion: async (reunionId, data) => {
        const res = await api.put(`/sdr/reuniones/${reunionId}/evaluar`, data);
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
    obtenerMetricasDiarias: async (empresaId, fecha = null, sdrId = null) => {
        const params = { empresaId };
        if (fecha) params.fecha = fecha;
        if (sdrId) params.sdrId = sdrId;
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
    }
};

export default SDRService;
