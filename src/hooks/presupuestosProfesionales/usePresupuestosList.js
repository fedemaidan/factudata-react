import { useCallback, useEffect, useState } from 'react';
import PresupuestoProfesionalService from 'src/services/presupuestoProfesional/presupuestoProfesionalService';

const usePresupuestosList = ({
  empresaId,
  currentTab,
  ppPage,
  ppRowsPerPage,
  filtroEstado,
  filtroMoneda,
  filtroTitulo,
  showAlert,
}) => {
  const [presupuestos, setPresupuestos] = useState([]);
  const [presupuestosLoading, setPresupuestosLoading] = useState(false);
  const [totalPresupuestos, setTotalPresupuestos] = useState(0);

  const refreshPresupuestos = useCallback(async () => {
    if (!empresaId) return;

    setPresupuestosLoading(true);
    try {
      const filters = {
        empresa_id: empresaId,
        limit: ppRowsPerPage,
        // Backend usa paginacion 1-based; MUI TablePagination usa 0-based.
        page: ppPage + 1,
      };
      if (filtroEstado) filters.estado = filtroEstado;
      if (filtroMoneda) filters.moneda = filtroMoneda;
      if (filtroTitulo.trim()) filters.titulo = filtroTitulo.trim();

      const resp = await PresupuestoProfesionalService.listar(filters);
      setPresupuestos(resp.items || []);
      setTotalPresupuestos(resp.total || 0);
    } catch (err) {
      console.error('Error al listar presupuestos profesionales:', err);
      showAlert('Error al cargar presupuestos', 'error');
    } finally {
      setPresupuestosLoading(false);
    }
  }, [empresaId, filtroEstado, filtroMoneda, filtroTitulo, ppPage, ppRowsPerPage, showAlert]);

  useEffect(() => {
    if (currentTab !== 0) return;
    refreshPresupuestos();
  }, [currentTab, refreshPresupuestos]);

  return {
    presupuestos,
    presupuestosLoading,
    totalPresupuestos,
    refreshPresupuestos,
  };
};

export default usePresupuestosList;
