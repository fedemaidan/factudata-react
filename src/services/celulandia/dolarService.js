import axiosCelulandia from "src/services/axiosCelulandia";

const dolarService = {
  getTipoDeCambio: async () => {
    const response = await axiosCelulandia.get("/dolar");
    return response.data;
  },
};

export default dolarService;
