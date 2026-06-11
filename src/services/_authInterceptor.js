import { auth } from 'src/config/firebase';

// ─────────────────────────────────────────────────────────────────────────────
// Interceptores de auth compartidos por TODAS las instancias de axios.
//
// Antes cada cliente (axiosConfig, axiosChatBot, axiosV2, ...) tenía su propia
// copia del interceptor y solo axiosConfig había recibido el refresh proactivo.
// Resultado: el bot (axiosChatBot) disparaba 25 requests con token vencido,
// recibía 25 × 401 (auth/id-token-expired) y recién ahí refrescaba y reintentaba
// las 25 → el doble de tráfico por cada interacción.
//
// Acá centralizamos:
//  1. Refresh PROACTIVO: si al token le quedan <5 min, lo renovamos ANTES de
//     mandar la request (en vez de esperar el 401 del server).
//  2. Coalescing GLOBAL: si varias requests (de cualquier instancia) detectan el
//     token venciendo a la vez, hacemos UN solo getIdToken(true) y todas reusan
//     la misma Promise. Evita el "thundering herd" contra Firebase.
//  3. Retry reactivo: si igual cae un 401/403, refresca (coalescado) y reintenta
//     una vez.
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000; // 5 minutos

const waitForUser = () =>
  new Promise((resolve, reject) => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      unsubscribe();
      if (user) resolve(user);
      else reject(new Error('No hay usuario autenticado'));
    });
  });

const waitForAuthReady = async () => {
  if (typeof auth.authStateReady === 'function') {
    await auth.authStateReady();
  }
};

// Coalesce compartido entre todas las instancias de axios.
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

const tokenVenceEnBreve = async user => {
  try {
    const result = await user.getIdTokenResult();
    const expMs = new Date(result.expirationTime).getTime();
    return (expMs - Date.now()) < TOKEN_REFRESH_MARGIN_MS;
  } catch {
    // Si no podemos leer la expiración, seguimos el camino normal.
    return false;
  }
};

/**
 * Instala los interceptores de request y response de auth en una instancia axios.
 * @param {import('axios').AxiosInstance} api
 */
export const attachAuthInterceptors = api => {
  api.interceptors.request.use(
    async config => {
      try {
        await waitForAuthReady();
        const user = auth.currentUser || await waitForUser().catch(() => null);

        let token = null;
        if (user) {
          const forceRefresh = await tokenVenceEnBreve(user);
          token = await getFreshToken(user, forceRefresh);
          if (forceRefresh) {
            window.localStorage.setItem('authToken', token);
          }
        } else {
          token = window.localStorage.getItem('authToken');
        }

        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (error) {
        const fallbackToken = window.localStorage.getItem('authToken');
        if (fallbackToken) {
          config.headers['Authorization'] = `Bearer ${fallbackToken}`;
          return config;
        }
        console.error('Error al obtener el token de Firebase:', error);
      }
      return config;
    },
    error => Promise.reject(error)
  );

  api.interceptors.response.use(
    response => response,
    async error => {
      const originalRequest = error.config;

      if ([401, 403].includes(error?.response?.status) && originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          await waitForAuthReady();
          const user = auth.currentUser || await waitForUser().catch(() => null);
          if (!user) {
            // 401 sin usuario de Firebase: no hay refresh posible, el token
            // guardado está muerto. Borrarlo corta el loop (el request
            // interceptor lo seguía mandando como fallback en cada llamada) y
            // redirigimos al login para no dejar la pestaña zombie.
            if (typeof window !== 'undefined') {
              window.localStorage.removeItem('authToken');
              window.localStorage.removeItem('MY_APP_STATE');
              if (!window.location.pathname.startsWith('/auth')) {
                window.location.href = '/auth/login';
              }
            }
            return Promise.reject(error);
          }
          // Reusa el refresh en vuelo si lo hay (coalescing global).
          const token = await getFreshToken(user, true);
          window.localStorage.setItem('authToken', token);
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return api(originalRequest);
        } catch (refreshError) {
          console.error('Error refreshing token:', refreshError);
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  return api;
};

export default attachAuthInterceptors;
