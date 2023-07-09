import { collection, doc, addDoc, deleteDoc, query, orderBy, startAfter, limit, getDocs } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from 'src/config/firebase';

export const getFacturas = async (start, end) => {
  try {
    const facturasCollectionRef = collection(db, 'facturas');
    let facturasQuery = query(facturasCollectionRef, orderBy('filename'), startAfter(start), limit(end)); 
    const querySnapshot = await getDocs(facturasQuery);
    
    const facturas = querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    }));
    
    return facturas;
  } catch (err) {
    console.error(err);
    return [];
  }
};


export const getTotalFacturas = async () => {
  try {
    const facturasCollectionRef = collection(db, 'facturas');
    const querySnapshot = await getDocs(facturasCollectionRef);
    const totalFacturas = querySnapshot.size;
    return totalFacturas;
  } catch (err) {
    console.error(err);
    return 0;
  }
};


export const deleteFactura = async (id) => {
  try {
    const facturaDoc = doc(db, 'facturas', id);
    await deleteDoc(facturaDoc);
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
};

export const uploadFile = async (files) => {
  if (!files) return false;

  try {
    for (let i = 0; i < files.length; i++) {
      const fileUpload = files[i];
      const filename = `probandoFiles/${fileUpload.name}`;
      const filesFolderRef = ref(storage, filename);
      await uploadBytes(filesFolderRef, fileUpload);
      const newUrl = await getDownloadURL(filesFolderRef);
      await addDoc(collection(db, 'facturas'), {
        tipo: 'COMPRA',
        filename: newUrl,
      });
    }
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};
