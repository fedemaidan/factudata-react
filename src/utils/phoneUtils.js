/**
 * Utilidades para manejo de teléfonos
 * Normalización a E.164 y validación
 */

/**
 * Limpia un número de teléfono removiendo caracteres no numéricos
 * @param {string} phone - Número de teléfono
 * @returns {string} - Solo dígitos
 */
export const cleanPhone = (phone) => {
    if (!phone) return '';
    return String(phone).replace(/\D/g, '');
};

/**
 * Normaliza un teléfono argentino a formato E.164
 * Soporta varios formatos de entrada:
 * - 1123456789 → +5491123456789
 * - 011 2345-6789 → +5491123456789
 * - +54 9 11 2345-6789 → +5491123456789
 * - 15 2345-6789 (con código de área) → necesita código de área
 * 
 * @param {string} phone - Número de teléfono
 * @param {string} defaultCountryCode - Código de país por defecto (default: 54 para Argentina)
 * @returns {string} - Teléfono en formato E.164 o string limpio si no se puede normalizar
 */
export const normalizeToE164 = (phone, defaultCountryCode = '54') => {
    if (!phone) return '';
    
    let cleaned = cleanPhone(phone);
    
    if (!cleaned) return '';
    
    // Si ya empieza con el código de país completo
    if (cleaned.startsWith('549') && cleaned.length >= 12) {
        return `+${cleaned}`;
    }
    
    // Si empieza con 54 pero sin 9 (línea fija o formato viejo)
    if (cleaned.startsWith('54') && !cleaned.startsWith('549') && cleaned.length >= 11) {
        // Insertar 9 después del 54 para celulares argentinos
        const rest = cleaned.substring(2);
        // Si el siguiente dígito es 11, 351, 261, etc (códigos de área)
        // y el número tiene longitud de celular, agregar 9
        if (rest.length >= 10) {
            return `+549${rest}`;
        }
        return `+${cleaned}`;
    }
    
    // Si empieza con 0 (formato local argentino: 011, 0351, etc)
    if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
        // Si después del 0 viene 15 (prefijo de celular viejo)
        if (cleaned.startsWith('15') && cleaned.length >= 10) {
            // Necesitaríamos el código de área, asumir Buenos Aires
            cleaned = '11' + cleaned.substring(2);
        }
        return `+549${cleaned}`;
    }
    
    // Si empieza con 15 (celular sin código de área - asumir Buenos Aires)
    if (cleaned.startsWith('15') && cleaned.length === 10) {
        return `+5491${cleaned.substring(2)}`;
    }
    
    // Si es un número de 10 dígitos (código de área + número sin 0 ni 15)
    if (cleaned.length === 10) {
        return `+549${cleaned}`;
    }
    
    // Si es un número de 8 dígitos (solo número sin código de área - asumir Buenos Aires)
    if (cleaned.length === 8) {
        return `+549${cleaned}`;
    }
    
    // Para otros casos, intentar agregar código de país
    if (cleaned.length >= 10 && !cleaned.startsWith(defaultCountryCode)) {
        return `+${defaultCountryCode}9${cleaned}`;
    }
    
    // Si ya tiene formato internacional de otro país, dejarlo como está
    if (cleaned.length >= 10) {
        return `+${cleaned}`;
    }
    
    // Retornar limpio si no se puede normalizar
    return cleaned;
};

/**
 * Formatea un teléfono E.164 para mostrar de forma legible
 * @param {string} phone - Teléfono en E.164
 * @returns {string} - Teléfono formateado
 */
export const formatPhoneDisplay = (phone) => {
    if (!phone) return '';
    
    const cleaned = cleanPhone(phone);
    
    // Formato argentino: +54 9 11 1234-5678
    if (cleaned.startsWith('549') && cleaned.length >= 12) {
        const areaCode = cleaned.substring(3, 5);
        const firstPart = cleaned.substring(5, 9);
        const secondPart = cleaned.substring(9);
        return `+54 9 ${areaCode} ${firstPart}-${secondPart}`;
    }
    
    // Otros formatos
    return phone;
};

/**
 * Valida si un teléfono tiene formato válido
 * @param {string} phone - Teléfono a validar
 * @returns {boolean} - true si es válido
 */
export const isValidPhone = (phone) => {
    if (!phone) return false;
    const cleaned = cleanPhone(phone);
    // Mínimo 8 dígitos, máximo 15 (estándar E.164)
    return cleaned.length >= 8 && cleaned.length <= 15;
};

/**
 * Genera el link de WhatsApp con mensaje
 * @param {string} phone - Teléfono (se normalizará)
 * @param {string} message - Mensaje opcional
 * @returns {string} - URL de wa.me
 */
export const getWhatsAppLink = (phone, message = '') => {
    const normalized = normalizeToE164(phone);
    const cleaned = cleanPhone(normalized);
    
    if (!cleaned) return '';
    
    let url = `https://wa.me/${cleaned}`;
    if (message) {
        url += `?text=${encodeURIComponent(message)}`;
    }
    return url;
};

/**
 * Genera el link tel: para llamadas
 * @param {string} phone - Teléfono
 * @returns {string} - URL tel:
 */
export const getTelLink = (phone) => {
    const cleaned = cleanPhone(phone);
    return cleaned ? `tel:${cleaned}` : '';
};

export default {
    cleanPhone,
    normalizeToE164,
    formatPhoneDisplay,
    isValidPhone,
    getWhatsAppLink,
    getTelLink
};
