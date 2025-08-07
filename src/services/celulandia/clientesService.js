import axiosCelulandia from "src/services/axiosCelulandia";

const clientesService = {
  getAllClientes: async () => {
    const response = await axiosCelulandia.get("/clientes");
    return response.data;
  },
};

export default clientesService;
