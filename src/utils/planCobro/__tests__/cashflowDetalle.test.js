import {
  filasDeCelda,
  totalPorTrack,
  filasDeGestion,
  filasRealizadoAnterior,
  claveDeFila,
} from '../cashflowDetalle';

const fila = (over = {}) => ({
  cuota_id: 'c1', tipo: 'esperado', bucket_key: '2026-08', track: 'ARS',
  monto: 100, fecha: '2026-08-05', vencida: false, realizado_anterior: false,
  ...over,
});

describe('filasDeCelda', () => {
  const detalle = [
    fila({ cuota_id: 'a', monto: 100, fecha: '2026-08-20' }),
    fila({ cuota_id: 'b', monto: 250, fecha: '2026-08-03' }),
    fila({ cuota_id: 'c', bucket_key: '2026-09' }),
    fila({ cuota_id: 'd', track: 'USD' }),
    fila({ cuota_id: 'e', tipo: 'cobrado' }),
    fila({ cuota_id: 'f', bucket_key: null, vencida: true }),
  ];

  test('devuelve sólo las filas del período, track y tipo pedidos', () => {
    const filas = filasDeCelda(detalle, { bucketKey: '2026-08', track: 'ARS', tipo: 'esperado' });
    expect(filas.map((r) => r.cuota_id)).toEqual(['b', 'a']); // ordenadas por fecha
  });

  test('el desglose de una celda suma exactamente el total de esa celda', () => {
    const filas = filasDeCelda(detalle, { bucketKey: '2026-08', track: 'ARS', tipo: 'esperado' });
    expect(totalPorTrack(filas).ARS).toBe(350);
  });

  test('no mezcla el track de dólares con el de pesos', () => {
    const usd = filasDeCelda(detalle, { bucketKey: '2026-08', track: 'USD', tipo: 'esperado' });
    expect(usd.map((r) => r.cuota_id)).toEqual(['d']);
  });

  test('separa esperado de cobrado', () => {
    const cobrado = filasDeCelda(detalle, { bucketKey: '2026-08', track: 'ARS', tipo: 'cobrado' });
    expect(cobrado.map((r) => r.cuota_id)).toEqual(['e']);
  });

  test('las filas sin bucket no aparecen en ninguna celda', () => {
    const conBucket = ['2026-08', '2026-09'].flatMap((bucketKey) =>
      filasDeCelda(detalle, { bucketKey, track: 'ARS', tipo: 'esperado' }));
    expect(conBucket.map((r) => r.cuota_id)).not.toContain('f');
  });

  test('tolera un detalle vacío o ausente', () => {
    expect(filasDeCelda(undefined, { bucketKey: 'x', track: 'ARS', tipo: 'esperado' })).toEqual([]);
  });
});

describe('totalPorTrack', () => {
  test('suma cada moneda por separado y cuenta las cuotas', () => {
    const total = totalPorTrack([
      fila({ monto: 100 }),
      fila({ monto: 250.5 }),
      fila({ monto: 30, track: 'USD' }),
    ]);
    expect(total).toEqual({ ARS: 350.5, USD: 30, cuotas: 3 });
  });

  test('sin filas devuelve ceros', () => {
    expect(totalPorTrack([])).toEqual({ ARS: 0, USD: 0, cuotas: 0 });
  });

  test('no arrastra error de coma flotante', () => {
    expect(totalPorTrack([fila({ monto: 0.1 }), fila({ monto: 0.2 })]).ARS).toBe(0.3);
  });
});

describe('filasDeGestion', () => {
  test('deja sólo las filas de esperado', () => {
    const filas = filasDeGestion([fila({ cuota_id: 'a' }), fila({ cuota_id: 'b', tipo: 'cobrado' })]);
    expect(filas.map((r) => r.cuota_id)).toEqual(['a']);
  });

  test('mantiene las vencidas aunque no pertenezcan a ningún período', () => {
    const filas = filasDeGestion([fila({ cuota_id: 'v', bucket_key: null, vencida: true })]);
    expect(filas).toHaveLength(1);
  });
});

describe('filasRealizadoAnterior', () => {
  const detalle = [
    fila({ cuota_id: 'ant2', tipo: 'cobrado', bucket_key: null, realizado_anterior: true, fecha: '2026-03-10' }),
    fila({ cuota_id: 'ant1', tipo: 'cobrado', bucket_key: null, realizado_anterior: true, fecha: '2026-01-05' }),
    fila({ cuota_id: 'usd', tipo: 'cobrado', bucket_key: null, realizado_anterior: true, track: 'USD' }),
    fila({ cuota_id: 'dentro', tipo: 'cobrado' }),
    fila({ cuota_id: 'esp', bucket_key: null, vencida: true }),
  ];

  test('devuelve los cobros previos a la ventana del track, ordenados por fecha', () => {
    expect(filasRealizadoAnterior(detalle, 'ARS').map((r) => r.cuota_id)).toEqual(['ant1', 'ant2']);
  });

  test('no mezcla tracks ni arrastra filas de esperado o dentro de la ventana', () => {
    expect(filasRealizadoAnterior(detalle, 'USD').map((r) => r.cuota_id)).toEqual(['usd']);
  });

  test('su total explica el realizado anterior del agregado', () => {
    expect(totalPorTrack(filasRealizadoAnterior(detalle, 'ARS')).ARS).toBe(200);
  });
});

describe('claveDeFila', () => {
  test('distingue la fila de esperado de la de cobrado de la misma cuota', () => {
    expect(claveDeFila(fila({ cuota_id: 'x' }))).not.toBe(claveDeFila(fila({ cuota_id: 'x', tipo: 'cobrado' })));
  });
});
