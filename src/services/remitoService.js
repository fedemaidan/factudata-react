import { storage } from 'src/config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from 'src/config/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, updateDoc, query, where } from 'firebase/firestore';

const remitoService = {
  async getRemitosByEmpresa(empresaId) {
    const remitosCollection = collection(db, 'remitos');
    const remitosSnapshot = await getDocs(remitosCollection);
    const remitosList = remitosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return remitosList.filter(remito => remito.empresaId === empresaId);
  },

  async getRemitosByHojaDeRuta(hojaDeRutaId) {
    const remitosCollection = collection(db, 'remitos');
    const q = query(remitosCollection, where('hojaDeRutaId', '==', hojaDeRutaId));
    const remitosSnapshot = await getDocs(q);
    const remitosList = remitosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return remitosList;
  },

  async createRemito(remito) {
    const remitosCollection = collection(db, 'remitos');
    const newRemitoRef = doc(remitosCollection);
    await setDoc(newRemitoRef, remito);
    return { id: newRemitoRef.id, ...remito };
  },
  
  async updateRemito(id, remito) {
    const remitoRef = doc(db, 'remitos', id);
    await updateDoc(remitoRef, remito);
  },
  
  async deleteRemito(id) {
    const remitoRef = doc(db, 'remitos', id);
    await deleteDoc(remitoRef);
  },

  async uploadFile(file, remitoNumero) {
    const fileExtension = file.name.split('.').pop();
    const fileRef = ref(storage, `remitos/${remitoNumero}-remitoOriginal.${fileExtension}`);
    const snapshot = await uploadBytes(fileRef, file);
    return await getDownloadURL(snapshot.ref);
  }
};

export default remitoService;
