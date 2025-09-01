import { getFechaArgentina } from "../fechas";

export const getMovimientoHistorialConfig = (cajas = []) => ({
  title: "Historial del Comprobante",
  entityName: "comprobante",
  fieldNames: {
    tipoDeCambio: "Tipo de Cambio",
    estado: "Estado",
    caja: "Cuenta de Destino",
    cliente: "Cliente",
    cuentaCorriente: "Cuenta Corriente",
    moneda: "Moneda",
    numeroFactura: "Número de Factura",
    fechaFactura: "Fecha de Factura",
    nombreUsuario: "Usuario",
    total: "Monto Total",
    montoEnviado: "Monto Enviado",
  },
  formatters: {
    tipoDeCambio: (valor) => `$${valor}`,
    fechaFactura: (valor) => getFechaArgentina(valor),
    fechaCreacion: (valor) => getFechaArgentina(valor),
    cliente: (valor) => {
      if (typeof valor === "object" && valor?.nombre) {
        return valor.nombre;
      }
      if (typeof valor === "string") {
        return valor;
      }
      return "N/A";
    },
    caja: (valor) => {
      if (typeof valor === "object" && valor?.nombre) {
        return valor.nombre;
      }
      if (typeof valor === "string" && cajas.length > 0) {
        const caja = cajas.find((c) => c._id === valor);
        return caja ? caja.nombre : `ID: ${valor}`;
      }
      return valor || "N/A";
    },
    total: (valor) => {
      if (typeof valor === "object" && valor.ars !== undefined) {
        return `ARS: $${valor.ars?.toFixed(2) || 0} | USD Blue: $${
          valor.usdBlue?.toFixed(2) || 0
        } | USD Oficial: $${valor.usdOficial?.toFixed(2) || 0}`;
      }
      return valor || "N/A";
    },
    montoEnviado: (valor) => {
      return `$${parseFloat(valor || 0).toFixed(2)}`;
    },
  },
});
