import { db } from 'src/config/firebase';
import { collection, doc, addDoc, getDoc, updateDoc, query, where, getDocs, serverTimestamp} from 'firebase/firestore';


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
    
    const querySnapshot = await db.collection("credits").where("userId", "==", userId).get();
    
    querySnapshot.forEach((doc) => {
      console.log(doc)
      total += doc.data.amount;
    });
    
    return total;
  } catch (error) {
    console.error("Error al obtener los créditos: ", error);
    return [];
  }
};

const addRegisterCreditForUser = async (userId, amount, type, cost) => {
  amount = type == "ADD"? amount : -amount;
  console.log(type, amount);

  const newCredit = {
    userId,
    type,
    amount,
    cost,
    date: serverTimestamp(),
  };
  const creditRef = await addDoc(collection(db, 'credits'), newCredit);

  return { id: creditRef.id, ...newCredit };
}

// Agregar créditos para un usuario
export const addCreditsForUser = async (userId, amount, cost = 0) => {
  try {
    console.log("aoaoaoa, estoy")
    return addRegisterCreditForUser(userId, amount, "ADD", cost);
  } catch (error) {
    console.error("Error al agregar créditos: ", error);
    return null;
  }
};

// Eliminar créditos para un usuario
export const removeCreditsForUser = async (userId, amount) => {
  try {
    return addRegisterCreditForUser(userId, amount, "REMOVE", 0);
  } catch (error) {
    console.error("Error al eliminar créditos: ", error);
    return false;
  }
};
