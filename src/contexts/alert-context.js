import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Alerts from 'src/components/alerts';

const AlertContext = createContext(undefined);

function defaultGetErrorMessage(error) {
  if (!error) return 'Ocurrió un error';
  if (typeof error === 'string') return error;

  // Axios/fetch-like shapes
  const responseData = error?.response?.data;
  const candidate =
    responseData?.message ||
    responseData?.error ||
    responseData?.detail ||
    error?.message;

  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    return candidate;
  }

  try {
    // Avoid huge payloads; fallback to generic message on failure
    const serialized = JSON.stringify(error);
    return serialized && serialized !== '{}' ? serialized : 'Ocurrió un error';
  } catch {
    return 'Ocurrió un error';
  }
}

export const AlertProvider = ({ children, getErrorMessage = defaultGetErrorMessage }) => {
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'error' });

  const closeAlert = useCallback(() => {
    setAlert((prev) => ({ ...prev, open: false }));
  }, []);

  const showAlert = useCallback(({ message, severity = 'error' }) => {
    setAlert({ open: true, message, severity });
  }, []);

  const notifyError = useCallback(
    (error, fallbackMessage) => {
      const rawMessage = getErrorMessage(error) || fallbackMessage || 'Ocurrió un error';
      const message =
        fallbackMessage && rawMessage && rawMessage !== fallbackMessage
          ? `${fallbackMessage}: ${rawMessage}`
          : rawMessage;
      showAlert({ message, severity: 'error' });
    },
    [getErrorMessage, showAlert]
  );

  useEffect(() => {
    const onUnhandledRejection = (event) => {
      notifyError(event?.reason || event, 'Error no manejado');
    };
    const onError = (event) => {
      notifyError(event?.error || event, 'Error no manejado');
    };

    window.addEventListener('unhandledrejection', onUnhandledRejection);
    window.addEventListener('error', onError);
    return () => {
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      window.removeEventListener('error', onError);
    };
  }, [notifyError]);

  const value = useMemo(
    () => ({
      showAlert,
      notifyError,
      closeAlert,
    }),
    [showAlert, notifyError, closeAlert]
  );

  return (
    <AlertContext.Provider value={value}>
      <Alerts alert={alert} onClose={closeAlert} />
      {children}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error('useAlert debe usarse dentro de <AlertProvider>');
  }
  return ctx;
};

