import { collection, doc, addDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from 'src/config/firebase';

export const getFacturas = async () => {
  try {
    const facturasCollectionRef = collection(db, 'facturas');
    const data = await getDocs(facturasCollectionRef);
    const filteredData = data.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    }));
    return filteredData;
  } catch (err) {
    console.error(err);
    return [];
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
