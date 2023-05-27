import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage} from "firebase/storage"
// import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAeR7QZR6lrxjp5gzxgUJDGa4E_N-Ohndk",
  authDomain: "factudata-3afdf.firebaseapp.com",
  projectId: "factudata-3afdf",
  storageBucket: "factudata-3afdf.appspot.com",
  messagingSenderId: "451744655383",
  appId: "1:451744655383:web:4c4e6cb4fdbb9f3ff55452",
  measurementId: "G-LSGQ7KL7YY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const db =  getFirestore(app);
export const storage = getStorage(app);
// const analytics = getAnalytics(app);