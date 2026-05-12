/**
 * Tests para los handlers puros del formulario de presupuestos.
 *
 * Invariante crítica que validamos: editar un input (cantidad, monto, descripción)
 * en modo NORMAL no debe modificar otro input que el usuario no tocó. En particular,
 * `incidencia_objetivo_pct` (de tareas y de rubros) no debe cambiar como efecto
 * colateral de editar montos o cantidades.
 *
 * En modo DISTRIBUIR, editar % objetivo sí debe redistribuir los montos.
 */

import {
  aplicarUpdateTareaMonto,
  aplicarUpdateTareaCantidad,
  aplicarUpdateTareaDescripcion,
  aplicarRemoveTarea,
  aplicarUpdateRubro,
  aplicarUpdateIncidenciaObjetivoRubro,
  aplicarUpdateIncidenciaObjetivoTarea,
  aplicarDistribuirPorTotal,
} from '../presupuestosHandlers';

const makeForm = () => ({
  rubros: [
    {
      nombre: 'Mampostería',
      monto: 0,
      incidencia_objetivo_pct: 30,
      tareas: [
        { descripcion: 'Pared exterior', cantidad: 1, monto: 100, incidencia_objetivo_pct: 60 },
        { descripcion: 'Pared interior', cantidad: 1, monto: 200, incidencia_objetivo_pct: 40 },
      ],
    },
    {
      nombre: 'Instalaciones',
      monto: 500,
      incidencia_objetivo_pct: 70,
      tareas: [
        { descripcion: 'Cañerías', cantidad: 1, monto: 500, incidencia_objetivo_pct: 100 },
      ],
    },
  ],
});

describe('aplicarUpdateTareaMonto (modo normal)', () => {
  test('actualiza monto de la tarea y recalcula rubro.monto = Σ tareas', () => {
    const f0 = makeForm();
    const f1 = aplicarUpdateTareaMonto(f0, 0, 0, '150');
    expect(f1.rubros[0].tareas[0].monto).toBe(150);
    expect(f1.rubros[0].monto).toBe(350); // 1*150 + 1*200
  });

  test('NO modifica incidencia_objetivo_pct de las otras tareas', () => {
    const f0 = makeForm();
    const f1 = aplicarUpdateTareaMonto(f0, 0, 0, '150');
    expect(f1.rubros[0].tareas[0].incidencia_objetivo_pct).toBe(60);
    expect(f1.rubros[0].tareas[1].incidencia_objetivo_pct).toBe(40);
  });

  test('NO modifica incidencia_objetivo_pct del rubro', () => {
    const f0 = makeForm();
    const f1 = aplicarUpdateTareaMonto(f0, 0, 0, '500');
    expect(f1.rubros[0].incidencia_objetivo_pct).toBe(30);
  });

  test('NO toca otros rubros', () => {
    const f0 = makeForm();
    const f1 = aplicarUpdateTareaMonto(f0, 0, 0, '999');
    expect(f1.rubros[1]).toEqual(f0.rubros[1]);
  });

  test('respeta cantidad en la suma del rubro', () => {
    const f0 = makeForm();
    f0.rubros[0].tareas[0].cantidad = 3;
    const f1 = aplicarUpdateTareaMonto(f0, 0, 0, '100');
    expect(f1.rubros[0].monto).toBe(500); // 3*100 + 1*200
  });

  test('valor vacío deja monto en null y recalcula', () => {
    const f0 = makeForm();
    const f1 = aplicarUpdateTareaMonto(f0, 0, 0, '');
    expect(f1.rubros[0].tareas[0].monto).toBeNull();
    expect(f1.rubros[0].monto).toBe(200); // solo la tarea 2
  });

  test('cuando todas las tareas quedan vacías, NO pisa el rubro.monto manual', () => {
    // Rubro con monto manual y tareas sin valor
    const f0 = {
      rubros: [
        {
          nombre: 'X',
          monto: 5000,
          incidencia_objetivo_pct: null,
          tareas: [
            { descripcion: 'a', cantidad: null, monto: null, incidencia_objetivo_pct: null },
            { descripcion: 'b', cantidad: null, monto: null, incidencia_objetivo_pct: null },
          ],
        },
      ],
    };
    // El usuario edita una tarea a vacío (ya estaba vacía)
    const f1 = aplicarUpdateTareaMonto(f0, 0, 0, '');
    expect(f1.rubros[0].monto).toBe(5000); // monto manual preservado
  });
});

