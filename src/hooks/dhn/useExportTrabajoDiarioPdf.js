import { useState, useCallback } from 'react';
import TrabajoRegistradoService from 'src/services/dhn/TrabajoRegistradoService';
import exportTrabajoDiarioToPdfRenderer from 'src/utils/dhn/exportTrabajoDiarioToPdfRenderer';

/**
 * Hook reutilizable para exportar trabajo diario a PDF.
 * Soporta items completos (uso directo) o items con referencia trabajoDiarioRegistrado (fetch).
 *
 * @param {Object} options
 * @param {(item) => Promise<Object>} [options.getTrabajoForItem] - Resolver para obtener el trabajo.
 *   Si no se pasa, se usa el item directamente. Para conciliación: (item) => TrabajoRegistradoService.getRegistroById(item.trabajoDiarioRegistrado).
 * @param {(message: string) => void} [options.onError] - Callback en error.
 * @param {() => void} [options.onSuccess] - Callback en éxito.
 * @returns {{ handleExportPdf: (item) => Promise<void>, exportingRowId: string|null }}
 */
export function useExportTrabajoDiarioPdf(options = {}) {
  const { getTrabajoForItem, onError, onSuccess } = options;
  const [exportingRowId, setExportingRowId] = useState(null);

  const handleExportPdf = useCallback(
    async (item) => {
      const rowId = item?._id ?? item?.id;
      if (!rowId) return;

      setExportingRowId(rowId);
      try {
        let trabajo = item;
        if (typeof getTrabajoForItem === 'function') {
          const resolved = await getTrabajoForItem(item);
          trabajo = resolved?.data ?? resolved;
        }
        if (!trabajo) {
          throw new Error('No hay trabajo diario registrado vinculado');
        }
        await exportTrabajoDiarioToPdfRenderer(trabajo);
        onSuccess?.();
      } catch (error) {
        console.error('Error exportando comprobantes', error);
        onError?.(error?.message || 'Error al exportar el PDF');
      } finally {
        setExportingRowId(null);
      }
    },
    [getTrabajoForItem, onError, onSuccess]
  );

  return { handleExportPdf, exportingRowId };
}

export const getTrabajoFromConciliacionRow = (item) => {
  const id = item?.trabajoDiarioRegistrado;
  if (!id) return Promise.resolve(null);
  return TrabajoRegistradoService.getRegistroById(id);
};
