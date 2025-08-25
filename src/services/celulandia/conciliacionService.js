import axiosCelulandia from "src/services/axiosCelulandia";

const conciliacionService = {
  confirmarSeleccionados: async (ids, usuario) => {
    const response = await axiosCelulandia.post("/movimientos/confirmar", {
      ids,
      usuario,
    });
    return response.data;
  },
};

export default conciliacionService;
