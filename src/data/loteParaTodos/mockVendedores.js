// src/data/loteParaTodos/mockVendedores.js

export const mockVendedores = [
  {
    id: 'juan.perez',
    nombre: 'Juan Pérez',
    telefono: '11-5555-1111',
    email: 'juan.perez@empresa.com',
    comision_porcentaje: 3.5,
    activo: true,
    fecha_ingreso: '2022-01-15'
  },
  {
    id: 'maria.garcia',
    nombre: 'María García',
    telefono: '11-5555-2222',
    email: 'maria.garcia@empresa.com',
    comision_porcentaje: 4.0,
    activo: true,
    fecha_ingreso: '2021-08-20'
  },
  {
    id: 'carlos.lopez',
    nombre: 'Carlos López',
    telefono: '11-5555-3333',
    email: 'carlos.lopez@empresa.com',
    comision_porcentaje: 3.8,
    activo: true,
    fecha_ingreso: '2020-03-10'
  },
  {
    id: 'ana.martinez',
    nombre: 'Ana Martínez',
    telefono: '11-5555-4444',
    email: 'ana.martinez@empresa.com',
    comision_porcentaje: 3.2,
    activo: true,
    fecha_ingreso: '2023-02-01'
  },
  {
    id: 'diego.fernandez',
    nombre: 'Diego Fernández',
    telefono: '11-5555-5555',
    email: 'diego.fernandez@empresa.com',
    comision_porcentaje: 2.8,
    activo: false, // Vendedor inactivo
    fecha_ingreso: '2019-05-15',
    fecha_baja: '2024-01-31'
  }
];

// Funciones de utilidad
export const getVendedorById = (id) => {
  return mockVendedores.find(vendedor => vendedor.id === id);
};

export const getVendedoresActivos = () => {
  return mockVendedores.filter(vendedor => vendedor.activo);
};

export const getVendedorByContrato = (contratoId) => {
  // Sería usado con mockContratos para obtener el vendedor de un contrato
  return mockVendedores;
};