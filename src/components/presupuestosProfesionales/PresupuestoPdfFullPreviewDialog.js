import React, { useMemo, memo } from 'react';
import dynamic from 'next/dynamic';
import {
  AppBar,
  Box,
  Dialog,
  IconButton,
  Toolbar,
  Typography,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const PresupuestoPdfPreviewInner = dynamic(
  () => import('./PresupuestoPdfPreviewInner'),
  { ssr: false, loading: () => <CircularProgress sx={{ m: 'auto', display: 'block', mt: 4 }} /> }
);

const PresupuestoPdfFullPreviewDialog = memo(function PresupuestoPdfFullPreviewDialog({
  open,
  onClose,
  loading = false,
  presupuesto,
  empresa,
  logoDataUrl,
  costoM2Data,
  incluirTotalesM2 = true,
}) {
  const canRender = Boolean(!loading && presupuesto);

  const docKey = useMemo(() => {
    if (!presupuesto) return 'empty';
    try {
      return JSON.stringify({
        t: presupuesto.titulo,
        f: presupuesto.fecha,
        n: presupuesto.total_neto,
        r: presupuesto.rubros?.length,
        lg: !!logoDataUrl,
        m2: incluirTotalesM2,
        esc: presupuesto.logo_pdf_escala,
      });
    } catch {
      return String(Date.now());
    }
  }, [presupuesto, logoDataUrl, incluirTotalesM2]);

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      aria-labelledby="presupuesto-pdf-preview-title"
      sx={{ zIndex: (theme) => theme.zIndex.modal + 10 }}
    >
      <AppBar position="sticky" color="default" elevation={1} sx={{ bgcolor: 'background.paper' }}>
        <Toolbar variant="dense">
          <IconButton edge="start" color="inherit" onClick={onClose} aria-label="Cerrar" disabled={loading}>
            <CloseIcon />
          </IconButton>
          <Typography id="presupuesto-pdf-preview-title" variant="subtitle1" component="div" sx={{ flex: 1, ml: 1 }}>
            Vista previa del PDF
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
            Mismo documento que al descargar
          </Typography>
        </Toolbar>
      </AppBar>
      <Box
        sx={{
          flex: 1,
          height: 'calc(100vh - 48px)',
          width: '100%',
          bgcolor: 'grey.200',
          position: 'relative',
        }}
      >
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
              bgcolor: 'rgba(255,255,255,0.72)',
            }}
          >
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
              Generando vista previa…
            </Typography>
          </Box>
        )}
        {canRender ? (
          <Box sx={{ height: '100%', width: '100%' }} key={docKey}>
            <PresupuestoPdfPreviewInner
              presupuesto={presupuesto}
              empresa={empresa}
              logoDataUrl={logoDataUrl}
              costoM2Data={costoM2Data}
              incluirTotalesM2={incluirTotalesM2}
            />
          </Box>
        ) : null}
      </Box>
    </Dialog>
  );
});

export default PresupuestoPdfFullPreviewDialog;
