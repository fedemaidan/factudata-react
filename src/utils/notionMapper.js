/**
 * Mapper para normalizar datos de Notion
 * Soporta formato viejo (comentarios como string) y nuevo (comentarios como items)
 */

const MAX_NOTES = 10;

/**
 * Detecta el formato de comentarios de Notion
 * @param {Object} notionPage - Página de Notion
 * @returns {'old' | 'new' | 'none'} - Tipo de formato
 */
export const detectCommentFormat = (notionPage) => {
    if (!notionPage) return 'none';
    
    const properties = notionPage.properties || notionPage;
    
    // Formato nuevo: comentarios como array de items con fecha
    if (properties.Comments?.type === 'relation' || 
        properties.Comentarios?.type === 'relation' ||
        Array.isArray(properties.comments_items) ||
        Array.isArray(properties.notas)) {
        return 'new';
    }
    
    // Formato viejo: comentarios como rich_text o texto largo
    if (properties.Comments?.rich_text || 
        properties.Comentarios?.rich_text ||
        properties.comments?.rich_text ||
        typeof properties.comments === 'string' ||
        typeof properties.Comments === 'string') {
        return 'old';
    }
    
    return 'none';
};

/**
 * Extrae texto de un campo rich_text de Notion
 * @param {Array|Object} richText - Campo rich_text
 * @returns {string} - Texto plano
 */
const extractRichText = (richText) => {
    if (!richText) return '';
    
    if (typeof richText === 'string') return richText;
    
    if (Array.isArray(richText)) {
        return richText.map(block => block.plain_text || block.text?.content || '').join('');
    }
    
    if (richText.rich_text) {
        return extractRichText(richText.rich_text);
    }
    
    return richText.plain_text || richText.text?.content || '';
};

/**
 * Parsea comentarios en formato viejo (string largo)
 * Intenta detectar estructura como:
 * - "2024-01-15: Llamada, no atendió\n2024-01-16: WhatsApp enviado"
 * - Párrafos separados por doble salto de línea
 * 
 * @param {string} comments - String de comentarios
 * @returns {Array<{date: Date|null, text: string}>} - Array de notas
 */
