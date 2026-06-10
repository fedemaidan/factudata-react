import axios from 'axios';
import { attachAuthInterceptors } from 'src/services/_authInterceptor';

const isProduction = process.env.NODE_ENV === 'production';
// const apiUrl = isProduction ? 'https://stock-whatsapp-sorby-production.up.railway.app' : 'http://localhost:3000/';
const apiUrl =
  process.env.NEXT_PUBLIC_CHATBOT_URL
  || (isProduction
    ? 'https://api.sorbydata.com/chat-bot/api'
    : 'http://localhost:3010/api/');
// Crea una instancia de axios
const api = axios.create({
  baseURL: apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

attachAuthInterceptors(api);

export default api;
