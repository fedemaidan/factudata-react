import { calcPresupuestadoNominal, calcEjecutadoNominalARS } from '../presupuestoNominal';

describe('calcPresupuestadoNominal', () => {
  test('CAC indexado: monto_ingresado + adicionales valuados a su snapshot', () => {
    const presupuesto = {
      indexacion: 'CAC',
      monto_ingresado: 1000000,
      adicionales: [
        { monto: 100, cotizacion_snapshot: { cac_indice: 400 } }, // 40.000
        { monto: 50, cotizacion_snapshot: { cac_general: 300 } }, // 15.000 (fallback a cac_general)
      ],
    };
    expect(calcPresupuestadoNominal(presupuesto)).toBe(1000000 + 40000 + 15000);
  });

  test('USD indexado: usa dolar_blue del snapshot del adicional', () => {
    const presupuesto = {
      indexacion: 'USD',
      monto_ingresado: 500000,
      adicionales: [{ monto: 100, cotizacion_snapshot: { dolar_blue: 1200 } }], // 120.000
    };
    expect(calcPresupuestadoNominal(presupuesto)).toBe(500000 + 120000);
  });

  test('plano (sin indexación): monto ya es el total nominal', () => {
    expect(calcPresupuestadoNominal({ monto: 800000 })).toBe(800000);
  });

  test('adicional sin snapshot no rompe (cuenta 0)', () => {
    const presupuesto = { indexacion: 'CAC', monto_ingresado: 1000, adicionales: [{ monto: 5 }] };
    expect(calcPresupuestadoNominal(presupuesto)).toBe(1000);
  });
});

describe('calcEjecutadoNominalARS', () => {
  const mov = (total, moneda, eq) => ({ total, moneda, equivalencias: eq ? { total: eq } : undefined });

  test('suma eq.ars (pesos reales) con fallback al total', () => {
    const movimientos = [
      mov(300000, 'ARS', { ars: 300000, cac: 1000 }),
      mov(700000, 'ARS', { ars: 700000, cac: 2000 }),
      mov(50, 'USD', { ars: 60000, usd_blue: 50 }), // USD → su ARS nominal
      mov(5000, 'ARS'), // sin equivalencias → fallback al total
    ];
    expect(calcEjecutadoNominalARS(movimientos)).toBe(300000 + 700000 + 60000 + 5000);
  });

  test('respeta base de cálculo subtotal', () => {
    const movimientos = [{ total: 121000, subtotal: 100000, equivalencias: { subtotal: { ars: 100000 }, total: { ars: 121000 } } }];
    expect(calcEjecutadoNominalARS(movimientos, 'subtotal')).toBe(100000);
  });
});
