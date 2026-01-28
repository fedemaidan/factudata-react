import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Alert } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

/**
 * Visor de PDF simple usando iframe nativo del navegador
 * - Soporta Ctrl+F para buscar
 * - Zoom nativo del navegador
 * - Sin dependencias problemáticas
 */
export default function PdfViewer({ file, url, height = 500 }) {
  const [error, setError] = useState(false);

  // Crear URL del archivo
  const pdfUrl = useMemo(() => {
    if (file) {
      try {
        return URL.createObjectURL(file);
      } catch (e) {
        console.error('Error creando URL para PDF:', e);
        setError(true);
        return null;
      }
    }
    return url;
  }, [file, url]);

  // Cleanup URL al desmontar
  useEffect(() => {
    return () => {
      if (file && pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [file, pdfUrl]);

  if (error || !pdfUrl) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        No se pudo cargar el PDF. Usá el visor de la izquierda.
      </Alert>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tip de búsqueda */}
      <Box sx={{ 
        p: 1, 
        bgcolor: '#fff3e0', 
        borderRadius: 1, 
        mb: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        border: '1px solid #ffcc80'
      }}>
        <PictureAsPdfIcon color="warning" fontSize="small" />
        <Typography variant="caption">
          👆 <strong>Hacé click en el PDF</strong> y luego usá <strong>Cmd+F</strong> para buscar texto
        </Typography>
      </Box>

      {/* Iframe con el PDF */}
      <Box
        sx={{
          flex: 1,
          border: '1px solid #e0e0e0',
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: '#525659',
          minHeight: height
        }}
      >
        <iframe
          src={pdfUrl}
          title="Visor de PDF"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            minHeight: height
          }}
        />
      </Box>
    </Box>
  );
}
