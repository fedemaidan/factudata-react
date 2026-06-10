import axios from 'axios';
import config from 'src/config/config';
import { attachAuthInterceptors } from 'src/services/_authInterceptor';

// Crea una instancia de axios
const api = axios.create({
    baseURL: config.apiUrl,
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 1000 * 60 * 15 * 10 // 10 minutos
});

attachAuthInterceptors(api);

export default api;
