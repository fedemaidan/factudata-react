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

/** ID especial para la plantilla SorbyData (no es un _id de backend) */
export const PLANTILLA_SORBYDATA_ID = 'sorbydata';

/** Plantilla predefinida SorbyData con rubros y tareas estándar */
export const PLANTILLA_SORBYDATA = {
  id: PLANTILLA_SORBYDATA_ID,
  nombre: 'Plantilla SorbyData',
  rubros: [
    {
      nombre: 'Demolición',
      incidencia_pct_sugerida: null,
      tareas: [
        { descripcion: 'Demolición de muros según plano' },
        { descripcion: 'Desmonte de artefactos sanitarios en baños, griferías, mesadas, muebles de cocina, puertas y roperos' },
        { descripcion: 'Retiro de todas las ventanas y desecho de las mismas' },
        { descripcion: 'Embolsado de escombros, servicio de volquetes y llenado de los mismos' },
      ],
    },
    {
      nombre: 'Albañilería General',
      incidencia_pct_sugerida: null,
      tareas: [
        { descripcion: 'Elevaciones de muros en mampostería según plano' },
        { descripcion: 'Revoque grueso de muros' },
        { descripcion: 'Recuadro de vanos para puertas y ventanas' },
        { descripcion: 'Ejecución de contrapiso y carpetas en ambientes húmedos con nuevas instalaciones. Y en sectores del patio para recibir nuevos pisos' },
        { descripcion: 'Ejecución de banquinas en cocina y lavadero' },
      ],
    },
    {
      nombre: 'Instalación Sanitaria',
      incidencia_pct_sugerida: null,
      tareas: [
        { descripcion: 'Desmonte y retiro de distribuciones de cañerías de agua y desagües obsoletas' },
        { descripcion: 'Instalación de distribución interna de cañerías de desagües nuevas para baños, cocina y lavadero. Se tomarán desde acometidas existentes' },
        { descripcion: 'Instalación de distribución interna de cañerías de agua fría y caliente nuevas para baños, cocina, lavadero y patio. Se tomarán desde acometidas existentes' },
        { descripcion: 'Instalación y amurado de juegos de griferías de embutir y rejillas de desagües lineales. Provistas por cliente' },
      ],
    },
    {
      nombre: 'Instalación Eléctrica',
      incidencia_pct_sugerida: null,
      tareas: [
        { descripcion: 'Desinstalación y desarmado de bocas y cableados de electricidad existentes' },
        { descripcion: 'Instalación de bocas de electricidad e iluminación nuevas (Canaleteado, colocación de caños corrugados plásticos, amurado de cajas, cableado nuevo)' },
        { descripcion: 'Instalación de tablero general nuevo de acuerdo a la nueva instalación eléctrica completa' },
      ],
    },
    {
      nombre: 'Colocaciones de Placas de Porcelanato y/o Marmetas',
      incidencia_pct_sugerida: null,
      tareas: [
        { descripcion: 'Colocaciones de placas de porcelanatos y/o marmetas provistas por cliente en baños, área de servicio y en algunos sectores de patio' },
      ],
    },
    {
      nombre: 'Pintura',
      incidencia_pct_sugerida: null,
      tareas: [
        { descripcion: 'Aplicación de Enduido en todos los muros interiores del departamento' },
        { descripcion: 'Lijado' },
        { descripcion: 'Aplicación de pintura de esmalte sintético satinada en paredes, puertas y zócalos' },
      ],
    },
    {
      nombre: 'Instalación de Toma Corrientes, Llaves de Enc. y Artef. de Iluminación',
      incidencia_pct_sugerida: null,
      tareas: [
        { descripcion: 'Colocación de artefactos de iluminación en todo el departamento. Provistos por cliente' },
      ],
    },
    {
      nombre: 'Colocación de Artefactos Sanitarios, Griferías y Accesorios',
      incidencia_pct_sugerida: null,
      tareas: [
        { descripcion: 'Instalación de vistas de griferías. Provistos por cliente' },
        { descripcion: 'Instalación de inodoros, bidets, desagües de bachas, bañadera y accesorios. Provistos por cliente' },
      ],
    },
    {
      nombre: 'Varios',
      incidencia_pct_sugerida: null,
      tareas: [
        { descripcion: 'Limpieza gruesa periódica' },
        { descripcion: 'Ayuda de gremios' },
      ],
    },
  ],
};
