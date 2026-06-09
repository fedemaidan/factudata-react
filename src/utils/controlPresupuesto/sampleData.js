/**
 * Datos de muestra para previsualizar plantillas de Control de Presupuesto.
 * Mismo shape que el objeto `data` que produce `buildControlPresupuestoData`.
 *
 * Caso elegido: presupuesto en PESOS INDEXADO POR CAC → muestra la unidad primaria
 * (pesos a hoy) + la columna de equivalencia (CAC), el bloque resumen
 * Presupuestado/Ejecutado/Saldo y la barra de avance. Así el preview ejercita el
 * render dinámico completo.
 */
const CONTROL_PRESUPUESTO_SAMPLE_DATA = {
  titulo: 'RECIBO DE PAGOS',
  fecha_emision: '22/5/2026',
  empresa_nombre: 'Tu empresa',
  domicilio: 'Costa de Oro',
  contratista: 'Rodrigo Soria',
  obra: 'Casa Tatán',
  presupuesto_label: 'Albañilería 1° etapa',
  tipo: 'gastos',
  moneda: 'ARS',
  indexacion: 'CAC',
  mostrar_equiv: true,
  equiv_label: 'CAC',
  presupuestado: 8750000,
  ejecutado: 7250000,
  saldo: 1500000,
  avance_pct: 82.86,
  presupuestado_equiv: 17500,
  ejecutado_equiv: 14500,
  saldo_equiv: 3000,
  movimientos: [
    { numero: 1, fecha: '27/3/2026', detalle: 'Entrega', proveedor: 'Rodrigo Soria', categoria: 'Albañilería', monto: 300000, acumulado: 300000, monto_equiv: 600, acumulado_equiv: 600 },
    { numero: 2, fecha: '28/3/2026', detalle: 'Entrega', proveedor: 'Rodrigo Soria', categoria: 'Albañilería', monto: 400000, acumulado: 700000, monto_equiv: 800, acumulado_equiv: 1400 },
    { numero: 3, fecha: '10/4/2026', detalle: 'Entrega', proveedor: 'Rodrigo Soria', categoria: 'Albañilería', monto: 1050000, acumulado: 1750000, monto_equiv: 2100, acumulado_equiv: 3500 },
    { numero: 4, fecha: '17/4/2026', detalle: 'Entrega', proveedor: 'Rodrigo Soria', categoria: 'Albañilería', monto: 600000, acumulado: 2350000, monto_equiv: 1200, acumulado_equiv: 4700 },
    { numero: 5, fecha: '24/4/2026', detalle: 'Entrega', proveedor: 'Rodrigo Soria', categoria: 'Albañilería', monto: 900000, acumulado: 3250000, monto_equiv: 1800, acumulado_equiv: 6500 },
    { numero: 6, fecha: '30/4/2026', detalle: 'Entrega', proveedor: 'Rodrigo Soria', categoria: 'Albañilería', monto: 1000000, acumulado: 4250000, monto_equiv: 2000, acumulado_equiv: 8500 },
    { numero: 7, fecha: '8/5/2026', detalle: 'Entrega', proveedor: 'Rodrigo Soria', categoria: 'Albañilería', monto: 1000000, acumulado: 5250000, monto_equiv: 2000, acumulado_equiv: 10500 },
    { numero: 8, fecha: '15/5/2026', detalle: 'Entrega', proveedor: 'Rodrigo Soria', categoria: 'Albañilería', monto: 1000000, acumulado: 6250000, monto_equiv: 2000, acumulado_equiv: 12500 },
    { numero: 9, fecha: '22/5/2026', detalle: 'Entrega', proveedor: 'Rodrigo Soria', categoria: 'Albañilería', monto: 1000000, acumulado: 7250000, monto_equiv: 2000, acumulado_equiv: 14500 },
  ],
};

export default CONTROL_PRESUPUESTO_SAMPLE_DATA;
