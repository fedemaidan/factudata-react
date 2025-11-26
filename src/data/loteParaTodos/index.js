// src/data/loteParaTodos/index.js - Exportaciones centrales limpias

// Importar datos base
import { mockClientes, getClienteById, buscarClientes } from './mockClientes.js';
import { mockContratos, getContratosByClienteId, getContratoActivoByLoteId, getContratoById } from './mockContratos.js';
import { mockVendedores, getVendedorById } from './mockVendedores.js';
import { 
  mockEmprendimientos, 
  getEmprendimientosActivos, 
  getEmprendimientoById,
  getEstadisticasGeneralesEmprendimientos,
  buscarEmprendimientos,
  ESTADO_EMPRENDIMIENTO,
  ESTADO_EMPRENDIMIENTO_LABELS,
  ESTADO_EMPRENDIMIENTO_COLORS
} from './mockEmprendimientos.js';
import { mockLotes, getLotesByEmprendimiento, getLotesByEstado, getLoteCompleto } from './mockLotes.js';
import { mockPlanes, getPlanesActivos, calcularFinanciacion } from './mockPlanes.js';
import { mockCuentas, mockMovimientos, CATEGORIAS_MOVIMIENTOS, mockExtractoBancario } from './mockFinanzas.js';

// Función principal que combina datos del cliente con sus contratos
export const getClienteCompleto = (clienteId) => {
  const cliente = getClienteById(clienteId);
  if (!cliente) return null;
  
  const contratos = getContratosByClienteId(clienteId);
  
  return {
    ...cliente,
    contratos: contratos.map(contrato => ({
      ...contrato,
      vendedor: getVendedorById(contrato.vendedor_id),
      lote: mockLotes.find(l => l.id === contrato.lote_id),
      plan: mockPlanes.find(p => p.id === contrato.plan_id)
    }))
  };
};

// Funciones adicionales que faltan
export const getClientesPorEmprendimiento = (emprendimientoId) => {
  const contratos = mockContratos.filter(contrato => {
    const lote = mockLotes.find(l => l.id === contrato.lote_id);
    return lote && lote.emprendimiento_id === emprendimientoId;
  });
  
  const clienteIds = [...new Set(contratos.map(c => c.cliente_id))];
  return clienteIds.map(id => getClienteById(id)).filter(c => c);
};

export const getClientesPorEstado = (estado) => {
  const contratos = mockContratos.filter(contrato => contrato.estado === estado);
  const clienteIds = [...new Set(contratos.map(c => c.cliente_id))];
  return clienteIds.map(id => getClienteById(id)).filter(c => c);
};

export const getEstadisticasClientes = () => {
  const total = mockClientes.length;
  const activos = mockClientes.filter(c => c.activo).length;
  const conContratos = [...new Set(mockContratos.map(c => c.cliente_id))].length;
  
  return {
    total,
    activos,
    inactivos: total - activos,
    conContratos,
    sinContratos: total - conContratos
  };
};

// Exportar todas las funciones y datos
export {
  // Datos base
  mockClientes,
  mockContratos,
  mockVendedores,
  mockEmprendimientos,
  mockLotes,
  mockPlanes,
  mockCuentas,
  mockMovimientos,
  mockExtractoBancario,
  
  // Funciones de clientes
  getClienteById,
  buscarClientes,
  
  // Funciones de contratos
  getContratosByClienteId,
  getContratoActivoByLoteId,
  getContratoById,
  
  // Funciones de vendedores
  getVendedorById,
  
  // Funciones de emprendimientos
  getEmprendimientosActivos,
  getEmprendimientoById,
  getEstadisticasGeneralesEmprendimientos,
  buscarEmprendimientos,
  ESTADO_EMPRENDIMIENTO,
  ESTADO_EMPRENDIMIENTO_LABELS,
  ESTADO_EMPRENDIMIENTO_COLORS,
  
  // Funciones de lotes
  getLotesByEmprendimiento,
  getLotesByEstado,
  getLoteCompleto,
  
  // Funciones de planes
  getPlanesActivos,
  calcularFinanciacion,
  
  // Constantes y funciones de finanzas
  CATEGORIAS_MOVIMIENTOS
};

// Exportar también las nuevas constantes y funciones de lotes
export * from './constantes.js';
export * from './mockLotes.js';