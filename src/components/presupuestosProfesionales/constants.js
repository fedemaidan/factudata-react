export const ESTADOS = ['borrador', 'enviado', 'aceptado', 'rechazado', 'vencido'];

export const ESTADO_LABEL = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  aceptado: 'Aceptado',
  rechazado: 'Rechazado',
  vencido: 'Vencido',
};

export const ESTADO_COLOR = {
  borrador: 'default',
  enviado: 'info',
  aceptado: 'success',
  rechazado: 'error',
  vencido: 'warning',
};

export const TRANSICIONES_VALIDAS = {
  borrador: ['enviado'],
  enviado: ['aceptado', 'rechazado'],
  aceptado: ['vencido'],
  rechazado: ['borrador'],
  vencido: [],
};

export const MONEDAS = ['ARS', 'USD'];

export const TIPOS_ANEXO = [
  { value: 'adicion', label: 'Adición' },
  { value: 'deduccion', label: 'Deducción' },
  { value: 'modificacion', label: 'Modificación' },
];

export const formatCurrency = (val, moneda = 'ARS') => {
  const num = Number(val) || 0;
  return num.toLocaleString('es-AR', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 2,
  });
};

export const formatDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const formatPct = (v) => `${(Number(v) || 0).toFixed(1)}%`;

export const formatNumberForInput = (value, maxDecimals = 2) => {
  if (value === '' || value == null) return '';
  const num = Number(value);
  if (Number.isNaN(num)) return '';
  return num.toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
};

/**
 * Parsea el texto del usuario a número.
 * Acepta: 1.000.000 (miles con punto), 20.5 o 20,5 (decimales).
 * El último . o , se trata como decimal; los anteriores como miles.
 */
export const parseNumberInput = (str) => {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  if (!trimmed) return null;
  const lastComma = trimmed.lastIndexOf(',');
  const lastDot = trimmed.lastIndexOf('.');
  let cleaned;
  const thousandLikeWithOptionalTail = /^\d{1,3}(\.\d{3})+(\d+)?$/;
  if (lastComma > lastDot) {
    cleaned = trimmed.replace(/\./g, '').replace(',', '.');
  } else if (thousandLikeWithOptionalTail.test(trimmed)) {
    cleaned = trimmed.replace(/\./g, '');
  } else if (lastDot > lastComma) {
    const beforeLast = trimmed.slice(0, lastDot).replace(/\./g, '');
    const afterLast = trimmed.slice(lastDot + 1);
    cleaned = beforeLast + '.' + afterLast;
  } else {
    cleaned = trimmed.replace(/\./g, '');
  }
  const num = parseFloat(cleaned);
  return Number.isNaN(num) ? null : num;
};

/** Solo permite teclas numéricas, coma, punto, backspace, etc. */
export const handleNumericKeyDown = (e) => {
  const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
  if (allowed.includes(e.key)) return;
  if (e.ctrlKey || e.metaKey) {
    if (['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return;
  }
  if (!/[\d.,]/.test(e.key)) e.preventDefault();
};

/** Texto sugerido por SorbyData para Notas / Condiciones cuando no hay plantilla ni importación */
export const TEXTO_NOTAS_DEFAULT = `FORMA DE PAGO:
[%] de anticipo al inicio de obra. Saldos mensuales ajustados por índice CAC (Cámara Argentina de la Construcción).

ÍNDICE DE REFERENCIA:
Índice base CAC – [MES/AÑO]. Los valores se actualizan mensualmente según publicación oficial.

ALCANCE INCLUIDO:
El presente presupuesto incluye mano de obra, materiales de obra gruesa y supervisión profesional según los rubros detallados.

EXCLUSIONES:
No incluye: limpieza final de obra, empapelados, cortinas, muebles, artefactos de iluminación especiales, ni tareas no listadas explícitamente en los rubros.

VALIDEZ:
Este presupuesto tiene una validez de 15 días corridos desde la fecha de emisión. No es válido como factura.

CONDICIONES DE RECÁLCULO:
Los precios fueron calculados considerando la ejecución conjunta de todas las tareas detalladas. Cualquier cambio de alcance, supresión parcial de rubros o modificación de proyecto implica un recálculo del presupuesto.`;
