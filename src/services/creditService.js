// src/services/creditService.js
// Aquí simulamos una función para obtener los créditos comprados por un usuario

export const getCreditsForUser = async (userId) => {
    // Aquí deberías hacer una llamada a la API para obtener los créditos del usuario
    return [
      { id: 1, amount: 10, date: '2021-12-01' },
      { id: 2, amount: 5, date: '2022-01-10' },
      // Agregar más datos simulados o reales
    ];
  };
  