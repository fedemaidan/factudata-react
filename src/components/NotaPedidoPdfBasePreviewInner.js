import React, { useEffect, useMemo, useState } from 'react';
import { usePDF } from '@react-pdf/renderer';
import { Box, Typography } from '@mui/material';
import { NotaPedidoPdfDocument } from 'src/utils/notaPedido/PdfNotaPedidoDocument';

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

const NotaPedidoPdfBasePreviewInner = ({ nota, logoDataUrl, empresaNombre }) => {
  const doc = useMemo(
    () => (
      <NotaPedidoPdfDocument
        nota={nota}
        layout={{}}
        logoDataUrl={logoDataUrl}
        empresaNombre={empresaNombre || ''}
      />
    ),
    [nota, logoDataUrl, empresaNombre]
  );

  const [instance] = usePDF({ document: doc });
  const [imgSrc, setImgSrc] = useState(null);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    if (!instance.url) return;
    let cancelled = false;
    setRendering(true);
    setImgSrc(null);
    pdfUrlToImageSrc(instance.url)
      .then((src) => { if (!cancelled) { setImgSrc(src); setRendering(false); } })
      .catch(() => { if (!cancelled) setRendering(false); });
    return () => { cancelled = true; };
  }, [instance.url]);

  if (instance.loading || rendering) {
    return (
      <Box sx={{ width: '100%', height: '100%', bgcolor: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="caption" color="text.secondary">Cargando plantilla base…</Typography>
      </Box>
    );
  }

  if (!imgSrc) return null;

  return (
    <Box sx={{ width: '100%', height: '100%', overflow: 'auto', bgcolor: '#e0e0e0', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', py: 2, px: 2 }}>
      <Box
        component="img"
        src={imgSrc}
        alt="Plantilla base"
        sx={{ width: '100%', maxWidth: 560, boxShadow: 6, display: 'block', borderRadius: 0.5 }}
      />
    </Box>
  );
};

export default React.memo(NotaPedidoPdfBasePreviewInner);
