// Helpers de teléfono compartidos.
// Mantener en sync con cualquier copia local (ej: usuariosDetails.js define la suya).

export const normalizePhone = (phone) => (phone || '').toString().replace(/[^\d]/g, '');

export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
