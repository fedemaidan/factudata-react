import { useState } from 'react';
import pdfPlantillaService from 'src/services/pdfPlantillaService';
import empresaLogoService from 'src/services/empresaLogoService';
import { loadCustomComponentById } from 'src/utils/plantillasPdf/loadCustomComponent';
import { renderPlantillaToPdf } from 'src/utils/plantillasPdf/exportPlantillaToPdf';
import { loadImageAsDataUrl } from 'src/utils/presupuestos/loadLogoForPdf';

/**
 * Lógica compartida de export a PDF para los distintos disparadores
 * (ExportarPdfMenu en los drawers, ExportarPdfDialog en movementForm, …).
 *
 * - cargarOpciones(): trae plantillas (por document_type) + logos de la empresa.
 * - exportar(plantilla|null): arma los datos (buildData puede ser async), resuelve
 *   el componente (default vs custom), carga el logo y dispara la descarga.
 *
 * `buildData` se `await`-ea: soporta builders sync (control_presupuesto) y async
 * (comprobante de movimiento, que carga la imagen adjunta).
 */
export function useExportarPdf({
  empresaId,
  empresaNombre = '',
  documentType,
  buildData,
  defaultDocumentLoader,
  fileName = 'documento',
  onError,
}) {
  const [loadingList, setLoadingList] = useState(false);
  const [plantillas, setPlantillas] = useState([]);
  const [logos, setLogos] = useState([]);
  const [generating, setGenerating] = useState(false);

  const cargarOpciones = async () => {
    setLoadingList(true);
    try {
      const [pls, lgs] = await Promise.all([
        pdfPlantillaService.listar(empresaId, documentType),
        empresaLogoService.listar(empresaId),
      ]);
      const ordenadas = [...(pls || [])].sort(
        (a, b) => (b.es_principal ? 1 : 0) - (a.es_principal ? 1 : 0)
      );
      setPlantillas(ordenadas);
      setLogos(lgs || []);
    } catch (err) {
      console.error('useExportarPdf cargarOpciones', err);
    } finally {
      setLoadingList(false);
    }
  };

  const resolverLogo = async (logoId, logosList) => {
    let logo = null;
    if (logoId) logo = logosList.find((l) => (l._id || l.id) === logoId);
    if (!logo) logo = logosList[0];
    if (!logo?.url) return null;
    return loadImageAsDataUrl(logo.url);
  };

  const exportar = async (plantilla) => {
    setGenerating(true);
    try {
      const data = await (typeof buildData === 'function' ? buildData() : buildData);
      let Component;
      let logoId = null;
      if (plantilla) {
        const loaded = await loadCustomComponentById(plantilla._id || plantilla.id);
        Component = loaded.Component;
        logoId = plantilla.logo_id || null;
      } else {
        Component = await defaultDocumentLoader();
      }
      const logoDataUrl = await resolverLogo(logoId, logos);
      await renderPlantillaToPdf({ Component, data, logoDataUrl, empresaNombre, fileName });
    } catch (err) {
      console.error('useExportarPdf exportar', err);
      if (onError) onError('No se pudo generar el PDF. Intentá de nuevo.');
    } finally {
      setGenerating(false);
    }
  };

  return { plantillas, logos, loadingList, generating, cargarOpciones, exportar };
}

export default useExportarPdf;
