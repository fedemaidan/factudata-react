import { doc, updateDoc, getDoc, addDoc, collection } from 'firebase/firestore';
import { db } from 'src/config/firebase';


/**
 * Crea una nueva empresa en la base de datos.
 * @param {object} empresaDetails - Un objeto con los detalles de la empresa a crear.
 * @returns {Promise<object|null>} - Retorna un objeto con los detalles de la empresa creada o null si falla.
 */
export const crearEmpresa = async (empresaDetails) => {
  try {
    console.log(empresaDetails)
    const empresaDocRef = await addDoc(collection(db, 'empresas'), empresaDetails);
    const empresaDoc = await getDoc(empresaDocRef);
    if (!empresaDoc.exists()) {
      console.error('No se pudo obtener el documento de la empresa recién creada');
      return null;
    }

    const nuevaEmpresa = {
      ...empresaDoc.data(),
      id: empresaDoc.id,
    };

    console.log('Empresa creada con éxito');
    return nuevaEmpresa;
  } catch (err) {
    console.error('Error al crear la empresa:', err);
    return null;
  }
};

/**
 * Añade un proyecto a la empresa.
 * @param {string} empresaId - El ID de la empresa.
 * @param {string} proyectoId - El ID del proyecto a añadir.
 * @returns {Promise<boolean>} - Retorna true si la actualización fue exitosa, false si falló.
 */
export const addProyectoToEmpresa = async (empresaId, proyectoId) => {
  try {
    // Obtener la empresa
    const empresaDocRef = doc(db, 'empresas', empresaId);
    const empresaDoc = await getDoc(empresaDocRef);

    if (!empresaDoc.exists()) {
      console.error('No se encontró la empresa para actualizar');
      return false;
    }

    // Actualizar la empresa para agregar el ID del nuevo proyecto
    const empresaData = empresaDoc.data();
    const proyectosIds = empresaData.proyectosIds || [];
    proyectosIds.push(proyectoId);

    await updateDoc(empresaDocRef, { proyectosIds });

    console.log('Proyecto añadido a la empresa con éxito');
    return true;
  } catch (err) {
    console.error('Error al añadir el proyecto a la empresa:', err);
    return false;
  }
};


/**
 * Actualiza los detalles de una empresa.
 * @param {string} empresaId - El ID de la empresa a actualizar.
 * @param {object} newDetails - Un objeto con los nuevos detalles de la empresa.
 * @returns {Promise<boolean>} - Retorna true si la actualización fue exitosa, false si falló.
 */
export const updateEmpresaDetails = async (empresaId, newDetails) => {
  try {
    console.log(newDetails)
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
    console.log(user.empresa)
    const pathSegments = user.empresa._key.path.segments;
    const path = pathSegments.slice(user.empresa._key.path.offset, user.empresa._key.path.offset + user.empresa._key.path.len).join('/');
    console.log(path)
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