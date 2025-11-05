// src/data/loteParaTodos/index.js

// Importar todos los mocks
export { 
  mockClientes, 
  getClienteById, 
  buscarClientes
} from './mockClientes.js';

export {
  mockContratos,
  getContratosByClienteId,
  getContratosActivosByClienteId,
  getContratoActivoByLoteId,
  getContratosByLoteId,
  getContratosByVendedor,
  getContratosEnMora,
  getEstadisticasContratos
} from './mockContratos.js';

export {
  mockVendedores,
  getVendedorById,
  getVendedoresActivos
} from './mockVendedores.js';

// Funciones relacionales combinadas
export const getClienteCompleto = (clienteId) => {
  const cliente = getClienteById(clienteId);
  if (!cliente) return null;
  
  const contratos = getContratosByClienteId(clienteId);
  const contratosActivos = getContratosActivosByClienteId(clienteId);
  
  // Calcular estado basado en contratos
  let estadoGeneral = 'POTENCIAL';
  let saldoTotal = 0;
  let ultimoPago = null;
  
  contratosActivos.forEach(contrato => {
    saldoTotal += contrato.saldo_pendiente || 0;
    if (!ultimoPago || contrato.ultimo_pago > ultimoPago) {
      ultimoPago = contrato.ultimo_pago;
    }
    
    if (contrato.estado === 'COMPLETADO') {
      estadoGeneral = 'PAGADO';
    } else if (contrato.estado === 'ACTIVO') {
      if (contrato.saldo_pendiente > 0) {
        estadoGeneral = 'MORA';
      } else {
        estadoGeneral = 'AL_DIA';
      }
    } else if (contrato.estado === 'RESERVADO') {
      estadoGeneral = 'RESERVADO';
    }
  });
  
  return {
    ...cliente,
    contratos,
    contratosActivos,
    estadoGeneral,
    saldoTotal,
    ultimoPago,
    cantidadLotes: contratosActivos.length
  };
};

export const getEstadisticasClientes = () => {
  const clientesCompletos = mockClientes.map(cliente => getClienteCompleto(cliente.id));
  
  const estadisticas = {
    PAGADO: 0,
    AL_DIA: 0,
    MORA: 0,
    RESERVADO: 0,
    POTENCIAL: 0
  };
  
  clientesCompletos.forEach(cliente => {
    estadisticas[cliente.estadoGeneral]++;
  });
  
  return {
    ...estadisticas,
    total: mockClientes.length,
    con_contratos: clientesCompletos.filter(c => c.contratosActivos.length > 0).length
  };
};

export { 
  mockEmprendimientos, 
  getEmprendimientoById, 
  getEmprendimientosActivos, 
  getEstadisticasEmprendimiento 
} from './mockEmprendimientos.js';

export { 
  mockLotes, 
  getLotesByEmprendimiento, 
  getLoteById, 
  getLotesByEstado, 
  getEstadisticasLotes, 
  buscarLotes 
} from './mockLotes.js';

export { 
  mockPlanes, 
  mockCondicionesEspeciales, 
  getPlanById, 
  getPlanesActivos, 
  calcularFinanciacion, 
  compararPlanes 
} from './mockPlanes.js';

export { 
  mockHistorialPrecios, 
  mockListaPrecios, 
  getPrecioActualLote, 
  getHistorialPreciosLote, 
  calcularPrecioConFactores, 
  actualizarPrecioLote, 
  getEvolucionPrecios, 
  simularAjustePorInflacion 
} from './mockPrecios.js';

export { 
  mockMovimientosCaja, 
  mockEstadoCaja, 
  mockConceptos, 
  getMovimientosPorPeriodo, 
  getMovimientosPorCliente, 
  getMovimientosPorTipo, 
  calcularEstadisticasPeriodo, 
  getSaldoActual, 
  registrarMovimiento, 
  getFlujoCaja, 
  getTopClientes 
} from './mockCaja.js';

// Funciones combinadas para análisis cruzado
export const getResumenCompleto = () => {
  const estadisticasClientes = getEstadisticasClientes();
  const estadisticasLotes = getEstadisticasLotes();
  const saldoCaja = getSaldoActual();
  
  return {
    clientes: estadisticasClientes,
    lotes: estadisticasLotes,
    saldo_caja: saldoCaja,
    emprendimientos_activos: getEmprendimientosActivos().length,
    planes_disponibles: getPlanesActivos().length
  };
};



export const getLoteCompleto = (loteId) => {
  const lote = getLoteById(loteId);
  if (!lote) return null;
  
  const emprendimiento = getEmprendimientoById(lote.emprendimiento_id);
  const precioActual = getPrecioActualLote(loteId);
  const historialPrecios = getHistorialPreciosLote(loteId);
  
  // Buscar contrato activo del lote
  const contratoActivo = getContratoActivoByLoteId(loteId);
  const cliente = contratoActivo ? getClienteById(contratoActivo.cliente_id) : null;
  const vendedor = contratoActivo ? getVendedorById(contratoActivo.vendedor_id) : null;
  
  return {
    ...lote,
    emprendimiento,
    precio_actual: precioActual,
    historial_precios: historialPrecios,
    contrato_activo: contratoActivo,
    cliente,
    vendedor,
    estado_venta: contratoActivo ? contratoActivo.estado : 'DISPONIBLE'
  };
};