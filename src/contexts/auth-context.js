import { createContext, useContext, useEffect, useReducer, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { auth } from '../config/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from 'src/config/firebase';
import { getTotalCreditsForUser, addCreditsForUser } from 'src/services/creditService';
import profileService from 'src/services/profileService';

const HANDLERS = {
  INITIALIZE: 'INITIALIZE',
  SIGN_OUT: 'SIGN_OUT',
  UPDATE_USER: 'UPDATE_USER',
  RETURN_TO_ORIGINAL_USER: 'RETURN_TO_ORIGINAL_USER',
};

const initialState = {
  isAuthenticated: false,
  isLoading: true,
  authReady: false,
  user: null,
  originalUser: null,
};

const handlers = {
  [HANDLERS.INITIALIZE]: (state, action) => {
    const payload = action.payload;
    const hasUserField =
      payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'user');
    const hasOriginalUserField =
      payload &&
      typeof payload === 'object' &&
      Object.prototype.hasOwnProperty.call(payload, 'originalUser');
    const hasClearStorageField =
      payload &&
      typeof payload === 'object' &&
      Object.prototype.hasOwnProperty.call(payload, 'clearStorage');

    const user = hasUserField ? payload.user : payload || null;
    const originalUser = hasOriginalUserField ? payload.originalUser : state.originalUser || user;
    const clearStorage = hasClearStorageField ? !!payload.clearStorage : false;

    if (!user) {
      if (clearStorage) {
        window.localStorage.removeItem('MY_APP_STATE');
        window.localStorage.removeItem('authToken');
      }
      return {
        ...state,
        isAuthenticated: false,
        isLoading: false,
        user: null,
        originalUser: null,
      };
    }

    return {
      ...state,
      isAuthenticated: true,
      isLoading: false,
      user,
      originalUser,
    };
  },
  [HANDLERS.UPDATE_USER]: (state, action) => {
    const user = action.payload?.user || action.payload;
    const originalUser = action.payload?.originalUser || state.originalUser || user;
    const newState = {
      ...state,
      isAuthenticated: true,
      isLoading: false,
      user,
      originalUser,
    };
    window.localStorage.setItem('MY_APP_STATE', JSON.stringify(newState));
    window.localStorage.setItem('authToken', user.token);

    return newState;
  },
  [HANDLERS.SIGN_OUT]: (state) => {
    window.localStorage.removeItem('MY_APP_STATE');

    return {
      ...state,
      isAuthenticated: false,
      user: null,
    };
  },
  [HANDLERS.RETURN_TO_ORIGINAL_USER]: (state, _action) => {
    return {
      ...state,
      user: state.originalUser,
    };
  },
};

const reducer = (state, action) =>
  handlers[action.type] ? handlers[action.type](state, action) : state;

export const AuthContext = createContext({ undefined });

