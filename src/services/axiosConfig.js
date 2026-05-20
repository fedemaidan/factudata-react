import axios from 'axios';
import config from 'src/config/config';
import { auth } from 'src/config/firebase'; // Asegúrate de tener la referencia correcta a tu configuración de Firebase

// Crea una instancia de axios
const api = axios.create({
    baseURL: config.apiUrl,
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 1000 * 60 * 15 * 10 // 10 minutos
});

const waitForUser = () =>
    new Promise((resolve, reject) => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            unsubscribe();
            if (user) resolve(user);
            else reject(new Error("No hay usuario autenticado"));
        });
    });

const waitForAuthReady = async () => {
    if (typeof auth.authStateReady === 'function') {
        await auth.authStateReady();
    }
};

// Si al token le quedan menos de este margen para expirar, lo refrescamos
// proactivamente antes de mandar la request. Reduce drásticamente los 401 +
// retry que veíamos en backend cuando una pantalla dispara muchas requests
// en paralelo y el SDK de Firebase aún no refrescó solo.
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000; // 5 minutos

// Coalesce: si varias requests detectan token expirando al mismo tiempo,
// hacemos UN solo refresh y todas reusan la misma Promise.
let _inflightRefresh = null;
const getFreshToken = async (user, forceRefresh) => {
    if (!forceRefresh) return user.getIdToken(false);
    if (!_inflightRefresh) {
        _inflightRefresh = user
            .getIdToken(true)
            .finally(() => { _inflightRefresh = null; });
    }
    return _inflightRefresh;
};

api.interceptors.request.use(
    async config => {
        try {
            await waitForAuthReady();
            const fallbackToken = window.localStorage.getItem('authToken');
            const user = auth.currentUser || await waitForUser().catch(() => null);

            let token = null;
            if (user) {
                // Si el token vence en <5 min, refrescar AHORA (en vez de
                // dejar que el server devuelva 401 y reintentar después).
                let forceRefresh = false;
                try {
                    const result = await user.getIdTokenResult();
                    const expMs = new Date(result.expirationTime).getTime();
                    forceRefresh = (expMs - Date.now()) < TOKEN_REFRESH_MARGIN_MS;
                } catch { /* si falla, vamos con el camino normal */ }

                token = await getFreshToken(user, forceRefresh);
                if (forceRefresh) {
                    window.localStorage.setItem('authToken', token);
                }
            } else {
                token = fallbackToken;
            }

            if (token) {
                config.headers['Authorization'] = `Bearer ${token}`;
            }
        } catch (error) {
            console.error("Error al obtener el token de Firebase:", error);
        }
        return config;
    },
    error => Promise.reject(error)
);

api.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;

        // Si la solicitud falla por un problema de autenticación y no se ha reintentado aún
        if ([401, 403].includes(error?.response?.status) && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                await waitForAuthReady();
                const user = auth.currentUser || await waitForUser().catch(() => null);
                if (!user) return Promise.reject(error);
                // Coalesce con el refresh proactivo: si ya hay uno en vuelo,
                // todas las requests fallidas reusan la misma Promise en vez
                // de pegarle 90 veces a Firebase.
                const token = await getFreshToken(user, true);
                window.localStorage.setItem('authToken', token);
                originalRequest.headers['Authorization'] = `Bearer ${token}`;
                return api(originalRequest);
            } catch (refreshError) {
                console.error("Error refreshing token:", refreshError);
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error); // Si no es un error 401, o ya se reintentó, lanza el error
    }
);

export default api;
