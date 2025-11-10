// src/data/loteParaTodos/mockEmprendimientos.js

export const mockEmprendimientos = [
  {
    id: 1,
    nombre: 'Cerro Verde I',
    ubicacion: 'Ruta 3 Km 42, La Matanza',
    estado: 'ACTIVO',
    fecha_inicio: '2023-01-15',
    fecha_fin: '2025-12-31',
    observaciones: 'Primer etapa del desarrollo Cerro Verde. 120 lotes con servicios básicos.',
    descripcion: 'Desarrollo residencial con lotes de 300-500 m². Incluye agua, luz y gas natural.',
    total_lotes: 120,
    lotes_disponibles: 45,
    lotes_vendidos: 60,
    lotes_reservados: 12,
    lotes_bloqueados: 3
  },
  {
    id: 2,
    nombre: 'Loteo Norte Premium',
    ubicacion: 'Av. San Martín 2800, Morón Norte',
    estado: 'ACTIVO',
    fecha_inicio: '2023-06-01',
    fecha_fin: '2026-06-30',
    observaciones: 'Loteo premium con infraestructura completa y club house.',
    descripcion: 'Lotes de 400-800 m² con todos los servicios, seguridad 24hs y amenities.',
    total_lotes: 85,
    lotes_disponibles: 32,
    lotes_vendidos: 41,
    lotes_reservados: 8,
    lotes_bloqueados: 4
  },
  {
    id: 3,
    nombre: 'Los Robles Country',
    ubicacion: 'Ruta 205 Km 15, Cañuelas',
    estado: 'ACTIVO',
    fecha_inicio: '2022-09-01',
    fecha_fin: '2024-12-31',
    observaciones: 'Country club con lotes de gran superficie y cancha de golf.',
    descripcion: 'Desarrollo de alta gama con lotes de 800-1500 m², cancha de golf 18 hoyos.',
    total_lotes: 150,
    lotes_disponibles: 28,
    lotes_vendidos: 95,
    lotes_reservados: 18,
    lotes_bloqueados: 9
  },
  {
    id: 4,
    nombre: 'Horizonte I',
    ubicacion: 'Camino Real 1200, Ezeiza',
    estado: 'ACTIVO',
    fecha_inicio: '2024-02-01',
    fecha_fin: '2027-02-28',
    observaciones: 'Nuevo desarrollo con foco en sustentabilidad y tecnología.',
    descripcion: 'Lotes con pre-instalación domótica, placas solares y sistema de riego.',
    total_lotes: 95,
    lotes_disponibles: 78,
    lotes_vendidos: 12,
    lotes_reservados: 4,
    lotes_bloqueados: 1
  },
  {
    id: 5,
    nombre: 'Delta Tigre',
    ubicacion: 'Río Luján s/n, Delta del Tigre',
    estado: 'PLANIFICACION',
    fecha_inicio: '2024-08-01',
    fecha_fin: '2026-12-31',
    observaciones: 'Desarrollo en el delta con acceso náutico exclusivo.',
    descripcion: 'Lotes con frente al río, muelles privados y acceso por lancha.',
    total_lotes: 45,
    lotes_disponibles: 0,
    lotes_vendidos: 0,
    lotes_reservados: 0,
    lotes_bloqueados: 45
  },
  {
    id: 6,
    nombre: 'Cerro Verde II',
    ubicacion: 'Ruta 3 Km 44, La Matanza',
    estado: 'PLANIFICACION',
    fecha_inicio: '2025-03-01',
    fecha_fin: '2027-03-31',
    observaciones: 'Segunda etapa del desarrollo Cerro Verde.',
    descripcion: 'Ampliación del desarrollo original con lotes de mayor superficie.',
    total_lotes: 180,
    lotes_disponibles: 0,
    lotes_vendidos: 0,
    lotes_reservados: 0,
    lotes_bloqueados: 180
  }
];

export const getEmprendimientoById = (id) => {
  return mockEmprendimientos.find(emp => emp.id === id);
};

export const getEmprendimientosActivos = () => {
  return mockEmprendimientos.filter(emp => emp.estado === 'ACTIVO');
};

export const getEstadisticasEmprendimiento = (id) => {
  const emp = getEmprendimientoById(id);
  if (!emp) return null;
  
  return {
    ...emp,
    porcentaje_vendido: Math.round((emp.lotes_vendidos / emp.total_lotes) * 100),
    porcentaje_disponible: Math.round((emp.lotes_disponibles / emp.total_lotes) * 100),
    porcentaje_reservado: Math.round((emp.lotes_reservados / emp.total_lotes) * 100),
    total_comprometido: emp.lotes_vendidos + emp.lotes_reservados
  };
};