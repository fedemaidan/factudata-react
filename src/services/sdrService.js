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
     * Importar contactos
     */
    importarContactos: async (contactos, empresaId, origen = 'excel') => {
        const res = await api.post('/sdr/importar', { contactos, empresaId, origen });
        return res.data;
    },

    // ==================== NOTION ====================

    /**
     * Consultar contactos desde Notion (usa token del backend)
     * @param {string} databaseId - ID de la DB (opcional, usa env del server)
     * @param {string} empresaId - ID de la empresa
     * @param {Object} filtros - Filtros adicionales
     * @param {string} salesFilter - Filtro de Sales: 'Outbound', 'Inbound', etc
     */
    consultarNotion: async (databaseId, empresaId, filtros = {}, salesFilter = null) => {
        const res = await api.post('/sdr/notion/consultar', { databaseId, empresaId, filtros, salesFilter });
        return res.data;
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
     */
    listarTemplatesWhatsApp: async (empresaId) => {
        try {
            const res = await api.get('/sdr/templates/whatsapp', { params: { empresaId } });
            return res.data;
        } catch (error) {
            // Si no existe el endpoint, retornar templates por defecto
            console.log('Templates endpoint no disponible, usando defaults');
            return {
                templates: [
                    {
                        _id: 'default-1',
                        empresaId,
                        cadencia_step: 1,
                        label: 'Primer contacto',
                        body: '¡Hola {{first_name}}! 👋\n\nSoy {{assigned_to}} de Sorby. Vi que podrías estar interesado en optimizar la gestión de tu negocio.\n\n¿Tenés 5 minutos para que te cuente cómo podemos ayudarte?',
                        active: true
                    },
                    {
                        _id: 'default-2',
                        empresaId,
                        cadencia_step: 2,
                        label: 'Follow-up',
                        body: '¡Hola {{first_name}}! 👋\n\nTe escribo de nuevo porque no quería que te pierdas la oportunidad de conocer Sorby.\n\n¿Te gustaría agendar una llamada rápida esta semana?',
                        active: true
                    },
                    {
                        _id: 'default-3',
                        empresaId,
                        cadencia_step: 3,
                        label: 'Último intento',
                        body: 'Hola {{first_name}},\n\nÚltimo mensaje 😊 No quiero ser insistente, pero realmente creo que Sorby podría ayudarte.\n\nSi en algún momento querés conocer más, acá estoy.\n\n¡Éxitos!',
                        active: true
                    }
                ]
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
    }
};

export default SDRService;
