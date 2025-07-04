import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from 'src/config/firebase';

export const getNodosByProyectoId = async (proyectoId) => {
  const nodosRef = collection(db, `proyectos/${proyectoId}/nodos`);
  const snapshot = await getDocs(nodosRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const crearNodo = async (data) => {
  const ref = collection(db, `proyectos/${data.proyectoId}/nodos`);
  await addDoc(ref, data);
};

export const eliminarNodo = async (proyectoId, nodoId) => {
  const ref = doc(db, `proyectos/${proyectoId}/nodos/${nodoId}`);
  await deleteDoc(ref);
};
