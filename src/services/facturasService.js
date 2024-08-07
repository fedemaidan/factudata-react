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

export const deleteFacturaByFilename = async (filename) => {
  try {
    // Define la colección y la consulta
    console.log(filename)
    const facturasCollection = collection(db, 'facturas');
    const q = query(facturasCollection, where('filename', '==', filename));

    // Ejecuta la consulta
    const querySnapshot = await getDocs(q);

    // Verifica si se encontró algún documento
    if (querySnapshot.empty) {
      console.error('No se encontró ninguna factura con el nombre de archivo especificado');
      return false;
    }

    // Recorre los documentos encontrados y elimínalos
    // (En este caso, se supone que solo hay uno, ya que los nombres de archivo deberían ser únicos)
    querySnapshot.forEach(async (doc) => {
      await deleteDoc(doc.ref);
    });

    return true;
  } catch (err) {
    console.error(err);
    return false;
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

const getBillDetailsFromChatGPT = (file) => {
  return {
    fecha: "27/02/2024",
    razon_social: "El Bravo",
    cuit: 30717858073,
    numero_factura: "0003-00007028",
    total: 8800
  }
}

export const uploadFile = async (files, tipo = 'input', ticketId, userId = "NOT_DEFINED") => {
  if (!files) return [];

  try {
    const enlaces = [];
    
    for (let i = 0; i < files.length; i++) {
      const fileUpload = files[i];
      const filename = `files/${userId}/${ticketId}/${fileUpload.name}`;
      const filesFolderRef = ref(storage, filename);
      await uploadBytes(filesFolderRef, fileUpload);
      const newUrl = await getDownloadURL(filesFolderRef);
      
      const facturaData = await getBillDetailsFromChatGPT(fileUpload);
      console.log(facturaData)
      // Guardar el enlace en el arreglo de enlaces
      enlaces.push({
        name: newUrl,
        originalName: fileUpload.name
      });
      
      await addDoc(collection(db, 'facturas'), {
        tipo: tipo,
        filename: newUrl,
        ticket: ticketId,
        data: facturaData
      });
    }

    return enlaces; // Retornar los enlaces de los archivos subidos
  } catch (e) {
    console.error(e);
    return [];
  }
};