export const parseOldComments = (comments) => {
    if (!comments || typeof comments !== 'string') return [];
    
    const notes = [];
    
    // Intentar detectar formato con fecha al inicio de cada línea
    // Patrones comunes: "2024-01-15:", "15/01/2024:", "[2024-01-15]", etc.
    const datePatterns = [
        /^(\d{4}-\d{2}-\d{2}):\s*/,
        /^(\d{2}\/\d{2}\/\d{4}):\s*/,
        /^\[(\d{4}-\d{2}-\d{2})\]\s*/,
        /^(\d{2}-\d{2}-\d{4}):\s*/,
    ];
    
    // Dividir por saltos de línea
    const lines = comments.split(/\n+/).filter(line => line.trim());
    
    for (const line of lines) {
        let date = null;
        let text = line.trim();
        
        // Intentar extraer fecha
        for (const pattern of datePatterns) {
            const match = text.match(pattern);
            if (match) {
                try {
                    date = new Date(match[1].replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1'));
                    if (isNaN(date.getTime())) date = null;
                } catch (e) {
                    date = null;
                }
                text = text.replace(pattern, '').trim();
                break;
            }
        }
        
        if (text) {
            notes.push({ date, text });
        }
    }
    
    // Si no se detectaron líneas separadas, crear una sola nota
    if (notes.length === 0 && comments.trim()) {
        notes.push({ 
            date: null, 
            text: comments.trim().substring(0, 500) // Limitar longitud
        });
    }
    
    return notes.slice(-MAX_NOTES); // Últimas N notas
};

/**
 * Parsea comentarios en formato nuevo (items estructurados)
 * @param {Array} items - Array de items de comentarios
 * @returns {Array<{date: Date|null, text: string}>} - Array de notas
 */
export const parseNewComments = (items) => {
    if (!Array.isArray(items)) return [];
    
    const notes = items
        .map(item => {
            // Formato típico de Notion con propiedades
            const props = item.properties || item;
            
            let date = null;
            let text = '';
            
            // Intentar extraer fecha
            if (props.Date?.date?.start) {
                date = new Date(props.Date.date.start);
            } else if (props.Fecha?.date?.start) {
                date = new Date(props.Fecha.date.start);
            } else if (props.created_time) {
                date = new Date(props.created_time);
            } else if (item.created_time) {
                date = new Date(item.created_time);
            }
            
            // Intentar extraer texto
            text = extractRichText(props.Comment) ||
                   extractRichText(props.Comentario) ||
                   extractRichText(props.Text) ||
                   extractRichText(props.Texto) ||
                   extractRichText(props.Content) ||
                   extractRichText(props.title) ||
                   extractRichText(props.Name) ||
                   '';
            
            // Si no hay texto en propiedades, buscar en el item directamente
            if (!text && item.text) {
                text = typeof item.text === 'string' ? item.text : extractRichText(item.text);
            }
            
            return { date, text: text.trim() };
        })
        .filter(note => note.text) // Solo notas con texto
        .sort((a, b) => {
            // Ordenar por fecha descendente (más recientes primero)
            if (!a.date && !b.date) return 0;
            if (!a.date) return 1;
            if (!b.date) return -1;
            return b.date.getTime() - a.date.getTime();
        });
    
    return notes.slice(0, MAX_NOTES); // Primeras N notas (más recientes)
};

/**
 * Genera un preview corto de las notas
 * @param {Array<{date: Date|null, text: string}>} notes - Array de notas
 * @param {number} maxLength - Longitud máxima del preview
 * @returns {string} - Preview concatenado
 */
export const generateNotesPreview = (notes, maxLength = 200) => {
    if (!notes || notes.length === 0) return '';
    
    const preview = notes
        .slice(0, 3) // Máximo 3 notas para preview
        .map(note => note.text)
        .join(' | ');
    
    if (preview.length <= maxLength) return preview;
    
    return preview.substring(0, maxLength - 3) + '...';
};

/**
 * Mapea una página de Notion al modelo interno de contacto
 * @param {Object} notionPage - Página de Notion
 * @param {Object} options - Opciones adicionales
 * @returns {Object} - Contacto normalizado
 */
export const mapNotionToContact = (notionPage, options = {}) => {
    const { empresaId, origen = 'notion' } = options;
    const props = notionPage.properties || notionPage;
    
    // Extraer campos básicos
    const nombre = extractRichText(props.Name) || 
                   extractRichText(props.Nombre) ||
                   extractRichText(props.title) ||
                   'Sin nombre';
    
    const telefono = extractRichText(props.Phone) ||
                     extractRichText(props.Teléfono) ||
                     extractRichText(props.Telefono) ||
                     extractRichText(props['Phone Number']) ||
                     '';
    
    const email = extractRichText(props.Email) ||
                  extractRichText(props.email) ||
                  (props.Email?.email) ||
                  '';
    
    const empresa = extractRichText(props.Company) ||
                    extractRichText(props.Empresa) ||
                    extractRichText(props.Organization) ||
                    '';
    
    const cargo = extractRichText(props.Role) ||
                  extractRichText(props.Cargo) ||
                  extractRichText(props.Position) ||
                  '';
    
    // Detectar y parsear comentarios
    const format = detectCommentFormat(notionPage);
    let notes = [];
    
    if (format === 'old') {
        const commentsRaw = extractRichText(props.Comments) ||
                           extractRichText(props.Comentarios) ||
                           extractRichText(props.comments) ||
                           '';
        notes = parseOldComments(commentsRaw);
        console.log(`[NotionMapper] Formato VIEJO detectado para "${nombre}": ${notes.length} notas`);
    } else if (format === 'new') {
        const items = props.Comments?.relation ||
                     props.Comentarios?.relation ||
                     props.comments_items ||
                     props.notas ||
                     [];
        notes = parseNewComments(items);
        console.log(`[NotionMapper] Formato NUEVO detectado para "${nombre}": ${notes.length} notas`);
    } else {
        console.log(`[NotionMapper] Sin comentarios para "${nombre}"`);
    }
    
    // Determinar última nota
    const lastNote = notes.length > 0 ? notes[0] : null;
    
    // Extraer segmento (Inbound/Outbound)
    const segmento = props.Sales?.select?.name?.toLowerCase() ||
                     props.Segmento?.select?.name?.toLowerCase() ||
                     (props.Sales?.multi_select?.[0]?.name?.toLowerCase()) ||
                     'outbound';
    
    // Construir contacto normalizado
    const contacto = {
        // Datos básicos
        nombre,
        telefono,
        email,
        empresa,
        cargo,
        segmento,
        
        // Notas normalizadas
        notes_preview: generateNotesPreview(notes),
        last_note_at: lastNote?.date || null,
        notes_history: notes.slice(0, MAX_NOTES),
        
        // Metadata de origen
        notionPageId: notionPage.id,
        origen,
        empresaId,
        
        // Estado inicial
        estado: 'nuevo',
        
        // Contexto inicial para el historial (si hay notas)
        contextoInicial: notes.length > 0 ? notes.map(n => {
            const dateStr = n.date ? n.date.toISOString().split('T')[0] : 'Sin fecha';
            return `[${dateStr}] ${n.text}`;
        }).join('\n') : null
    };
    
    return contacto;
};

/**
 * Mapea múltiples páginas de Notion
 * @param {Array} pages - Array de páginas de Notion
 * @param {Object} options - Opciones
 * @returns {Array} - Contactos normalizados
 */
export const mapNotionPages = (pages, options = {}) => {
    const results = {
        contactos: [],
        errores: [],
        stats: {
            total: pages.length,
            exitosos: 0,
            fallidos: 0,
            sinTelefono: 0,
            formatoViejo: 0,
            formatoNuevo: 0
        }
    };
    
    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        try {
            const contacto = mapNotionToContact(page, options);
            
            if (!contacto.telefono) {
                results.stats.sinTelefono++;
                results.errores.push({
                    index: i,
                    nombre: contacto.nombre,
                    error: 'Sin teléfono'
                });
                continue;
            }
            
            // Contar formatos
            const format = detectCommentFormat(page);
            if (format === 'old') results.stats.formatoViejo++;
            if (format === 'new') results.stats.formatoNuevo++;
            
            results.contactos.push(contacto);
            results.stats.exitosos++;
        } catch (error) {
            results.stats.fallidos++;
            results.errores.push({
                index: i,
                pageId: page?.id,
                error: error.message
            });
            console.error(`[NotionMapper] Error en página ${i}:`, error);
        }
    }
    
    console.log(`[NotionMapper] Resumen: ${results.stats.exitosos} OK, ${results.stats.fallidos} errores, ${results.stats.sinTelefono} sin teléfono`);
    console.log(`[NotionMapper] Formatos: ${results.stats.formatoViejo} viejo, ${results.stats.formatoNuevo} nuevo`);
    
    return results;
};

export default {
    detectCommentFormat,
    parseOldComments,
    parseNewComments,
    generateNotesPreview,
    mapNotionToContact,
    mapNotionPages,
    MAX_NOTES
};
