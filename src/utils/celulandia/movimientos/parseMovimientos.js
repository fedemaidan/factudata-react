export const parseMovimientos = (movimientos) => {
  return movimientos.map((movimiento) => {
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

    // Separar fechaCreacion en fecha y hora
    let fechaCreacion = null;
    let horaCreacion = null;

    if (movimiento.fechaCreacion) {
      const fecha = new Date(movimiento.fechaCreacion);
      fechaCreacion = fecha.toISOString().split("T")[0]; // Formato YYYY-MM-DD
      horaCreacion = fecha.toTimeString().split(" ")[0]; // Formato HH:MM:SS
    }

    return {
      ...movimiento,
      montoCC,
      fechaCreacion,
      horaCreacion,
      nombreCliente: movimiento.cliente.nombre,
      ccActivasCliente: movimiento.cliente.ccActivas,
    };
  });
};
