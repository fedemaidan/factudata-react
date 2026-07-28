import {
  vistaHabilitadaEmpresa,
  vistaOcultaUsuario,
  vistaBloqueadaParaUsuario,
  vistasVisiblesPara,
  VISTAS_UTILES,
} from '../vistasUtiles';

const ID = 'vista-obra';

describe('vistaHabilitadaEmpresa', () => {
  test('sin config previa → activada por default', () => {
    expect(vistaHabilitadaEmpresa(undefined, ID)).toBe(true);
    expect(vistaHabilitadaEmpresa({}, ID)).toBe(true);
    expect(vistaHabilitadaEmpresa({ vistas_config: {} }, ID)).toBe(true);
  });
  test('empresa la puede desactivar', () => {
    expect(vistaHabilitadaEmpresa({ vistas_config: { [ID]: false } }, ID)).toBe(false);
    expect(vistaHabilitadaEmpresa({ vistas_config: { [ID]: true } }, ID)).toBe(true);
  });
});

describe('vistaOcultaUsuario', () => {
  test('blacklist personal', () => {
    expect(vistaOcultaUsuario({ vistas_ocultas: [ID] }, ID)).toBe(true);
    expect(vistaOcultaUsuario({ vistas_ocultas: [] }, ID)).toBe(false);
    expect(vistaOcultaUsuario({}, ID)).toBe(false);
  });
});

describe('vistaBloqueadaParaUsuario', () => {
  test('admin bloquea a un usuario puntual desde el doc de empresa', () => {
    const emp = { vistas_usuarios: { [ID]: { ocultosPara: ['u1'] } } };
    expect(vistaBloqueadaParaUsuario(emp, ID, 'u1')).toBe(true);
    expect(vistaBloqueadaParaUsuario(emp, ID, 'u2')).toBe(false);
    expect(vistaBloqueadaParaUsuario({}, ID, 'u1')).toBe(false);
  });
});

describe('vistasVisiblesPara', () => {
  test('empresa activa + usuario no oculta → visible', () => {
    const vis = vistasVisiblesPara({}, { id: 'u1' });
    expect(vis.map((v) => v.id)).toContain(ID);
  });
  test('admin bloqueó a este usuario → no la ve, y no la puede revertir', () => {
    const emp = { vistas_usuarios: { [ID]: { ocultosPara: ['u1'] } } };
    expect(vistasVisiblesPara(emp, { id: 'u1' }).map((v) => v.id)).not.toContain(ID);
    expect(vistasVisiblesPara(emp, { id: 'u2' }).map((v) => v.id)).toContain(ID);
  });
  test('empresa desactiva → nadie la ve', () => {
    const vis = vistasVisiblesPara({ vistas_config: { [ID]: false } }, {});
    expect(vis.map((v) => v.id)).not.toContain(ID);
  });
  test('usuario la oculta aunque la empresa la tenga activa', () => {
    const vis = vistasVisiblesPara({}, { vistas_ocultas: [ID] });
    expect(vis.map((v) => v.id)).not.toContain(ID);
  });
  test('nunca devuelve más que el catálogo', () => {
    expect(vistasVisiblesPara({}, {}).length).toBeLessThanOrEqual(VISTAS_UTILES.length);
  });
});