describe('aplicarUpdateTareaCantidad (modo normal)', () => {
  test('actualiza cantidad y recalcula rubro.monto', () => {
    const f0 = makeForm();
    const f1 = aplicarUpdateTareaCantidad(f0, 0, 0, '3');
    expect(f1.rubros[0].tareas[0].cantidad).toBe(3);
    expect(f1.rubros[0].monto).toBe(500); // 3*100 + 1*200
  });

  test('NO modifica incidencia_objetivo_pct de tareas ni del rubro', () => {
    const f0 = makeForm();
    const f1 = aplicarUpdateTareaCantidad(f0, 0, 0, '5');
    expect(f1.rubros[0].tareas[0].incidencia_objetivo_pct).toBe(60);
    expect(f1.rubros[0].tareas[1].incidencia_objetivo_pct).toBe(40);
    expect(f1.rubros[0].incidencia_objetivo_pct).toBe(30);
  });

  test('cantidad vacía la deja en null', () => {
    const f0 = makeForm();
    const f1 = aplicarUpdateTareaCantidad(f0, 0, 0, '');
    expect(f1.rubros[0].tareas[0].cantidad).toBeNull();
  });
});

describe('aplicarUpdateTareaDescripcion', () => {
  test('solo cambia descripcion, no toca nada más', () => {
    const f0 = makeForm();
    const f1 = aplicarUpdateTareaDescripcion(f0, 0, 0, 'Otro nombre');
    expect(f1.rubros[0].tareas[0].descripcion).toBe('Otro nombre');
    expect(f1.rubros[0].tareas[0].monto).toBe(100);
    expect(f1.rubros[0].tareas[0].cantidad).toBe(1);
    expect(f1.rubros[0].monto).toBe(0); // monto original del rubro intacto
  });
});

describe('aplicarRemoveTarea', () => {
  test('elimina la tarea y recalcula rubro.monto', () => {
    const f0 = makeForm();
    const f1 = aplicarRemoveTarea(f0, 0, 0);
    expect(f1.rubros[0].tareas).toHaveLength(1);
    expect(f1.rubros[0].monto).toBe(200);
  });

  test('NO modifica incidencia_objetivo_pct de tareas restantes ni del rubro', () => {
    const f0 = makeForm();
    const f1 = aplicarRemoveTarea(f0, 0, 0);
    expect(f1.rubros[0].tareas[0].incidencia_objetivo_pct).toBe(40);
    expect(f1.rubros[0].incidencia_objetivo_pct).toBe(30);
  });
});

describe('aplicarUpdateRubro', () => {
  test('cambia el nombre sin tocar nada más', () => {
    const f0 = makeForm();
    const f1 = aplicarUpdateRubro(f0, 0, 'nombre', 'Estructura');
    expect(f1.rubros[0].nombre).toBe('Estructura');
    expect(f1.rubros[0].tareas).toEqual(f0.rubros[0].tareas);
  });

  test('en modo normal con tareas con valor, editar monto del rubro es no-op', () => {
    const f0 = makeForm(); // tareas con monto > 0
    const f1 = aplicarUpdateRubro(f0, 0, 'monto', 9999, { modoDistribuir: false });
    expect(f1).toEqual(f0);
  });

  test('en modo normal sin tareas, editar monto del rubro lo guarda', () => {
    const f0 = { rubros: [{ nombre: 'Suelto', monto: 0, tareas: [] }] };
    const f1 = aplicarUpdateRubro(f0, 0, 'monto', 5000, { modoDistribuir: false });
    expect(f1.rubros[0].monto).toBe(5000);
  });

  test('en modo normal con tareas vacías (sin valor), editar monto del rubro lo guarda', () => {
    const f0 = {
      rubros: [
        {
          nombre: 'X',
          monto: 0,
          tareas: [
            { descripcion: 'placeholder', cantidad: null, monto: null },
          ],
        },
      ],
    };
    const f1 = aplicarUpdateRubro(f0, 0, 'monto', 1234, { modoDistribuir: false });
    expect(f1.rubros[0].monto).toBe(1234);
  });

  test('en modo distribuir, editar monto del rubro distribuye entre tareas según %', () => {
    const f0 = makeForm();
    const f1 = aplicarUpdateRubro(f0, 0, 'monto', 1000, { modoDistribuir: true });
    expect(f1.rubros[0].monto).toBe(1000);
    // Las tareas tienen 60/40, total efectivo debe ser 1000
    const sumEfectivo =
      (Number(f1.rubros[0].tareas[0].cantidad) || 1) * f1.rubros[0].tareas[0].monto +
      (Number(f1.rubros[0].tareas[1].cantidad) || 1) * f1.rubros[0].tareas[1].monto;
    expect(sumEfectivo).toBe(1000);
    expect(f1.rubros[0].tareas[0].monto).toBe(600);
    expect(f1.rubros[0].tareas[1].monto).toBe(400);
  });
});

