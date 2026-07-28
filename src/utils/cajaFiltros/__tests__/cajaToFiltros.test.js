import { cajaToFiltros, filtrosToParam, denormalizarEscalares, describirCondiciones, esCajaVista } from '../cajaToFiltros';

describe('cajaToFiltros — precedencia y adapter legacy', () => {
  test('caja filterSet → null (no-op, se aplica por el path de vista)', () => {
    expect(cajaToFiltros({ filterSet: { categorias: ['A'] } })).toBeNull();
    expect(esCajaVista({ filterSet: {} })).toBe(true);
  });

  test('caja con filtros → se usa tal cual', () => {
    const filtros = { match: 'any', condiciones: [{ campo: 'categoria', operador: 'no_es', valores: ['X'] }] };
    expect(cajaToFiltros({ filtros })).toBe(filtros);
  });

  test('caja legacy scope → deriva condiciones "es" (moneda NO)', () => {
    const out = cajaToFiltros({ moneda: 'ARS', medios_pago: ['Efectivo', 'Débito'], type: 'egreso', categorias: ['Obra'] });
    expect(out.match).toBe('all');
    expect(out.condiciones).toEqual(expect.arrayContaining([
      { campo: 'medio_pago', operador: 'es', valores: ['Efectivo', 'Débito'] },
      { campo: 'tipo', operador: 'es', valores: ['egreso'] },
      { campo: 'categoria', operador: 'es', valores: ['Obra'] },
    ]));
    // moneda es control dedicado, no condición
    expect(out.condiciones.some((c) => c.campo === 'moneda')).toBe(false);
  });

  test('caja legacy con medio_pago string (pre TAR-581)', () => {
    const out = cajaToFiltros({ medio_pago: 'Efectivo' });
    expect(out.condiciones).toEqual([{ campo: 'medio_pago', operador: 'es', valores: ['Efectivo'] }]);
  });

  test('asignado sentinel → operador vacío', () => {
    const out = cajaToFiltros({ asignados: ['__sin_asignar__'] });
    expect(out.condiciones).toEqual([{ campo: 'asignado', operador: 'vacio' }]);
  });

  test('caja sin scope ni filtros → null', () => {
    expect(cajaToFiltros({ moneda: 'ARS', equivalencia: 'none' })).toBeNull();
  });
});

describe('filtrosToParam', () => {
  test('serializa condiciones', () => {
    const p = filtrosToParam({ match: 'all', condiciones: [{ campo: 'categoria', operador: 'vacio' }] });
    expect(JSON.parse(p).condiciones[0].operador).toBe('vacio');
  });
  test('sin condiciones → null', () => {
    expect(filtrosToParam({ match: 'all', condiciones: [] })).toBeNull();
    expect(filtrosToParam(null)).toBeNull();
  });
});

describe('denormalizarEscalares — para consumidores legacy', () => {
  test('extrae escalares de condiciones "es"', () => {
    const out = denormalizarEscalares({ match: 'all', condiciones: [
      { campo: 'medio_pago', operador: 'es', valores: ['Efectivo', 'Débito'] },
      { campo: 'categoria', operador: 'es', valores: ['Obra'] },
      { campo: 'categoria', operador: 'no_es', valores: ['Materiales'] }, // no_es no denormaliza
    ] });
    expect(out.medios_pago).toEqual(['Efectivo', 'Débito']);
    expect(out.medio_pago).toBe('Efectivo');
    expect(out.categorias).toEqual(['Obra']);
  });
});

describe('describirCondiciones — chips', () => {
  test('textos legibles por tipo', () => {
    const chips = describirCondiciones({ match: 'all', condiciones: [
      { campo: 'categoria', operador: 'no_es', valores: ['Materiales'] },
      { campo: 'monto', operador: 'mayor_igual', valor: 10000 },
      { campo: 'categoria', operador: 'vacio' },
      { campo: 'fecha_factura', operador: 'relativa', valor: 'este_mes' },
    ] });
    expect(chips[0]).toBe('Categoría no es Materiales');
    expect(chips[1]).toBe('Monto ≥ 10.000');
    expect(chips[2]).toBe('Categoría vacío');
    expect(chips[3]).toBe('Fecha de factura: este mes');
  });
});
