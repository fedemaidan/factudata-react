import React, { useEffect, useMemo, useState } from 'react';
import { usePDF } from '@react-pdf/renderer';
import { Box, Typography } from '@mui/material';

let _pdfjs = null;

async function getPdfjs() {
  if (_pdfjs) return _pdfjs;
  const lib = await import('pdfjs-dist');
  lib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  _pdfjs = lib;
  return lib;
}

async function pdfUrlToImageSrc(url) {
  const lib = await getPdfjs();
  const pdf = await lib.getDocument(url).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
  return canvas.toDataURL('image/jpeg', 0.92);
}

const NotaPedidoPdfPreviewInner = ({ PlantillaPDF, nota, logoDataUrl, empresaNombre, onImageReady }) => {
  const doc = useMemo(
    () => <PlantillaPDF nota={nota} logoDataUrl={logoDataUrl} empresaNombre={empresaNombre} />,
    [PlantillaPDF, nota, logoDataUrl, empresaNombre]
  );

  const [instance] = usePDF({ document: doc });
  const [imgSrc, setImgSrc] = useState(null);
  const [rendering, setRendering] = useState(false);

  const errorMessage = instance.error
    ? (typeof instance.error === 'string' ? instance.error : instance.error?.message || String(instance.error))
    : null;

  useEffect(() => {
    if (!instance.url) return;
    let cancelled = false;
    setRendering(true);
    setImgSrc(null);
    pdfUrlToImageSrc(instance.url)
      .then((src) => {
        if (!cancelled) {
          setImgSrc(src);
          setRendering(false);
          onImageReady?.(src);
        }
      })
      .catch(() => { if (!cancelled) setRendering(false); });
    return () => { cancelled = true; };
  }, [instance.url]);

  if (instance.loading || rendering) {
    return (
      <Box sx={{ width: '100%', height: '100%', bgcolor: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="caption" color="text.secondary">Generando vista previa…</Typography>
      </Box>
    );
  }

  if (errorMessage) {
    console.error('[PdfPreview] Error al renderizar PDF:', instance.error);
    return (
      <Box sx={{ p: 3, m: 2, border: '1px solid', borderColor: 'error.light', borderRadius: 2, bgcolor: 'rgba(211,47,47,0.04)' }}>
        <Typography variant="caption" fontWeight={600} color="error.main" display="block" gutterBottom>
          Error al renderizar el PDF
        </Typography>
        <Typography variant="caption" color="error.main" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {errorMessage}
        </Typography>
      </Box>
    );
  }

  if (!imgSrc) return null;

  return (
    <Box sx={{ width: '100%', height: '100%', overflow: 'auto', bgcolor: '#e0e0e0', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', py: 2, px: 2 }}>
      <Box
        component="img"
        src={imgSrc}
        alt="Vista previa"
        sx={{ width: '100%', maxWidth: 560, boxShadow: 6, display: 'block', borderRadius: 0.5 }}
      />
    </Box>
  );
};

export default React.memo(NotaPedidoPdfPreviewInner);
