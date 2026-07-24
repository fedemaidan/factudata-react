import { pickCac, snapshotCacIndice, equivalenciaCac } from '../pickCac';

describe('pickCac', () => {
  it('devuelve el número tal cual (docs viejos)', () => {
    expect(pickCac(573.95, 'estimado')).toBe(573.95);
  });

  it('elige la variante del modo', () => {
    const v = { legacy: 100, estimado: 90, automatico: 95 };
    expect(pickCac(v, 'legacy')).toBe(100);
    expect(pickCac(v, 'estimado')).toBe(90);
    expect(pickCac(v, 'automatico')).toBe(95);
  });

  it('cae a automatico → legacy → estimado si falta la variante', () => {
    expect(pickCac({ automatico: 95 }, 'legacy')).toBe(95);
    expect(pickCac({ estimado: 90 }, 'legacy')).toBe(90);
    expect(pickCac(null, 'legacy')).toBeNull();
  });
});

describe('equivalenciaCac', () => {
  const eqNuevo = {
    ars: 600000,
    cac: { legacy: 34.4, estimado: 28.5, automatico: 32.1 },
    cac_mano_obra: { legacy: 30.1, estimado: 25.2, automatico: 28.0 },
    cac_materiales: { legacy: 38.9, estimado: 31.7, automatico: 35.5 },
  };

  it('shape nuevo: elige subíndice y variante del modo', () => {
    expect(equivalenciaCac(eqNuevo, 'general', 'estimado')).toBe(28.5);
    expect(equivalenciaCac(eqNuevo, 'mano_obra', 'legacy')).toBe(30.1);
    expect(equivalenciaCac(eqNuevo, 'materiales', 'automatico')).toBe(35.5);
  });

  it('shape viejo (números): devuelve el valor directo', () => {
    expect(equivalenciaCac({ cac: 34.4 }, 'general', 'estimado')).toBe(34.4);
    expect(equivalenciaCac({ cac: 34.4, cac_mano_obra: 30.1 }, 'mano_obra', 'legacy')).toBe(30.1);
  });

  it('sin campo del subíndice cae al general', () => {
    expect(equivalenciaCac({ cac: 34.4 }, 'mano_obra', 'legacy')).toBe(34.4);
  });

  it('null/vacío devuelve null (nunca NaN)', () => {
    expect(equivalenciaCac(null, 'general', 'legacy')).toBeNull();
    expect(equivalenciaCac({}, 'general', 'legacy')).toBeNull();
    expect(equivalenciaCac({ ars: 100 }, 'general', 'legacy')).toBeNull();
  });

  it('cacTipo null/undefined equivale a general', () => {
    expect(equivalenciaCac(eqNuevo, null, 'legacy')).toBe(34.4);
    expect(equivalenciaCac(eqNuevo, undefined, 'legacy')).toBe(34.4);
  });
});

describe('snapshotCacIndice', () => {
  it('shape nuevo de variantes por subíndice', () => {
    const snap = { cac: { general: { legacy: 17423.2, estimado: 21035.6, automatico: 17423.2 } } };
    expect(snapshotCacIndice(snap, 'general', 'estimado')).toBe(21035.6);
  });

  it('shape viejo plano', () => {
    expect(snapshotCacIndice({ cac_indice: 17423.2 }, 'general', 'legacy')).toBe(17423.2);
    expect(snapshotCacIndice({ cac_mano_obra: 15000 }, 'mano_obra', 'legacy')).toBe(15000);
  });
});
