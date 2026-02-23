import { pdf } from '@react-pdf/renderer';
import { PresupuestoPdfDocument } from './PdfPresupuestoDocument';

const sanitizeFileName = (value) =>
  (value || 'presupuesto')
    .replace(/\s+/g, '_')
    .replace(/[^\w-]/g, '')
    .slice(0, 40);

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
};

export async function exportPresupuestoToPdfRenderer(presupuesto, { empresa } = {}) {
  if (!presupuesto) {
    throw new Error('Presupuesto inválido');
  }
  const rubros = presupuesto.rubros || [];
  if (!rubros.length) {
    throw new Error('El presupuesto no tiene rubros');
  }

  const fileName = `${sanitizeFileName(presupuesto.titulo)}_${sanitizeFileName(
    empresa?.nombre || presupuesto.empresa_nombre
  )}`;

  const doc = <PresupuestoPdfDocument presupuesto={presupuesto} empresa={empresa} />;
  const blob = await pdf(doc).toBlob();
  downloadBlob(blob, `${fileName || 'presupuesto'}.pdf`);
}
