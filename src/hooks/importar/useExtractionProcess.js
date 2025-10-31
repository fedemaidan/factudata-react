import { useState } from 'react';
import AcopioService from 'src/services/acopioService';
import { rotateImageFile } from 'src/utils/importar/imageRotation';
import { buildPreview } from 'src/utils/importar/tablePreview';
import { inferInitialMapping } from 'src/utils/importar/mapping';

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

      const resp = await AcopioService.extraerCompraInit(toSend, {
        rotationDegrees: rotation, guideYPercent: guideY, ...meta,
      });
      setProgreso(35);

      if (Array.isArray(resp?.materiales)) {
        setProgreso(100);
        const { cols, rows } = buildPreview(resp.materiales, 10);
        const mapping = inferInitialMapping(cols, rows, meta.tipoLista);
        onPreviewReady({ rawRows: resp.materiales, cols, rows, mapping });
        return;
      }

      if (typeof resp === 'string') {
        const taskId = resp; let intentos = 0; const max = 60;
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        while (true) {
          const r = await AcopioService.consultarEstadoExtraccion(taskId);
          const pct = 35 + Math.min(60, Math.floor((intentos / max) * 60));
          setProgreso(pct);

          if (r.status === 'completado' && Array.isArray(r.materiales)) {
            setProgreso(100);
            const { cols, rows } = buildPreview(r.materiales, 10);
            const mapping = inferInitialMapping(cols, rows, meta.tipoLista);
            onPreviewReady({ rawRows: r.materiales, cols, rows, mapping, urls: r.urls });
            return;
          }
          if (r.status === 'fallido') throw new Error(r.error || 'Extracción fallida');
          intentos += 1; await wait(5000);
        }
      }

      throw new Error('Respuesta inesperada del backend');
    } finally {
      setTimeout(() => { setCargando(false); setProgreso(0); }, 300);
    }
  };

  return { cargando, progreso, procesar };
}
