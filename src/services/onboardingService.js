import { crearEmpresa } from './empresaService';
import { crearProyecto } from './proyectosService';
import profileService from './profileService';


const categoriasConstructora = [
    {
        name: "Mano de obra",
        subcategorias: [
            "Tareas preliminares",
            "Estructura",
            "Albañilería",
            "Instalaciones sanitarios",
            "Instalaciones eléctricas",
            "Instalaciones de gas",
            "Cielorrasos",
            "Colocaciones",
            "Pintura",
            "Climatización",
            "Aire acondicionado",
            "Pileta",
            "Riego",
            "Paisajismo",
            "Limpieza",
        ]
    },
    {
        name: "Materiales",
        subcategorias: [
            "Aberturas",
            "Baño químico",
            "Corralon",
            "Durlock",
            "Ferretería",
            "Grillo Mov Suelos",
            "Hierros",
            "Hormigón",
            "Maderera",
            "Materiales Eléctricos",
            "Piedra",
            "Pileta",
            "Pintureria",
            "Sanitarios",
            "Volquetes",
            "Zingueria",
        ]
    },
    {
        name: "Administración",
        subcategorias: [
            "Sueldos",
            "Honorarios",
            "Alquiler oficina",
            "Sistema gestión",
            "Fotografía",
            "Renders",
            "Expensas"
        ]
    }
]

/**
 * Realiza el proceso de onboarding creando la empresa y sus proyectos asociados.
 * @param {object} formData - Los datos del formulario de onboarding.
 * @returns {Promise<object|null>} - Retorna un objeto con los detalles de la empresa creada o null si falla.
 */
export const handleOnboarding = async (formData, profileId) => {
  try {
    console.log(categoriasConstructora[0])
    formData =  {
        tipo: "Constructora",
        acciones: [],
        conf_fecha: "HOY",
        camposObligatorios: [
            "proyecto",
            "categoria",
            "total"
        ],
        categorias: [].concat(categoriasConstructora),
        ...formData,
    }
    console.log(formData)
    // Crear la empresa primero
    const nuevaEmpresa = await crearEmpresa(formData);
    if (!nuevaEmpresa) {
      console.error('Error al crear la empresa');
      return null;
    }

    // Usar el ID de la empresa recién creada para asociar los proyectos
    const empresaId = nuevaEmpresa.id;
    nuevaEmpresa.proyectosIds = nuevaEmpresa.proyectosIds ?? [];
    for (const proyecto of formData.proyectos) {
      const nuevoProyecto = await crearProyecto({ nombre: proyecto }, empresaId);
      nuevaEmpresa.proyectosIds.push(nuevoProyecto.id)
    }

    // Actualizar el perfil del usuario con la nueva empresa y proyectos
    const profileUpdated = await profileService.updateProfileWithEmpresa(profileId, empresaId, nuevaEmpresa.proyectosIds);
    if (!profileUpdated) {
        console.error('Error al actualizar el perfil del usuario');
        return null;
    }
    
    return nuevaEmpresa;
  } catch (err) {
    console.error('Error en el proceso de onboarding:', err);
    return null;
  }
};
