// Genera movimientos sintéticos para previsualizar un reporte cuando la empresa todavía
// NO cargó ningún movimiento. Así un usuario nuevo ve "cómo se verá" su reporte desde el
// minuto cero, en vez de un panel vacío. Los campos coinciden con los que lee reportEngine
// (categoria, nombre_proveedor, etapa, medio_pago, usuario_nombre, fecha_factura,
// total/equivalencias) para que TODOS los tipos de bloque muestren variedad realista.
//
// Es 100% determinístico (sin Math.random) para no romper SSR/StrictMode: los valores
// salen de los índices. Estos datos son SOLO para la preview — nunca se guardan; el reporte
// guardado computa sobre los datos reales de la empresa.

const CATEGORIAS = ['Materiales', 'Mano de obra', 'Servicios', 'Equipos', 'Fletes'];
const PROVEEDORES = ['Corralón del Centro', 'Hierros SA', 'Pinturería Norte', 'Áridos del Sur', 'Eléctrica López'];
const ETAPAS = ['Fundaciones', 'Estructura', 'Terminaciones'];
const MEDIOS = ['Transferencia', 'Efectivo', 'Cheque'];
const USUARIOS = ['María', 'Juan', 'Sofía'];
const PROYECTO = { id: 'demo-proyecto', nombre: 'Obra de ejemplo' };

const DOLAR_REF = 1200; // aprox. para derivar equivalencias USD/CAC de la muestra
const CAC_REF = 9000;
const COUNT = 16;
const MONTHS_BACK = 6;

function pad2(n) {
  return n < 10 ? `0${n}` : String(n);
}

// Fecha YYYY-MM-15 retrocediendo `monthsAgo` meses desde un ancla (año/mes actuales).
function dateMonthsAgo(baseYear, baseMonth0, monthsAgo) {
  const total = baseYear * 12 + baseMonth0 - monthsAgo;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return `${y}-${pad2(m)}-15`;
}

function buildEquivalencias(amount) {
  const usd = Math.round(amount / DOLAR_REF);
  const cac = Math.round(amount / CAC_REF);
  return {
    total: { ars: amount, usd_blue: usd, cac },
    subtotal: { ars: amount, usd_blue: usd, cac },
  };
}

/**
 * @param {object} draft - borrador del reporte; se usa para sesgar el tipo (egreso/ingreso)
 *                         según el filtro por defecto, si lo hay.
 * @returns {Array<object>} movimientos de ejemplo
 */
export function buildSampleMovimientos(draft) {
  const now = new Date();
  const baseYear = now.getFullYear();
  const baseMonth0 = now.getMonth();

  const tipoDefault = draft?.filtros_schema?.tipo?.default_value || null;

  const movs = [];
  for (let i = 0; i < COUNT; i += 1) {
    // Tipo: si el reporte filtra por uno, respetarlo; si no, mayormente egresos con
    // algunos ingresos para que los bloques de ingreso/egreso muestren ambos.
    let type;
    if (tipoDefault === 'egreso' || tipoDefault === 'ingreso') type = tipoDefault;
    else type = i % 5 === 0 ? 'ingreso' : 'egreso';

    const amount = 180000 + ((i * 73000) % 920000) + (i % CATEGORIAS.length) * 45000;
    const monthsAgo = i % MONTHS_BACK;

    movs.push({
      id: `sample-${i}`,
      _id: `sample-${i}`,
      type,
      total: amount,
      subtotal: amount,
      monto: amount,
      moneda: 'ARS',
      dolar_referencia: DOLAR_REF,
      equivalencias: buildEquivalencias(amount),
      fecha_factura: dateMonthsAgo(baseYear, baseMonth0, monthsAgo),
      categoria: CATEGORIAS[i % CATEGORIAS.length],
      nombre_proveedor: PROVEEDORES[i % PROVEEDORES.length],
      etapa: ETAPAS[i % ETAPAS.length],
      medio_pago: MEDIOS[i % MEDIOS.length],
      usuario_nombre: USUARIOS[i % USUARIOS.length],
      proyecto_id: PROYECTO.id,
      proyecto: PROYECTO.nombre,
      proyecto_nombre: PROYECTO.nombre,
      _sample: true,
    });
  }
  return movs;
}

export default buildSampleMovimientos;
