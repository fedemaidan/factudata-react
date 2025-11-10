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

mockClientes[1] = { 
  id: 2, 
  nombre: 'Ana', 
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
};

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