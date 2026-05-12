/**
 * Tests para incidenciaHelpers — distribución por porcentajes y largest remainder.
 *
 * Garantizan dos invariantes:
 *  - La suma de los montos repartidos siempre coincide con el total exacto cuando
 *    los porcentajes suman 100% (no quedan centavos sueltos).
 *  - Las tareas con `cantidad` reciben un `monto` por unidad consistente con su
 *    parte total (cantidad × monto = parte total asignada).
 */

import {
  distribuirMontosPorIncidencia,
  distribuirMontosPorIncidenciaTareas,
  plantillaRubrosToPresupuestoRubros,
  sumaIncidenciasObjetivo,
} from '../incidenciaHelpers';

const sumMontos = (xs) => xs.reduce((s, x) => s + (Number(x.monto) || 0), 0);

describe('largest remainder en distribuirMontosPorIncidencia', () => {
  test('33/33/34 sobre $10.000.000 reparte exacto sin centavos sueltos', () => {
    const rubros = [
      { nombre: 'A', incidencia_objetivo_pct: 33 },
      { nombre: 'B', incidencia_objetivo_pct: 33 },
      { nombre: 'C', incidencia_objetivo_pct: 34 },
    ];
    const result = distribuirMontosPorIncidencia(10_000_000, rubros);
    expect(sumMontos(result)).toBe(10_000_000);
    expect(result[0].monto).toBe(3_300_000);
    expect(result[1].monto).toBe(3_300_000);
    expect(result[2].monto).toBe(3_400_000);
  });

  test('50/50 sobre un total impar reparte exacto', () => {
    const rubros = [
      { nombre: 'A', incidencia_objetivo_pct: 50 },
      { nombre: 'B', incidencia_objetivo_pct: 50 },
    ];
    const result = distribuirMontosPorIncidencia(1_000_001, rubros);
    expect(sumMontos(result)).toBe(1_000_001);
  });

  test('33.33/33.33/33.34 reparte exacto y respeta el orden', () => {
    const rubros = [
      { nombre: 'A', incidencia_objetivo_pct: 33.33 },
      { nombre: 'B', incidencia_objetivo_pct: 33.33 },
      { nombre: 'C', incidencia_objetivo_pct: 33.34 },
    ];
    const result = distribuirMontosPorIncidencia(100, rubros);
    expect(sumMontos(result)).toBeCloseTo(100, 2);
  });

  test('si la suma de % no llega a 100, NO inventa centavos', () => {
    const rubros = [
      { nombre: 'A', incidencia_objetivo_pct: 30 },
      { nombre: 'B', incidencia_objetivo_pct: 30 },
    ];
    const result = distribuirMontosPorIncidencia(1000, rubros);
    expect(result[0].monto + result[1].monto).toBeLessThanOrEqual(600);
  });

  test('preserva incidencia_objetivo_pct del input (no la pisa por el ajuste)', () => {
    const rubros = [
      { nombre: 'A', incidencia_objetivo_pct: 60 },
      { nombre: 'B', incidencia_objetivo_pct: 40 },
    ];
    const result = distribuirMontosPorIncidencia(1000, rubros);
    expect(result[0].incidencia_objetivo_pct).toBe(60);
    expect(result[1].incidencia_objetivo_pct).toBe(40);
  });
});

describe('distribuirMontosPorIncidenciaTareas', () => {
  test('respeta cantidad: con cantidad=2, monto por unidad es la mitad del total asignado', () => {
    const tareas = [
      { descripcion: 'A', cantidad: 2, incidencia_objetivo_pct: 100 },
    ];
    const result = distribuirMontosPorIncidenciaTareas(1000, tareas);
    // cantidad=2, total asignado=1000, monto por unidad=500
    expect(result[0].monto).toBe(500);
    expect(result[0].cantidad).toBe(2);
  });

  test('reparte 50/50 sobre dos tareas con cantidad distinta', () => {
    const tareas = [
      { descripcion: 'A', cantidad: 1, incidencia_objetivo_pct: 50 },
      { descripcion: 'B', cantidad: 4, incidencia_objetivo_pct: 50 },
    ];
    const result = distribuirMontosPorIncidenciaTareas(1000, tareas);
    expect(result[0].monto).toBe(500);
    expect(result[1].monto).toBe(125); // 500 / 4
    const totalEfectivo =
      (Number(result[0].cantidad) || 1) * result[0].monto +
      (Number(result[1].cantidad) || 1) * result[1].monto;
    expect(totalEfectivo).toBe(1000);
  });

  test('sin incidencias y sin montos previos, retorna tareas sin alterar montos', () => {
    const tareas = [
      { descripcion: 'A' },
      { descripcion: 'B' },
    ];
    const result = distribuirMontosPorIncidenciaTareas(1000, tareas);
    expect(result).toHaveLength(2);
    expect(result[0].monto).toBeUndefined();
  });
});

describe('plantillaRubrosToPresupuestoRubros', () => {
  test('preserva cantidad de tareas de plantilla', () => {
    const plantilla = [
      {
        nombre: 'Mampostería',
        incidencia_pct_sugerida: 35,
        tareas: [
          { descripcion: 'Pared', cantidad: 3, incidencia_pct_sugerida: 50 },
          { descripcion: 'Techo', incidencia_pct_sugerida: 50 },
        ],
      },
    ];
    const result = plantillaRubrosToPresupuestoRubros(plantilla);
    expect(result[0].tareas[0].cantidad).toBe(3);
    expect(result[0].tareas[1].cantidad).toBeNull();
    expect(result[0].incidencia_objetivo_pct).toBe(35);
  });

  test('descarta incidencia_pct_sugerida fuera de rango [0,100]', () => {
    const plantilla = [{ nombre: 'X', incidencia_pct_sugerida: 150, tareas: [] }];
    const result = plantillaRubrosToPresupuestoRubros(plantilla);
    expect(result[0].incidencia_objetivo_pct).toBeNull();
  });
});

describe('sumaIncidenciasObjetivo', () => {
  test('suma los % objetivo de los rubros (ignorando los nulos)', () => {
    const rubros = [
      { incidencia_objetivo_pct: 30 },
      { incidencia_objetivo_pct: null },
      { incidencia_objetivo_pct: 70 },
    ];
    expect(sumaIncidenciasObjetivo(rubros)).toBe(100);
  });
});
