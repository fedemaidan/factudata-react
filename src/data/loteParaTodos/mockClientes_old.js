// src/data/loteParaTodos/mockClientes.js

export const mockClientes = [
  // Clientes - solo datos personales
  { 
    id: 1, 
    nombre: 'Roberto García', 
    apellido: 'García',
    dni: '35123456', 
    telefono: '11-5626-1946', 
    email: 'roberto.garcia@email.com', 
    direccion: 'Av. San Martín 1523, La Matanza',
    localidad: 'La Matanza',
    codigo_postal: '1754',
    fecha_nacimiento: '1985-05-15',
    estado_civil: 'Casado',
    ocupacion: 'Ingeniero Civil',
    activo: true,
    fecha_registro: '2023-03-10',
    observaciones: 'Cliente preferencial'
  },
  { 
    id: 2, 
    nombre: 'Ana Rodríguez', 
    apellido: 'Rodríguez',
    dni: '27458921', 
    telefono: '11-4990-8822', 
    email: 'ana.rodriguez@outlook.com',
    direccion: 'Calle 45 N° 891, Morón',
    localidad: 'Morón',
    codigo_postal: '1708',
    fecha_nacimiento: '1978-11-22',
    estado_civil: 'Soltera',
    ocupacion: 'Contadora Pública',
    activo: true,
    fecha_registro: '2023-07-15',
    observaciones: 'Excelente pagadora, cliente con múltiples inversiones'
  },
  { 
    id: 3, 
    nombre: 'Pedro Martínez', 
    apellido: 'Martínez',
    dni: '30712345', 
    telefono: '11-5448-9988', 
    email: 'pedro.martinez@gmail.com',
    direccion: 'Ruta 21 Km 8, Morón Norte',
    localidad: 'Morón',
    codigo_postal: '1708',
    fecha_nacimiento: '1980-09-10',
    estado_civil: 'Casado',
    ocupacion: 'Empresario',
    activo: true,
    fecha_registro: '2023-08-10',
    observaciones: 'Inversor inmobiliario con múltiples propiedades'
  },
  { 
    id: 4, 
    nombre: 'Laura Fernández', 
    apellido: 'Fernández',
    dni: '35220100', 
    telefono: '11-5678-2244', 
    email: 'laura.fernandez@gmail.com',
    direccion: 'Belgrano 456, Hurlingham',
    localidad: 'Hurlingham',
    codigo_postal: '1686',
    fecha_nacimiento: '1987-03-28',
    estado_civil: 'Divorciada',
    ocupacion: 'Médica',
    activo: true,
    fecha_registro: '2023-10-10',
    observaciones: 'Cliente con contrato en mora'
  },
  { 
    id: 5, 
    nombre: 'Carlos Silva', 
    apellido: 'Silva',
    dni: '30222111', 
    telefono: '11-5544-9911', 
    email: 'carlos.silva@yahoo.com',
    direccion: 'Av. Libertador 2890, Cañuelas',
    localidad: 'Cañuelas',
    codigo_postal: '1814',
    fecha_nacimiento: '1975-12-05',
    estado_civil: 'Casado',
    ocupacion: 'Comerciante',
    activo: true,
    fecha_registro: '2023-01-15',
    observaciones: 'Comerciante con problemas de pago'
  },
  { 
    id: 6, 
    nombre: 'Mónica González', 
    apellido: 'González',
    dni: '33788662', 
    telefono: '11-5999-8811', 
    email: 'monica.gonzalez@hotmail.com',
    direccion: 'Mitre 789, La Matanza',
    localidad: 'La Matanza',
    codigo_postal: '1754',
    fecha_nacimiento: '1982-07-18',
    estado_civil: 'Casada',
    ocupacion: 'Arquitecta',
    activo: true,
    fecha_registro: '2023-05-01',
    observaciones: 'Arquitecta, pagó al contado'
  },
  { 
    id: 7, 
    nombre: 'Diego Herrera', 
    dni: '28123456', 
    telefono: '11-4000-9090', 
    email: 'diego.herrera@gmail.com',
    direccion: 'San Lorenzo 1234, Tigre',
    fecha_nacimiento: '1973-01-14',
    estado_civil: 'Casado',
    ocupacion: 'Abogado',
    emprendimiento_id: 3,
    lote_id: 22,
    estado_cuenta: 'PAGADO',
    plan_financiacion_id: 1,
    fecha_compra: '2022-12-10',
    ultimo_pago: '2022-12-10',
    saldo_cuenta_corriente: 0,
    lotes_ids: [22],
    observaciones: 'Lote premium frente al lago'
  },
  { 
    id: 8, 
    nombre: 'Estela Morales', 
    dni: '31112233', 
    telefono: '11-5777-1122', 
    email: 'estela.morales@gmail.com',
    direccion: 'Rivadavia 567, Ezeiza',
    fecha_nacimiento: '1979-08-30',
    estado_civil: 'Viuda',
    ocupacion: 'Profesora',
    emprendimiento_id: 1,
    lote_id: 9,
    estado_cuenta: 'PAGADO',
    plan_financiacion_id: 7,
    fecha_compra: '2023-09-18',
    ultimo_pago: '2023-09-18',
    saldo_cuenta_corriente: 0,
    lotes_ids: [9],
    observaciones: 'Plan mixto 50-50'
  },
  { 
    id: 9, 
    nombre: 'Tecnológica SRL', 
    dni: '30998877665', 
    telefono: '11-5443-0098', 
    email: 'info@tecnologica.com.ar',
    direccion: 'Parque Industrial Sur, Ezeiza',
    fecha_nacimiento: null,
    estado_civil: null,
    ocupacion: 'Empresa Tecnológica',
    emprendimiento_id: 4,
    lote_id: 26,
    estado_cuenta: 'MORA',
    plan_financiacion_id: 3,
    fecha_compra: '2024-03-12',
    ultimo_pago: '2024-03-12',
    saldo_cuenta_corriente: 85000, // Debe cuotas desde marzo
    lotes_ids: [26],
    observaciones: 'Empresa compradora - MORA: solo pagó entrega inicial, sin cuotas posteriores'
  },
  
  // Clientes potenciales sin lotes asignados
  { 
    id: 10, 
    nombre: 'Constructora Horizonte SA', 
    dni: '30987654321', 
    telefono: '11-5500-0099', 
    email: 'ventas@horizonte.com',
    direccion: 'Av. del Trabajo 4500, Zona Industrial',
    fecha_nacimiento: null,
    estado_civil: null,
    ocupacion: 'Constructora',
    emprendimiento_id: null,
    lote_id: null,
    estado_cuenta: 'POTENCIAL',
    plan_financiacion_id: null,
    fecha_compra: null,
    ultimo_pago: null,
    saldo_cuenta_corriente: 0,
    lotes_ids: [],
    observaciones: 'Interesada en compra múltiple de lotes'
  },
  
  // Clientes con reservas
  { 
    id: 11, 
    nombre: 'Familia Rossi', 
    dni: '34567890', 
    telefono: '11-6123-4567', 
    email: 'familia.rossi@gmail.com',
    direccion: 'Las Flores 890, Morón',
    fecha_nacimiento: '1988-04-12',
    estado_civil: 'Casado',
    ocupacion: 'Empleado Bancario',
    emprendimiento_id: 1,
    lote_id: 3,
    estado_cuenta: 'RESERVADO',
    plan_financiacion_id: 2,
    fecha_compra: null,
    ultimo_pago: null,
    saldo_cuenta_corriente: -5000, // Seña abonada
    lotes_ids: [],
    observaciones: 'Reserva hasta fin de mes, seña abonada'
  },
  { 
    id: 12, 
    nombre: 'Inversiones del Norte', 
    dni: '30445566778', 
    telefono: '11-7890-1234', 
    email: 'contacto@inversionesdelnorte.com',
    direccion: 'Av. Norte 1800, San Isidro',
    fecha_nacimiento: null,
    estado_civil: null,
    ocupacion: 'Empresa de Inversiones',
    emprendimiento_id: 2,
    lote_id: 15,
    estado_cuenta: 'RESERVADO',
    plan_financiacion_id: 5,
    fecha_compra: null,
    ultimo_pago: null,
    saldo_cuenta_corriente: -10000, // Seña de reserva
    lotes_ids: [15, 16], // Empresa con dos lotes reservados
    observaciones: 'Reserva con financiación aprobada'
  }
];

