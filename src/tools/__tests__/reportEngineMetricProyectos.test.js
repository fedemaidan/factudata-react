import { processMetricCards } from '../reportEngine';

const movs = [
  { type: 'ingreso', proyecto_id: 'fede', total: 100, equivalencias: { total: { ars: 100 } } },
  { type: 'egreso',  proyecto_id: 'fede', total: 40,  equivalencias: { total: { ars: 40 } } },
  { type: 'ingreso', proyecto_id: 'facu', total: 500, equivalencias: { total: { ars: 500 } } },
];

test('metric card filtra por proyecto y saldo_neto neta', () => {
  const block = { type: 'metric_cards', metricas: [
    { id: 'all',  titulo: 'Todas', operacion: 'saldo_neto', campo: 'total', filtro_tipo: null, formato: 'currency' },
    { id: 'fede', titulo: 'Fede',  operacion: 'saldo_neto', campo: 'total', filtro_tipo: null, formato: 'currency', filtros_extra: { proyectos: ['fede'] } },
    { id: 'facu', titulo: 'Facu',  operacion: 'saldo_neto', campo: 'total', filtro_tipo: null, formato: 'currency', filtros_extra: { proyectos: ['facu'] } },
  ]};
  const res = processMetricCards(block, movs, [], ['ARS']);
  const by = Object.fromEntries(res.map((r) => [r.id, r.valor]));
  expect(by.all).toBe(560);   // 100 - 40 + 500
  expect(by.fede).toBe(60);   // 100 - 40
  expect(by.facu).toBe(500);
});
