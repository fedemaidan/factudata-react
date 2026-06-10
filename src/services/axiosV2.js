import axios from 'axios';
import config from 'src/config/config';
import { attachAuthInterceptors } from 'src/services/_authInterceptor';

// Crea una instancia de axios
const api = axios.create({
    baseURL: config.apiV2Url,
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 1000 * 60 * 3 // 1 minuto
});

attachAuthInterceptors(api);

export default api;
