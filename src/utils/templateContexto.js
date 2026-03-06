/**
 * Template Contexto — Fase 2: Templates Contextuales
 * 
 * Versión frontend (ES module) de la función de detección de contexto.
 * Se usa en ModalSelectorTemplate y en el wizard de [id].js.
 */

// Definición de todos los tags con metadata para UI
export const TAGS_DISPONIBLES = [
    { tag: 'primer_contacto_inbound', label: 'Primer contacto (inbound)', color: '#2196f3', icon: '🔵', descripcion: 'Contacto nuevo del bot, sin intentos previos' },
    { tag: 'primer_contacto_outbound', label: 'Primer contacto (outbound)', color: '#ff9800', icon: '🟠', descripcion: 'Contacto importado/manual, sin intentos previos' },
    { tag: 'post_llamada_no_atendio', label: 'Post llamada no atendida', color: '#f44336', icon: '📞', descripcion: 'Después de 1-2 llamadas no atendidas' },
    { tag: 'post_llamada_no_atendio_3x', label: 'Post 3+ sin atender', color: '#d32f2f', icon: '🔴', descripcion: 'Después de 3 o más llamadas no atendidas' },
    { tag: 'follow_up', label: 'Follow-up', color: '#4caf50', icon: '🤝', descripcion: 'Contactado, pendiente de seguimiento' },
    { tag: 're_engagement', label: 'Re-engagement', color: '#9c27b0', icon: '🔄', descripcion: 'Contacto frío que hay que reactivar' },
    { tag: 'post_reunion', label: 'Post reunión', color: '#673ab7', icon: '📅', descripcion: 'Después de una reunión realizada' },
    { tag: 'propuesta', label: 'Propuesta / Cierre', color: '#e91e63', icon: '💰', descripcion: 'En fase de cierre o propuesta' },
    { tag: 'recordatorio_reunion', label: 'Recordatorio reunión', color: '#00bcd4', icon: '⏰', descripcion: 'Recordatorio antes de una reunión agendada' },
    { tag: 'generico', label: 'Genérico', color: '#607d8b', icon: '📝', descripcion: 'Aplica en cualquier situación' },
];

// Mapa rápido de tag → metadata
export const TAG_MAP = TAGS_DISPONIBLES.reduce((acc, t) => {
    acc[t.tag] = t;
    return acc;
}, {});

/**
 * Analiza un contacto y retorna array ordenado de tags aplicables.
 * Los tags más específicos van primero; 'generico' siempre va al final.
 * 
 * @param {Object} contacto - Objeto ContactoSDR
 * @returns {string[]} Array de tags aplicables, ordenados por relevancia
 */
export function detectarContextoTemplate(contacto) {
    if (!contacto) return ['generico'];

    const tags = [];
    const estado = contacto.estado || 'nuevo';
    const contadores = contacto.contadores || {};
    const segmento = contacto.segmento || 'outbound';
    const llamadasNoAtendidas = contadores.llamadasNoAtendidas || 0;
    const llamadasAtendidas = contadores.llamadasAtendidas || 0;
    const mensajesEnviados = contadores.mensajesEnviados || 0;
    const reunionesTotales = contadores.reunionesTotales || 0;

    const todosContadoresEnCero = llamadasNoAtendidas === 0 && llamadasAtendidas === 0 && mensajesEnviados === 0;

    // 1. Primer contacto (nuevo sin intentos)
    if (estado === 'nuevo' && todosContadoresEnCero) {
        if (segmento === 'inbound') {
            tags.push('primer_contacto_inbound');
        } else {
            tags.push('primer_contacto_outbound');
        }
    }

    // 2. Post llamada no atendida
    if (llamadasNoAtendidas >= 3) {
        tags.push('post_llamada_no_atendio_3x');
    } else if (llamadasNoAtendidas > 0 && llamadasAtendidas === 0) {
        tags.push('post_llamada_no_atendio');
    }

    // 3. Follow-up (contactado o calificado, con algo de interacción)
    if (['contactado', 'calificado'].includes(estado) && reunionesTotales === 0) {
        tags.push('follow_up');
    }

    // 4. Re-engagement (contactos fríos)
    if (['no_responde', 'revisar_mas_adelante'].includes(estado)) {
        tags.push('re_engagement');
    }

    // 5. Post reunión (tuvo reunión, aún no en cierre)
    if (reunionesTotales > 0 && estado !== 'cierre' && estado !== 'ganado') {
        tags.push('post_reunion');
    }

    // 6. Recordatorio de reunión (tiene reunión agendada)
    if (contacto.reuniones?.some?.(r => r.estado === 'agendada' && new Date(r.fecha) >= new Date())) {
        tags.push('recordatorio_reunion');
    }

    // 7. Propuesta / Cierre
    if (estado === 'cierre') {
        tags.push('propuesta');
    }

    // 8. Genérico siempre al final
    tags.push('generico');

    return tags;
}

/**
 * Calcula el score de coincidencia entre tags de un template y tags del contexto.
 */
export function calcularScoreTemplate(templateTags, contextoTags) {
    if (!templateTags?.length || !contextoTags?.length) return 0;

    let score = 0;
    for (let i = 0; i < contextoTags.length; i++) {
        if (templateTags.includes(contextoTags[i])) {
            score += (contextoTags.length - i);
        }
    }
    if (score === 1 && templateTags.includes('generico') && contextoTags.includes('generico')) {
        score = 0.5;
    }
    return score;
}

/**
 * Filtra y ordena templates por coincidencia con el contexto.
 */
export function filtrarTemplatesPorContexto(templates, contextoTags) {
    if (!templates?.length || !contextoTags?.length) return templates || [];

    return templates
        .map(template => {
            const tags = template.tags || [];
            const score = calcularScoreTemplate(tags, contextoTags);
            return { ...template, _score: score };
        })
        .filter(t => t._score > 0)
        .sort((a, b) => b._score - a._score);
}

/**
 * Obtiene el mejor template según el contexto del contacto.
 * Útil para auto-fill en el wizard.
 */
export function obtenerMejorTemplate(templates, contacto) {
    const contextoTags = detectarContextoTemplate(contacto);
    const filtrados = filtrarTemplatesPorContexto(templates, contextoTags);
    return filtrados.length > 0 ? filtrados[0] : null;
}
