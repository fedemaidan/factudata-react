import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
  CircularProgress,
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import NotaPedidoPlantillaChatDialog from './NotaPedidoPlantillaChatDialog';
import { loadImageAsDataUrl } from 'src/utils/presupuestos/loadLogoForPdf';

/**
 * Modal para subir logo cuando falta y el usuario intentó descargar PDF.
 */
export function NotaPedidoLogoRequeridoDialog({ open, onClose, loading, onSaveAndDownload }) {
  const [file, setFile] = useState(null);

  const handleClose = useCallback(() => {
    setFile(null);
    onClose();
  }, [onClose]);

  const handleSave = async () => {
    if (!file) return;
    await onSaveAndDownload(file);
    setFile(null);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth aria-labelledby="logo-requerido-title">
      <DialogTitle id="logo-requerido-title">Falta el logo de tu empresa</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Subí el logo una vez (PNG o JPG). Se usará en todos los PDFs de notas de pedido.
          </Typography>
          <Button variant="outlined" component="label" size="small" disabled={loading} startIcon={<ImageOutlinedIcon />}>
            Elegir imagen
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </Button>
          {file && (
            <Typography variant="caption" color="text.secondary">
              {file.name}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button variant="contained" disabled={loading || !file} onClick={handleSave}>
          {loading ? <CircularProgress size={20} color="inherit" /> : 'Guardar y descargar PDF'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function NotaPedidoPdfTemplateDialog({
  open,
  onClose,
  baseTemplate,
  loading,
  onSaveLogo,
  empresaId,
  sampleNota,
  onPlantillaGuardada,
}) {
  const [logoFile, setLogoFile] = useState(null);
  const [openChat, setOpenChat] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState(null);

  const handleClose = useCallback(() => {
    setLogoFile(null);
    onClose();
  }, [onClose]);

  const handleGuardarLogo = async () => {
    if (!logoFile) return;
    await onSaveLogo(logoFile);
    setLogoFile(null);
  };

  const handleOpenChat = useCallback(async () => {
    const url = baseTemplate?.logo_url;
    if (url && !logoDataUrl) {
      const dataUrl = await loadImageAsDataUrl(url).catch(() => null);
      setLogoDataUrl(dataUrl);
    }
    setOpenChat(true);
  }, [baseTemplate?.logo_url, logoDataUrl]);

  const logoUrl = baseTemplate?.logo_url;

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Configuración PDF - Nota de pedido</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <Typography variant="body2" color="text.secondary">
              Logo de la empresa para los PDFs de notas de pedido. Subí una imagen y guardá.
            </Typography>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              {logoUrl ? (
                <Typography variant="body2" sx={{ color: 'success.main', mb: 1.5, fontWeight: 500 }}>
                  Logo actual guardado.
                </Typography>
              ) : (
                <Typography variant="body2" sx={{ color: 'warning.main', mb: 1.5, fontWeight: 500 }}>
                  Aún no hay logo configurado.
                </Typography>
              )}

              {logoUrl && (
                <Box
                  sx={{
                    mb: 1.5,
                    maxHeight: 76,
                    display: 'flex',
                    alignItems: 'center',
                    '& img': { maxHeight: 68, maxWidth: '100%', objectFit: 'contain' },
                  }}
                >
                  <img src={logoUrl} alt="Logo" />
                </Box>
              )}

              <Stack spacing={1.2}>
                <Button
                  variant="outlined"
                  component="label"
                  size="small"
                  disabled={loading}
                  startIcon={<ImageOutlinedIcon />}
                >
                  Elegir logo
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  />
                </Button>
                {logoFile && (
                  <Typography variant="caption" noWrap sx={{ maxWidth: 260 }}>
                    {logoFile.name}
                  </Typography>
                )}
                <Button
                  size="small"
                  variant="contained"
                  disabled={loading || !logoFile}
                  onClick={handleGuardarLogo}
                >
                  Guardar logo
                </Button>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderStyle: 'dashed' }}>
              <Stack spacing={1}>
                <Typography variant="body2" fontWeight={500}>
                  Plantillas personalizadas
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Diseñá una plantilla completamente personalizada con la ayuda de la IA.
                  Podés elegir colores, secciones, tipografía y más.
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AutoFixHighIcon />}
                  onClick={handleOpenChat}
                >
                  Crear plantilla con IA
                </Button>
              </Stack>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose}>Listo</Button>
        </DialogActions>
      </Dialog>

      <NotaPedidoPlantillaChatDialog
        open={openChat}
        onClose={() => setOpenChat(false)}
        empresaId={empresaId}
        logoDataUrl={logoDataUrl}
        sampleNota={sampleNota}
        onSaved={(template) => {
          setOpenChat(false);
          onPlantillaGuardada?.(template);
        }}
      />
    </>
  );
}

export default NotaPedidoPdfTemplateDialog;
