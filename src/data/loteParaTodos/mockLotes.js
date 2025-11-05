// src/data/loteParaTodos/mockLotes.js

export const mockLotes = [
  // CERRO VERDE I - Emprendimiento ID 1
  { id: 1, emprendimiento_id: 1, numero: 'A-001', manzana: 'A', superficie: 350, estado: 'VENDIDO', precio_base: 25000, fecha_venta: '2023-03-15', observaciones: 'Esquina, doble frente' },
  { id: 2, emprendimiento_id: 1, numero: 'A-002', manzana: 'A', superficie: 320, estado: 'DISPONIBLE', precio_base: 22000, fecha_venta: null, observaciones: 'Vista al parque' },
  { id: 3, emprendimiento_id: 1, numero: 'A-003', manzana: 'A', superficie: 300, estado: 'RESERVADO', precio_base: 21000, fecha_venta: null, observaciones: 'Lote central' },
  { id: 4, emprendimiento_id: 1, numero: 'A-004', manzana: 'A', superficie: 280, estado: 'VENDIDO', precio_base: 19000, fecha_venta: '2023-07-22', observaciones: null },
  { id: 5, emprendimiento_id: 1, numero: 'A-005', manzana: 'A', superficie: 450, estado: 'DISPONIBLE', precio_base: 32000, fecha_venta: null, observaciones: 'Lote premium, frente amplio' },
  { id: 6, emprendimiento_id: 1, numero: 'B-001', manzana: 'B', superficie: 330, estado: 'VENDIDO', precio_base: 23000, fecha_venta: '2023-05-10', observaciones: 'Cerca del acceso principal' },
  { id: 7, emprendimiento_id: 1, numero: 'B-002', manzana: 'B', superficie: 310, estado: 'DISPONIBLE', precio_base: 21500, fecha_venta: null, observaciones: null },
  { id: 8, emprendimiento_id: 1, numero: 'B-003', manzana: 'B', superficie: 295, estado: 'BLOQUEADO', precio_base: 20500, fecha_venta: null, observaciones: 'Problema legal pendiente' },
  { id: 9, emprendimiento_id: 1, numero: 'C-001', manzana: 'C', superficie: 380, estado: 'VENDIDO', precio_base: 27000, fecha_venta: '2023-09-18', observaciones: 'Esquina privilegiada' },
  { id: 10, emprendimiento_id: 1, numero: 'C-002', manzana: 'C', superficie: 340, estado: 'RESERVADO', precio_base: 24000, fecha_venta: null, observaciones: 'Reserva hasta fin de mes' },

  // LOTEO NORTE PREMIUM - Emprendimiento ID 2
  { id: 11, emprendimiento_id: 2, numero: 'P-001', manzana: 'Premium', superficie: 500, estado: 'VENDIDO', precio_base: 45000, fecha_venta: '2023-08-15', observaciones: 'Frente al club house' },
  { id: 12, emprendimiento_id: 2, numero: 'P-002', manzana: 'Premium', superficie: 480, estado: 'DISPONIBLE', precio_base: 43000, fecha_venta: null, observaciones: 'Vista panorámica' },
  { id: 13, emprendimiento_id: 2, numero: 'P-003', manzana: 'Premium', superficie: 520, estado: 'VENDIDO', precio_base: 47000, fecha_venta: '2023-10-02', observaciones: 'Doble lote unificado' },
  { id: 14, emprendimiento_id: 2, numero: 'E-001', manzana: 'Este', superficie: 420, estado: 'DISPONIBLE', precio_base: 38000, fecha_venta: null, observaciones: 'Zona tranquila' },
  { id: 15, emprendimiento_id: 2, numero: 'E-002', manzana: 'Este', superficie: 410, estado: 'RESERVADO', precio_base: 37000, fecha_venta: null, observaciones: 'Cliente con financiación aprobada' },
  { id: 16, emprendimiento_id: 2, numero: 'O-001', manzana: 'Oeste', superficie: 450, estado: 'VENDIDO', precio_base: 40000, fecha_venta: '2023-11-28', observaciones: 'Acceso directo a amenities' },
  { id: 17, emprendimiento_id: 2, numero: 'O-002', manzana: 'Oeste', superficie: 435, estado: 'DISPONIBLE', precio_base: 39000, fecha_venta: null, observaciones: null },
  { id: 18, emprendimiento_id: 2, numero: 'N-001', manzana: 'Norte', superficie: 600, estado: 'BLOQUEADO', precio_base: 55000, fecha_venta: null, observaciones: 'Reservado para equipamiento comunitario' },

  // LOS ROBLES COUNTRY - Emprendimiento ID 3
  { id: 19, emprendimiento_id: 3, numero: 'G-001', manzana: 'Golf', superficie: 800, estado: 'VENDIDO', precio_base: 85000, fecha_venta: '2023-01-20', observaciones: 'Frente al green del hoyo 9' },
  { id: 20, emprendimiento_id: 3, numero: 'G-002', manzana: 'Golf', superficie: 750, estado: 'VENDIDO', precio_base: 80000, fecha_venta: '2023-04-15', observaciones: 'Vista al fairway' },
  { id: 21, emprendimiento_id: 3, numero: 'G-003', manzana: 'Golf', superficie: 900, estado: 'DISPONIBLE', precio_base: 95000, fecha_venta: null, observaciones: 'Lote premium esquina' },
  { id: 22, emprendimiento_id: 3, numero: 'L-001', manzana: 'Lago', superficie: 1200, estado: 'VENDIDO', precio_base: 140000, fecha_venta: '2022-12-10', observaciones: 'Frente al lago artificial' },
  { id: 23, emprendimiento_id: 3, numero: 'L-002', manzana: 'Lago', superficie: 1100, estado: 'RESERVADO', precio_base: 130000, fecha_venta: null, observaciones: 'Seña abonada, escrituración pendiente' },
  { id: 24, emprendimiento_id: 3, numero: 'B-001', manzana: 'Bosque', superficie: 650, estado: 'DISPONIBLE', precio_base: 70000, fecha_venta: null, observaciones: 'Zona arbolada nativa' },
  { id: 25, emprendimiento_id: 3, numero: 'B-002', manzana: 'Bosque', superficie: 680, estado: 'VENDIDO', precio_base: 72000, fecha_venta: '2023-06-08', observaciones: 'Reserva natural protegida' },

  // HORIZONTE I - Emprendimiento ID 4
  { id: 26, emprendimiento_id: 4, numero: 'T-001', manzana: 'Tech', superficie: 400, estado: 'VENDIDO', precio_base: 48000, fecha_venta: '2024-03-12', observaciones: 'Pre-instalación domótica completa' },
  { id: 27, emprendimiento_id: 4, numero: 'T-002', manzana: 'Tech', superficie: 385, estado: 'DISPONIBLE', precio_base: 46000, fecha_venta: null, observaciones: 'Sistema solar incluido' },
  { id: 28, emprendimiento_id: 4, numero: 'S-001', manzana: 'Sustentable', superficie: 420, estado: 'DISPONIBLE', precio_base: 50000, fecha_venta: null, observaciones: 'Certificación LEED ready' },
  { id: 29, emprendimiento_id: 4, numero: 'S-002', manzana: 'Sustentable', superficie: 390, estado: 'RESERVADO', precio_base: 47000, fecha_venta: null, observaciones: 'Sistema de captación de agua' },
  { id: 30, emprendimiento_id: 4, numero: 'E-001', manzana: 'Ecológica', superficie: 450, estado: 'DISPONIBLE', precio_base: 52000, fecha_venta: null, observaciones: 'Huerta comunitaria incluida' },

  // DELTA TIGRE - Emprendimiento ID 5 (todos bloqueados en planificación)
  { id: 31, emprendimiento_id: 5, numero: 'R-001', manzana: 'Río', superficie: 600, estado: 'BLOQUEADO', precio_base: 75000, fecha_venta: null, observaciones: 'Muelle privado 15m' },
  { id: 32, emprendimiento_id: 5, numero: 'R-002', manzana: 'Río', superficie: 580, estado: 'BLOQUEADO', precio_base: 73000, fecha_venta: null, observaciones: 'Frente al río Luján' },
  { id: 33, emprendimiento_id: 5, numero: 'I-001', manzana: 'Isla', superficie: 800, estado: 'BLOQUEADO', precio_base: 95000, fecha_venta: null, observaciones: 'Isla privada con puente' },

  // CERRO VERDE II - Emprendimiento ID 6 (todos bloqueados en planificación)
  { id: 34, emprendimiento_id: 6, numero: 'AA-001', manzana: 'AA', superficie: 500, estado: 'BLOQUEADO', precio_base: 35000, fecha_venta: null, observaciones: 'Segunda etapa - lotes ampliados' },
  { id: 35, emprendimiento_id: 6, numero: 'AA-002', manzana: 'AA', superficie: 520, estado: 'BLOQUEADO', precio_base: 36000, fecha_venta: null, observaciones: 'Infraestructura mejorada' }
];

