import axios from 'axios';
import config from 'src/config/config';

/**
 * Endpoint público sin autenticación. Usa un cliente axios "pelado" porque
 * el `axiosConfig` adjunta el token de Firebase y para esta ruta el cliente
 * no está logueado (la abre desde el celular vía link).
 */
const publicApi = axios.create({
  baseURL: config.apiUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

const consultaPublicaService = {
  /**
   * Devuelve { cliente, cuenta_corriente, acopios, cobros_recientes }
   * para el cliente asociado al token.
   * @param {string} token
   */
  async obtenerSaldo(token) {
    const { data } = await publicApi.get(`/public/consulta-saldo/${token}`);
    return data;
  },

  /** Saldo consolidado de un titular (grupo) por token público. */
  async obtenerSaldoGrupo(token) {
    const { data } = await publicApi.get(`/public/consulta-saldo-grupo/${token}`);
    return data;
  },
};

export default consultaPublicaService;
