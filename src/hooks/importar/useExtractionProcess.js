import { useState } from 'react';
import AcopioService from 'src/services/acopioService';
import { rotateImageFile } from 'src/utils/importar/imageRotation';
import { buildPreview } from 'src/utils/importar/tablePreview';
import { inferInitialMapping } from 'src/utils/importar/mapping';

// Limpia campos internos del backend que no deben ir al DataGrid
const limpiarMateriales = (materiales) => {
  if (!Array.isArray(materiales)) return materiales;
  return materiales.map(mat => {
    const { 
      _verificacion, 
      _extraccion_inicial, 
      _requiere_confirmacion_usuario, 
      materiales_requieren_input, 
      resumen_verificacion,
      ...limpio 
    } = mat;
    return limpio;
  });
};

export default function useExtractionProcess() {
  const [cargando, setCargando] = useState(false);
  const [progreso, setProgreso] = useState(0);

  const procesar = async ({
    archivo, rotation, guideY, meta, onPreviewReady,
  }) => {
    if (!archivo) return;

    try {
      setCargando(true); setProgreso(0);
      let toSend = archivo;

      if (archivo.type.startsWith('image/')) {
        setProgreso(10);
        toSend = (Math.abs(rotation) > 0.01) ? await rotateImageFile(archivo, rotation) : archivo;
        setProgreso(25);
      } else { setProgreso(15); }

      const resp = await AcopioService.extraerCompraInit(toSend, meta);
      setProgreso(35);

      if (Array.isArray(resp?.materiales)) {
        setProgreso(100);
        // Pasar materiales SIN limpiar para que crearAcopio pueda verificar discrepancias
        // La limpieza se hace en crearAcopio DESPUÉS de procesar discrepancias
        const { cols, rows } = buildPreview(resp.materiales, 10);
        const mapping = inferInitialMapping(cols, rows, meta.tipoLista);
        onPreviewReady({ 
          rawRows: resp.materiales, 
          cols, 
          rows, 
          mapping,
          tieneDiscrepancias: resp.tieneDiscrepancias || false
        });
        return;
      }

      if (typeof resp === 'string') {
        const taskId = resp; let intentos = 0; const max = 360; // 30 minutos (360 × 5s)
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        while (intentos < max) {
          const r = await AcopioService.consultarEstadoExtraccion(taskId);
          const pct = 35 + Math.min(60, Math.floor((intentos / max) * 60));
          setProgreso(pct);

          if (r.status === 'completado' && Array.isArray(r.materiales)) {
            setProgreso(100);
            // Pasar materiales SIN limpiar para que crearAcopio pueda verificar discrepancias
            const { cols, rows } = buildPreview(r.materiales, 10);
            const mapping = inferInitialMapping(cols, rows, meta.tipoLista);
            onPreviewReady({ 
              rawRows: r.materiales, 
              cols, 
              rows, 
              mapping, 
              urls: r.urls,
              tieneDiscrepancias: r.tieneDiscrepancias || false
            });
            return;
          }
          if (r.status === 'fallido') throw new Error(r.error || 'Extracción fallida');
          intentos += 1; await wait(5000);
        }
        throw new Error('Tiempo de espera agotado. La extracción está tardando demasiado.');
      }

      throw new Error('Respuesta inesperada del backend');
    } finally {
      setTimeout(() => { setCargando(false); setProgreso(0); }, 300);
    }
  };

  return { cargando, progreso, procesar };
}
