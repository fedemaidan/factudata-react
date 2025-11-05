// src/data/loteParaTodos/mockClientes.js - Generación automática de clientes

// Arrays de opciones para generar combinaciones
const nombres = [
  'Roberto', 'Ana', 'Pedro', 'Laura', 'Carlos', 'Mónica', 'Diego', 'Estela', 'Martín', 'Carmen',
  'José', 'María', 'Juan', 'Patricia', 'Luis', 'Andrea', 'Miguel', 'Claudia', 'Fernando', 'Silvia',
  'Alejandro', 'Gabriela', 'Ricardo', 'Valeria', 'Daniel', 'Mariana', 'Sergio', 'Natalia', 'Eduardo', 'Florencia',
  'Gustavo', 'Romina', 'Pablo', 'Cecilia', 'Hernán', 'Soledad', 'Maximiliano', 'Lucía', 'Nicolás', 'Agustina',
  'Santiago', 'Victoria', 'Matías', 'Camila', 'Sebastián', 'Antonela', 'Ignacio', 'Micaela', 'Franco', 'Julieta'
];

const apellidos = [
  'García', 'Rodríguez', 'Martínez', 'Fernández', 'Silva', 'González', 'Herrera', 'Morales', 'Torres', 'Sánchez',
  'Pérez', 'López', 'Díaz', 'Romero', 'Ruiz', 'Vargas', 'Castro', 'Ramos', 'Ortega', 'Delgado',
  'Jiménez', 'Flores', 'Vega', 'Mendoza', 'Aguilar', 'Medina', 'Guerrero', 'Cortés', 'Campos', 'Reyes',
  'Cruz', 'Ramírez', 'Molina', 'Gutiérrez', 'Contreras', 'Herrera', 'Núñez', 'Castillo', 'Espinoza', 'Vásquez',
  'Moreno', 'Figueroa', 'Paredes', 'Cabrera', 'Salazar', 'Vera', 'Rojas', 'Acosta', 'Benítez', 'Valdez'
];

const ocupaciones = [
  'Ingeniero Civil', 'Contadora Pública', 'Empresario', 'Médica', 'Comerciante', 'Arquitecta', 'Abogado', 'Profesora',
  'Vendedor', 'Empleado Bancario', 'Desarrollador', 'Diseñador Gráfico', 'Psicólogo', 'Nutricionista', 'Farmacéutico',
  'Electricista', 'Plomero', 'Mecánico', 'Chef', 'Periodista', 'Fotógrafo', 'Músico', 'Artista', 'Escritor',
  'Consultor', 'Analista', 'Técnico', 'Operario', 'Supervisor', 'Gerente', 'Director', 'Coordinador'
];

const localidades = [
  'La Matanza', 'Morón', 'Hurlingham', 'Cañuelas', 'Tigre', 'Ezeiza', 'Avellaneda', 'San Isidro', 'Quilmes',
  'Lomas de Zamora', 'Lanús', 'Banfield', 'Temperley', 'Adrogué', 'Burzaco', 'Florencio Varela', 'Berazategui',
  'Almirante Brown', 'Esteban Echeverría', 'Merlo', 'Moreno', 'José C. Paz', 'Malvinas Argentinas', 'San Miguel'
];

const calles = [
  'Av. San Martín', 'Belgrano', 'Rivadavia', 'Mitre', 'San Lorenzo', 'Las Flores', 'Sarmiento', 'Av. Libertador',
  'Av. del Trabajo', 'Parque Industrial', 'Ruta 3', 'Ruta 21', 'Ruta 205', 'Av. Norte', 'Calle 45'
];

const estadosCiviles = ['Soltero', 'Casado', 'Divorciado', 'Viudo', 'Separado'];

const dominiosEmail = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'email.com'];

// Función para generar número aleatorio entre min y max
const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Función para seleccionar elemento aleatorio de array
const randomChoice = (arr) => arr[random(0, arr.length - 1)];

// Función para generar fecha aleatoria
const randomDate = (start, end) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const randomTime = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime());
  return new Date(randomTime).toISOString().slice(0, 10);
};

// Generación automática de 100 clientes
const generarClientes = () => {
  const clientes = [];
  
  for (let i = 1; i <= 100; i++) {
    const nombre = randomChoice(nombres);
    const apellido = randomChoice(apellidos);
    const localidad = randomChoice(localidades);
    const calle = randomChoice(calles);
    const ocupacion = randomChoice(ocupaciones);
    const estadoCivil = randomChoice(estadosCiviles);
    const dominio = randomChoice(dominiosEmail);
    
    const cliente = {
      id: i,
      nombre: nombre,
      apellido: apellido,
      dni: `${random(20000000, 45000000)}`,
      telefono: `11-${random(4000, 6999)}-${random(1000, 9999)}`,
      email: `${nombre.toLowerCase()}.${apellido.toLowerCase()}@${dominio}`,
      direccion: `${calle} ${random(100, 9999)}, ${localidad}`,
      localidad: localidad,
      codigo_postal: `${random(1600, 1900)}`,
      fecha_nacimiento: randomDate('1960-01-01', '2000-12-31'),
      estado_civil: estadoCivil,
      ocupacion: ocupacion,
      activo: random(1, 100) > 5, // 95% activos
      fecha_registro: randomDate('2020-01-01', '2024-11-01'),
      observaciones: i <= 20 ? 'Cliente generado automáticamente - datos de prueba' : null
    };
    
    clientes.push(cliente);
  }
  
  return clientes;
};

