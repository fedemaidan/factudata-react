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
import pdfPlantillaService from 'src/services/pdfPlantillaService';
import empresaLogoService from 'src/services/empresaLogoService';
import { loadCustomComponentById } from 'src/utils/plantillasPdf/loadCustomComponent';
import { renderPlantillaToPdf } from 'src/utils/plantillasPdf/exportPlantillaToPdf';
import { loadImageAsDataUrl } from 'src/utils/presupuestos/loadLogoForPdf';

/**
 * Botón "PDF" reutilizable que abre un menú chico para exportar a PDF.
 *
 * - Siempre ofrece la **plantilla por defecto** (libre para todos).
 * - Lista las plantillas personalizadas de la empresa para el `documentType` (la
 *   principal primero, marcada con ⭐).
 * - Ofrece "Crear plantilla personalizada" que redirige a /plantillas-pdf.
 *
 * Genérico por `documentType` para reusarlo a futuro en otros documentos.
 *
 * Props:
 *   empresaId, empresaNombre, documentType,
 *   buildData: () => objeto `data` (se llama al exportar, refleja el estado actual),
 *   defaultDocumentLoader: () => Promise<Component> (plantilla default, client-only),
 *   fileName, disabled, onError(msg)
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
  const [loadingList, setLoadingList] = useState(false);
  const [plantillas, setPlantillas] = useState([]);
  const [logos, setLogos] = useState([]);
  const [generating, setGenerating] = useState(false);
  const open = Boolean(anchorEl);

  const abrir = async (e) => {
    setAnchorEl(e.currentTarget);
    setLoadingList(true);
    try {
      const [pls, lgs] = await Promise.all([
        pdfPlantillaService.listar(empresaId, documentType),
        empresaLogoService.listar(empresaId),
      ]);
      const ordenadas = [...(pls || [])].sort(
        (a, b) => (b.es_principal ? 1 : 0) - (a.es_principal ? 1 : 0)
      );
      setPlantillas(ordenadas);
      setLogos(lgs || []);
    } catch (err) {
      console.error('ExportarPdfMenu listar', err);
    } finally {
      setLoadingList(false);
    }
  };

  const cerrar = () => setAnchorEl(null);

  const resolverLogo = async (logoId) => {
    let logo = null;
    if (logoId) logo = logos.find((l) => (l._id || l.id) === logoId);
    if (!logo) logo = logos[0];
    if (!logo?.url) return null;
    return loadImageAsDataUrl(logo.url);
  };

  const exportar = async (plantilla) => {
    cerrar();
    setGenerating(true);
    try {
      const data = typeof buildData === 'function' ? buildData() : buildData;
      let Component;
      let logoId = null;
      if (plantilla) {
        const loaded = await loadCustomComponentById(plantilla._id || plantilla.id);
        Component = loaded.Component;
        logoId = plantilla.logo_id || null;
      } else {
        Component = await defaultDocumentLoader();
      }
      const logoDataUrl = await resolverLogo(logoId);
      await renderPlantillaToPdf({ Component, data, logoDataUrl, empresaNombre, fileName });
    } catch (err) {
      console.error('ExportarPdfMenu exportar', err);
      if (onError) onError('No se pudo generar el PDF. Intentá de nuevo.');
    } finally {
      setGenerating(false);
    }
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
            <MenuItem onClick={() => exportar(null)} sx={{ py: 1 }}>
              <ListItemIcon><DescriptionOutlinedIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Plantilla por defecto" secondary="Recibo estándar" />
            </MenuItem>

            {plantillas.length > 0 && (
              <ListSubheader sx={{ lineHeight: '28px', fontSize: '0.7rem', color: 'text.disabled' }}>
                Tus plantillas
              </ListSubheader>
            )}
            {plantillas.map((p) => (
              <MenuItem key={p._id || p.id} onClick={() => exportar(p)} sx={{ py: 1 }}>
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
