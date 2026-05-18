let _pdfjs = null;

async function getPdfjs() {
  if (_pdfjs) return _pdfjs;
  const lib = await import('pdfjs-dist');
  lib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  _pdfjs = lib;
  return lib;
}

function fileToArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Lee un File PDF en el cliente y devuelve su cantidad de páginas.
 * Si falla por cualquier motivo (PDF corrupto, sin worker, etc.) devuelve 1
 * para no bloquear el flujo (peor caso: el toggle "una página por movimiento"
 * no aparece, pero el archivo se sigue procesando).
 */
export async function getPdfPageCount(file) {
  if (!file) return 1;
  try {
    const lib = await getPdfjs();
    const buffer = await fileToArrayBuffer(file);
    const pdf = await lib.getDocument({ data: buffer }).promise;
    const n = pdf.numPages;
    return Number.isInteger(n) && n > 0 ? n : 1;
  } catch (e) {
    console.warn('getPdfPageCount: fallback a 1 página', e);
    return 1;
  }
}
