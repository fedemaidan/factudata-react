import axios from 'axios';
import config from 'src/config/config';
import { attachAuthInterceptors } from 'src/services/_authInterceptor';

const isProduction = process.env.NODE_ENV === 'production';
// const apiUrl = isProduction ? 'https://stock-whatsapp-sorby-production.up.railway.app' : 'http://localhost:3000/';
const apiUrl = process.env.NEXT_PUBLIC_STOCK_URL || 'https://api.sorbydata.com/materiales'
// Crea una instancia de axios
const api = axios.create({
    baseURL: config.apiUrl,
    headers: {
        'Content-Type': 'application/json'
    }
});

attachAuthInterceptors(api);

export default api;
