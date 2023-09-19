import { collection, doc, addDoc, deleteDoc, where, query, orderBy, startAfter, limit, getDocs } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from 'src/config/firebase';

export const getFacturasByTicketId = async (ticketId) => {
  try {
    const facturasCollectionRef = collection(db, 'facturas');
    const facturasQuery = query(facturasCollectionRef, where('ticket', '==', ticketId));
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

export const uploadFile = async (files, tipo = 'COMPRA', ticketId) => {
  if (!files) return [];

  try {
    const enlacesFacturas = [];
    
    for (let i = 0; i < files.length; i++) {
      const fileUpload = files[i];
      const filename = `files/${fileUpload.name}`;
      const filesFolderRef = ref(storage, filename);
      await uploadBytes(filesFolderRef, fileUpload);
      const newUrl = await getDownloadURL(filesFolderRef);
      
      // Guardar el enlace en el arreglo de enlaces
      enlacesFacturas.push({
        name: newUrl,
        originalName: fileUpload.name
      });
      
      await addDoc(collection(db, 'facturas'), {
        tipo: tipo,
        filename: newUrl,
        ticket: ticketId
      });
    }

    return enlacesFacturas; // Retornar los enlaces de los archivos subidos
  } catch (e) {
    console.error(e);
    return [];
  }
};
