import { processGroupMonthMatrix } from '../reportEngine';

const mov = (cat, fecha, total, type = 'egreso') => ({
  type, categoria: cat, fecha_factura: fecha, total,
  equivalencias: { total: { ars: total } },
});

test('matriz categoría × mes cruza ambas dimensiones', () => {
  const movs = [
    mov('Materiales', '2026-05-10', 100),
    mov('Materiales', '2026-04-10', 200),
    mov('Mano de obra', '2026-05-10', 300),
    mov('Mano de obra', '2026-05-20', 50),
    mov('Mano de obra', '2026-03-10', 400),
  ];
  const data = processGroupMonthMatrix(
    { type: 'group_month_matrix', agrupar_por: 'categoria', filtro_tipo: 'egreso', meses_n: 6 },
    movs, [], ['ARS'],
  );
  const monthCols = data.headers.filter((h) => /^\d{4}-\d{2}$/.test(h.id)).map((h) => h.id);
  expect(monthCols).toEqual(['2026-05', '2026-04', '2026-03']);

  const mano = data.rows.find((r) => r.grupo === 'Mano de obra');
  expect(mano['2026-05']).toBe(350);
  expect(mano['2026-03']).toBe(400);
  expect(mano['2026-04']).toBe(0);
  expect(mano._total).toBe(750);
  expect(data.rows[0].grupo).toBe('Mano de obra');

  expect(data.totals['2026-05']).toBe(450);
  expect(data.totals._total).toBe(1050);
});

test('filtro_tipo separa ingresos de egresos', () => {
  const movs = [
    mov('Ventas', '2026-05-10', 1000, 'ingreso'),
    mov('Ventas', '2026-05-11', 500, 'egreso'),
  ];
  const ing = processGroupMonthMatrix(
    { type: 'group_month_matrix', agrupar_por: 'categoria', filtro_tipo: 'ingreso', meses_n: 6 },
    movs, [], ['ARS'],
  );
  expect(ing.rows.find((r) => r.grupo === 'Ventas')['2026-05']).toBe(1000);
});

test('meses_n limita la cantidad de columnas', () => {
  const movs = [
    mov('A', '2026-05-10', 1), mov('A', '2026-04-10', 1), mov('A', '2026-03-10', 1),
    mov('A', '2026-02-10', 1), mov('A', '2026-01-10', 1), mov('A', '2025-12-10', 1),
    mov('A', '2025-11-10', 1),
  ];
  const data = processGroupMonthMatrix(
    { type: 'group_month_matrix', agrupar_por: 'categoria', filtro_tipo: 'egreso', meses_n: 6 },
    movs, [], ['ARS'],
  );
  const monthCols = data.headers.filter((h) => /^\d{4}-\d{2}$/.test(h.id));
  expect(monthCols).toHaveLength(6);
  expect(monthCols[0].id).toBe('2026-05'); // más nuevo primero
});
