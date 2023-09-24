import { db } from 'src/config/firebase';
import { collection, doc, addDoc, getDoc, updateDoc, query, where, getDocs, serverTimestamp} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from 'src/config/firebase';

export const getCreditsForUser = async (userId) => {
  try {
    const creditData = [];
    const q = query(collection(db, 'credits'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((doc) => {
      console.log(doc)
      creditData.push({ id: doc.id, ...doc.data() });
    });
    return creditData;
  } catch (error) {
    console.error("Error al obtener los créditos: ", error);
    return 0;
  }
};

export const getTotalCreditsForUser = async (userId) => {
  try {
    let total = 0;
    const q = query(collection(db, 'credits'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((doc) => {
      console.log("Estoy calculando", doc.data().amount)
      total += doc.data().amount;
    });
    
    return total;
  } catch (error) {
    console.error("Error al obtener los créditos: ", error);
    return [];
  }
};

const addRegisterCreditForUser = async (userId, amount, type, cost, url, status) => {
  const newCredit = {
    userId,
    type,
    amount,
    cost,
    date: serverTimestamp(),
    comprobante: url,
    status: status
  };
  const creditRef = await addDoc(collection(db, 'credits'), newCredit);

  return { id: creditRef.id, ...newCredit };
}

// Agregar créditos para un usuario
export const addCreditsForUser = async (userId, amount, cost = 0, file = null) => {
  try {
    let url = null;
    let status = "Init";

    if (file != null && cost > 0) {
      const filesFolderRef = ref(storage, `comprobantesCredito/${userId}/${file.name}`);
      await uploadBytes(filesFolderRef, file);
      url = await getDownloadURL(filesFolderRef);
      status = "Pending"
    }

    return addRegisterCreditForUser(userId, amount, "ADD", cost, url, status);
  } catch (error) {
    console.error("Error al agregar créditos: ", error);
    return null;
  }
};

// Eliminar créditos para un usuario
export const removeCreditsForUser = async (userId, amount) => {
  try {
    return addRegisterCreditForUser(userId, -amount, "REMOVE", 0, null, null);
  } catch (error) {
    console.error("Error al eliminar créditos: ", error);
    return false;
  }
};
