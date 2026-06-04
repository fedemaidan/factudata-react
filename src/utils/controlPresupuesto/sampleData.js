/**
 * Datos de muestra para previsualizar plantillas de Control de Presupuesto.
 * Mismo shape que el objeto `data` que recibirá la plantilla en el export real
 * (el builder de datos reales se implementa en una etapa posterior).
 * Basado en el recibo de referencia (RECIBO DE PAGOS).
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
  presupuestado: 8750000,
  ejecutado: 7250000,
  saldo: 1500000,
  avance_pct: 82.86,
  movimientos: [
    { numero: 1, fecha: '27/3/2026', detalle: 'Entrega', proveedor: 'Rodrigo Soria', categoria: 'Albañilería', monto: 300000, acumulado: 300000 },
    { numero: 2, fecha: '28/3/2026', detalle: 'Entrega', proveedor: 'Rodrigo Soria', categoria: 'Albañilería', monto: 400000, acumulado: 700000 },
    { numero: 3, fecha: '10/4/2026', detalle: 'Entrega', proveedor: 'Rodrigo Soria', categoria: 'Albañilería', monto: 1050000, acumulado: 1750000 },
    { numero: 4, fecha: '17/4/2026', detalle: 'Entrega', proveedor: 'Rodrigo Soria', categoria: 'Albañilería', monto: 600000, acumulado: 2350000 },
    { numero: 5, fecha: '24/4/2026', detalle: 'Entrega', proveedor: 'Rodrigo Soria', categoria: 'Albañilería', monto: 900000, acumulado: 3250000 },
    { numero: 6, fecha: '30/4/2026', detalle: 'Entrega', proveedor: 'Rodrigo Soria', categoria: 'Albañilería', monto: 1000000, acumulado: 4250000 },
    { numero: 7, fecha: '8/5/2026', detalle: 'Entrega', proveedor: 'Rodrigo Soria', categoria: 'Albañilería', monto: 1000000, acumulado: 5250000 },
    { numero: 8, fecha: '15/5/2026', detalle: 'Entrega', proveedor: 'Rodrigo Soria', categoria: 'Albañilería', monto: 1000000, acumulado: 6250000 },
    { numero: 9, fecha: '22/5/2026', detalle: 'Entrega', proveedor: 'Rodrigo Soria', categoria: 'Albañilería', monto: 1000000, acumulado: 7250000 },
  ],
};

export default CONTROL_PRESUPUESTO_SAMPLE_DATA;
