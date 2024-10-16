import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from 'src/config/firebase';
import api from './axiosConfig';
import  { addProyectoToEmpresa } from 'src/services/empresaService';
/**
 * Obtiene los proyectos de un empresa a partir de las referencias almacenadas en el atributo proyectos.
 * @param {object} empresa - El objeto empresa que contiene las referencias de los proyectos.
 * @returns {Promise<object[]>} - Retorna un array con los proyectos o un array vacío si no se encuentran o hay un error.
 */
export const getProyectosByEmpresa = async (empresa) => {

    try {
      if (!empresa || !empresa.proyectosIds) {
        console.log('Referencias de proyectos no proporcionadas o incompletas en el objeto usuario');
        return [];
      }
      
        const proyectos = await Promise.all(empresa.proyectosIds.map(async (id) => {
        const proyectoData = await getProyectoById(id); 
        return proyectoData;
        
      }));
  
      return proyectos.filter(proyecto => proyecto !== null);
    } catch (err) {
      console.error('Error al obtener los proyectos del usuario:', err);
      return []; 
    }
  };

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

// ... (tu código existente)

/**
 * Obtiene un proyecto específico por su ID.
 * @param {string} id - El ID del proyecto a obtener.
 * @returns {Promise<object|null>} - Retorna un objeto con los datos del proyecto o null si no se encuentra.
 */
export const getProyectoById = async (id) => {
  try {
    const proyectoDocRef = doc(db, 'proyectos', id);
    const proyectoDoc = await getDoc(proyectoDocRef);

    if (proyectoDoc.exists()) {
      console.log('Proyecto obtenido con éxito');
      return {
        ...proyectoDoc.data(),
        id: proyectoDoc.id,
      };
    } else {
      console.log('No se encontró el proyecto');
      return null;
    }
  } catch (err) {
    console.error('Error al obtener el proyecto:', err);
    return null;
  }
};

/**
 * Actualiza un proyecto existente.
 * @param {string} id - El ID del proyecto a actualizar.
 * @param {object} proyecto - Un objeto con los datos a actualizar del proyecto.
 * @returns {Promise<boolean>} - Retorna true si la actualización fue exitosa, false si falló.
 */
export const updateProyecto = async (id, proyecto) => {
  try {
    proyecto = {
      carpetaRef: proyecto.carpetaRef ?? "",
      proyecto_default_id: proyecto.proyecto_default_id ?? "",
      sheetWithClient: proyecto.sheetWithClient ?? "",
      nombre: proyecto.nombre,
      activo: proyecto.activo ?? true,
    }
    const proyectoDocRef = doc(db, 'proyectos', id);
    await updateDoc(proyectoDocRef, proyecto);
    console.log('Proyecto actualizado con éxito');
    return true;
  } catch (err) {
    console.error('Error al actualizar el proyecto:', err);
    return false;
  }
};

export const recargarProyecto = async (idProyecto) => {
  try {
    const response = await api.get(`recargar_sheets/${idProyecto}`);
    if (response.status === 201) {
        console.log('Sheets actualizados');
        return true;
    } else {
        console.error('Error al actualizando sheets');
        return false;
    }
  } catch (err) {
      console.error('Error al actualizando sheets:', err);
      return false;
  }
}

export const hasPermission = async (fileId) => {
  try {
    const response = await api.get(`permisosDrive/${fileId}`);
    if (response.status === 201) {
        return response.data.hasPermission;
    } else {
        console.error('Error al verificando permisos');
        return false;
    }
  } catch (err) {
      console.error('Error al verificando permisos', err);
      return false;
  }
}

/**
 * Crea un nuevo proyecto y retorna el proyecto creado.
 * @param {object} proyecto - Un objeto con los datos del proyecto a crear.
 * @param {string} empresaId - El ID de la empresa a la que se asociará el proyecto.
 * @returns {Promise<object|null>} - Retorna un objeto con los datos del proyecto creado o null si falla.
 */
export const crearProyecto = async (proyecto, empresaId) => {
  try {
    // Crear el nuevo proyecto en Firestore
    const proyectoDocRef = await addDoc(collection(db, 'proyectos'), {
      ...proyecto,
      empresaId
    });

    // Obtener los datos del nuevo proyecto
    const proyectoDoc = await getDoc(proyectoDocRef);
    if (!proyectoDoc.exists()) {
      console.error('No se pudo obtener el proyecto recién creado');
      return null;
    }

    const nuevoProyecto = {
      ...proyectoDoc.data(),
      id: proyectoDoc.id,
    };

    await addProyectoToEmpresa(empresaId, nuevoProyecto.id);

    return nuevoProyecto;
  } catch (err) {
    console.error('Error al crear el proyecto:', err);
    return null;
  }
};