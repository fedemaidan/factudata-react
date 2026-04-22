import React, { useMemo } from 'react';
import { usePDF } from '@react-pdf/renderer';
import { Box, Typography } from '@mui/material';
import { NotaPedidoPdfDocument } from 'src/utils/notaPedido/PdfNotaPedidoDocument';

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

  if (instance.loading) {
    return (
      <Box sx={{ width: '100%', height: '100%', bgcolor: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="caption" color="text.secondary">Cargando plantilla base…</Typography>
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
      title="Plantilla base"
    />
  );
};

export default React.memo(NotaPedidoPdfBasePreviewInner);
