import { doc, getDoc, updateDoc, addDoc, collection, deleteDoc, query, getDocs, where } from 'firebase/firestore';
import { db } from 'src/config/firebase';
import api from './axiosConfig';
import  { addProyectoToEmpresa } from 'src/services/empresaService';
import movimientosService from 'src/services/movimientosService';

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
    console.log("proyecto", proyecto);
    proyecto = {
      carpetaRef: proyecto.carpetaRef ?? "",
      proyecto_default_id: proyecto.proyecto_default_id ?? "",
      sheetWithClient: proyecto.sheetWithClient ?? "",
      nombre: proyecto.nombre,
      activo: proyecto.activo ?? true,
      extraSheets: proyecto.extraSheets ?? [],
    }
    console.log("proyecto nuevo", proyecto);
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
 * Crea un nuevo proyecto utilizando la API en lugar de Firebase directamente.
 * @param {object} proyecto - Un objeto con los datos del proyecto a crear.
 * @param {string} empresaId - El ID de la empresa a la que se asociará el proyecto.
 * @returns {Promise<object|null>} - Retorna un objeto con los datos del proyecto creado o null si falla.
 */
export const crearProyecto = async (proyecto, empresaId) => {
  try {
    const response = await api.post('/proyecto/', {
      ...proyecto,
      empresaId,  // Enviar la empresa ID en el body
    });

    if (response.status === 201) {
      console.log('Proyecto creado con éxito:', response.data.proyecto);
      return response.data.proyecto;
    } else {
      console.error('Error al crear el proyecto:', response.data);
      return null;
    }
  } catch (err) {
    console.error('Error al crear el proyecto:', err);
    return null;
  }
};


/**
 * Elimina un proyecto y todos sus movimientos asociados.
 * @param {string} proyectoId - El ID del proyecto a eliminar.
 * @returns {Promise<boolean>} - Retorna true si la eliminación fue exitosa, false si falló.
 */
export const deleteProyectoById = async (proyectoId) => {
  try {
    // Obtén todos los movimientos asociados al proyecto
    const movimientosQuery = query(
      collection(db, 'movimientos'),
      where('proyecto_id', '==', proyectoId)
    );
    const movimientosSnapshot = await getDocs(movimientosQuery);

    // Elimina cada movimiento asociado al proyecto
    const deleteMovementsPromises = movimientosSnapshot.docs.map((movimientoDoc) =>
      movimientosService.deleteMovimientoById(movimientoDoc.id)
    );
    await Promise.all(deleteMovementsPromises);

    // Elimina el proyecto una vez que todos los movimientos se han eliminado
    const proyectoDocRef = doc(db, 'proyectos', proyectoId);
    await deleteDoc(proyectoDocRef);

    console.log('Proyecto y movimientos eliminados con éxito');
    return true;
  } catch (err) {
    console.error('Error al eliminar el proyecto y sus movimientos:', err);
    return false;
  }
};

export const deleteCajaById = async (cajaId) => {
  try {
    // Obtén todos los movimientos asociados al proyecto
    const movimientosQuery = query(
      collection(db, 'movimientos'),
      where('caja_id', '==', cajaId)
    );
    const movimientosSnapshot = await getDocs(movimientosQuery);

    // Elimina cada movimiento asociado al proyecto
    const deleteMovementsPromises = movimientosSnapshot.docs.map((movimientoDoc) =>
      movimientosService.deleteMovimientoById(movimientoDoc.id)
    );
    await Promise.all(deleteMovementsPromises);

    // Elimina el proyecto una vez que todos los movimientos se han eliminado
    const cajaDocRef = doc(db, 'cajas', cajaId);
    await deleteDoc(cajaDocRef);

    console.log('Caja y movimientos eliminados con éxito');
    return true;
  } catch (err) {
    console.error('Error al eliminar el caja y sus movimientos:', err);
    return false;
  }
};

/**
 * Obtiene todas las cajas de una empresa filtradas por empresa_id.
 * @param {string} empresaId - El ID de la empresa para filtrar las cajas.
 * @returns {Promise<Array<object>>} - Retorna un array de cajas que pertenecen a la empresa especificada.
 */
export const getCajasByEmpresaId = async (empresaId) => {
  try {
    const cajasCollection = collection(db, 'cajas');
    const cajasQuery = query(cajasCollection, where('empresa_id', '==', empresaId));
    const querySnapshot = await getDocs(cajasQuery);

    const cajas = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log('Cajas obtenidas con éxito:', cajas);
    return cajas;
  } catch (err) {
    console.error('Error al obtener las cajas:', err);
    return [];
  }
};

/**
 * Sube un archivo CSV y carga los movimientos en un proyecto.
 * @param {string} proyectoId - ID del proyecto donde se cargarán los movimientos.
 * @param {File} archivo - Archivo CSV a subir.
 * @returns {Promise<object>} - Respuesta de la API.
 */
export const subirCSVProyecto = async (proyectoId, archivo, proyectoNombre) => {
  try {
    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('proyecto_nombre', proyectoNombre);

    const response = await api.post(`/proyecto/${proyectoId}/cargar-movimientos`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (err) {
    console.error('Error al subir el archivo CSV:', err);
    throw err;
  }
};

