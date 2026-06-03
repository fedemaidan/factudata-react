import { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Divider,
  CircularProgress,
  Box,
  Typography,
  Tooltip,
} from '@mui/material';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { useExportarPdf } from './useExportarPdf';

/**
 * Botón "PDF" reutilizable (Chip + menú chico) para exportar a PDF.
 *
 * - Siempre ofrece la **plantilla por defecto** (libre para todos).
 * - Lista las plantillas personalizadas de la empresa para el `documentType` (la
 *   principal primero, marcada con ⭐).
 * - Ofrece "Crear plantilla personalizada" que redirige a /plantillas-pdf.
 *
 * La lógica (listar + render) vive en el hook useExportarPdf, compartido con
 * ExportarPdfDialog. Genérico por `documentType`.
 */
export default function ExportarPdfMenu({
  empresaId,
  empresaNombre = '',
  documentType = 'control_presupuesto',
  buildData,
  defaultDocumentLoader,
  fileName = 'documento',
  disabled = false,
  onError,
}) {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const { plantillas, loadingList, generating, cargarOpciones, exportar } = useExportarPdf({
    empresaId, empresaNombre, documentType, buildData, defaultDocumentLoader, fileName, onError,
  });

  const abrir = (e) => {
    setAnchorEl(e.currentTarget);
    cargarOpciones();
  };
  const cerrar = () => setAnchorEl(null);

  const handleExportar = (plantilla) => {
    cerrar();
    exportar(plantilla);
  };

  return (
    <>
      <Tooltip title="Exportar a PDF" arrow>
        <Chip
          icon={<PictureAsPdfRoundedIcon sx={{ fontSize: 15 }} />}
          label={generating ? 'Generando…' : 'PDF'}
          size="small"
          variant="outlined"
          color="error"
          disabled={disabled || generating}
          onClick={abrir}
          sx={{ cursor: 'pointer', fontSize: '0.65rem', height: 22, '& .MuiChip-icon': { ml: 0.6 } }}
        />
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={cerrar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 256, mt: 0.5, borderRadius: 2 } } }}
      >
        <ListSubheader sx={{ lineHeight: '32px', fontWeight: 700, color: 'text.secondary' }}>
          Exportar como PDF
        </ListSubheader>

        {loadingList ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5 }}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">Cargando plantillas…</Typography>
          </Box>
        ) : (
          <Box>
            <MenuItem onClick={() => handleExportar(null)} sx={{ py: 1 }}>
              <ListItemIcon><DescriptionOutlinedIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Plantilla por defecto" secondary="Recibo estándar" />
            </MenuItem>

            {plantillas.length > 0 && (
              <ListSubheader sx={{ lineHeight: '28px', fontSize: '0.7rem', color: 'text.disabled' }}>
                Tus plantillas
              </ListSubheader>
            )}
            {plantillas.map((p) => (
              <MenuItem key={p._id || p.id} onClick={() => handleExportar(p)} sx={{ py: 1 }}>
                <ListItemIcon>
                  {p.es_principal ? (
                    <StarRoundedIcon fontSize="small" sx={{ color: 'warning.main' }} />
                  ) : (
                    <DescriptionOutlinedIcon fontSize="small" />
                  )}
                </ListItemIcon>
                <ListItemText primary={p.nombre || 'Sin nombre'} />
              </MenuItem>
            ))}

            <Divider sx={{ my: 0.5 }} />
            <MenuItem
              onClick={() => { cerrar(); router.push('/plantillas-pdf'); }}
              sx={{ py: 1, color: 'primary.main' }}
            >
              <ListItemIcon><AddRoundedIcon fontSize="small" color="primary" /></ListItemIcon>
              <ListItemText primary="Crear plantilla personalizada" />
            </MenuItem>
          </Box>
        )}
      </Menu>
    </>
  );
}
