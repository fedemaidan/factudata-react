import {
  accionesEnProyecto,
  tieneAccionEnProyecto,
  modoLecturaEnProyecto,
  accionRecortadaEnObra,
} from '../accionesPorProyecto';

const OBRA_A = 'obraA';
const OBRA_B = 'obraB';

// Espejo del helper del bot. user shape del frontend:
// empresa.acciones (techo) − permisosOcultos (global) − permisosOcultosPorProyecto[obra].
function baseUser(overrides = {}) {
  const {
    acciones = ['CREAR_EGRESO', 'CREAR_INGRESO', 'VER_CAJAS', 'LISTAR_MOVIMIENTOS', 'VER_MIS_MOVIMIENTOS'],
    proyectos = [OBRA_A, OBRA_B],
    admin = false,
    permisosOcultos = [],
    permisosOcultosPorProyecto = {},
  } = overrides;
  return { empresa: { acciones }, proyectos, admin, permisosOcultos, permisosOcultosPorProyecto };
}

describe('tieneAccionEnProyecto — matriz P/B', () => {
  test('P1 heredado → true', () => {
    expect(tieneAccionEnProyecto(baseUser(), OBRA_A, 'CREAR_EGRESO')).toBe(true);
  });
  test('P2 admin respeta el recorte por obra → false en la obra recortada, true en otra', () => {
    const u = baseUser({ admin: true, permisosOcultosPorProyecto: { [OBRA_A]: ['CREAR_EGRESO'] } });
    expect(tieneAccionEnProyecto(u, OBRA_A, 'CREAR_EGRESO')).toBe(false);
    expect(tieneAccionEnProyecto(u, OBRA_B, 'CREAR_EGRESO')).toBe(true);
  });
  test('P2b admin igual que usuario normal: no miembro → false', () => {
    expect(tieneAccionEnProyecto(baseUser({ admin: true, proyectos: [OBRA_B] }), OBRA_A, 'CREAR_EGRESO')).toBe(false);
  });
  test('B1 quitada en obra A → false en A, true en B', () => {
    const u = baseUser({ permisosOcultosPorProyecto: { [OBRA_A]: ['CREAR_EGRESO'] } });
    expect(tieneAccionEnProyecto(u, OBRA_A, 'CREAR_EGRESO')).toBe(false);
    expect(tieneAccionEnProyecto(u, OBRA_B, 'CREAR_EGRESO')).toBe(true);
  });
  test('B2 no miembro → false', () => {
    expect(tieneAccionEnProyecto(baseUser({ proyectos: [OBRA_B] }), OBRA_A, 'CREAR_EGRESO')).toBe(false);
  });
  test("B2' proyectos vacío = todas → true", () => {
    expect(tieneAccionEnProyecto(baseUser({ proyectos: [] }), OBRA_A, 'CREAR_EGRESO')).toBe(true);
  });
  test('B3 global sin la acción → false', () => {
    expect(tieneAccionEnProyecto(baseUser({ permisosOcultos: ['CREAR_EGRESO'] }), OBRA_A, 'CREAR_EGRESO')).toBe(false);
  });
});

describe('modoLecturaEnProyecto', () => {
  test('con VER_CAJAS → todo', () => {
    expect(modoLecturaEnProyecto(baseUser(), OBRA_A)).toBe('todo');
  });
  test('solo VER_MIS → solo_mio', () => {
    const u = baseUser({ permisosOcultosPorProyecto: { [OBRA_A]: ['VER_CAJAS', 'LISTAR_MOVIMIENTOS'] } });
    expect(modoLecturaEnProyecto(u, OBRA_A)).toBe('solo_mio');
  });
  test('sin ninguna de ver → bloqueado', () => {
    const u = baseUser({ permisosOcultosPorProyecto: { [OBRA_A]: ['VER_CAJAS', 'LISTAR_MOVIMIENTOS', 'VER_MIS_MOVIMIENTOS'] } });
    expect(modoLecturaEnProyecto(u, OBRA_A)).toBe('bloqueado');
  });
});

describe('accionRecortadaEnObra — gating visual B0-safe', () => {
  test('sin override → false (no cambia comportamiento)', () => {
    expect(accionRecortadaEnObra(baseUser(), OBRA_A, 'CREAR_EGRESO')).toBe(false);
  });
  test('override quita la acción en la obra → true', () => {
    const u = baseUser({ permisosOcultosPorProyecto: { [OBRA_A]: ['CREAR_EGRESO'] } });
    expect(accionRecortadaEnObra(u, OBRA_A, 'CREAR_EGRESO')).toBe(true);
  });
  test('usuario sin la acción global → false (no la restringe de más)', () => {
    const u = baseUser({ permisosOcultos: ['CREAR_EGRESO'] });
    expect(accionRecortadaEnObra(u, OBRA_A, 'CREAR_EGRESO')).toBe(false);
  });
  test('sin obra en scope → false', () => {
    expect(accionRecortadaEnObra(baseUser(), null, 'CREAR_EGRESO')).toBe(false);
  });
  test('admin con recorte en la obra → true (ya no bypassa)', () => {
    const u = baseUser({ admin: true, permisosOcultosPorProyecto: { [OBRA_A]: ['CREAR_EGRESO'] } });
    expect(accionRecortadaEnObra(u, OBRA_A, 'CREAR_EGRESO')).toBe(true);
  });
});

describe('accionesEnProyecto', () => {
  test('admin → resta el recorte por-obra del techo global', () => {
    const u = baseUser({ admin: true, permisosOcultosPorProyecto: { [OBRA_A]: ['VER_CAJAS'] } });
    expect(accionesEnProyecto(u, OBRA_A)).not.toContain('VER_CAJAS');
    expect(accionesEnProyecto(u, OBRA_B)).toContain('VER_CAJAS');
  });
  test('no miembro → vacío', () => {
    expect(accionesEnProyecto(baseUser({ proyectos: [OBRA_B] }), OBRA_A)).toEqual([]);
  });
});