// Funciones de utilidad
export const getClienteById = (id) => {
  return mockClientes.find(cliente => cliente.id === id);
};

export const getClientesPorEmprendimiento = (emprendimientoId) => {
  return mockClientes.filter(cliente => cliente.emprendimiento_id === emprendimientoId);
};

export const getClientesPorEstado = (estado) => {
  return mockClientes.filter(cliente => cliente.estado_cuenta === estado);
};

export const buscarClientes = (termino) => {
  const terminoLower = termino.toLowerCase();
  return mockClientes.filter(cliente => 
    cliente.nombre.toLowerCase().includes(terminoLower) ||
    cliente.dni.includes(termino) ||
    cliente.email.toLowerCase().includes(terminoLower) ||
    cliente.telefono.includes(termino)
  );
};

export const getEstadisticasClientes = () => {
  const estados = ['PAGADO', 'AL_DIA', 'MORA', 'RESERVADO', 'POTENCIAL'];
  const estadisticas = {};
  
  estados.forEach(estado => {
    estadisticas[estado] = mockClientes.filter(c => c.estado_cuenta === estado).length;
  });
  
  return {
    ...estadisticas,
    total: mockClientes.length,
    con_lotes: mockClientes.filter(c => c.lote_id !== null).length,
    empresas: mockClientes.filter(c => c.fecha_nacimiento === null).length
  };
};
