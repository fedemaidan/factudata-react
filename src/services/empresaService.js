import { doc, updateDoc, getDoc, addDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from 'src/config/firebase';
import profileService from 'src/services/profileService';
import { deleteCajaById, deleteProyectoById, getCajasByEmpresaId, getProyectoById } from 'src/services/proyectosService';
import TicketService from './ticketService';


/**
 * Obtiene información detallada de perfiles, proyectos y movimientos antes de eliminar la empresa.
 * @param {string} empresaId - El ID de la empresa a eliminar.
 * @returns {Promise<object>} - Retorna un objeto con la información de perfiles, proyectos y movimientos.
 */
export const getInfoToDeleteEmpresa = async (empresaId) => {
  try {
    const profiles = await profileService.getProfileByEmpresa(empresaId);
    const empresaDocRef = doc(db, 'empresas', empresaId);
    const empresaDoc = await getDoc(empresaDocRef);

    if (!empresaDoc.exists()) {
      console.error('No se encontró la empresa');
      return null;
    }

    const { proyectosIds, nombre, tipo } = empresaDoc.data();
    if (tipo == "Constructora") {
      const proyectos = await Promise.all(
        proyectosIds.map(async (proyectoId) => {
          const proyecto = await getProyectoById(proyectoId);
          const movimientosARS = await TicketService.getMovimientosForProyecto(proyectoId, 'ARS');
          const movimientosUSD = await TicketService.getMovimientosForProyecto(proyectoId, 'USD');
          const todosMovimientos = [...movimientosARS, ...movimientosUSD];
  
          // Ordena los movimientos por fecha descendente y obtiene el último movimiento
          const ultimoMovimiento = todosMovimientos.sort((a, b) => b.fecha_factura.seconds - a.fecha_factura.seconds)[0];
          const fechaUltimoMovimiento = ultimoMovimiento ? new Date(ultimoMovimiento.fecha_factura.seconds * 1000) : null;
  
          return {
            ...proyecto,
            movimientosCount: todosMovimientos.length,
            fechaUltimoMovimiento, // Añade la fecha del último movimiento
          };
        })
      );
  
      return {
        nombre,
        tipo,
        profiles: profiles.map((profile) => ({
          email: profile.email,
          phone: profile.phone,
        })),
        proyectos: proyectos.map((proyecto) => ({
          nombre: proyecto.nombre,
          movimientosCount: proyecto.movimientosCount,
          fechaUltimoMovimiento: proyecto.fechaUltimoMovimiento
            ? proyecto.fechaUltimoMovimiento.toLocaleDateString()
            : 'No hay movimientos',
        })),
      };
    } else {
      return {
        nombre,
        tipo,
        profiles: profiles.map((profile) => ({
          email: profile.email,
          phone: profile.phone,
        })),
      };
    }
    
  } catch (err) {
    console.error('Error al obtener información para borrar la empresa:', err);
    return null;
  }
};


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


/**
 * Obtiene todas las empresas en la base de datos.
 * @returns {Promise<Array<object>>} - Retorna un array con los detalles de cada empresa o un array vacío si falla.
 */
export const getAllEmpresas = async () => {
  try {
    const empresasCollectionRef = collection(db, 'empresas');
    const empresasSnapshot = await getDocs(empresasCollectionRef);

    const empresas = empresasSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log('Empresas obtenidas con éxito');
    return empresas;
  } catch (err) {
    console.error('Error al obtener las empresas:', err);
    return [];
  }
};


/**
 * Elimina una empresa de la base de datos, junto con sus perfiles y proyectos asociados.
 * @param {string} empresaId - El ID de la empresa a eliminar.
 * @returns {Promise<void>}
 */
export const deleteEmpresa = async (empresaId) => {
  try {
    // Eliminar perfiles asociados a la empresa
    const profiles = await profileService.getProfileByEmpresa(empresaId);
    
    for (const profile of profiles) {
      await profileService.deleteProfile(profile.id);
    }

    // Obtener y eliminar proyectos asociados a la empresa
    const empresaDocRef = doc(db, 'empresas', empresaId);
    const empresaDoc = await getDoc(empresaDocRef);
    if (empresaDoc.exists()) {
      const empresa = empresaDoc.data();
      if (empresa.tipo == "Constructora") {
        for (const proyectoId of empresa.proyectosIds) {
          await deleteProyectoById(proyectoId);
        }
      }
      else {
        const cajas = await getCajasByEmpresaId(empresa.id)
        for (const cajaId of cajas) {
          await deleteCajaById(cajaId.id);
        }
      }
    }

    // // Finalmente, eliminar la empresa
    await deleteDoc(empresaDocRef);
    console.log('Empresa, perfiles y proyectos eliminados con éxito');
  } catch (err) {
    console.error('Error al eliminar la empresa y sus dependencias:', err);
  }
};