export const mockClientes = generarClientes();

// Mantener algunos clientes específicos para casos de prueba al inicio
mockClientes[0] = { 
  id: 1, 
  nombre: 'Roberto', 
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
};
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
    apellido: 'Herrera',
    dni: '28887766', 
    telefono: '11-5123-4567', 
    email: 'diego.herrera@gmail.com',
    direccion: 'San Lorenzo 1234, Tigre',
    localidad: 'Tigre',
    codigo_postal: '1648',
    fecha_nacimiento: '1973-01-14',
    estado_civil: 'Casado',
    ocupacion: 'Abogado',
    activo: true,
    fecha_registro: '2022-12-01',
    observaciones: 'Abogado, compró lote premium'
  },
  { 
    id: 8, 
    nombre: 'Estela Morales', 
    apellido: 'Morales',
    dni: '31112233', 
    telefono: '11-5777-1122', 
    email: 'estela.morales@gmail.com',
    direccion: 'Rivadavia 567, Ezeiza',
    localidad: 'Ezeiza',
    codigo_postal: '1802',
    fecha_nacimiento: '1979-08-30',
    estado_civil: 'Viuda',
    ocupacion: 'Profesora',
    activo: true,
    fecha_registro: '2023-09-10',
    observaciones: 'Profesora, plan de financiación mixto'
  },
  { 
    id: 9, 
    nombre: 'Tecnológica SRL', 
    apellido: '',
    dni: '30998877665', 
    telefono: '11-5443-0098', 
    email: 'info@tecnologica.com.ar',
    direccion: 'Parque Industrial Sur, Ezeiza',
    localidad: 'Ezeiza',
    codigo_postal: '1802',
    fecha_nacimiento: null,
    estado_civil: null,
    ocupacion: 'Empresa Tecnológica',
    activo: true,
    fecha_registro: '2024-03-01',
    observaciones: 'Empresa tecnológica con contrato en mora'
  },
  { 
    id: 10, 
    nombre: 'Constructora Horizonte SA', 
    apellido: '',
    dni: '30987654321', 
    telefono: '11-5500-0099', 
    email: 'ventas@horizonte.com',
    direccion: 'Av. del Trabajo 4500, Zona Industrial',
    localidad: 'Avellaneda',
    codigo_postal: '1870',
    fecha_nacimiento: null,
    estado_civil: null,
    ocupacion: 'Constructora',
    activo: true,
    fecha_registro: '2024-02-15',
    observaciones: 'Constructora interesada en múltiples lotes'
  },
  { 
    id: 11, 
    nombre: 'Familia Rossi', 
    apellido: 'Rossi',
    dni: '34567890', 
    telefono: '11-6123-4567', 
    email: 'familia.rossi@gmail.com',
    direccion: 'Las Flores 890, Morón',
    localidad: 'Morón',
    codigo_postal: '1708',
    fecha_nacimiento: '1988-04-12',
    estado_civil: 'Casado',
    ocupacion: 'Empleado Bancario',
    activo: true,
    fecha_registro: '2024-03-25',
    observaciones: 'Familia con reserva activa'
  },
  { 
    id: 12, 
    nombre: 'Inversiones del Norte', 
    apellido: '',
    dni: '30445566778', 
    telefono: '11-7890-1234', 
    email: 'contacto@inversionesdelnorte.com',
    direccion: 'Av. Norte 1800, San Isidro',
    localidad: 'San Isidro',
    codigo_postal: '1642',
    fecha_nacimiento: null,
    estado_civil: null,
    ocupacion: 'Empresa de Inversiones',
    activo: true,
    fecha_registro: '2024-03-15',
    observaciones: 'Empresa inversora con múltiples reservas'
  },
  { 
    id: 13, 
    nombre: 'Martín Torres', 
    apellido: 'Torres',
    dni: '32554433', 
    telefono: '11-6789-0123', 
    email: 'martin.torres@gmail.com',
    direccion: 'Sarmiento 345, Quilmes',
    localidad: 'Quilmes',
    codigo_postal: '1878',
    fecha_nacimiento: '1985-11-22',
    estado_civil: 'Soltero',
    ocupacion: 'Vendedor',
    activo: false,
    fecha_registro: '2023-06-05',
    observaciones: 'Cliente con contrato caído por falta de pago'
  }
];

// Funciones de utilidad básicas
export const getClienteById = (id) => {
  return mockClientes.find(cliente => cliente.id === id);
};

export const buscarClientes = (termino) => {
  const terminoLower = termino.toLowerCase();
  return mockClientes.filter(cliente => 
    cliente.nombre.toLowerCase().includes(terminoLower) ||
    cliente.apellido.toLowerCase().includes(terminoLower) ||
    cliente.dni.includes(termino) ||
    cliente.email.toLowerCase().includes(terminoLower) ||
    cliente.telefono.includes(termino)
  );
};