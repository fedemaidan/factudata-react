import { getFechaArgentina, getHoraArgentina } from "../fechas";

export const parseMovimiento = (movimiento) => {
  let montoCC = 0;
  switch (movimiento.cuentaCorriente) {
    case "ARS":
      montoCC = movimiento.total.ars;
      break;
    case "USD BLUE":
      montoCC = movimiento.total.usdBlue;
      break;
    case "USD OFICIAL":
      montoCC = movimiento.total.usdOficial;
      break;
  }

  let montoEnviado = 0;

  switch (movimiento.moneda) {
    case "ARS":
      montoEnviado = movimiento.total.ars;
      break;
    case "USD":
      if (movimiento.cuentaCorriente === "USD BLUE") {
        montoEnviado = movimiento.total.usdBlue;
      } else if (movimiento.cuentaCorriente === "USD OFICIAL") {
        montoEnviado = movimiento.total.usdOficial;
      } else if (movimiento.cuentaCorriente === "ARS") {
        montoEnviado = movimiento.total.usdBlue;
      }
      break;
  }

  let fechaFactura = null;
  let horaCreacion = null;

  if (movimiento?.fechaFactura) {
    fechaFactura = getFechaArgentina(movimiento.fechaFactura);
  }

  if (movimiento?.fechaCreacion) {
    horaCreacion = getHoraArgentina(movimiento.fechaCreacion);
  }

  return {
    ...movimiento,
    montoEnviado,
    tipoDeCambio: Math.round(movimiento.tipoDeCambio),
    montoCC: Math.round(montoCC),
    fechaCreacion: movimiento.fechaCreacion,
    fechaFactura,
    horaCreacion,
    nombreCliente: movimiento.cliente?.nombre || "Sin cliente",
    ccActivasCliente: movimiento.cliente?.ccActivas || [],
    cuentaDestino: movimiento.caja?.nombre || "Sin caja",
    type: "movimiento",
    fecha: fechaFactura,
  };
};
