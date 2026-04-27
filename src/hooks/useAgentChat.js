import { useCallback, useReducer, useRef } from 'react';
import api from 'src/services/axiosConfig';

const initialState = {
  messages: [],
  isLoadingHistory: false,
  isSending: false,
  sessionActive: false,
  awaitingConfirm: false,
  confirmAction: null,
  error: null,
  hasLoadedHistory: false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'load:start':
      return { ...state, isLoadingHistory: true, error: null };
    case 'load:success':
      return {
        ...state,
        isLoadingHistory: false,
        hasLoadedHistory: true,
        messages: action.payload.messages,
        sessionActive: action.payload.sessionActive,
        awaitingConfirm: action.payload.awaitingConfirm,
        confirmAction: action.payload.confirmAction,
      };
    case 'load:error':
      // Marcamos hasLoadedHistory: true aunque haya fallado para evitar reintentos
      // automáticos en el useEffect (que dispararían loop infinito al cambiar la
      // referencia del callback). El reset() vuelve a poner el flag en false.
      return { ...state, isLoadingHistory: false, hasLoadedHistory: true, error: action.payload };
    case 'send:start':
      return {
        ...state,
        isSending: true,
        error: null,
        messages: [...state.messages, action.payload.optimisticMessage],
      };
    case 'send:success':
      return {
        ...state,
        isSending: false,
        messages: [...state.messages, action.payload.assistantMessage],
        sessionActive: action.payload.sessionActive,
        awaitingConfirm: action.payload.awaitingConfirm,
        confirmAction: action.payload.confirmAction,
      };
    case 'send:error':
      return {
        ...state,
        isSending: false,
        error: action.payload,
        // Mantenemos el mensaje optimista del user; solo no se agrega el del assistant
      };
    case 'reset':
      return { ...initialState, hasLoadedHistory: true };
    case 'error:dismiss':
      return { ...state, error: null };
    default:
      return state;
  }
}

function extractErrorMessage(err) {
  const status = err?.response?.status;
  const data = err?.response?.data;
  const backendMsg = typeof data?.error === 'string' ? data.error : null;
  if (status === 403) {
    return backendMsg || 'No tenés acceso al asistente.';
  }
  if (status === 401) {
    return 'Sesión expirada. Volvé a ingresar.';
  }
  if (backendMsg) return backendMsg;
  return 'Ocurrió un error. Probá de nuevo.';
}

/**
 * Encapsula el estado y las llamadas al backend del agente web. Una sola conversación
 * por usuario; el historial se carga la primera vez que se abre el chat y los mensajes
 * se acumulan localmente turno a turno (el backend ya los persiste).
 */
export function useAgentChat() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const inFlightRef = useRef(false);

  const loadHistory = useCallback(async () => {
    if (state.hasLoadedHistory || state.isLoadingHistory) return;
    dispatch({ type: 'load:start' });
    try {
      const { data } = await api.get('/agent/conversation');
      dispatch({ type: 'load:success', payload: data });
    } catch (err) {
      dispatch({ type: 'load:error', payload: extractErrorMessage(err) });
    }
  }, [state.hasLoadedHistory, state.isLoadingHistory]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || '').trim();
    if (!trimmed || inFlightRef.current) return;
    inFlightRef.current = true;
    const optimisticMessage = {
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'send:start', payload: { optimisticMessage } });
    try {
      const { data } = await api.post('/agent/chat', { message: trimmed });
      dispatch({
        type: 'send:success',
        payload: {
          assistantMessage: {
            role: 'assistant',
            content: data.replyText,
            createdAt: new Date().toISOString(),
          },
          sessionActive: data.sessionActive,
          awaitingConfirm: data.awaitingConfirm,
          confirmAction: data.confirmAction,
        },
      });
    } catch (err) {
      dispatch({ type: 'send:error', payload: extractErrorMessage(err) });
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  const reset = useCallback(async () => {
    try {
      await api.post('/agent/reset');
      dispatch({ type: 'reset' });
    } catch (err) {
      dispatch({ type: 'load:error', payload: extractErrorMessage(err) });
    }
  }, []);

  const confirmCurrent = useCallback(() => sendMessage('sí'), [sendMessage]);
  const cancelCurrent = useCallback(() => sendMessage('cancelar'), [sendMessage]);
  const dismissError = useCallback(() => dispatch({ type: 'error:dismiss' }), []);

  return {
    ...state,
    loadHistory,
    sendMessage,
    reset,
    confirmCurrent,
    cancelCurrent,
    dismissError,
  };
}
