export const parseMovimiento = (movimiento) => {
  let montoCC = 0;
  switch (movimiento.cuentaCorriente) {
    case "ARS":
      montoCC = movimiento.total.ars;
      break;
    case "USD BLUE":
      montoCC = movimiento.total.usdBlue;
      break;
    case "USD OFFICIAL":
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
      } else if (movimiento.cuentaCorriente === "USD OFFICIAL") {
        montoEnviado = movimiento.total.usdOficial;
      } else if (movimiento.cuentaCorriente === "ARS") {
        montoEnviado = movimiento.total.usdBlue;
      }
      break;
  }

  let fechaCreacion = null;
  let horaCreacion = null;

  if (movimiento.fechaCreacion) {
    const fecha = new Date(movimiento.fechaCreacion);
    fechaCreacion = fecha.toISOString().split("T")[0];
    horaCreacion = fecha.toTimeString().split(" ")[0];
  }

  return {
    ...movimiento,
    montoEnviado,
    tipoDeCambio: Math.round(movimiento.tipoDeCambio),
    montoCC: Math.round(montoCC),
    fechaCreacion,
    horaCreacion,
    nombreCliente: movimiento.cliente.nombre,
    ccActivasCliente: movimiento.cliente.ccActivas,
    cuentaDestino: movimiento.caja.nombre,
  };
};
