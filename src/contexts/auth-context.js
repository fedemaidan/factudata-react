import { createContext, useContext, useEffect, useReducer, useRef } from 'react';
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
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from 'src/config/firebase';
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
  user: null,
  originalUser: null,
};

const handlers = {
  [HANDLERS.INITIALIZE]: (state, action) => {
    const user = action.payload?.user || action.payload || null;
    const originalUser = action.payload?.originalUser || state.originalUser || user;

    return {
      ...state,
      ...(user
        ? {
            isAuthenticated: true,
            isLoading: false,
            user,
            originalUser,
          }
        : {
            isLoading: false,
          }),
    };
  },
  [HANDLERS.UPDATE_USER]: (state, action) => {
    const user = action.payload?.user || action.payload;
    const originalUser = action.payload?.originalUser || state.originalUser;
    const newState = {
      ...state,
      isAuthenticated: true,
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
  const initialized = useRef(false);

  const initialize = async () => {
    if (initialized.current) {
      return;
    }

    initialized.current = true;
    const storageState = window.localStorage.getItem('MY_APP_STATE');

    if (storageState) {
      const savedState = JSON.parse(storageState);
      dispatch({
        type: HANDLERS.INITIALIZE,
        payload: { user: savedState.user, originalUser: savedState.originalUser },
      });
    } else {
      dispatch({
        type: HANDLERS.INITIALIZE,
        payload: null,
      });
    }

    onAuthStateChanged(auth, async (user) => {
      console.log('AUTENTICANDO CON CREDENCIALES');

      if (user) {
        const idToken = await user.getIdToken(true); // Forzar actualización
        const updatedUser = await getPayloadUserByUid(user.uid, idToken);

        dispatch({
          type: HANDLERS.UPDATE_USER,
          payload: updatedUser,
        });
      } else {
        dispatch({
          type: HANDLERS.INITIALIZE,
          payload: null,
        });
      }
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
    const userRef = collection(db, 'profile');
    const q = query(userRef, where('user_id', '==', uid));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.docs.length == 0) {
      const error = new Error('Perfil no encontrado.');
      error.code = 'sorby/deleted-user';
      throw error;
    }

    const user = querySnapshot.docs[0].data();
    const id = querySnapshot.docs[0].id;
    const credit = await getTotalCreditsForUser(id);
    return {
      ...user,
      credit,
      id,
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
      id: '',
      avatar: auth.currentUser.photoURL,
      firstName: '',
      lastName: '',
      email,
      phone: '',
      state: '',
      country: '',
      created_at: serverTimestamp(),
      admin: false,
      empresa: null,
      proyectos: [],
    };

    const usersCollectionRef = collection(db, 'profile');
    const userRef = await addDoc(usersCollectionRef, user);

    const newUser = {
      ...user,
      id: userRef.id,
    };
    await updateUser(newUser);

    dispatch({
      type: HANDLERS.UPDATE_USER,
      payload: newUser,
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
        ...profile,
        user_id: userId,
        email,
        confirmed: true,
      };

      await updateDoc(doc(db, 'profile', profile.id), updatedProfile);
      const idToken = await response.user.getIdToken(true);

      const payload = await getPayloadUserByUid(userId, idToken);

      dispatch({
        type: HANDLERS.UPDATE_USER,
        payload: payload,
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
    const userRef = doc(db, 'profile', user.id);
    await updateDoc(userRef, user);

    dispatch({
      type: HANDLERS.UPDATE_USER,
      payload: user,
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

      // 2) Cambiar en Firestore (colección profile)
      const userRef = doc(db, 'profile', userId);
      await updateDoc(userRef, { email: newEmail });

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

      const userRef = doc(db, 'profile', user.id);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error('Usuario no encontrado');
      }

      const targetUserData = userDoc.data();
      const credit = await getTotalCreditsForUser(user.id);

      dispatch({
        type: HANDLERS.UPDATE_USER,
        payload: {
          ...targetUserData,
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
    return state.user && state.user.email !== state.originalUser.email;
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
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
