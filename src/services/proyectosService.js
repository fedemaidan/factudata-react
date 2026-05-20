import { doc, collection, deleteDoc, query, getDocs, where } from 'firebase/firestore';
import { db } from 'src/config/firebase';
import api from './axiosConfig';
import  { addProyectoToEmpresa } from 'src/services/empresaService';
import movimientosService from 'src/services/movimientosService';

import { v4 as uuidv4 } from 'uuid';

// ─── Cache en memoria para proyectos ─────────────────────────────────────
// TTL: 5 min. Pensado para evitar N+1 cuando varias partes de la UI piden
// el mismo proyecto en la misma pantalla (ej: lista de tickets con muchos
// proyectos). Coalesce de requests en vuelo para no disparar duplicados.
const _proyectoCache = new Map();      // id -> { data, expiresAt }
const _proyectoInflight = new Map();   // id -> Promise<proyecto>
const _empresaProyectosCache = new Map(); // empresaId -> { data, expiresAt }
const _empresaProyectosInflight = new Map(); // empresaId -> Promise<proyectos[]>
const PROYECTO_TTL_MS = 5 * 60 * 1000;

const _isFresh = (entry) => entry && entry.expiresAt > Date.now();

/**
 * Extrae el empresaId del objeto user.
 * Formatos esperados (post-migración a Mongo):
 *  - user.empresaId / user.empresa_id (string)
 *  - user.empresa (string)
 *  - user.empresa.id / user.empresa._id (objeto)
 */
const _extractEmpresaIdFromUser = (user) => {
  if (!user) return null;
  if (typeof user.empresaId === 'string' && user.empresaId) return user.empresaId;
  if (typeof user.empresa_id === 'string' && user.empresa_id) return user.empresa_id;
  const e = user.empresa;
  if (!e) return null;
  if (typeof e === 'string') return e || null;
  return e.id || e._id || null;
};

/**
 * Extrae el id de un proyecto desde una referencia simple (string o {id/_id}).
 */
const _extractProyectoIdFromRef = (ref) => {
  if (!ref) return null;
  if (typeof ref === 'string') return ref || null;
  return ref.id || ref._id || null;
};

/**
 * Invalida la caché de proyectos. Llamar tras crear/editar/eliminar.
 * @param {object} opts - { id?: string, empresaId?: string, all?: boolean }
 */
export const invalidarProyectoCache = ({ id, empresaId, all } = {}) => {
  if (all) {
    _proyectoCache.clear();
    _empresaProyectosCache.clear();
    return;
  }
  if (id) _proyectoCache.delete(id);
  if (empresaId) _empresaProyectosCache.delete(empresaId);
};

/**
 * Asegura que cada subproyecto tenga un ID único.
 * Modifica el array en lugar.
 */
export const asegurarIdsSubproyectos = (proyecto) => {
  console.log(proyecto, " asegurando IDs de subproyectos");
  if (!Array.isArray(proyecto.subproyectos)) return;
  console.log(proyecto.subproyectos, " asegurando IDs de subproyectosssss");
  proyecto.subproyectos = proyecto.subproyectos.map(sp => ({
    ...sp,
    id: sp.id || uuidv4()
  }));
  console.log(proyecto.subproyectos, " ya con ids");
};


/**
 * Obtiene los proyectos de una empresa en una sola query (endpoint batch).
 * @param {string} empresaId - ID de la empresa.
 * @returns {Promise<object[]>}
 */
