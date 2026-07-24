import { signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from 'src/config/firebase';

// Timestamp de la última actividad real del usuario (request no-background).
// Lo actualiza el request-interceptor de axios y lo lee el IdleWatcher para el
// logout proactivo por inactividad. Fuente de verdad final: el backend.
let lastActivityMs = Date.now();

export const markActivity = () => {
  lastActivityMs = Date.now();
};

export const getLastActivityMs = () => lastActivityMs;

// Logout "de verdad": corta la sesión de Firebase, limpia el estado local y
// manda a login. Idempotente: varios disparos concurrentes (interceptor +
// IdleWatcher) hacen una sola cosa.
let loggingOut = false;
export const forceSessionLogout = async () => {
  if (loggingOut) return;
  loggingOut = true;
  await firebaseSignOut(auth).catch(() => {});
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('authToken');
    window.localStorage.removeItem('MY_APP_STATE');
    if (!window.location.pathname.startsWith('/auth')) {
      window.location.href = '/auth/login';
    }
  }
};
