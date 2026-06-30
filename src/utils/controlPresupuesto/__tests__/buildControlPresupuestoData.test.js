import buildControlPresupuestoData from '../buildControlPresupuestoData';

const mov = (seconds, total, moneda, eq) => ({
  fecha_factura: { seconds },
  total,
  moneda,
  nombre_proveedor: 'Proveedor',
  equivalencias: eq ? { total: eq } : undefined,
});

describe('buildControlPresupuestoData', () => {
  describe("modo 'cac' (pesos a hoy, presupuesto indexado por CAC)", () => {
    const movimientos = [
      mov(200, 700000, 'ARS', { ars: 700000, cac: 1400, usd_blue: 580 }),
      mov(100, 300000, 'ARS', { ars: 300000, cac: 600, usd_blue: 250 }),
    ];
    const data = buildControlPresupuestoData({
      movimientos,
      titulo: 'RECIBO DE PAGOS',
      modo: 'cac',
      indexacion: 'CAC',
      monedaPresupuesto: 'CAC',
      cacTipo: 'general',
      presupuestadoNativo: 3000, // CAC units
      cacIndiceActual: 500,
    });

    test('flags y moneda primaria', () => {
      expect(data.modo).toBe('cac');
      expect(data.modo_label).toBe('CAC a hoy');
      expect(data.moneda).toBe('ARS');
      expect(data.indexacion).toBe('CAC');
      expect(data.mostrar_equiv).toBe(true);
      expect(data.equiv_label).toBe('CAC');
    });

    test('ejecutado coherente: CAC nativo y pesos a hoy (= nativo × índice)', () => {
      expect(data.ejecutado_equiv).toBe(2000); // 600 + 1400
      expect(data.ejecutado).toBe(1000000); // 2000 × 500
    });

    test('presupuestado en ambas unidades', () => {
      expect(data.presupuestado_equiv).toBe(3000);
      expect(data.presupuestado).toBe(1500000); // 3000 × 500
    });

    test('saldo NUNCA mezcla pesos − CAC (mismo nivel en cada unidad)', () => {
      expect(data.saldo).toBe(500000); // 1.5M − 1M
      expect(data.saldo_equiv).toBe(1000); // 3000 − 2000
    });

    test('avance_pct = ejecutado / presupuestado', () => {
      expect(data.avance_pct).toBeCloseTo((1000000 / 1500000) * 100, 5);
    });

    test('movimientos ordenados cronológicamente con monto + equivalencia', () => {
      expect(data.movimientos.map((m) => m.numero)).toEqual([1, 2]);
      expect(data.movimientos[0]).toMatchObject({ monto: 300000, monto_equiv: 600, acumulado: 300000, acumulado_equiv: 600 });
      expect(data.movimientos[1]).toMatchObject({ monto: 700000, monto_equiv: 1400, acumulado: 1000000, acumulado_equiv: 2000 });
    });
  });

  describe("modo 'nominal' (default, pesos reales)", () => {
    const movimientos = [
      mov(200, 700000, 'ARS', { ars: 700000, cac: 1400, usd_blue: 580 }),
      mov(100, 300000, 'ARS', { ars: 300000, cac: 600, usd_blue: 250 }),
    ];

    test('es el modo por defecto cuando no se pasa modo', () => {
      const data = buildControlPresupuestoData({ movimientos, indexacion: 'CAC' });
      expect(data.modo).toBe('nominal');
      expect(data.modo_label).toBe('Nominal');
    });

    test('presupuesto indexado por CAC mostrado en nominal: sin equivalencia, pesos reales', () => {
      const data = buildControlPresupuestoData({
        movimientos,
        modo: 'nominal',
        indexacion: 'CAC',
        monedaPresupuesto: 'CAC',
        presupuestadoNominal: 1200000,
        cacIndiceActual: 500, // se ignora en nominal
      });
      expect(data.moneda).toBe('ARS');
      expect(data.indexacion).toBe(null);
      expect(data.mostrar_equiv).toBe(false);
      expect(data.equiv_label).toBe('');
      // ejecutado = Σ pesos reales (eq.ars), NO caquificado.
      expect(data.ejecutado).toBe(1000000); // 300000 + 700000
      expect(data.presupuestado).toBe(1200000); // nominal provisto
      expect(data.saldo).toBe(200000);
      expect(data.movimientos[0]).toMatchObject({ monto: 300000, monto_equiv: null });
    });

    test('nominal ≠ caquificado cuando el índice del momento ≠ el actual (raíz del ticket)', () => {
      // Pago de $300.000 hecho con índice CAC del momento = 300 (cac = 1000),
      // pero el índice actual es 500 → caquificado = 1000 × 500 = 500.000.
      const movs = [mov(100, 300000, 'ARS', { ars: 300000, cac: 1000 })];
      const args = {
        movimientos: movs,
        indexacion: 'CAC',
        monedaPresupuesto: 'CAC',
        presupuestadoNominal: 300000,
        presupuestadoNativo: 1000,
        cacIndiceActual: 500,
      };
      const nominal = buildControlPresupuestoData({ ...args, modo: 'nominal' });
      const cac = buildControlPresupuestoData({ ...args, modo: 'cac' });
      expect(nominal.ejecutado).toBe(300000); // pesos reales pagados
      expect(cac.ejecutado).toBe(500000); // caquificado a hoy
      expect(nominal.ejecutado).not.toBe(cac.ejecutado);
    });
  });

  test('regresión: modo cac no mezcla pesos − CAC', () => {
    const data = buildControlPresupuestoData({
      movimientos: [mov(100, 0, 'ARS', { ars: 30000, cac: 60 })],
      modo: 'cac',
      indexacion: 'CAC',
      monedaPresupuesto: 'CAC',
      presupuestadoNativo: 100, // CAC
      cacIndiceActual: 500,
    });
    expect(data.presupuestado).toBe(50000); // 100 × 500
    expect(data.ejecutado).toBe(30000); // 60 × 500
    expect(data.saldo).toBe(20000); // coherente
    expect(data.saldo).not.toBe(50000 - 60); // el bug viejo
  });

  test('modo cac + cac_tipo mano_obra → equiv_label "CAC MO"', () => {
    const data = buildControlPresupuestoData({
      movimientos: [mov(100, 0, 'ARS', { ars: 1000, cac: 2 })],
      modo: 'cac',
      indexacion: 'CAC',
      cacTipo: 'mano_obra',
      presupuestadoNativo: 10,
      cacIndiceActual: 500,
    });
    expect(data.equiv_label).toBe('CAC MO');
  });

  test("modo 'usd' → solo USD, sin equivalencia", () => {
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
    expect(data.modo_label).toBe('USD');
    expect(data.mostrar_equiv).toBe(false);
    expect(data.ejecutado).toBe(450); // 200 (USD nativo) + 250 (eq.usd_blue del ARS)
    expect(data.presupuestado).toBe(1000);
    expect(data.saldo).toBe(550);
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
});
