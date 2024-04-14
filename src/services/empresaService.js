import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from 'src/config/firebase';

/**
 * Actualiza los detalles de una empresa.
 * @param {string} empresaId - El ID de la empresa a actualizar.
 * @param {object} newDetails - Un objeto con los nuevos detalles de la empresa.
 * @returns {Promise<boolean>} - Retorna true si la actualización fue exitosa, false si falló.
 */
export const updateEmpresaDetails = async (empresaId, newDetails) => {
  try {
    console.log(empresaId)
    const empresaDocRef = doc(db, 'empresas', empresaId);
    await updateDoc(empresaDocRef, newDetails);
    console.log('Detalles de la empresa actualizados con éxito');
    return true;
  } catch (err) {
    console.error('Error al actualizar los detalles de la empresa:', err);
    return false;
  }
};

/**
 * Obtiene los detalles de una empresa a partir del objeto usuario que contiene una referencia a la empresa.
 * @param {object} user - El objeto usuario que contiene la referencia de la empresa.
 * @returns {Promise<object|null>} - Retorna un objeto con los detalles de la empresa o null si no se encuentra o hay un error.
 */
export const getEmpresaDetailsFromUser = async (user) => {
  try {
    if (!user || !user.empresa || !user.empresa._key || !user.empresa._key.path || !user.empresa._key.path.segments) {
      console.log('Información de la empresa no proporcionada o incompleta en el objeto usuario');
      return null;
    }
    
    const pathSegments = user.empresa._key.path.segments;
    const path = pathSegments.slice(user.empresa._key.path.offset, user.empresa._key.path.offset + user.empresa._key.path.len).join('/');

    const empresaDocRef = doc(db, path); // Crea una referencia al documento usando el path
    const empresaDoc = await getDoc(empresaDocRef); // Obtiene el documento de Firestore

    if (empresaDoc.exists()) {
      console.log('Detalles de la empresa obtenidos con éxito');
      return {
        ...empresaDoc.data(),
        id: empresaDoc.id,
      }
    } else {
      console.log('No se encontró el documento de la empresa');
      return null; // Retorna null si el documento no existe
    }
  } catch (err) {
    console.error('Error al obtener los detalles de la empresa:', err);
    return null; // Retorna null en caso de error
  }
};

/**
 * Obtiene los detalles de una empresa por su ID.
 * @param {string} empresaId - El ID de la empresa a obtener.
 * @returns {Promise<object|null>} - Retorna un objeto con los detalles de la empresa o null si no se encuentra.
 */
export const getEmpresaById = async (empresaId) => {
  try {
    const empresaDocRef = doc(db, 'empresas', empresaId);
    const empresaDoc = await getDoc(empresaDocRef);

    if (empresaDoc.exists()) {
      console.log('Detalles de la empresa obtenidos con éxito');
      return {
        ...empresaDoc.data(),
        id: empresaDoc.id,
      };
    } else {
      console.log('No se encontró la empresa con ID:', empresaId);
      return null;
    }
  } catch (err) {
    console.error('Error al obtener los detalles de la empresa:', err);
    return null;
  }
};