/**
 * Fechas ancladas a Argentina (UTC-3 fijo, sin DST) — ESPEJO EXACTO de
 * sorby_bot_wa/utils/movimientoCaja/cajaFiltros.js. Ambos motores deben resolver
 * el mismo rango para que el saldo del dashboard (server) y el matcheo client-side
 * coincidan. No cambiar de un lado sin el otro (lo cubren los golden tests).
 */

const AR_TZ = 'America/Argentina/Buenos_Aires';

const partesAR = (date) => {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: AR_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const [y, m, d] = fmt.format(date).split('-').map(Number);
  return { y, m, d };
};

// AR 00:00 = UTC 03:00. Date.UTC normaliza overflow/underflow de mes y día.
const medianocheAR = (y, m, d) => new Date(Date.UTC(y, m - 1, d, 3, 0, 0, 0));
const finDelDiaAR = (y, m, d) => new Date(medianocheAR(y, m, d + 1).getTime() - 1);
const diaSemanaAR = (y, m, d) => new Date(Date.UTC(y, m - 1, d, 15, 0, 0, 0)).getUTCDay();

// Rango [desde, hasta] del día calendario AR de un 'YYYY-MM-DD'.
export const rangoDiaAR = (isoDate) => {
  const [y, m, d] = String(isoDate).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return { desde: medianocheAR(y, m, d), hasta: finDelDiaAR(y, m, d) };
};

export const resolverFechaRelativa = (preset, now, cantidad) => {
  const { y, m, d } = partesAR(now);
  switch (preset) {
    case 'hoy':
      return { desde: medianocheAR(y, m, d), hasta: finDelDiaAR(y, m, d) };
    case 'ultimos_n_dias': {
      const n = Math.max(1, Number(cantidad) || 1);
      return { desde: medianocheAR(y, m, d - (n - 1)), hasta: finDelDiaAR(y, m, d) };
    }
    case 'esta_semana': {
      const dow = diaSemanaAR(y, m, d);
      return { desde: medianocheAR(y, m, d - dow), hasta: finDelDiaAR(y, m, d - dow + 6) };
    }
    case 'este_mes':
      return { desde: medianocheAR(y, m, 1), hasta: finDelDiaAR(y, m + 1, 0) };
    case 'mes_pasado':
      return { desde: medianocheAR(y, m - 1, 1), hasta: finDelDiaAR(y, m, 0) };
    case 'este_anio':
      return { desde: medianocheAR(y, 1, 1), hasta: finDelDiaAR(y, 12, 31) };
    default:
      return null;
  }
};
