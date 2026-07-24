// Aísla la lógica de agregación: mockeamos getAmount para que un movimiento en USD
// valga su `total` tal cual, y así testeamos el cruce sin depender del motor.
jest.mock('../../../tools/reportEngine', () => ({
  getAmount: (mov) => Number(mov?.total ?? 0),
}));

import {
  buildObraRows,
  buildTotales,
  buildDetalle,
} from '../aggregate';

const proyectos = [
  { id: 'p1', nombre: 'Roberto', superficie_total_m2: 500 },
  { id: 'p2', nombre: 'Dúplex Playa', superficie_total_m2: 400 },
];

// Todo en USD (moneda USD → getAmount/presupuestoUsd devuelven el nominal).
const movimientos = [
  { proyecto_id: 'p1', type: 'egreso', total: 300000, moneda: 'USD', categoria: 'Estructura' },
  { proyecto_id: 'p1', type: 'egreso', total: 150000, moneda: 'USD', categoria: 'Materiales' },
  { proyecto_id: 'p2', type: 'egreso', total: 580000, moneda: 'USD', categoria: 'Estructura' },
];

const presupuestos = [
  { proyecto_id: 'p1', tipo: 'ingreso', monto_presupuestado: 1000000, moneda_almacenamiento: 'USD' },
  { proyecto_id: 'p1', tipo: 'egreso', monto_presupuestado: 700000, moneda_almacenamiento: 'USD', clasificaciones: [{ categoria: 'Estructura' }] },
  { proyecto_id: 'p2', tipo: 'ingreso', monto_presupuestado: 800000, moneda_almacenamiento: 'USD' },
  { proyecto_id: 'p2', tipo: 'egreso', monto_presupuestado: 620000, moneda_almacenamiento: 'USD', clasificaciones: [{ categoria: 'Estructura' }] },
];

const planes = [
  {
    _id: 'plan1',
    proyecto_id: 'p1',
    moneda: 'USD',
    cuotas: [
      { numero: 1, monto: 250000, monto_cobrado: 250000, estado: 'cobrada', fecha_vencimiento: '2026-06-10' },
      { numero: 2, monto: 250000, monto_cobrado: 250000, estado: 'cobrada', fecha_vencimiento: '2026-07-10' },
      { numero: 3, monto: 250000, monto_cobrado: 0, estado: 'pendiente', fecha_vencimiento: '2030-01-10' },
      { numero: 4, monto: 250000, monto_cobrado: 0, estado: 'vencida', fecha_vencimiento: '2020-01-10' },
    ],
  },
];

describe('buildObraRows', () => {
  const rows = buildObraRows({ proyectos, movimientos, presupuestos, planes, dolar: 1000 });
  const roberto = rows.find((r) => r.proyectoId === 'p1');

  test('cruza venta/costo/gastado/cobrado por obra', () => {
    expect(roberto.venta).toBe(1000000);
    expect(roberto.costo).toBe(700000);
    expect(roberto.gastado).toBe(450000);
    expect(roberto.cobrado).toBe(500000); // 2 cuotas cobradas
    expect(roberto.margen).toBe(300000);
  });

  test('calcula por m² con la superficie de la obra', () => {
    expect(roberto.costoM2).toBe(1400); // 700000 / 500
    expect(roberto.precioM2).toBe(2000); // 1000000 / 500
    expect(roberto.gananciaM2).toBe(600); // 300000 / 500
  });

  test('separa vencido y a-cobrar', () => {
    expect(roberto.vencido).toBe(250000); // cuota 4
    expect(roberto.aCobrar).toBe(1000000); // 4 cuotas de 250k
    expect(roberto.modoCobro).toBe('Por cuotas');
  });

  test('ordena por venta desc', () => {
    expect(rows[0].proyectoId).toBe('p1');
    expect(rows[1].proyectoId).toBe('p2');
  });
});

describe('buildTotales', () => {
  const rows = buildObraRows({ proyectos, movimientos, presupuestos, planes, dolar: 1000 });
  const t = buildTotales(rows);

  test('suma la cartera', () => {
    expect(t.venta).toBe(1800000); // 1M + 0.8M
    expect(t.costo).toBe(1320000); // 0.7M + 0.62M
    expect(t.gastado).toBe(1030000); // 0.45M + 0.58M
    expect(t.margen).toBe(480000);
  });

  test('por m² pondera sobre m² totales', () => {
    expect(t.costoM2).toBe(1320000 / 900);
  });
});

describe('buildDetalle', () => {
  const detalle = buildDetalle({
    proyecto: proyectos[0],
    movimientos,
    presupuestos,
    planes,
    dolar: 1000,
  });

  test('cuotas quién debe: sólo pendientes/vencidas con saldo, ordenadas', () => {
    expect(detalle.cuotas).toHaveLength(2);
    expect(detalle.cuotas[0].vencida).toBe(true); // la de 2020 primero
    expect(detalle.cuotas.every((c) => c.monto > 0)).toBe(true);
  });

  test('gasto por categoría marca excedido', () => {
    const estructura = detalle.gastoPorCategoria.find((c) => c.categoria === 'Estructura');
    expect(estructura.gastado).toBe(300000);
    expect(estructura.presupuestado).toBe(700000);
    expect(estructura.excedido).toBe(false);
  });

  test('cash flow agrupa por mes', () => {
    expect(detalle.cashflow.length).toBeGreaterThan(0);
    const jul = detalle.cashflow.find((m) => m.mes === '2026-07');
    expect(jul.cobrado).toBe(250000);
  });
});