export const getProyectosByEmpresaId = async (empresaId, { forceRefresh = false } = {}) => {
  if (!empresaId) return [];

  // Cache hit
  if (!forceRefresh) {
    const cached = _empresaProyectosCache.get(empresaId);
    if (_isFresh(cached)) return cached.data;
  }

  // Coalesce: si ya hay una request en vuelo para esta empresa, reusala.
  if (_empresaProyectosInflight.has(empresaId)) {
    return _empresaProyectosInflight.get(empresaId);
  }

  const promise = (async () => {
    try {
      const response = await api.get(`/proyecto/empresa/${empresaId}`);
      const proyectos = (response.data || []).filter(p => p && p.eliminado !== true);
      _empresaProyectosCache.set(empresaId, { data: proyectos, expiresAt: Date.now() + PROYECTO_TTL_MS });
      // Sembrá también la caché individual para futuras llamadas a getProyectoById.
      for (const p of proyectos) {
        const pid = p?._id || p?.id;
        if (pid) _proyectoCache.set(pid, { data: p, expiresAt: Date.now() + PROYECTO_TTL_MS });
      }
      return proyectos;
    } catch (err) {
      console.error('Error al obtener proyectos por empresa:', err);
      return [];
    } finally {
      _empresaProyectosInflight.delete(empresaId);
    }
  })();

  _empresaProyectosInflight.set(empresaId, promise);
  return promise;
};

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
  
      return proyectos.filter(proyecto => proyecto !== null && proyecto.eliminado !== true);
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

    // Resolver empresaId con fallbacks. Todos los usuarios deberían tener uno;
    // si no aparece en los campos directos, lo resolvemos vía API.
    let empresaId = _extractEmpresaIdFromUser(user);
    if (!empresaId) {
      try {
        // Import dinámico para evitar ciclo de dependencias con empresaService.
        const { getEmpresaDetailsFromUser } = await import('./empresaService');
        const empresa = await getEmpresaDetailsFromUser(user);
        empresaId = empresa?.id || empresa?._id || null;
      } catch (e) {
        console.warn('No se pudo resolver empresaId vía getEmpresaDetailsFromUser:', e?.message);
      }
    }

    // Construir el set de ids del usuario una sola vez.
    const idsUser = new Set();
    for (const ref of user.proyectos) {
      const pid = _extractProyectoIdFromRef(ref);
      if (pid) idsUser.add(pid);
    }

    // Path principal: batch por empresa + filtro local. 1 request total.
    if (empresaId) {
      const todosDeEmpresa = await getProyectosByEmpresaId(empresaId);
      if (Array.isArray(todosDeEmpresa) && todosDeEmpresa.length > 0) {
        const filtrados = todosDeEmpresa.filter(
          (p) => p && (idsUser.has(p._id) || idsUser.has(p.id)) && p.eliminado !== true
        );
        if (filtrados.length > 0) return filtrados;
        // Si el filtro quedó vacío puede ser que los ids del user no estén en la
        // empresa (caso raro). Caemos al path por id, que ya usa caché y coalescing.
      }
    }

    // Fallback: pedir uno por uno. Igualmente pasa por la caché en memoria y
    // por el coalescing, así que duplicados se deduplican automáticamente.
    const proyectos = await Promise.all(
      Array.from(idsUser).map((pid) => getProyectoById(pid))
    );

    return proyectos.filter((p) => p !== null && p?.eliminado !== true);
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
export const getProyectoById = async (id, { forceRefresh = false } = {}) => {
  if (!id) return null;

  // Cache hit
  if (!forceRefresh) {
    const cached = _proyectoCache.get(id);
    if (_isFresh(cached)) return cached.data;
  }

  // Coalesce: si ya hay una request en vuelo para este id, reusala.
  if (_proyectoInflight.has(id)) {
    return _proyectoInflight.get(id);
  }

  const promise = (async () => {
    try {
      const response = await api.get(`/proyecto/${id}`);
      const data = response.data;
      if (data) {
        _proyectoCache.set(id, { data, expiresAt: Date.now() + PROYECTO_TTL_MS });
      }
      return data;
    } catch (err) {
      console.error('Error al obtener el proyecto:', err);
      return null;
    } finally {
      _proyectoInflight.delete(id);
    }
  })();

  _proyectoInflight.set(id, promise);
  return promise;
};

/**
 * Actualiza un proyecto existente.
 * @param {string} id - El ID del proyecto a actualizar.
 * @param {object} proyecto - Un objeto con los datos a actualizar del proyecto.
 * @returns {Promise<boolean>} - Retorna true si la actualización fue exitosa, false si falló.
 */
