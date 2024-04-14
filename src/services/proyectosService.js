import { doc, getDoc } from 'firebase/firestore';
import { db } from 'src/config/firebase';

/**
 * Obtiene los proyectos de un usuario a partir de las referencias almacenadas en el atributo proyectos.
 * @param {object} user - El objeto usuario que contiene las referencias de los proyectos.
 * @returns {Promise<object[]>} - Retorna un array con los proyectos o un array vacío si no se encuentran o hay un error.
 */
export const getProyectosFromUser = async (user) => {

  try {
    if (!user || !user.proyectos) {
      console.log('Referencias de proyectos no proporcionadas o incompletas en el objeto usuario');
      return [];
    }

      const proyectos = await Promise.all(user.proyectos.map(async (proyectoRef) => {
      const pathSegments = proyectoRef._key.path.segments;
      const path = pathSegments.slice(proyectoRef._key.path.offset, proyectoRef._key.path.offset + proyectoRef._key.path.len).join('/');

      const proyectoDocRef = doc(db, path); // Crea una referencia al documento usando el path
      const proyectoDoc = await getDoc(proyectoDocRef); // Obtiene el documento de Firestore
      
      if (proyectoDoc.exists()) {
        return {
          ...proyectoDoc.data(),
          id: proyectoDoc.id,
        };
      } else {
        console.log(`No se encontró el proyecto con referencia: ${proyectoRef.path}`);
        return null; 
      }
    }));

    return proyectos.filter(proyecto => proyecto !== null);
  } catch (err) {
    console.error('Error al obtener los proyectos del usuario:', err);
    return []; 
  }
};
