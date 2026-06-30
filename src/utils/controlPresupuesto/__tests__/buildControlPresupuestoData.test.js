import buildControlPresupuestoData from '../buildControlPresupuestoData';

const mov = (seconds, total, moneda, eq) => ({
  fecha_factura: { seconds },
  total,
  moneda,
  nombre_proveedor: 'Proveedor',
  equivalencias: eq ? { total: eq } : undefined,
});

describe('buildControlPresupuestoData', () => {
  describe("modo 'cac' (movimientos nominal + CAC, resumen en CAC)", () => {
    // eq.ars (nominal) distinto de cac × índice a propósito: prueba que el monto de
    // cada movimiento es el NOMINAL, no el caquificado.
    const movimientos = [
      mov(200, 0, 'ARS', { ars: 660000, cac: 1400 }),
      mov(100, 0, 'ARS', { ars: 280000, cac: 600 }),
    ];
    const data = buildControlPresupuestoData({
      movimientos,
      titulo: 'RECIBO DE PAGOS',
      modo: 'cac',
      indexacion: 'CAC',
      cacTipo: 'general',
      presupuestadoNativo: 3000, // CAC units
      cacIndiceActual: 500,
    });

    test('flags y etiquetas', () => {
      expect(data.modo).toBe('cac');
      expect(data.modo_label).toBe('CAC a hoy');
      expect(data.moneda).toBe('ARS');
      expect(data.mostrar_equiv).toBe(true);
      expect(data.equiv_label).toBe('CAC');
    });

    test('movimientos: monto = $ nominal (eq.ars), equivalente = CAC', () => {
      expect(data.movimientos.map((m) => m.numero)).toEqual([1, 2]);
      expect(data.movimientos[0]).toMatchObject({ monto: 280000, monto_equiv: 600, acumulado: 280000, acumulado_equiv: 600 });
      expect(data.movimientos[1]).toMatchObject({ monto: 660000, monto_equiv: 1400, acumulado: 940000, acumulado_equiv: 2000 });
    });

    test('resumen en CAC (titular) + pesos a hoy (= CAC × índice)', () => {
      expect(data.ejecutado_equiv).toBe(2000); // 600 + 1400 CAC
      expect(data.ejecutado).toBe(1000000); // 2000 × 500 (pesos a hoy)
      expect(data.presupuestado_equiv).toBe(3000);
      expect(data.presupuestado).toBe(1500000); // 3000 × 500
      expect(data.saldo_equiv).toBe(1000);
      expect(data.saldo).toBe(500000);
    });

    test('avance por índice (CAC)', () => {
      expect(data.avance_pct).toBeCloseTo((2000 / 3000) * 100, 5);
    });
  });

  test("modo 'cac' con cacTipo mano_obra → usa cac_mano_obra y etiqueta 'CAC MO'", () => {
    const data = buildControlPresupuestoData({
      movimientos: [mov(100, 0, 'ARS', { ars: 1000, cac: 2, cac_mano_obra: 3 })],
      modo: 'cac',
      indexacion: 'CAC',
      cacTipo: 'mano_obra',
      presupuestadoNativo: 10,
      cacIndiceActual: 500,
    });
    expect(data.equiv_label).toBe('CAC MO');
    expect(data.movimientos[0].monto_equiv).toBe(3); // cac_mano_obra, NO cac general
    expect(data.ejecutado_equiv).toBe(3);
  });

  test("modo 'cac' funciona a nivel proyecto (sin indexacion, con índice)", () => {
    const data = buildControlPresupuestoData({
      movimientos: [mov(100, 0, 'ARS', { ars: 300000, cac: 600 })],
      modo: 'cac',
      presupuestadoNativo: 1000, // CAC equiv del total del proyecto
      cacIndiceActual: 500,
    });
    expect(data.mostrar_equiv).toBe(true);
    expect(data.movimientos[0]).toMatchObject({ monto: 300000, monto_equiv: 600 });
    expect(data.presupuestado_equiv).toBe(1000);
    expect(data.presupuestado).toBe(500000);
  });

  describe("modo 'nominal' (default, pesos reales)", () => {
    const movimientos = [
      mov(200, 700000, 'ARS', { ars: 700000, cac: 1400 }),
      mov(100, 300000, 'ARS', { ars: 300000, cac: 600 }),
    ];

    test('es el modo por defecto cuando no se pasa modo', () => {
      const data = buildControlPresupuestoData({ movimientos, indexacion: 'CAC' });
      expect(data.modo).toBe('nominal');
      expect(data.mostrar_equiv).toBe(false);
    });

    test('pesos reales, sin equivalencia', () => {
      const data = buildControlPresupuestoData({
        movimientos,
        modo: 'nominal',
        indexacion: 'CAC',
        presupuestadoNominal: 1200000,
        cacIndiceActual: 500, // se ignora en nominal
      });
      expect(data.moneda).toBe('ARS');
      expect(data.mostrar_equiv).toBe(false);
      expect(data.ejecutado).toBe(1000000); // 300000 + 700000
      expect(data.presupuestado).toBe(1200000);
      expect(data.saldo).toBe(200000);
      expect(data.movimientos[0]).toMatchObject({ monto: 300000, monto_equiv: null });
    });
  });

  describe("modo 'usd'", () => {
    test('indexado por dólar → movimientos $ nominal + USD, resumen en USD', () => {
      const data = buildControlPresupuestoData({
        movimientos: [mov(100, 0, 'ARS', { ars: 300000, usd_blue: 250 })],
        modo: 'usd',
        indexacion: 'USD',
        presupuestadoNativo: 1000, // USD
        tipoCambioActual: 1200,
      });
      expect(data.moneda).toBe('ARS');
      expect(data.mostrar_equiv).toBe(true);
      expect(data.equiv_label).toBe('USD');
      expect(data.movimientos[0]).toMatchObject({ monto: 300000, monto_equiv: 250 });
      expect(data.ejecutado_equiv).toBe(250);
      expect(data.ejecutado).toBe(300000); // 250 × 1200
      expect(data.presupuestado_equiv).toBe(1000);
      expect(data.presupuestado).toBe(1200000); // 1000 × 1200
      expect(data.saldo_equiv).toBe(750);
    });

    test('nativo en dólares → solo USD, sin equivalencia', () => {
      const data = buildControlPresupuestoData({
        movimientos: [
          mov(100, 200, 'USD', { ars: 250000, usd_blue: 200 }),
          mov(200, 300000, 'ARS', { ars: 300000, usd_blue: 250 }),
        ],
        modo: 'usd',
        monedaPresupuesto: 'USD',
        presupuestadoNativo: 1000,
      });
      expect(data.moneda).toBe('USD');
      expect(data.mostrar_equiv).toBe(false);
      expect(data.ejecutado).toBe(450); // 200 (USD nativo) + 250 (eq.usd_blue del ARS)
      expect(data.presupuestado).toBe(1000);
      expect(data.saldo).toBe(550);
    });
  });

  test('presupuesto en pesos plano (nominal default) → solo pesos', () => {
    const data = buildControlPresupuestoData({
      movimientos: [
        mov(100, 300000, 'ARS', { ars: 300000 }),
        mov(200, 400000, 'ARS', { ars: 400000 }),
      ],
      monedaPresupuesto: 'ARS',
      presupuestadoNativo: 1000000,
    });
    expect(data.moneda).toBe('ARS');
    expect(data.mostrar_equiv).toBe(false);
    expect(data.ejecutado).toBe(700000);
    expect(data.saldo).toBe(300000);
    expect(data.avance_pct).toBeCloseTo(70, 5);
  });

  test('fallback a nivel proyecto (presupuestado compat) sigue funcionando', () => {
    const data = buildControlPresupuestoData({
      movimientos: [mov(100, 500000, 'ARS')],
      presupuestado: 800000, // firma vieja, sin nativo
    });
    expect(data.moneda).toBe('ARS');
    expect(data.ejecutado).toBe(500000);
    expect(data.saldo).toBe(300000);
  });

  // Bug fix: con fechas de Mongo (Date / ISO) el sort cronológico debe ordenar
  // del más viejo al más nuevo y acumular en ese orden (antes fechaSecs solo
  // entendía el shape de Firestore → no ordenaba y el acumulado salía al revés).
  describe('orden cronológico con fechas de Mongo (Date / ISO)', () => {
    const movMongo = (fecha, total, eq) => ({
      fecha_factura: fecha, total, moneda: 'ARS', nombre_proveedor: 'Proveedor',
      equivalencias: eq ? { total: eq } : undefined,
    });

    test('ordena del más viejo al más nuevo y acumula en ese orden (ISO desordenado)', () => {
      const data = buildControlPresupuestoData({
        movimientos: [
          movMongo('2026-06-29', 8335),   // más nuevo, llega primero
          movMongo('2026-06-08', 6000000), // más viejo, llega último
          movMongo('2026-06-20', 109350),
        ],
      });
      expect(data.movimientos.map((m) => m.fecha)).toEqual(['8/6/2026', '20/6/2026', '29/6/2026']);
      expect(data.movimientos.map((m) => m.numero)).toEqual([1, 2, 3]);
      // acumulado crece del más viejo (su propio monto) al más nuevo (total).
      expect(data.movimientos.map((m) => m.acumulado)).toEqual([6000000, 6109350, 6117685]);
    });

    test('acepta Date nativo', () => {
      const data = buildControlPresupuestoData({
        movimientos: [
          movMongo(new Date('2026-06-29'), 100),
          movMongo(new Date('2026-06-08'), 200),
        ],
      });
      expect(data.movimientos.map((m) => m.acumulado)).toEqual([200, 300]);
    });

    test('modo cac: acumulado_equiv suma en CAC del más viejo al más nuevo', () => {
      const data = buildControlPresupuestoData({
        movimientos: [
          movMongo('2026-06-29', 8335, { ars: 8335, cac: 0.41 }),
          movMongo('2026-06-08', 6000000, { ars: 6000000, cac: 292.78 }),
        ],
        modo: 'cac', indexacion: 'CAC', monedaPresupuesto: 'CAC', cacIndiceActual: 20488,
      });
      // el más viejo (8/6) primero; acumulado_equiv en CAC, no en pesos.
      expect(data.movimientos.map((m) => m.acumulado_equiv)).toEqual([292.78, 293.19]);
    });
  });
});
