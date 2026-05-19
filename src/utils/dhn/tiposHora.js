export const TIPOS_HORA = Object.freeze({
  NORMAL: 'normal',
  EXTRA_50: 'extra50',
  EXTRA_100: 'extra100',
  NOCTURNA_NORMAL: 'nocturnaNormal',
  NOCTURNA_50: 'nocturna50',
  NOCTURNA_100: 'nocturna100',
  NO_CUENTA: 'no_cuenta',
});

export const TIPOS_VALIDOS = Object.freeze(Object.values(TIPOS_HORA));

export const TIPO_META = Object.freeze({
  [TIPOS_HORA.NORMAL]: {
    label: 'Normal',
    short: 'N',
    color: '#10B981',
  },
  [TIPOS_HORA.EXTRA_50]: {
    label: 'Extra 50%',
    short: '50',
    color: '#F79009',
  },
  [TIPOS_HORA.EXTRA_100]: {
    label: 'Extra 100%',
    short: '100',
    color: '#F04438',
  },
  [TIPOS_HORA.NOCTURNA_NORMAL]: {
    label: 'Nocturna',
    short: 'Nc',
    color: '#6366F1',
  },
  [TIPOS_HORA.NOCTURNA_50]: {
    label: 'Nocturna 50%',
    short: 'Nc50',
    color: '#4338CA',
  },
  [TIPOS_HORA.NOCTURNA_100]: {
    label: 'Nocturna 100%',
    short: 'Nc100',
    color: '#312E81',
  },
  [TIPOS_HORA.NO_CUENTA]: {
    label: 'No cuenta',
    short: '—',
    color: '#9DA4AE',
  },
});

export const SPLIT_STEP_MIN = 10;

export const DIAS = Object.freeze([
  { key: 'lunes', label: 'Lun' },
  { key: 'martes', label: 'Mar' },
  { key: 'miercoles', label: 'Mié' },
  { key: 'jueves', label: 'Jue' },
  { key: 'viernes', label: 'Vie' },
  { key: 'sabado', label: 'Sáb' },
  { key: 'domingo', label: 'Dom' },
  { key: 'feriado', label: 'Feriado' },
]);

export function emptyHours() {
  return Array.from({ length: 24 }, () => ({ tipo: TIPOS_HORA.NO_CUENTA }));
}

export function emptyDia(fraccionMin = 20) {
  return {
    hours: emptyHours(),
    fraccion: {
      minutos: fraccionMin,
      decimal: Math.ceil((fraccionMin / 60) * 100) / 100,
    },
    turnos: [],
  };
}

export function emptyConfig() {
  const out = {};
  for (const d of DIAS) out[d.key] = emptyDia();
  out.feriadosFechas = [];
  return out;
}

export function isAtMinValido(n) {
  return (
    Number.isInteger(n) &&
    n >= SPLIT_STEP_MIN &&
    n <= 60 - SPLIT_STEP_MIN &&
    n % SPLIT_STEP_MIN === 0
  );
}

export function isTipoValido(t) {
  return typeof t === 'string' && TIPOS_VALIDOS.includes(t);
}

export const TURNO_STEP_MIN = 10;
export const VENTANA_TURNO_MIN = 60;

export function parseHHmm(s) {
  if (typeof s !== 'string') return null;
  const m = s.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return h * 60 + mm;
}

export function formatHHmm(totalMin) {
  if (typeof totalMin !== 'number' || Number.isNaN(totalMin)) return null;
  const m = ((Math.round(totalMin) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function normalizeHHmm(s, stepMin = TURNO_STEP_MIN) {
  const min = parseHHmm(s);
  if (min == null) return null;
  const snapped = Math.round(min / stepMin) * stepMin;
  return formatHHmm(snapped % 1440);
}

export function isTurnoValido(t) {
  if (!t || typeof t !== 'object') return false;
  const e = parseHHmm(t.entrada);
  const s = parseHHmm(t.salida);
  return e != null && s != null && e !== s;
}
