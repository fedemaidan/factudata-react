import React, { useMemo } from 'react';
import { usePDF } from '@react-pdf/renderer';
import { Box, Typography } from '@mui/material';

const NotaPedidoPdfPreviewInner = ({ PlantillaPDF, nota, logoDataUrl, empresaNombre }) => {
  const document = useMemo(
    () => <PlantillaPDF nota={nota} logoDataUrl={logoDataUrl} empresaNombre={empresaNombre} />,
    [PlantillaPDF, nota, logoDataUrl, empresaNombre]
  );

  const [instance] = usePDF({ document });

  const errorMessage = instance.error
    ? (typeof instance.error === 'string' ? instance.error : instance.error?.message || String(instance.error))
    : null;

  console.log('[PdfPreview] usePDF state →', {
    loading: instance.loading,
    error: errorMessage,
    hasUrl: !!instance.url,
  });

  if (instance.loading) {
    return (
      <Box sx={{ width: '100%', height: '100%', bgcolor: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="caption" color="text.secondary">Generando PDF…</Typography>
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

  if (!instance.url) return null;

  return (
    <iframe
      src={instance.url}
      width="100%"
      height="100%"
      style={{ border: 'none', display: 'block' }}
      title="Vista previa PDF"
    />
  );
};

export default React.memo(NotaPedidoPdfPreviewInner);
