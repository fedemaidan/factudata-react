import {
  montoCalculadoDeCuota,
  importeDelCobro,
  importeDifiereDelRestante,
  mensajeCobroRegistrado,
  diferenciaAceptadaPreview,
  diferenciaAceptadaDeCuota,
} from '../cobroCuota';

describe('montoCalculadoDeCuota', () => {
  const cuota = { monto: 500000, monto_cac: 1000, monto_usd: 500 };

  it('plan CAC: unidades CAC por el índice de hoy', () => {
    expect(montoCalculadoDeCuota({ cuota, plan: { indexacion: 'CAC' }, cacActual: 600 })).toBe(600000);
  });

  it('plan USD: unidades USD por la cotización de hoy', () => {
    expect(montoCalculadoDeCuota({ cuota, plan: { indexacion: 'USD' }, usdActual: 1200 })).toBe(600000);
  });

  it('sin índice disponible cae al monto pactado', () => {
    expect(montoCalculadoDeCuota({ cuota, plan: { indexacion: 'CAC' }, cacActual: null })).toBe(500000);
  });

  it('plan no indexado: monto nominal', () => {
    expect(montoCalculadoDeCuota({ cuota, plan: { indexacion: null }, cacActual: 600 })).toBe(500000);
  });
});

describe('importeDelCobro', () => {
  const restante = 600000;

  it('cobro total: el importe es el restante de la cuota', () => {
    expect(importeDelCobro({ modo: 'nuevo', tipoCobro: 'total', montoParcial: '', restante })).toBe(600000);
  });

  it('cobro parcial: el importe es el monto tipeado', () => {
    expect(importeDelCobro({ modo: 'nuevo', tipoCobro: 'parcial', montoParcial: '500000', restante })).toBe(500000);
  });

  it('parcial sin monto tipeado: 0', () => {
    expect(importeDelCobro({ modo: 'nuevo', tipoCobro: 'parcial', montoParcial: '', restante })).toBe(0);
  });

  it('vincular: el importe lo define el movimiento elegido, no el tipo de cobro', () => {
    expect(importeDelCobro({ modo: 'vincular', tipoCobro: 'total', movimiento: { monto: 420000 }, restante })).toBe(420000);
    expect(importeDelCobro({ modo: 'vincular', tipoCobro: 'total', movimiento: null, restante })).toBe(0);
  });

  it('solo marcar: se comporta como un cobro normal', () => {
    expect(importeDelCobro({ modo: 'solo_estado', tipoCobro: 'total', restante })).toBe(600000);
    expect(importeDelCobro({ modo: 'solo_estado', tipoCobro: 'parcial', montoParcial: '300000', restante })).toBe(300000);
  });
});

describe('importeDifiereDelRestante', () => {
  it('coincidir con el restante no es diferencia', () => {
    expect(importeDifiereDelRestante(600000, 600000)).toBe(false);
  });

  it('cobrar de menos o de más sí lo es', () => {
    expect(importeDifiereDelRestante(500000, 600000)).toBe(true);
    expect(importeDifiereDelRestante(700000, 600000)).toBe(true);
  });

  it('sin importe todavía no hay diferencia que decidir', () => {
    expect(importeDifiereDelRestante(0, 600000)).toBe(false);
  });

  it('ignora el ruido de redondeo del índice', () => {
    expect(importeDifiereDelRestante(600000.005, 600000)).toBe(false);
  });
});

describe('mensajeCobroRegistrado', () => {
  it('el cobro total confirmado manda sobre el modo', () => {
    expect(mensajeCobroRegistrado({ modo: 'vincular', cobro_total_confirmado: true }))
      .toBe('Cuota saldada por el importe cobrado.');
  });

  it('distingue vincular, solo marcar, parcial y cobro completo', () => {
    expect(mensajeCobroRegistrado({ modo: 'vincular' })).toMatch(/vinculando/);
    expect(mensajeCobroRegistrado({ modo: 'solo_estado' })).toMatch(/sin movimiento de caja/);
    expect(mensajeCobroRegistrado({ modo: 'nuevo', monto_parcial: 100 })).toBe('Pago parcial registrado.');
    expect(mensajeCobroRegistrado({ modo: 'nuevo' })).toMatch(/Movimiento de caja registrado/);
  });
});

describe('diferenciaAceptadaPreview', () => {
  it('positiva cuando se cobra menos que el monto calculado', () => {
    expect(diferenciaAceptadaPreview({ montoCalculado: 600000, montoCobradoPrevio: 0, importe: 500000 })).toBe(100000);
  });

  it('negativa cuando se cobra de más', () => {
    expect(diferenciaAceptadaPreview({ montoCalculado: 600000, montoCobradoPrevio: 0, importe: 700000 })).toBe(-100000);
  });

  it('suma los pagos parciales previos', () => {
    expect(diferenciaAceptadaPreview({ montoCalculado: 600000, montoCobradoPrevio: 200000, importe: 250000 })).toBe(150000);
  });

  it('sin monto calculado no hay diferencia que mostrar', () => {
    expect(diferenciaAceptadaPreview({ montoCalculado: 0, montoCobradoPrevio: 0, importe: 500000 })).toBeNull();
  });
});

describe('diferenciaAceptadaDeCuota', () => {
  it('deriva la diferencia del snapshot y lo cobrado', () => {
    expect(diferenciaAceptadaDeCuota({
      cobro_total_confirmado: true, monto_calculado_snapshot: 600000, monto_cobrado: 500000,
    })).toBe(100000);
  });

  it('es negativa si se cobró de más', () => {
    expect(diferenciaAceptadaDeCuota({
      cobro_total_confirmado: true, monto_calculado_snapshot: 600000, monto_cobrado: 700000,
    })).toBe(-100000);
  });

  it('null si la cuota no se saldó con cobro total confirmado', () => {
    expect(diferenciaAceptadaDeCuota({ monto_calculado_snapshot: 600000, monto_cobrado: 500000 })).toBeNull();
    expect(diferenciaAceptadaDeCuota(null)).toBeNull();
  });

  it('null si no hay snapshot persistido (cobros previos a la funcionalidad)', () => {
    expect(diferenciaAceptadaDeCuota({ cobro_total_confirmado: true, monto_cobrado: 500000 })).toBeNull();
  });

  it('ignora diferencias por redondeo', () => {
    expect(diferenciaAceptadaDeCuota({
      cobro_total_confirmado: true, monto_calculado_snapshot: 600000, monto_cobrado: 599999.995,
    })).toBeNull();
  });
});
