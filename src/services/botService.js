import axios from 'axios';

// Ajusta la URL base según tu configuración. 
// Si estás en desarrollo local, suele ser localhost:3003.
// En producción, debería ser la URL de tu API del bot.
const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3003/api';

class BotService {
  async listarUsuarios(phone = '') {
    try {
      const params = {};
      if (phone) params.phone = phone;
      
      const response = await axios.get(`${API_URL}/bot-state/users-state`, { params });
      return response.data;
    } catch (error) {
      console.error('Error al listar usuarios del bot:', error);
      throw error;
    }
  }

  async resetearEstado(phone) {
    try {
      const response = await axios.post(`${API_URL}/bot-state/reset-state`, { phone });
      return response.data;
    } catch (error) {
      console.error('Error al resetear estado:', error);
      throw error;
    }
  }
}

export default new BotService();
