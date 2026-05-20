// Helpers para el nuevo shape del JSON de configuración DHN.
// Diferente al `tiposHora.js` viejo (que era para hours[24] + turnos[]).
//
// Shape esperado por día:
//   {
//     tramos: [{ desde, hasta, tipo }, ...]      // contiguos 00:00→24:00
//     franjaNocturna: [{ desde, hasta, tipoPlus? }, ...]
//     fraccion: number                            // divisor de 60
//     turnoDiurno: [{ entrada, salida }] | null   // 1 ó 2 variantes
//     turnoNoche:  [{ entrada, salida }] | null
//     horaExtra: 'extra50' | 'extra100' | ...
//   }

import { TIPOS_HORA, TIPO_META } from './tiposHora';

export const DIA_KEYS = Object.freeze([
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
  'feriado',
]);

export const DIA_LABEL = Object.freeze({
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
  feriado: 'Feriado',
});

export const FRACCIONES_VALIDAS = Object.freeze([10, 12, 15, 20, 30, 60]);

// Acepta 24:00 como fin de día (a diferencia de parseHHmm de tiposHora).
export function parseHHmm24(s) {
  if (typeof s !== 'string') return null;
  const m = s.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h < 0 || h > 24 || mm < 0 || mm > 59) return null;
  if (h === 24 && mm !== 0) return null;
  return h * 60 + mm;
}

