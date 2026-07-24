/**
 * Golden de paridad (frontend): corre movimientoMatchesCondiciones sobre las
 * MISMAS fixtures y la MISMA tabla de verdad que el golden backend
 * (sorby_bot_wa/test/unit/cajaFiltros.golden.test.js, que valida contra Mongo real).
 * Si este test y aquel divergen, los dos motores no están en paridad.
 */
import { movimientoMatchesCondiciones } from '../matcher';

const FIXTURES = [
  { _id: 1, categoria: 'Materiales',   medio_pago: 'Efectivo', total: 5000,   asignado: 'Juan', type: 'egreso',  estado: 'Pagado',    fecha_factura: new Date('2026-07-10T12:00:00-03:00') },
  { _id: 2, categoria: 'Mano de obra', medio_pago: 'Débito',   total: 15000,  asignado: null,   type: 'ingreso', estado: 'Pendiente', fecha_factura: new Date('2026-07-20T12:00:00-03:00') },
  { _id: 3, categoria: '',             medio_pago: '',         total: 0,                          type: 'egreso',                       fecha_factura: new Date('2026-06-30T12:00:00-03:00') },
  { _id: 4, /* categoria ausente */    total: null,                                              type: 'egreso',                       fecha_factura: new Date('2026-08-01T12:00:00-03:00') },
  { _id: 5, categoria: 'Servicios',    medio_pago: 'Efectivo', total: 100000, asignado: 'Ana',  type: 'ingreso', estado: 'Pagado',    fecha_factura: new Date('2026-07-24T12:00:00-03:00') },
];

const NOW = new Date('2026-07-15T12:00:00-03:00');

const CASOS = [
  { nombre: 'categoria no_es Materiales', filtros: { match: 'all', condiciones: [{ campo: 'categoria', operador: 'no_es', valores: ['Materiales'] }] }, esperado: [2, 3, 4, 5] },
  { nombre: 'categoria vacio', filtros: { match: 'all', condiciones: [{ campo: 'categoria', operador: 'vacio' }] }, esperado: [3, 4] },
  { nombre: 'categoria no_vacio', filtros: { match: 'all', condiciones: [{ campo: 'categoria', operador: 'no_vacio' }] }, esperado: [1, 2, 5] },
  { nombre: 'monto >= 15000', filtros: { match: 'all', condiciones: [{ campo: 'monto', operador: 'mayor_igual', valor: 15000 }] }, esperado: [2, 5] },
  { nombre: 'monto entre (<=0) excluye null', filtros: { match: 'all', condiciones: [{ campo: 'monto', operador: 'entre', valorHasta: 0 }] }, esperado: [3] },
  { nombre: 'monto distinto 0 incluye null/missing', filtros: { match: 'all', condiciones: [{ campo: 'monto', operador: 'distinto', valor: 0 }] }, esperado: [1, 2, 4, 5] },
  { nombre: 'asignado vacio', filtros: { match: 'all', condiciones: [{ campo: 'asignado', operador: 'vacio' }] }, esperado: [2, 3, 4] },
  { nombre: 'fecha_factura relativa este_mes', filtros: { match: 'all', condiciones: [{ campo: 'fecha_factura', operador: 'relativa', valor: 'este_mes' }] }, esperado: [1, 2, 5] },
  { nombre: 'match any (categoria Materiales OR estado Pagado)', filtros: { match: 'any', condiciones: [{ campo: 'categoria', operador: 'es', valores: ['Materiales'] }, { campo: 'estado', operador: 'es', valores: ['Pagado'] }] }, esperado: [1, 5] },
  { nombre: 'match all (no Materiales AND >=15000)', filtros: { match: 'all', condiciones: [{ campo: 'categoria', operador: 'no_es', valores: ['Materiales'] }, { campo: 'monto', operador: 'mayor_igual', valor: 15000 }] }, esperado: [2, 5] },
];

describe('golden paridad frontend (movimientoMatchesCondiciones)', () => {
  CASOS.forEach(({ nombre, filtros, esperado }) => {
    test(nombre, () => {
      const ids = FIXTURES.filter((m) => movimientoMatchesCondiciones(m, filtros, NOW)).map((m) => m._id);
      expect(ids).toEqual(esperado);
    });
  });
});
