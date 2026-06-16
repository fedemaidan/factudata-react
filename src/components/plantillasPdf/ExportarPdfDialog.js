import { useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Divider,
  CircularProgress,
  Box,
  Typography,
} from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { useExportarPdf } from './useExportarPdf';

/**
 * Diálogo de opciones para exportar a PDF. Mismas opciones que ExportarPdfMenu
 * (plantilla por defecto / plantillas propias / crear nueva) pero en un Dialog,
 * pensado para disparadores que viven fuera de un anchor MUI (ej. el menú
 * "Acciones" Tailwind de movementForm). Reusa el hook useExportarPdf.
 */
export default function ExportarPdfDialog({
  open,
  onClose,
  onExported,
  empresaId,
  empresaNombre = '',
  documentType,
  buildData,
  defaultDocumentLoader,
  fileName = 'documento',
  titulo = 'Exportar como PDF',
  onError,
}) {
  const router = useRouter();
  const { plantillas, loadingList, generating, cargarOpciones, exportar } = useExportarPdf({
    empresaId, empresaNombre, documentType, buildData, defaultDocumentLoader, fileName, onError,
  });

  useEffect(() => {
    if (open) cargarOpciones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Solo cerramos (y notificamos onExported) si la descarga se disparó; si falló,
  // el diálogo queda abierto para que el usuario vea el error y pueda reintentar.
  const handleExportar = async (plantilla) => {
    const ok = await exportar(plantilla);
    if (ok) {
      onExported?.();
      onClose?.();
    }
  };

  return (
    <Dialog open={open} onClose={generating ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 0.5 }}>{titulo}</DialogTitle>
      <DialogContent sx={{ px: 1, py: 0.5 }}>
        {loadingList ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 3 }}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">Cargando plantillas…</Typography>
          </Box>
        ) : (
          <List disablePadding>
            <ListItemButton disabled={generating} onClick={() => handleExportar(null)} sx={{ borderRadius: 1.5 }}>
              <ListItemIcon><DescriptionOutlinedIcon /></ListItemIcon>
              <ListItemText primary="Plantilla por defecto" secondary="Comprobante estándar" />
            </ListItemButton>

            {plantillas.length > 0 && (
              <ListSubheader sx={{ bgcolor: 'transparent', lineHeight: '30px', fontSize: '0.72rem', color: 'text.disabled' }}>
                Tus plantillas
              </ListSubheader>
            )}
            {plantillas.map((p) => (
              <ListItemButton key={p._id || p.id} disabled={generating} onClick={() => handleExportar(p)} sx={{ borderRadius: 1.5 }}>
                <ListItemIcon>
                  {p.es_principal ? <StarRoundedIcon sx={{ color: 'warning.main' }} /> : <DescriptionOutlinedIcon />}
                </ListItemIcon>
                <ListItemText primary={p.nombre || 'Sin nombre'} />
              </ListItemButton>
            ))}

            <Divider sx={{ my: 0.5 }} />
            <ListItemButton
              disabled={generating}
              onClick={() => { onClose?.(); router.push('/plantillas-pdf'); }}
              sx={{ borderRadius: 1.5, color: 'primary.main' }}
            >
              <ListItemIcon><AddRoundedIcon color="primary" /></ListItemIcon>
              <ListItemText primary="Crear plantilla personalizada" />
            </ListItemButton>
          </List>
        )}
        {generating && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">Generando PDF…</Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={generating}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
