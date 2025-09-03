import { getFechaArgentina, getHoraArgentina } from "../fechas";

export const parseCuentaPendiente = (c) => {
  const fechaCuentaCompleta = new Date(c.fechaCuenta);
  const fecha = fechaCuentaCompleta.toISOString().split("T")[0]; // YYYY-MM-DD
  const hora = fechaCuentaCompleta.toTimeString().split(" ")[0]; // HH:MM:SS
  const cc = c.cc;
  let montoCC = 0;
  if (cc === "ARS") montoCC = Number(c?.montoTotal?.ars || 0);
  else if (cc === "USD BLUE") montoCC = Number(c?.montoTotal?.usdBlue || 0);
  else if (cc === "USD OFICIAL") montoCC = Number(c?.montoTotal?.usdOficial || 0);

  let montoEnviado;

  switch (c.moneda) {
    case "ARS":
      montoEnviado = Number(c?.subTotal?.ars || 0);
      break;
    case "USD":
      montoEnviado = Number(c?.subTotal?.usdBlue || 0);
      break;
  }

  console.log("c", c);

  return {
    id: c._id,
    _id: c._id,
    origen: "cuentaPendiente",
    numeroComprobante: c.descripcion || "-",
    fecha: c.fechaCuenta,
    horaCreacion: getHoraArgentina(c.fechaCreacion),
    fechaCuenta: c.fechaCuenta, // Mantener la fecha original para EditarEntregaModal
    hora,
    montoCC,
    tipoDeCambio: c.tipoDeCambio || 1,
    montoEnviado,
    monedaDePago: c.moneda,
    cuentaDestino: c.cc,
    estado: "-",
    type: "EGRESO",
    usuario: c.usuario,
    cuentaCorriente: c.cc,
    // Campos esperados por EditarEntregaModal
    clienteNombre: c.cliente?.nombre || c.proveedorOCliente,
    descripcion: c.descripcion,
    CC: c.cc,
    descuentoAplicado: c.descuentoAplicado,
    cliente: c.cliente,
    subTotal: c.subTotal,
    montoTotal: c.montoTotal,
    type: "cuentaPendiente",
  };
};