export const getLotesByEmprendimiento = (emprendimientoId) => {
  return mockLotes.filter(lote => lote.emprendimiento_id === emprendimientoId);
};

export const getLoteById = (id) => {
  return mockLotes.find(lote => lote.id === id);
};

export const getLotesByEstado = (estado) => {
  return mockLotes.filter(lote => lote.estado === estado);
};

export const getEstadisticasLotes = () => {
  const estados = ['DISPONIBLE', 'VENDIDO', 'RESERVADO', 'BLOQUEADO'];
  const estadisticas = {};
  
  estados.forEach(estado => {
    const lotes = getLotesByEstado(estado);
    estadisticas[estado] = {
      cantidad: lotes.length,
      superficie_total: lotes.reduce((sum, lote) => sum + lote.superficie, 0),
      precio_promedio: lotes.length > 0 ? 
        Math.round(lotes.reduce((sum, lote) => sum + lote.precio_base, 0) / lotes.length) : 0
    };
  });
  
  return estadisticas;
};

export const buscarLotes = (filtros = {}) => {
  let resultado = [...mockLotes];
  
  if (filtros.emprendimiento_id) {
    resultado = resultado.filter(lote => lote.emprendimiento_id === filtros.emprendimiento_id);
  }
  
  if (filtros.estado) {
    resultado = resultado.filter(lote => lote.estado === filtros.estado);
  }
  
  if (filtros.manzana) {
    resultado = resultado.filter(lote => lote.manzana.toLowerCase().includes(filtros.manzana.toLowerCase()));
  }
  
  if (filtros.superficie_min) {
    resultado = resultado.filter(lote => lote.superficie >= filtros.superficie_min);
  }
  
  if (filtros.superficie_max) {
    resultado = resultado.filter(lote => lote.superficie <= filtros.superficie_max);
  }
  
  if (filtros.precio_min) {
    resultado = resultado.filter(lote => lote.precio_base >= filtros.precio_min);
  }
  
  if (filtros.precio_max) {
    resultado = resultado.filter(lote => lote.precio_base <= filtros.precio_max);
  }
  
  return resultado;
};

export const getLoteCompleto = (loteId) => {
  const lote = getLoteById(loteId);
  if (!lote) return null;
  
  // Importación dinámica para evitar dependencias circulares
  const mockContratos = require('./mockContratos.js').mockContratos;
  const mockEmprendimientos = require('./mockEmprendimientos.js').mockEmprendimientos;
  
  const contratos = mockContratos.filter(c => c.lote_id === loteId);
  const emprendimiento = mockEmprendimientos.find(e => e.id === lote.emprendimiento_id);
  
  return {
    ...lote,
    emprendimiento,
    contratos,
    contratoActivo: contratos.find(c => c.estado === 'ACTIVO')
  };
};