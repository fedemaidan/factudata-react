import { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import PropTypes from 'prop-types';
import { auth } from "../config/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged } from "firebase/auth"
import { collection, addDoc, getDocs, doc, query, where, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from 'src/config/firebase';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from 'src/config/firebase';
import {getTotalCreditsForUser, addCreditsForUser } from 'src/services/creditService';

const HANDLERS = {
  INITIALIZE: 'INITIALIZE',
  SIGN_OUT: 'SIGN_OUT',
  UPDATE_USER: 'UPDATE_USER'
};

const initialState = {
  isAuthenticated: false,
  isLoading: true,
  user: null
};

const handlers = {
  [HANDLERS.INITIALIZE]: (state, action) => {
    console.log("HANDLERS.INITIALIZE")
    const user = action.payload;

    return {
      ...state,
      ...(
        // if payload (user) is provided, then is authenticated
        user
          ? ({
            isAuthenticated: true,
            isLoading: false,
            user
          })
          : ({
            isLoading: false
          })
      )
    };
  },
  [HANDLERS.UPDATE_USER]: (state, action) => {
    const user = action.payload;
    const newState = {
      ...state,
      isAuthenticated: true,
      user
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
      user: null
    };
  }
};

const reducer = (state, action) => (
  handlers[action.type] ? handlers[action.type](state, action) : state
);

// The role of this context is to propagate authentication state through the App tree.

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
      console.log(savedState)
      dispatch({
        type: HANDLERS.INITIALIZE,
        payload: savedState.user
      });
    } else {
      dispatch({
        type: HANDLERS.INITIALIZE
      });
    }


    onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Obtén el token actualizado
        const idToken = await user.getIdToken(true); // Forzar actualización

        // Actualiza el estado del contexto con el token y otros datos
        const updatedUser = await getPayloadUserByUid(user.uid,idToken);

        dispatch({
          type: HANDLERS.UPDATE_USER,
          payload: updatedUser
        });
      } else {
        dispatch({
          type: HANDLERS.INITIALIZE
        });
      }
    });
  };


  useEffect(
    () => {
      initialize();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const getPayloadUserByUid = async (uid,idToken)=> {
    const userRef = collection(db, "profile");
    const q = query(userRef, where("user_id", "==", uid));
    const querySnapshot = await getDocs(q);    
    const user =  querySnapshot.docs[0].data();
    const id = querySnapshot.docs[0].id;
    const credit = await getTotalCreditsForUser(id);
    return {
      ...user,
      credit: credit,
      id: id,
      admin: user.admin? user.admin : false,
      token: idToken
    }
  }

  const classicSignIn = async (email, password) => {
    try {
      const response = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await response.user.getIdToken(true);
      const payload = await getPayloadUserByUid(response.user.uid, idToken);
  
      dispatch({
        type: HANDLERS.UPDATE_USER,
        payload: payload
      });
    } catch (error) {
      if (error.code === 'auth/id-token-expired') {
        await refreshToken();
        return classicSignIn(email, password); // Reintenta la autenticación
      }
      console.error("Error in classicSignIn:", error);
    }
  }
  

  const signUp = async (email, password) => {
    const response = await createUserWithEmailAndPassword(auth, email, password);
    const initCredit = 20;
    const user = {
      user_id: response.user.uid,
      id: '',
      avatar: auth.currentUser.photoURL,
      firstName: '',
      lastName: '',
      email: email,
      phone: '',
      state: '',
      country: '',
      created_at: serverTimestamp(),
      admin: false,
      empresa: null,
      proyectos: []
    };
    
    const usersCollectionRef = collection(db, 'profile');
    const userRef = await addDoc(usersCollectionRef, user)
    await addCreditsForUser(userRef.id,initCredit);
    const newUser = {
      ...user,
      credit: initCredit,
      id: userRef.id
    }
    await updateUser(newUser)
    
    dispatch({
      type: HANDLERS.UPDATE_USER,
      payload: newUser
    });
  };

  const signOut = () => {
    firebaseSignOut(auth).then(() => {
      dispatch({
        type: HANDLERS.SIGN_OUT
      });
    });
  };


  const updateUser = async (user) => {
    const userRef = doc(db, "profile", user.id);
    await updateDoc(userRef, user);
    
    dispatch({
      type: HANDLERS.UPDATE_USER,
      payload: user
    });
  }

  const refreshUser = async(user) => {
    const credit = await getTotalCreditsForUser(user.id);
    dispatch({
      type: HANDLERS.UPDATE_USER,
      payload: {
        ...user,
        credit: credit
      }
    });
  }

  const updateAvatar = async (user, avatarFile) => {
    const filesFolderRef = ref(storage, `avatars/${avatarFile.name}`);
    await uploadBytes(filesFolderRef, avatarFile);
    const downloadURL = await getDownloadURL(filesFolderRef);
    
    const userUpdated = {
      ...user,
      avatar: downloadURL
    };
    await updateUser(userUpdated);
  }

  const refreshToken = async () => {
    try {
      const currentUser = auth.currentUser;
      const idToken = await currentUser.getIdToken(true); // Forzar la renovación del token
      const user = {
        ...state.user,
        token: idToken
      };
      dispatch({
        type: HANDLERS.UPDATE_USER,
        payload: user
      });
      window.localStorage.setItem('authToken', idToken); // Actualizar el token en localStorage
      return idToken;
    } catch (error) {
      console.error("Error refreshing token:", error);
    }
  }
  

  return (
    <AuthContext.Provider
      value={{
        ...state,
        classicSignIn,
        signUp,
        signOut,
        updateUser,
        updateAvatar,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node
};

export const AuthConsumer = AuthContext.Consumer;

export const useAuthContext = () => useContext(AuthContext);
