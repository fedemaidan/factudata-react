import api from './axiosConfig';
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
    const empresa = await getEmpresaById(empresaId);

    if (!empresa) {
      console.error('No se encontró la empresa');
      return null;
    }

    const { proyectosIds, nombre, tipo } = empresa;
    if (tipo == "Constructora") {
      const proyectos = await Promise.all(
        (proyectosIds || []).map(async (proyectoId) => {
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
    const response = await api.post('/empresa', empresaDetails);
    console.log('Empresa creada con éxito');
    return response.data;
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
    const empresa = await getEmpresaById(empresaId);
    if (!empresa) {
      console.error('No se encontró la empresa para actualizar');
      return false;
    }

    const proyectosIds = empresa.proyectosIds || [];
    proyectosIds.push(proyectoId);

    await updateEmpresaDetails(empresaId, { proyectosIds });

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
    await api.put(`/empresa/${empresaId}`, newDetails);
    console.log('Detalles de la empresa actualizados con éxito');
    return true;
  } catch (err) {
    console.error('Error al actualizar los detalles de la empresa:', err);
    return false;
  }
};

/**
 * Invalida el caché de la empresa manualmente.
 * @param {string} empresaId - El ID de la empresa.
 * @returns {Promise<boolean>}
 */
export const invalidateEmpresaCache = async (empresaId) => {
  try {
    await api.post('/cache/invalidate', { tipo: 'empresa', id: empresaId });
    return true;
  } catch (err) {
    console.error('Error al invalidar caché:', err);
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
    // Si el perfil ya trae empresaData resuelto (MongoDB), usarlo directamente
    if (user?.empresaData) {
      return user.empresaData;
    }

    if (!user || (!user.empresa && !user.empresa_id)) {
      console.log('Información de la empresa no proporcionada');
      return null;
    }

    // Extraer empresaId de distintas formas
    let empresaId = null;
    const e = user.empresa || user.empresa_id;
    if (typeof e === 'string') {
      empresaId = e.includes('/') ? e.split('/').pop() : e;
    } else if (e && typeof e === 'object') {
      if (e.id) empresaId = e.id;
      else if (e._key?.path?.segments) {
        const segs = e._key.path.segments;
        const offset = e._key.path.offset || 0;
        const len = e._key.path.len || segs.length;
        const path = segs.slice(offset, offset + len).join('/');
        empresaId = path.split('/').pop();
      }
    }

    if (!empresaId) return null;
    return await getEmpresaById(empresaId);
  } catch (err) {
    console.error('Error al obtener los detalles de la empresa:', err);
    return null;
  }
};

/**
 * Obtiene los detalles de una empresa por su ID.
 * @param {string} empresaId - El ID de la empresa a obtener.
 * @returns {Promise<object|null>} - Retorna un objeto con los detalles de la empresa o null si no se encuentra.
 */
export const getEmpresaById = async (empresaId) => {
  try {
    const response = await api.get(`/empresa/${empresaId}`);
    console.log('Detalles de la empresa obtenidos con éxito');
    return response.data;
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
    const response = await api.get('/empresa');
    console.log('Empresas obtenidas con éxito');
    return response.data;
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

    // Obtener y eliminar proyectos/cajas asociados
    const empresa = await getEmpresaById(empresaId);
    if (empresa) {
      if (empresa.tipo == "Constructora") {
        for (const proyectoId of (empresa.proyectosIds || [])) {
          await deleteProyectoById(proyectoId);
        }
      } else {
        const cajas = await getCajasByEmpresaId(empresaId);
        for (const caja of cajas) {
          await deleteCajaById(caja.id);
        }
      }
    }

    // Eliminar la empresa
    await api.delete(`/empresa/${empresaId}`);
    console.log('Empresa, perfiles y proyectos eliminados con éxito');
  } catch (err) {
    console.error('Error al eliminar la empresa y sus dependencias:', err);
  }
};