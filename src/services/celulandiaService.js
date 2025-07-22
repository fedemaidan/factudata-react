import mockData from "./celulandiaData.json";

// Simular delay de red
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const celulandiaService = {
  // Obtener todos los movimientos
  getAllMovimientos: async () => {
    try {
      await delay(500); // Simular delay de red
      return mockData.movimientos;
    } catch (err) {
      console.error("Error al obtener los movimientos:", err);
      return [];
    }
  },

  // Obtener un movimiento por ID
  getMovimientoById: async (movimientoId) => {
    try {
      await delay(300);
      const movimiento = mockData.movimientos.find((m) => m.id === parseInt(movimientoId));
      return movimiento || null;
    } catch (err) {
      console.error("Error al obtener el movimiento:", err);
      return null;
    }
  },

  // Crear un nuevo movimiento
  createMovimiento: async (movimientoData) => {
    try {
      await delay(400);
      const newMovimiento = {
        id: Math.max(...mockData.movimientos.map((m) => m.id)) + 1,
        ...movimientoData,
        fecha: new Date().toISOString().split("T")[0],
        hora: new Date().toTimeString().split(" ")[0],
      };

      // En un caso real, aquí se haría la llamada al backend
      // mockData.movimientos.push(newMovimiento);

      return newMovimiento;
    } catch (err) {
      console.error("Error al crear el movimiento:", err);
      return null;
    }
  },

  // Actualizar un movimiento existente
  updateMovimiento: async (movimientoId, movimientoData) => {
    try {
      await delay(400);
      const index = mockData.movimientos.findIndex((m) => m.id === parseInt(movimientoId));

      if (index === -1) {
        return null;
      }

      const updatedMovimiento = {
        ...mockData.movimientos[index],
        ...movimientoData,
        id: parseInt(movimientoId), // Mantener el ID original
      };

      // En un caso real, aquí se haría la llamada al backend
      // mockData.movimientos[index] = updatedMovimiento;

      return updatedMovimiento;
    } catch (err) {
      console.error("Error al actualizar el movimiento:", err);
      return null;
    }
  },

  // Eliminar un movimiento
  deleteMovimientoById: async (movimientoId) => {
    try {
      await delay(300);
      const index = mockData.movimientos.findIndex((m) => m.id === parseInt(movimientoId));

      if (index === -1) {
        return false;
      }

      // En un caso real, aquí se haría la llamada al backend
      // mockData.movimientos.splice(index, 1);

      return true;
    } catch (err) {
      console.error("Error al eliminar el movimiento:", err);
      return false;
    }
  },

  // Obtener movimientos por estado
  getMovimientosByEstado: async (estado) => {
    try {
      await delay(300);
      const movimientos = mockData.movimientos.filter((m) => m.estado === estado);
      return movimientos;
    } catch (err) {
      console.error("Error al obtener movimientos por estado:", err);
      return [];
    }
  },

  // Obtener movimientos por cuenta destino
  getMovimientosByCuentaDestino: async (cuentaDestino) => {
    try {
      await delay(300);
      const movimientos = mockData.movimientos.filter((m) => m.cuentaDestino === cuentaDestino);
      return movimientos;
    } catch (err) {
      console.error("Error al obtener movimientos por cuenta destino:", err);
      return [];
    }
  },

  // Obtener movimientos por fecha
  getMovimientosByFecha: async (fecha) => {
    try {
      await delay(300);
      const movimientos = mockData.movimientos.filter((m) => m.fecha === fecha);
      return movimientos;
    } catch (err) {
      console.error("Error al obtener movimientos por fecha:", err);
      return [];
    }
  },

  // Obtener estadísticas básicas
  getEstadisticas: async () => {
    try {
      await delay(500);
      const movimientos = mockData.movimientos;

      const estadisticas = {
        totalMovimientos: movimientos.length,
        confirmados: movimientos.filter((m) => m.estado === "CONFIRMADO").length,
        pendientes: movimientos.filter((m) => m.estado === "PENDIENTE").length,
        totalMontoARS: movimientos
          .filter((m) => m.monedaDePago === "ARS")
          .reduce((sum, m) => sum + m.montoEnviado, 0),
        totalMontoUSD: movimientos
          .filter((m) => m.monedaDePago === "USD")
          .reduce((sum, m) => sum + m.montoEnviado, 0),
        ensopSRL: movimientos.filter((m) => m.cuentaDestino === "ENSHOP SRL").length,
        financiera: movimientos.filter((m) => m.cuentaDestino === "FINANCIERA").length,
      };

      return estadisticas;
    } catch (err) {
      console.error("Error al obtener estadísticas:", err);
      return null;
    }
  },

  // Método para obtener totales de clientes por cuenta corriente
  async getClientesTotales() {
    try {
      // Simulamos la llamada al endpoint
      const response = await fetch("/api/celulandia/clientes-totales");

      if (!response.ok) {
        throw new Error("Error al obtener totales de clientes");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error en getClientesTotales:", error);
      // Retornamos datos simulados basados en el JSON existente
      const movimientos = mockData.movimientos;
      const clientesMap = new Map();

      // Procesamos todos los movimientos para calcular totales por cliente y CC
      movimientos.forEach((mov) => {
        const cliente = mov.cliente;
        const cc = mov.CC;
        const monto = mov.montoCC;

        if (!clientesMap.has(cliente)) {
          clientesMap.set(cliente, {
            cliente: cliente,
            ARS: 0,
            "USD BLUE": 0,
            "USD OFICIAL": 0,
          });
        }

        const clienteData = clientesMap.get(cliente);

        // Sumamos el monto según la cuenta corriente
        if (cc === "ARS") {
          clienteData.ARS += monto;
        } else if (cc === "USD BLUE") {
          clienteData["USD BLUE"] += monto;
        } else if (cc === "USD OFICIAL") {
          clienteData["USD OFICIAL"] += monto;
        }
      });

      // Convertimos el Map a array y ordenamos por nombre de cliente
      return Array.from(clientesMap.values()).sort((a, b) => a.cliente.localeCompare(b.cliente));
    }
  },
};

export default celulandiaService;
