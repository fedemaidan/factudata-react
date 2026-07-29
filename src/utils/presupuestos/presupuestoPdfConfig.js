/**
 * Config de formato del PDF de presupuestos profesionales a nivel empresa
 * (TAR-658). Se configura en /plantillas-pdf y se guarda en
 * empresa.presupuesto_pdf_config. Los presupuestos dejan de cargar logo/colores
 * propios: al guardar y al exportar se aplica esta config.
 */

export const PDF_HEADER_BG_DEFAULT = '#0a4791';
export const PDF_HEADER_TEXT_DEFAULT = '#ffffff';
export const PDF_LOGO_ESCALA_DEFAULT = 1;

const isValidHex = (v) => typeof v === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v);

export const clampLogoPdfEscala = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return PDF_LOGO_ESCALA_DEFAULT;
  return Math.min(2, Math.max(0.5, Math.round(n * 100) / 100));
};

/**
 * Normaliza la config guardada en la empresa. Devuelve null solo si nunca se
 * configuró. El logo NO es obligatorio: config sin logo = el PDF muestra el
 * nombre de la empresa en la cabecera (guardar "por defecto" también cuenta
 * como configurado y destraba el gate de creación).
 */
export const normalizePresupuestoPdfConfig = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  return {
    logo_id: raw.logo_url ? raw.logo_id || null : null,
    logo_url: raw.logo_url || null,
    logo_pdf_escala: clampLogoPdfEscala(raw.logo_pdf_escala),
    header_bg_color: isValidHex(raw.header_bg_color) ? raw.header_bg_color : PDF_HEADER_BG_DEFAULT,
    header_text_color: isValidHex(raw.header_text_color) ? raw.header_text_color : PDF_HEADER_TEXT_DEFAULT,
  };
};

/**
 * Aplica la config de empresa sobre un presupuesto (para preview/export).
 * Sin config devuelve el presupuesto tal cual (docs viejos conservan su branding).
 */
export const aplicarPdfConfigAPresupuesto = (presupuesto, config) => {
  if (!presupuesto || !config) return presupuesto;
  return {
    ...presupuesto,
    empresa_logo_url: config.logo_url,
    logo_pdf_escala: config.logo_pdf_escala,
    header_bg_color: config.header_bg_color,
    header_text_color: config.header_text_color,
  };
};
