import axios from 'axios';
import config from 'src/config/config';
import { auth } from 'src/config/firebase'; // Asegúrate de tener la referencia correcta a tu configuración de Firebase

const isProduction = process.env.NODE_ENV === 'production';
// const apiUrl = isProduction ? 'https://stock-whatsapp-sorby-production.up.railway.app' : 'http://localhost:3000/';
const apiUrl = 'https://stock-whatsapp-sorby-production.up.railway.app'
// Crea una instancia de axios
const api = axios.create({
    baseURL: apiUrl,
    headers: {
        'Content-Type': 'application/json'
    }
});

const waitForUser = () =>
    new Promise((resolve, reject) => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            unsubscribe();
            if (user) resolve(user);
            else reject(new Error("No hay usuario autenticado"));
        });
    });

api.interceptors.request.use(
    async config => {
        try {
            const user = auth.currentUser || await waitForUser();
            const token = await user.getIdToken();
            if (token) {
                config.headers['Authorization'] = `Bearer ${token}`;
            }
        } catch (error) {
            console.error("Error al obtener el token de Firebase:", error);
            throw error;
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
        if (error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true; // Marcar la solicitud como ya reintentada
            try {
                const token = await auth.currentUser.getIdToken(true); // Forzar la actualización del token
                window.localStorage.setItem('authToken', token); // Opcional: Guardar el nuevo token
                originalRequest.headers['Authorization'] = `Bearer ${token}`;
                return api(originalRequest); // Reenviar la solicitud original con el nuevo token
            } catch (refreshError) {
                console.error("Error refreshing token:", refreshError);
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error); // Si no es un error 401, o ya se reintentó, lanza el error
    }
);

export default api;
