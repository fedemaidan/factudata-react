import { useCallback, useEffect, useState } from 'react';
import PresupuestoProfesionalService from 'src/services/presupuestoProfesional/presupuestoProfesionalService';

const usePlantillasList = ({ empresaId, currentTab, showAlert }) => {
  const [plantillas, setPlantillas] = useState([]);
  const [plantillasLoading, setPlantillasLoading] = useState(false);

  const refreshPlantillas = useCallback(async () => {
    if (!empresaId) return;

    setPlantillasLoading(true);
    try {
      const items = await PresupuestoProfesionalService.listarPlantillas(empresaId, false);
      setPlantillas(items);
    } catch (err) {
      console.error('Error al listar plantillas:', err);
      showAlert('Error al cargar plantillas', 'error');
    } finally {
      setPlantillasLoading(false);
    }
  }, [empresaId, showAlert]);

  useEffect(() => {
    if (!empresaId) return;
    refreshPlantillas();
  }, [empresaId, refreshPlantillas]);

  useEffect(() => {
    if (currentTab !== 1) return;
    refreshPlantillas();
  }, [currentTab, refreshPlantillas]);

  return {
    plantillas,
    plantillasLoading,
    refreshPlantillas,
  };
};

export default usePlantillasList;
