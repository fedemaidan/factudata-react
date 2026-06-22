import {
  processCollectionsSummary,
  processCollectionsSchedule,
  processCollectionsChart,
  processCollectionsAging,
  processCollectionsPlans,
  processCollectionsInstallments,
} from '../reportEngine';

const iso = (d) => d.toISOString().slice(0, 10);

function buildPlanes() {
  const today = new Date();
  const past = new Date(today); past.setDate(past.getDate() - 10);   // vencida
  const soon = new Date(today); soon.setDate(soon.getDate() + 20);    // por vencer

  return [
    {
      _id: 'p1', codigo: 1, nombre: 'Casa Lopez', estado: 'activo', moneda: 'ARS', indexacion: null, proyecto_id: 'proj1',
      cuotas: [
        { _id: 'c1', numero: 1, fecha_vencimiento: iso(past), monto: 100000, monto_cobrado: 0, estado: 'pendiente', estado_ui: 'vencida', descripcion: 'Anticipo' },
        { _id: 'c2', numero: 2, fecha_vencimiento: iso(soon), monto: 200000, monto_cobrado: 0, estado: 'pendiente', estado_ui: 'pendiente' },
        { _id: 'c3', numero: 3, fecha_vencimiento: iso(soon), monto: 50000, monto_cobrado: 50000, estado: 'cobrada', estado_ui: 'cobrada' },
      ],
    },
    {
      // Plan indexado CAC: la cuota se valoriza monto_cac * cac_hoy (100 * 2000 = 200000), no el nominal 150000.
      _id: 'p2', codigo: 2, nombre: 'Edificio Sur', estado: 'activo', moneda: 'ARS', indexacion: 'CAC', proyecto_id: 'proj2',
      cuotas: [
        { _id: 'c4', numero: 1, fecha_vencimiento: iso(soon), monto: 150000, monto_cac: 100, monto_cobrado: 0, estado: 'pendiente', estado_ui: 'pendiente' },
      ],
    },
    {
      // Completado: excluido por default (plan_estados = ['activo']).
      _id: 'p3', codigo: 3, nombre: 'Viejo', estado: 'completado', moneda: 'ARS', indexacion: null, proyecto_id: 'proj1',
      cuotas: [{ _id: 'c5', numero: 1, fecha_vencimiento: iso(past), monto: 999999, monto_cobrado: 999999, estado: 'cobrada', estado_ui: 'cobrada' }],
    },
  ];
}

const cotizaciones = { cac: 2000, dolar_blue: 1000 };
const ctx = (planes) => ({ planesCobro: planes, proyectos: [{ id: 'proj1', nombre: 'Proyecto Uno' }, { id: 'proj2', nombre: 'Proyecto Dos' }] });

describe('collections processors', () => {
  test('summary KPIs valorizan CAC y excluyen completados', () => {
    const planes = buildPlanes();
    const data = processCollectionsSummary({}, [], [], ['ARS'], cotizaciones, ctx(planes));
    const byId = Object.fromEntries(data.map((m) => [m.id, m.valor]));
    expect(byId.total_cobrar).toBe(550000);   // 100k+200k+50k + 200k(CAC)
    expect(byId.cobrado).toBe(50000);
    expect(byId.pendiente).toBe(500000);       // 100k+200k+200k
    expect(byId.vencido).toBe(100000);         // c1
  });

  test('schedule separa el bucket vencido y agrupa por mes', () => {
    const planes = buildPlanes();
    const data = processCollectionsSchedule({}, [], [], ['ARS'], cotizaciones, ctx(planes));
    const vencido = data.rows.find((r) => /Vencido/.test(r.grupo));
    expect(vencido).toBeTruthy();
    expect(vencido.a_cobrar).toBe(100000);
    expect(data.totals.a_cobrar).toBe(500000);
  });

  test('chart: solo futuro por default, ordenado año-mes y tipo bar', () => {
    const planes = buildPlanes();
    const data = processCollectionsChart({}, [], [], ['ARS'], cotizaciones, ctx(planes));
    expect(data.chartType).toBe('bar');
    // No incluye el bucket vencido (incluir_vencidas default false en el gráfico).
    expect(data.rows.some((r) => /Vencido/.test(r.grupo))).toBe(false);
    // Una sola serie numérica: a_cobrar.
    expect(data.headers.filter((h) => h.id !== 'grupo')).toHaveLength(1);
    // c2 + c4 caen en el mismo mes futuro → 400000.
    expect(data.totals.a_cobrar).toBe(400000);
  });

  test('chart: incluir_vencidas=true suma el bucket vencido', () => {
    const planes = buildPlanes();
    const data = processCollectionsChart({ incluir_vencidas: true, chart_type: 'line' }, [], [], ['ARS'], cotizaciones, ctx(planes));
    expect(data.chartType).toBe('line');
    expect(data.rows.some((r) => /Vencido/.test(r.grupo))).toBe(true);
    expect(data.totals.a_cobrar).toBe(500000);
  });

  test('aging clasifica por antigüedad', () => {
    const planes = buildPlanes();
    const data = processCollectionsAging({}, [], [], ['ARS'], cotizaciones, ctx(planes));
    const byGrupo = Object.fromEntries(data.rows.map((r) => [r.grupo, r]));
    expect(byGrupo['Por vencer'].monto).toBe(400000);  // c2 + c4
    expect(byGrupo['Por vencer'].cantidad).toBe(2);
    expect(byGrupo['1-30 días'].monto).toBe(100000);   // c1
    expect(data.totals.cantidad).toBe(3);
  });

  test('plans: una fila por plan activo, ordenado por pendiente', () => {
    const planes = buildPlanes();
    const data = processCollectionsPlans({}, [], [], ['ARS'], cotizaciones, ctx(planes));
    expect(data.rows).toHaveLength(2);
    expect(data.rows[0].pendiente).toBeGreaterThanOrEqual(data.rows[1].pendiente);
    const lopez = data.rows.find((r) => /Casa Lopez/.test(r.grupo));
    expect(lopez.total).toBe(350000);
    expect(lopez.cobrado).toBe(50000);
    expect(lopez.estado).toBe('Activo');
  });

  test('installments lista solo cuotas pendientes valorizadas', () => {
    const planes = buildPlanes();
    const data = processCollectionsInstallments({}, [], [], ['ARS'], cotizaciones, ctx(planes));
    expect(data.rows).toHaveLength(3);           // c1, c2, c4 (no c3 cobrada, no p3)
    expect(data.totals.saldo).toBe(500000);
    const cac = data.rows.find((r) => r.grupo === 'Edificio Sur');
    expect(cac.monto).toBe(200000);              // valorizado, no 150000
  });

  test('plan_estados permite incluir completados', () => {
    const planes = buildPlanes();
    const data = processCollectionsPlans({ plan_estados: ['activo', 'completado'] }, [], [], ['ARS'], cotizaciones, ctx(planes));
    expect(data.rows).toHaveLength(3);
  });
});
