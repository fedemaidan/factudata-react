import axiosCelulandia from "src/services/axiosCelulandia";

const dolarService = {
  // Shape única para todo Celulandia: { oficial, blue, ultimaActualizacion }
  getTipoDeCambio: async () => {
    const response = await axiosCelulandia.get("/dolar");
    const data = response.data || {};
    return {
      oficial: Number(data.oficial) > 0 ? Number(data.oficial) : null,
      blue: Number(data.blue) > 0 ? Number(data.blue) : null,
      ultimaActualizacion: data.ultimaActualizacion || null,
    };
  },
};

export default dolarService;