describe('aplicarUpdateIncidenciaObjetivoTarea', () => {
  test('en modo normal: solo persiste el valor, NO redistribuye montos', () => {
    const f0 = makeForm();
    const f1 = aplicarUpdateIncidenciaObjetivoTarea(f0, 0, 0, 80, { modoDistribuir: false });
    expect(f1.rubros[0].tareas[0].incidencia_objetivo_pct).toBe(80);
    // Los montos no deben haber cambiado
    expect(f1.rubros[0].tareas[0].monto).toBe(100);
    expect(f1.rubros[0].tareas[1].monto).toBe(200);
  });

  test('en modo distribuir: redistribuye monto del rubro entre tareas', () => {
    const f0 = makeForm();
    f0.rubros[0].monto = 1000;
    // Ponemos primero la 2da tarea a 20% para que la suma quede 80+20=100
    const f1 = aplicarUpdateIncidenciaObjetivoTarea(f0, 0, 1, 20, { modoDistribuir: true });
    const f2 = aplicarUpdateIncidenciaObjetivoTarea(f1, 0, 0, 80, { modoDistribuir: true });
    expect(f2.rubros[0].tareas[0].incidencia_objetivo_pct).toBe(80);
    const sumEfectivo =
      (Number(f2.rubros[0].tareas[0].cantidad) || 1) * f2.rubros[0].tareas[0].monto +
      (Number(f2.rubros[0].tareas[1].cantidad) || 1) * f2.rubros[0].tareas[1].monto;
    expect(Math.round(sumEfectivo)).toBe(1000);
  });
});

describe('aplicarUpdateIncidenciaObjetivoRubro', () => {
  test('en modo normal: solo persiste el valor, no redistribuye', () => {
    const f0 = makeForm();
    const f1 = aplicarUpdateIncidenciaObjetivoRubro(f0, 0, 50, { modoDistribuir: false });
    expect(f1.rubros[0].incidencia_objetivo_pct).toBe(50);
    // Otros rubros sin cambios
    expect(f1.rubros[1].monto).toBe(500);
  });

  test('en modo distribuir: redistribuye usando totalObjetivo', () => {
    const f0 = makeForm();
    const f1 = aplicarUpdateIncidenciaObjetivoRubro(f0, 0, 50, {
      modoDistribuir: true,
      totalObjetivo: '1000',
    });
    f1.rubros[1].incidencia_objetivo_pct = 50; // forzamos suma 100
    const f2 = aplicarUpdateIncidenciaObjetivoRubro(f1, 1, 50, {
      modoDistribuir: true,
      totalObjetivo: '1000',
    });
    expect(f2.rubros[0].monto + f2.rubros[1].monto).toBe(1000);
  });
});

describe('aplicarDistribuirPorTotal', () => {
  test('reparte el total entre rubros según incidencia_objetivo_pct', () => {
    const f0 = makeForm();
    const f1 = aplicarDistribuirPorTotal(f0, '1000');
    expect(f1.rubros[0].monto + f1.rubros[1].monto).toBe(1000);
    expect(f1.rubros[0].monto).toBe(300); // 30% de 1000
    expect(f1.rubros[1].monto).toBe(700); // 70% de 1000
  });
});
