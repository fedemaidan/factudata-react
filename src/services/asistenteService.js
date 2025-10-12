// src/services/asistenteService.js
import api from './axiosConfig';


const asistenteService = {
  askProyectoAssistant: async ({ context, messages }) => {
    const { data } = await api.post('/asistente/proyecto', { context, messages });
    // { reply: string }
    return data;
  },
};

export default asistenteService;
