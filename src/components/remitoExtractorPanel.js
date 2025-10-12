import React, { useRef } from 'react';
import { Paper, Stack, Typography, Button } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import UploadFileIcon from '@mui/icons-material/UploadFile';

export default function RemitoExtractorPanel({
  acopioId,
  tipoAcopio = 'materiales', // o 'lista_precios'
  archivoRemitoFile,
  setArchivoRemitoFile,
  archivoRemitoUrl,
  setArchivoRemitoUrl,
  onExtract, // (materiales) => void
  loading = false,
}) {
  const fileRef = useRef(null);
  const pick = () => fileRef.current?.click();

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setArchivoRemitoFile?.(f);
    setArchivoRemitoUrl?.(URL.createObjectURL(f));
  };

  return (
    <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
      <Typography variant="h6" gutterBottom>
        Extraer materiales del archivo
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Subí una imagen o PDF del remito y vamos a leer las líneas de materiales automáticamente.
      </Typography>

      <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 2, flexWrap: 'wrap' }}>
        <input type="file" accept="image/*,application/pdf" hidden ref={fileRef} onChange={handleFile} />
        <Button startIcon={<UploadFileIcon />} variant="outlined" onClick={pick}>
          {archivoRemitoUrl ? 'Cambiar archivo' : 'Subir archivo'}
        </Button>
        <Button
          variant="contained"
          onClick={onExtract}
          disabled={loading || (!archivoRemitoFile && !archivoRemitoUrl)}
        >
          {loading ? <CircularProgress size={20} /> : 'Extraer ahora'}
        </Button>
      </Stack>

      {tipoAcopio === 'lista_precios' && (
        <Typography variant="caption" sx={{ display: 'block', opacity: 0.8 }}>
          * Este acopio es de tipo lista de precios: vamos a extraer sin catálogos cargados. Luego podrás ajustar precios por instrucciones.
        </Typography>
      )}
    </Paper>
  );
}
