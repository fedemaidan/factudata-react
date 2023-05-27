import { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import PropTypes from 'prop-types';
import { auth } from "../config/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth"
import { collection, addDoc, getDocs, doc, query, where, updateDoc } from 'firebase/firestore'
import { db } from 'src/config/firebase';
const HANDLERS = {
  INITIALIZE: 'INITIALIZE',
  SIGN_IN: 'SIGN_IN',
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
  [HANDLERS.SIGN_IN]: (state, action) => {
    const user = action.payload;

    return {
      ...state,
      isAuthenticated: true,
      user
    };
  },
  [HANDLERS.UPDATE_USER]: (state, action) => {
    const user = action.payload;

    return {
      ...state,
      user
    };
  },
  [HANDLERS.SIGN_OUT]: (state) => {
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
    // Prevent from calling twice in development mode with React.StrictMode enabled
    if (initialized.current) {
      return;
    }

    initialized.current = true;

    if (state.isAuthenticated) {
      dispatch({
        type: HANDLERS.INITIALIZE,
        payload: state.user
      });
    } else {
      dispatch({
        type: HANDLERS.INITIALIZE
      });
    }
  };

  useEffect(
    () => {
      initialize();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const classicSignIn = async (email, password)  => {
    const response = await signInWithEmailAndPassword(auth, email,password);
    
    const userRef = collection(db, "profile");
    
    const q = query(userRef, where("user_id", "==", response.user.uid));
    const querySnapshot = await getDocs(q);    
    const user =  querySnapshot.docs[0].data();
    const id = querySnapshot.docs[0].id;
    
    dispatch({
      type: HANDLERS.SIGN_IN,
      payload: {
        ...user,
        id: id
      }
    });
  }

  const signUp = async (email, password) => {
    const response = await createUserWithEmailAndPassword(auth, email, password);
    
    const user = {
      user_id: response.user.uid,
      id: '',
      avatar: '',
      firstName: '',
      lastName: '',
      email: email,
      phone: '',
      state: '',
      country: ''
    };
    
    const usersCollectionRef = collection(db, 'profile');
    const userRef = await addDoc(usersCollectionRef, user)

    dispatch({
      type: HANDLERS.SIGN_IN,
      payload: {
        ...user,
        id: userRef.id
      }
    });
  };

  const signOut = () => {
    dispatch({
      type: HANDLERS.SIGN_OUT
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

  return (
    <AuthContext.Provider
      value={{
        ...state,
        classicSignIn,
        signUp,
        signOut,
        updateUser
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