export function formatHHmm24(totalMin) {
  if (typeof totalMin !== 'number' || Number.isNaN(totalMin)) return null;
  const m = Math.round(totalMin);
  if (m < 0 || m > 1440) return null;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function diferenciaHoras(desde, hasta) {
  const a = parseHHmm24(desde);
  const b = parseHHmm24(hasta);
  if (a == null || b == null) return null;
  const min = b - a;
  return Math.round((min / 60) * 100) / 100;
}

export function crearDiaPorDefecto() {
  return {
    tramos: [{ desde: '00:00', hasta: '24:00', tipo: TIPOS_HORA.NORMAL }],
    franjaNocturna: [
      { desde: '00:00', hasta: '06:00' },
      { desde: '21:00', hasta: '24:00' },
    ],
    fraccion: 20,
    turnoDiurno: [{ entrada: '08:20', salida: '17:20' }],
    turnoNoche: [{ entrada: '20:00', salida: '08:00' }],
    horaExtra: TIPOS_HORA.EXTRA_50,
  };
}

// Devuelve el `tipo` del tramo más largo del día. Útil para mostrar un resumen
// "tipo dominante" en headers colapsados.
export function tipoDominante(dia) {
  if (!dia || !Array.isArray(dia.tramos) || dia.tramos.length === 0) return null;
  let mejor = null;
  let mejorDuracion = -1;
  for (const t of dia.tramos) {
    const desde = parseHHmm24(t.desde);
    const hasta = parseHHmm24(t.hasta);
    if (desde == null || hasta == null) continue;
    const dur = hasta - desde;
    if (dur > mejorDuracion) {
      mejorDuracion = dur;
      mejor = t.tipo;
    }
  }
  return mejor;
}

// String de resumen para el header colapsado del acordeón.
// Ej: "08:20 → 17:20 · 9h Normal" / "Sin turno · Extra 100%".
export function formatResumen(dia) {
  if (!dia) return 'sin configurar';
  const primerDiurno = dia.turnoDiurno?.[0];
  const tipo = tipoDominante(dia);
  const tipoLabel = tipo ? TIPO_META[tipo]?.label || tipo : '';
  const turnoStr = primerDiurno
    ? `${primerDiurno.entrada} → ${primerDiurno.salida}`
    : dia.turnoNoche?.[0]
    ? `${dia.turnoNoche[0].entrada} → ${dia.turnoNoche[0].salida} (noche)`
    : 'sin turno';
  if (!primerDiurno && !dia.turnoNoche?.[0]) return tipoLabel ? `${turnoStr} · ${tipoLabel}` : turnoStr;
  const horas = primerDiurno
    ? diferenciaHoras(primerDiurno.entrada, primerDiurno.salida)
    : null;
  const horasStr = horas != null && horas > 0 ? `${horas}h` : '';
  return [turnoStr, horasStr, tipoLabel].filter(Boolean).join(' · ');
}

function _validarTramos(errores, tramos) {
  if (!Array.isArray(tramos) || tramos.length === 0) {
    errores.push('Debe haber al menos un tramo de hora');
    return;
  }
  let prev = 0;
  for (let i = 0; i < tramos.length; i++) {
    const t = tramos[i];
    const desde = parseHHmm24(t.desde);
    const hasta = parseHHmm24(t.hasta);
    if (desde == null || hasta == null) {
      errores.push(`Tramo ${i + 1}: horario inválido`);
      return;
    }
    if (hasta <= desde) {
      errores.push(`Tramo ${i + 1}: el fin debe ser posterior al inicio`);
      return;
    }
    if (i === 0 && desde !== 0) {
      errores.push('El primer tramo debe arrancar a las 00:00');
      return;
    }
    if (i > 0 && desde !== prev) {
      errores.push(`Tramo ${i + 1}: queda un hueco entre tramos (${formatHHmm24(prev)})`);
      return;
    }
    if (!TIPO_META[t.tipo]) {
      errores.push(`Tramo ${i + 1}: tipo de hora inválido`);
      return;
    }
    prev = hasta;
  }
  if (prev !== 1440) {
    errores.push(`El último tramo debe terminar a las 24:00 (termina en ${formatHHmm24(prev)})`);
  }
}

function _validarFranja(errores, franja) {
  if (franja == null) return;
  if (!Array.isArray(franja)) {
    errores.push('Franja nocturna debe ser una lista');
    return;
  }
  for (let i = 0; i < franja.length; i++) {
    const f = franja[i];
    const desde = parseHHmm24(f.desde);
    const hasta = parseHHmm24(f.hasta);
    if (desde == null || hasta == null) {
      errores.push(`Franja nocturna ${i + 1}: horario inválido`);
      continue;
    }
    if (hasta <= desde) {
      errores.push(`Franja nocturna ${i + 1}: el fin debe ser posterior al inicio`);
    }
    if (f.tipoPlus && !TIPO_META[f.tipoPlus]) {
      errores.push(`Franja nocturna ${i + 1}: tipo plus inválido`);
    }
  }
}

function _validarTurno(errores, key, turno) {
  if (turno == null) return;
  if (!Array.isArray(turno)) {
    errores.push(`${key} debe ser una lista de variantes`);
    return;
  }
  if (turno.length === 0) return;
  if (turno.length > 2) {
    errores.push(`${key}: máximo 2 variantes`);
    return;
  }
  const keys = [];
  for (let i = 0; i < turno.length; i++) {
    const v = turno[i];
    const e = parseHHmm24(v?.entrada);
    const s = parseHHmm24(v?.salida);
    if (e == null || s == null) {
      errores.push(`${key} variante ${i + 1}: entrada o salida inválidas`);
      return;
    }
    keys.push(`${e}-${s}`);
  }
  if (keys.length === 2 && keys[0] === keys[1]) {
    errores.push(`${key}: las dos variantes son idénticas`);
  }
}

// Retorna un array de errores legibles para mostrar en la UI.
// Si no hay errores, devuelve [].
export function validarDia(dia) {
  const errores = [];
  if (!dia || typeof dia !== 'object') {
    return ['Día sin configuración'];
  }
  _validarTramos(errores, dia.tramos);
  _validarFranja(errores, dia.franjaNocturna);
  if (!Number.isInteger(dia.fraccion) || dia.fraccion <= 0 || 60 % dia.fraccion !== 0) {
    errores.push('Fracción debe ser un divisor entero de 60 (1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60)');
  }
  _validarTurno(errores, 'Turno diurno', dia.turnoDiurno);
  _validarTurno(errores, 'Turno noche', dia.turnoNoche);
  if (!TIPO_META[dia.horaExtra]) {
    errores.push('Tipo de hora extra inválido');
  }
  return errores;
}

export function validarConfig(config) {
  if (!config || typeof config !== 'object') return { lunes: ['root inválido'] };
  const erroresPorDia = {};
  for (const k of DIA_KEYS) {
    const e = validarDia(config[k]);
    if (e.length > 0) erroresPorDia[k] = e;
  }
  return erroresPorDia;
}

export function esConfigValida(config) {
  return Object.keys(validarConfig(config)).length === 0;
}

// Deep clone de un día (sin referencias compartidas, para "Copiar de…").
export function cloneDia(dia) {
  if (dia == null) return null;
  return JSON.parse(JSON.stringify(dia));
}

// Tipos disponibles para el selector "Tipo del día" del modo Simple.
// Excluye los nocturnos puros y "no_cuenta" para no abrumar al usuario.
export const TIPOS_DIA_SIMPLE = Object.freeze([
  TIPOS_HORA.NORMAL,
  TIPOS_HORA.EXTRA_50,
  TIPOS_HORA.EXTRA_100,
]);

// Tipos disponibles para `horaExtra` (qué bucket reciben las horas pasadas la
// ventana de salida nominal).
export const TIPOS_HORA_EXTRA = Object.freeze([
  TIPOS_HORA.EXTRA_50,
  TIPOS_HORA.EXTRA_100,
]);

// Tipos disponibles para `tipoPlus` de franja nocturna (override del automático).
export const TIPOS_PLUS_NOCTURNO = Object.freeze([
  TIPOS_HORA.NOCTURNA_NORMAL,
  TIPOS_HORA.NOCTURNA_50,
  TIPOS_HORA.NOCTURNA_100,
]);
