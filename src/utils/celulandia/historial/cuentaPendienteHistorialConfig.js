import { getFechaArgentina } from "../fechas";

export const getCuentaPendienteHistorialConfig = (clientes = []) => ({
  title: "Historial de la Entrega",
  entityName: "entrega",
  fieldNames: {
    descripcion: "Descripción",
    fechaCuenta: "Fecha de Cuenta",
    cliente: "Cliente",
    clienteNombre: "Cliente",
    descuentoAplicado: "Descuento Aplicado",
    subTotal: "Sub Total",
    montoTotal: "Monto Total",
    moneda: "Moneda",
    cc: "Cuenta Corriente",
    usuario: "Usuario",
  },
  formatters: {
    fechaCuenta: (valor) => getFechaArgentina(valor),
    descuentoAplicado: (valor) => `${Math.round(((valor ?? 1) - 1) * -100)}%`,
    subTotal: (valor) => {
      if (typeof valor === "object") {
        return `ARS: $${valor.ars || 0} | USD Of: $${valor.usdOficial || 0} | USD Blue: ${
          valor.usdBlue || 0
        }`;
      }
      return valor;
    },
    montoTotal: (valor) => {
      if (typeof valor === "object") {
        return `ARS: $${valor.ars || 0} | USD Of: $${valor.usdOficial || 0} | USD Blue: ${
          valor.usdBlue || 0
        }`;
      }
      return valor;
    },
    cliente: (valor) => {
      if (typeof valor === "object" && valor?.nombre) {
        return valor.nombre;
      }
      if (typeof valor === "string" && clientes.length > 0) {
        const cliente = clientes.find((c) => c._id === valor);
        return cliente ? cliente.nombre : `ID: ${valor}`;
      }
      if (typeof valor === "string") {
        return valor;
      }
      return "N/A";
    },
  },
});
