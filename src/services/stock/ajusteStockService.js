import StockSolicitudesService from './stockSolicitudesService';

/**
 * Servicio para procesar ajustes de stock desde archivos Excel importados
 */
const AjusteStockService = {
  /**
   * Procesa una lista de ajustes y crea las solicitudes de movimiento correspondientes
   * @param {Array} ajustes - Lista de ajustes a procesar
   * @param {Object} user - Usuario autenticado
   * @returns {Promise<Object>} Resultado del procesamiento
   */
  procesarAjustes: async (ajustes, user) => {
    if (!ajustes || ajustes.length === 0) {
      throw new Error('No hay ajustes para procesar');
    }

    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const resultados = {
      exitosos: 0,
      errores: [],
      solicitudesCreadas: []
    };

    try {
      // Agrupar ajustes por proyecto para crear una solicitud por proyecto
      const ajustesPorProyecto = AjusteStockService.agruparPorProyecto(ajustes);

      // Procesar cada proyecto
      for (const [proyectoId, ajustesProyecto] of Object.entries(ajustesPorProyecto)) {
        try {
          const solicitudCreada = await AjusteStockService.crearSolicitudAjuste(
            ajustesProyecto, 
            user
          );
          
          resultados.exitosos += ajustesProyecto.length;
          resultados.solicitudesCreadas.push(solicitudCreada);
        } catch (error) {
          console.error(`Error procesando proyecto ${proyectoId}:`, error);
          ajustesProyecto.forEach(ajuste => {
            resultados.errores.push({
              material: ajuste.materialNombre,
              error: `Error en proyecto ${ajuste.proyectoNombre}: ${error.message}`
            });
          });
        }
      }

      return resultados;
    } catch (error) {
      console.error('Error general procesando ajustes:', error);
      throw new Error(`Error procesando ajustes: ${error.message}`);
    }
  },

  /**
   * Agrupa los ajustes por proyecto
   * @param {Array} ajustes 
   * @returns {Object} Ajustes agrupados por proyecto
   */
  agruparPorProyecto: (ajustes) => {
    return ajustes.reduce((acc, ajuste) => {
      const key = ajuste.proyectoId || 'SIN_ASIGNAR'; // null/undefined se agrupa como 'SIN_ASIGNAR'
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(ajuste);
      return acc;
    }, {});
  },

  /**
   * Crea una solicitud de ajuste para un proyecto específico
   * @param {Array} ajustesProyecto - Ajustes del proyecto
   * @param {Object} user - Usuario autenticado
   * @returns {Promise<Object>} Solicitud creada
   */
  crearSolicitudAjuste: async (ajustesProyecto, user) => {
    if (!ajustesProyecto || ajustesProyecto.length === 0) {
      throw new Error('No hay ajustes para el proyecto');
    }

    const primerAjuste = ajustesProyecto[0];
    const fechaActual = new Date().toISOString();

    // Preparar el formulario de la solicitud
    const form = {
      tipo: 'AJUSTE',
      subtipo: '-',
      fecha: fechaActual,
      responsable: user.email,
      proveedor_nombre: '',
      proveedor_id: '',
      proveedor_cuit: '',
      id_compra: '',
      url_doc: ''
    };

    // Preparar los movimientos
    const movimientos = ajustesProyecto.map(ajuste => ({
      empresa_id: ajuste.empresaId,
      usuario_id: user.uid || user.id,
      usuario_mail: user.email,
      nombre_item: ajuste.materialNombre,
      cantidad: ajuste.cantidad, // Siempre positivo
      tipo: ajuste.tipo, // 'INGRESO' o 'EGRESO' 
      subtipo: 'AJUSTE',
      fecha_movimiento: fechaActual,
      proyecto_id: ajuste.proyectoId || null, // null para "sin asignar"
      proyecto_nombre: ajuste.proyectoId ? ajuste.proyectoNombre : 'Sin asignar',
      observacion: `Ajuste de stock - Stock sistema: ${ajuste.stockSistema}, Stock Excel: ${ajuste.stockExcel}, Diferencia: ${ajuste.diferencia}`,
      id_material: ajuste.materialId
    }));

    // Crear la solicitud usando el servicio existente
    const solicitudCreada = await StockSolicitudesService.guardarSolicitud({
      user,
      form,
      movs: movimientos,
      editMode: false,
      editId: null
    });

    return solicitudCreada;
  },

  /**
   * Valida que los ajustes tengan la estructura correcta
   * @param {Array} ajustes 
   * @returns {Object} Resultado de la validación
   */
  validarAjustes: (ajustes) => {
    const errores = [];
    const ajustesValidos = [];

    if (!Array.isArray(ajustes)) {
      errores.push('Los ajustes deben ser un array');
      return { validos: false, errores, ajustesValidos };
    }

    ajustes.forEach((ajuste, index) => {
      const erroresAjuste = [];

      // ❌ REMOVED: No requerir materialId - puede ser null para materiales no conciliados
      // if (!ajuste.materialId) {
      //   erroresAjuste.push('ID del material es requerido');
      // }

      if (!ajuste.materialNombre?.trim()) {
        erroresAjuste.push('Nombre del material es requerido');
      }

      if (!ajuste.proyectoId && ajuste.proyectoNombre !== 'Sin asignar') {
        erroresAjuste.push('ID del proyecto es requerido (excepto para "Sin asignar")');
      }

      if (!ajuste.proyectoNombre?.trim()) {
        erroresAjuste.push('Nombre del proyecto es requerido');
      }

      if (!ajuste.empresaId) {
        erroresAjuste.push('ID de la empresa es requerido');
      }

      if (!Number.isFinite(ajuste.cantidad) || ajuste.cantidad <= 0) {
        erroresAjuste.push('La cantidad debe ser un número positivo');
      }

      if (!['INGRESO', 'EGRESO'].includes(ajuste.tipo)) {
        erroresAjuste.push('El tipo debe ser INGRESO o EGRESO');
      }

      if (erroresAjuste.length > 0) {
        errores.push({
          index,
          material: ajuste.materialNombre || 'Desconocido',
          errores: erroresAjuste
        });
      } else {
        ajustesValidos.push(ajuste);
      }
    });

    return {
      validos: errores.length === 0,
      errores,
      ajustesValidos
    };
  }
};

export default AjusteStockService;