export const AuthProvider = (props) => {
  const { children } = props;
  const [state, dispatch] = useReducer(reducer, initialState);
  const [authReady, setAuthReady] = useState(false);
  const authReadyRef = useRef(false);
  const initialized = useRef(false);
  const stateRef = useRef(initialState);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const initialize = async () => {
    if (initialized.current) {
      return;
    }

    initialized.current = true;
    if (typeof auth.authStateReady === 'function') {
      await auth.authStateReady();
    }

    const storageState = window.localStorage.getItem('MY_APP_STATE');
    if (storageState) {
      try {
        const savedState = JSON.parse(storageState);
        if (savedState?.user) {
          dispatch({
            type: HANDLERS.UPDATE_USER,
            payload: { user: savedState.user, originalUser: savedState.originalUser || savedState.user },
          });
        }
      } catch (_) {}
    }

    // Fallback: si Firebase no responde en 5s, desbloquear la app con lo que haya en localStorage
    const authReadyTimeout = setTimeout(() => {
      if (!authReadyRef.current) {
        console.warn('[Auth] Timeout esperando onAuthStateChanged, desbloqueando con estado actual');
        setAuthReady(true);
        authReadyRef.current = true;
      }
    }, 5000);

    onAuthStateChanged(auth, async (user) => {
      console.log('AUTENTICANDO CON CREDENCIALES');

      clearTimeout(authReadyTimeout);

      if (user) {
        const idToken = await user.getIdToken(true); // Forzar actualización
        const updatedUser = await getPayloadUserByUid(user.uid, idToken);

        dispatch({
          type: HANDLERS.UPDATE_USER,
          payload: updatedUser,
        });
      } else {
        const shouldIgnoreNullEvent =
          stateRef.current.isAuthenticated &&
          (!!stateRef.current.user?.id || !!stateRef.current.user?.user_id);
        if (shouldIgnoreNullEvent) {
          setAuthReady(true);
          authReadyRef.current = true;
          return;
        }
        dispatch({
          type: HANDLERS.INITIALIZE,
          payload: { user: null, originalUser: null, clearStorage: false },
        });
      }
      setAuthReady(true);
      authReadyRef.current = true;
    });
  };

  useEffect(() => {
    initialize();
  }, []);

  // Refresh automático del usuario cada 30 minutos (transparente)
  useEffect(() => {
    const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutos

    const refreshUserData = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser || !state.isAuthenticated) return;

      try {
        console.log('🔄 [Auth] Refrescando datos de usuario...');
        const idToken = await currentUser.getIdToken(true);
        const freshUser = await getPayloadUserByUid(currentUser.uid, idToken);

        dispatch({
          type: HANDLERS.UPDATE_USER,
          payload: { user: freshUser, originalUser: state.originalUser || freshUser },
        });
        console.log('✅ [Auth] Usuario actualizado correctamente');
      } catch (error) {
        console.error('❌ [Auth] Error refrescando usuario:', error);

        // Si el usuario fue eliminado o hay error grave, hacer logout
        if (error.code === 'sorby/deleted-user' || error.code === 'auth/user-not-found') {
          console.warn('⚠️ [Auth] Usuario eliminado o no encontrado, cerrando sesión...');
          firebaseSignOut(auth).then(() => {
            dispatch({ type: HANDLERS.SIGN_OUT });
          });
        }
      }
    };

    const intervalId = setInterval(refreshUserData, REFRESH_INTERVAL);

    // Cleanup al desmontar
    return () => clearInterval(intervalId);
  }, [state.isAuthenticated, state.originalUser]);

  const getPayloadUserByUid = async (uid, idToken) => {
    const user = await profileService.getProfileByUserId(uid);

    if (!user) {
      const error = new Error('Perfil no encontrado.');
      error.code = 'sorby/deleted-user';
      throw error;
    }

    const credit = await getTotalCreditsForUser(user.id);
    return {
      ...user,
      credit,
      admin: user.admin || false,
      token: idToken,
    };
  };

  const classicSignIn = async (email, password) => {
    try {
      const response = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await response.user.getIdToken(true);
      const payload = await getPayloadUserByUid(response.user.uid, idToken);

      dispatch({
        type: HANDLERS.UPDATE_USER,
        payload: { user: payload, originalUser: payload },
      });
    } catch (error) {
      if (error.code === 'auth/id-token-expired') {
        await refreshToken();
        return classicSignIn(email, password);
      }
      if (error.code === 'sorby/deleted-user') {
        throw new Error('Usuario eliminado por el administrador.');
      }
      console.error('Error in classicSignIn:', error);
      throw error;
    }
  };

  const signUp = async (email, password) => {
    const response = await createUserWithEmailAndPassword(auth, email, password);
    console.log('SignUp response:', response);

    const user = {
      user_id: response.user.uid,
      avatar: auth.currentUser.photoURL,
      firstName: '',
      lastName: '',
      email,
      phone: '',
      state: '',
      country: '',
      admin: false,
      proyectos: [],
    };

    const newUser = await profileService.createProfile(user, null);
    await updateUser(newUser);

    dispatch({
      type: HANDLERS.UPDATE_USER,
      payload: { user: newUser, originalUser: newUser },
    });
  };

  const signUpWithCode = async (email, password, code) => {
    try {
      const profile = await profileService.getProfileByCode(code);
      if (!profile) {
        throw new Error('Invalid confirmation code');
      }

      const response = await createUserWithEmailAndPassword(auth, email, password);
      const userId = response.user.uid;

      // Update profile with the new email and user ID
      const updatedProfile = {
        user_id: userId,
        email,
        confirmed: true,
      };

      await profileService.updateProfile(profile.id, updatedProfile);
      const idToken = await response.user.getIdToken(true);

      const payload = await getPayloadUserByUid(userId, idToken);

      dispatch({
        type: HANDLERS.UPDATE_USER,
        payload: { user: payload, originalUser: payload },
      });
    } catch (error) {
      console.error('Error in signUpWithCode:', error);
      throw error;
    }
  };

  const signOut = () => {
    firebaseSignOut(auth).then(() => {
      dispatch({
        type: HANDLERS.SIGN_OUT,
      });
    });
  };

  const updateUser = async (user) => {
    const { id, credit, token, empresaData, ...persistedUser } = user;
    await profileService.updateProfile(id, persistedUser);

    dispatch({
      type: HANDLERS.UPDATE_USER,
      payload: { ...user, id },
    });
  };

  const refreshUser = async (user) => {
    console.log('refreshUser', user);
    const credit = await getTotalCreditsForUser(user.id);
    dispatch({
      type: HANDLERS.UPDATE_USER,
      payload: {
        ...user,
        credit,
      },
    });
  };

  const sendResetPasswordEmail = async (email) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateUserEmail = async (userId, newEmail) => {
    try {
      if (!auth.currentUser) {
        const e = new Error('No hay usuario logueado.');
        e.code = 'sorby/no-current-user';
        throw e;
      }

      // 1) Cambiar en Firebase Auth
      await updateEmail(auth.currentUser, newEmail);

      // 2) Cambiar en profile
      await profileService.updateProfile(userId, { email: newEmail });

      // 3) Refrescar estado
      const updatedUser = { ...state.user, email: newEmail };
      dispatch({ type: HANDLERS.UPDATE_USER, payload: updatedUser });

      return true;
    } catch (error) {
      // ⚠️ NO PIERDAS EL CODE: re-lanzá el mismo error
      // (si querés, podés adjuntar un mensaje legible sin pisar code)
      if (!error.message) error.message = 'No se pudo actualizar el email.';
      throw error;
    }
  };

  const reauthenticateUser = async (currentPassword) => {
    if (!auth.currentUser) throw new Error('No hay sesión activa');
    const email = auth.currentUser.email;
    if (!email) throw new Error('No se encontró el email actual del usuario');
    const cred = EmailAuthProvider.credential(email, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, cred);
  };

  const updateAvatar = async (user, avatarFile) => {
    const filesFolderRef = ref(storage, `avatars/${avatarFile.name}`);
    await uploadBytes(filesFolderRef, avatarFile);
    const downloadURL = await getDownloadURL(filesFolderRef);

    const userUpdated = {
      ...user,
      avatar: downloadURL,
    };
    await updateUser(userUpdated);
  };

  const refreshToken = async () => {
    try {
      const currentUser = auth.currentUser;
      const idToken = await currentUser.getIdToken(true); // Forzar la renovación del token
      const user = {
        ...state.user,
        token: idToken,
      };
      dispatch({
        type: HANDLERS.UPDATE_USER,
        payload: user,
      });
      window.localStorage.setItem('authToken', idToken); // Actualizar el token en localStorage
      return idToken;
    } catch (error) {
      console.error('Error refreshing token:', error);
    }
  };

  const spyUser = async (user) => {
    try {
      if (!state.originalUser?.admin) {
        throw new Error('Solo los administradores pueden espiar cuentas');
      }

      const targetUserData = await profileService.getProfileById(user.id);

      if (!targetUserData) {
        throw new Error('Usuario no encontrado');
      }
      const credit = await getTotalCreditsForUser(user.id);

      dispatch({
        type: HANDLERS.UPDATE_USER,
        payload: {
          ...targetUserData,
          id: user.id,
          credit,
          admin: targetUserData.admin || false,
        },
      });
    } catch (error) {
      console.error('Error spying user:', error);
      throw error;
    }
  };

  const returnToOriginalUser = () => {
    dispatch({
      type: HANDLERS.RETURN_TO_ORIGINAL_USER,
    });
    window.location.reload();
  };

  const isSpying = () => {
    return !!state.user && !!state.originalUser && state.user.email !== state.originalUser.email;
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        authReady,
        classicSignIn,
        signUp,
        signUpWithCode,
        signOut,
        updateUser,
        updateAvatar,
        refreshUser,
        sendResetPasswordEmail,
        updateUserEmail,
        reauthenticateUser,
        spyUser,
        returnToOriginalUser,
        isSpying,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node,
};

export const AuthConsumer = AuthContext.Consumer;

export const useAuthContext = () => useContext(AuthContext);
