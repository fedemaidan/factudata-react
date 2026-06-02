import { copyShareableFields, SHAREABLE_FIELDS, toDateInputValue } from '../cargaMasivaMap';

const baseForm = () => ({
  type: '',
  moneda: '',
  total: '',
  subtotal: '',
  nombre_proveedor: '',
  fecha_factura: '',
  categoria: '',
  subcategoria: '',
  proyecto_id: '',
  proyecto_nombre: '',
  medio_pago: '',
  etapa: '',
  observacion: '',
  numero_factura: '',
  impuestos: [],
});

describe('copyShareableFields', () => {
  test('overwrite=false copia solo campos vacíos del target', () => {
    const source = {
      ...baseForm(),
      nombre_proveedor: 'ACME SA',
      fecha_factura: '2026-01-15',
      categoria: 'Materiales',
      proyecto_id: 'p1',
      medio_pago: 'Transferencia',
    };
    const target = {
      ...baseForm(),
      nombre_proveedor: 'YA CARGADO', // no se debe pisar
      fecha_factura: '',
      categoria: '',
      proyecto_id: '',
    };

    const out = copyShareableFields(source, target, { overwrite: false });

    expect(out.nombre_proveedor).toBe('YA CARGADO');
    expect(out.fecha_factura).toBe('2026-01-15');
    expect(out.categoria).toBe('Materiales');
    expect(out.proyecto_id).toBe('p1');
    expect(out.medio_pago).toBe('Transferencia');
  });

  test('overwrite=true pisa valores ya cargados', () => {
    const source = { ...baseForm(), nombre_proveedor: 'ACME SA', categoria: 'Materiales' };
    const target = { ...baseForm(), nombre_proveedor: 'OTRO', categoria: 'Servicios' };

    const out = copyShareableFields(source, target, { overwrite: true });

    expect(out.nombre_proveedor).toBe('ACME SA');
    expect(out.categoria).toBe('Materiales');
  });

  test('campos NO compartibles nunca se copian', () => {
    const source = {
      ...baseForm(),
      total: 999,
      subtotal: 800,
      numero_factura: '00001-12345678',
      observacion: 'algo',
      impuestos: [{ nombre: 'IVA', monto: 21 }],
      monto_pagado: 100,
      estado: 'Pagado',
    };
    const target = baseForm();

    const out = copyShareableFields(source, target, { overwrite: true });

    expect(out.total).toBe('');
    expect(out.subtotal).toBe('');
    expect(out.numero_factura).toBe('');
    expect(out.observacion).toBe('');
    expect(out.impuestos).toEqual([]);
    expect(out.monto_pagado).toBeUndefined();
    expect(out.estado).toBeUndefined();
  });

  test('source con valores vacíos no pisa target', () => {
    const source = { ...baseForm() }; // todos vacíos
    const target = {
      ...baseForm(),
      nombre_proveedor: 'YA CARGADO',
      fecha_factura: '2026-02-01',
    };

    const out = copyShareableFields(source, target, { overwrite: true });

    expect(out.nombre_proveedor).toBe('YA CARGADO');
    expect(out.fecha_factura).toBe('2026-02-01');
  });

  test('source o target null/undefined no rompe', () => {
    expect(copyShareableFields(null, baseForm())).toEqual(baseForm());
    expect(copyShareableFields(baseForm(), null)).toBeNull();
    expect(copyShareableFields(undefined, undefined)).toBeUndefined();
  });

  test('no muta los argumentos', () => {
    const source = { ...baseForm(), nombre_proveedor: 'ACME' };
    const target = baseForm();
    const targetSnap = JSON.stringify(target);
    const sourceSnap = JSON.stringify(source);

    copyShareableFields(source, target, { overwrite: true });

    expect(JSON.stringify(target)).toBe(targetSnap);
    expect(JSON.stringify(source)).toBe(sourceSnap);
  });

  test('SHAREABLE_FIELDS expone la lista completa', () => {
    expect(SHAREABLE_FIELDS).toEqual(
      expect.arrayContaining([
        'type',
        'moneda',
        'nombre_proveedor',
        'fecha_factura',
        'categoria',
        'subcategoria',
        'proyecto_id',
        'proyecto_nombre',
        'medio_pago',
        'etapa',
      ]),
    );
  });
});

describe('toDateInputValue', () => {
  test('YYYY-MM-DD se devuelve tal cual', () => {
    expect(toDateInputValue('2026-05-07')).toBe('2026-05-07');
  });

  test('DD/MM/YYYY se reordena a YYYY-MM-DD', () => {
    expect(toDateInputValue('7/5/2026')).toBe('2026-05-07');
    expect(toDateInputValue('07/05/2026')).toBe('2026-05-07');
  });

  test('ISO a medianoche UTC NO corre un día (bug -1)', () => {
    // En UTC-3 los getters locales devolvían el día anterior (06). Debe ser 07.
    expect(toDateInputValue('2026-05-07T00:00:00.000Z')).toBe('2026-05-07');
  });

  test('Firestore Timestamp ({seconds}) usa el día calendario UTC', () => {
    // 2026-05-07 13:30:00 UTC -> ancla mediodía, día estable
    const seconds = Math.floor(Date.UTC(2026, 4, 7, 13, 30, 0) / 1000);
    expect(toDateInputValue({ seconds })).toBe('2026-05-07');
    expect(toDateInputValue({ _seconds: seconds })).toBe('2026-05-07');
  });

  test('valores vacíos devuelven string vacío', () => {
    expect(toDateInputValue('')).toBe('');
    expect(toDateInputValue(null)).toBe('');
    expect(toDateInputValue(undefined)).toBe('');
  });
});
