import axiosCelulandia from "src/services/axiosCelulandia";

const cajasService = {
  getAllCajas: async () => {
    const response = await axiosCelulandia.get("/cajas");
    return response.data;
  },
};

export default cajasService;