export const updateProyecto = async (id, proyecto, empresaId = null) => {
  try {
    asegurarIdsSubproyectos(proyecto);
    console.log(proyecto, " proyecto a actualizar");
    proyecto = {
      carpetaRef: proyecto.carpetaRef ?? "",
      proyecto_default_id: proyecto.proyecto_default_id ?? "",
      sheetWithClient: proyecto.sheetWithClient ?? "",
      nombre: proyecto.nombre,
      activo: proyecto.activo ?? true,
      extraSheets: proyecto.extraSheets ?? [],
      subproyectos: proyecto.subproyectos ?? [],
      eliminado: proyecto.eliminado || false,
      ui_prefs: proyecto.ui_prefs || {},
      datos_facturacion_cliente: proyecto.datos_facturacion_cliente ?? "",
    }
    console.log("proyecto nuevo", proyecto);
    await api.put(`/proyecto/${id}`, proyecto);
    invalidarProyectoCache({ id, empresaId });

    if (empresaId) {
      try {
        await api.post('/cache/invalidate', { tipo: 'empresa', id: empresaId });
        console.log('Caché invalidado tras actualizar proyecto');
      } catch (error) {
        console.warn('Error invalidando caché:', error);
      }
    }

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

/**
 * Actualiza todos los sheets de los proyectos de una empresa en base a la configuración actual de la empresa.
 * @param {string} empresaId - ID de la empresa.
 * @param {string|null} proyectoId - (opcional) ID de un proyecto específico a actualizar. Si es null, actualiza todos.
 * @returns {Promise<{ success: boolean, detalles?: any }>} - Resultado de la operación.
 */
export const actualizarSheetsDesdeBaseEmpresa = async (empresaId, proyectoId = null) => {
  try {
    const response = await api.post('/proyecto/empresa/actualizar-base', {
      empresaId,
      proyectoId
    });

    if (response.status === 200) {
      try {
        await api.post('/cache/invalidate', { tipo: 'empresa', id: empresaId });
      } catch (error) {
        console.warn('Error invalidando caché:', error);
      }
      console.log('Proyectos actualizados con éxito:', response.data.detalles);
      return { success: true, detalles: response.data.detalles };
    } else {
      console.error('Error en la respuesta:', response.data);
      return { success: false };
    }
  } catch (err) {
    console.error('Error al actualizar los proyectos con la base de la empresa:', err);
    return { success: false, error: err.message };
  }
};


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
    asegurarIdsSubproyectos(proyecto); // ← agregar esta línea

    const response = await api.post('/proyecto/', {
      ...proyecto,
      empresaId,  // Enviar la empresa ID en el body
    });

    if (response.status === 201) {
      try {
        await api.post('/cache/invalidate', { tipo: 'empresa', id: empresaId });
      } catch (error) {
        console.warn('Error invalidando caché:', error);
      }
      invalidarProyectoCache({ empresaId });
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
export const softDeleteMovimientosByProyectoId = async (proyectoId) => {
  try {
    await api.delete(`movimientos/by-proyecto/${proyectoId}`);
    return true;
  } catch (err) {
    console.error('Error al soft-delete movimientos del proyecto:', err);
    return false;
  }
};


export const deleteProyectoById = async (proyectoId, empresaId = null) => {
  try {
    // Obtener IDs de movimientos asociados al proyecto via API
    const response = await api.get(`movimientos/ids-by-proyecto/${proyectoId}`);
    const ids = response.data?.ids || [];

    const deleteMovementsPromises = ids.map((id) =>
      movimientosService.deleteMovimientoById(id)
    );
    await Promise.all(deleteMovementsPromises);

    // Elimina el proyecto via REST API
    await api.delete(`/proyecto/${proyectoId}`);
    invalidarProyectoCache({ id: proyectoId, empresaId });

    if (empresaId) {
      try {
        await api.post('/cache/invalidate', { tipo: 'empresa', id: empresaId });
      } catch (error) {
        console.warn('Error invalidando caché:', error);
      }
    }

    console.log('Proyecto y movimientos eliminados con éxito');
    return true;
  } catch (err) {
    console.error('Error al eliminar el proyecto y sus movimientos:', err);
    return false;
  }
};

export const deleteCajaById = async (cajaId) => {
  try {
    // Obtener IDs de movimientos asociados a la caja via API
    const response = await api.get(`movimientos/ids-by-caja/${cajaId}`);
    const ids = response.data?.ids || [];

    const deleteMovementsPromises = ids.map((id) =>
      movimientosService.deleteMovimientoById(id)
    );
    await Promise.all(deleteMovementsPromises);

    // Elimina la caja una vez que todos los movimientos se han eliminado
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

export const otorgarPermisosDriveProyecto = async (proyectoId) => {
  try {
    const resp = await api.post('/proyecto/otorgarPermiso', { proyectoId });
    return resp.status === 200;
  } catch (e) {
    console.error('otorgarPermisosDriveProyecto error:', e);
    return false;
  }
};

