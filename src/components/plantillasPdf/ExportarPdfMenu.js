import { useState, useEffect } from 'react';
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
  TextField,
  ToggleButton,
  ToggleButtonGroup,
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
 * - Si `tituloEditable`, muestra un campo de título (default `defaultTitulo`) cuyo
 *   valor se pasa al `buildData({ titulo })` → el usuario controla el encabezado del
 *   PDF desde el export (no depende de la plantilla del agente).
 * - Si `modosDisponibles` trae más de una opción, muestra un selector de moneda
 *   (Pesos nominales / CAC a hoy / USD) cuyo valor va en `buildData({ modo })`. El
 *   modo controla los NÚMEROS (no la plantilla), por eso vive en el export.
 *
 * La lógica (listar + render) vive en el hook useExportarPdf, compartido con
 * ExportarPdfDialog. Genérico por `documentType`.
 */
const MODO_LABELS = { nominal: 'Pesos nominales', cac: 'CAC a hoy', usd: 'USD' };

export default function ExportarPdfMenu({
  empresaId,
  empresaNombre = '',
  documentType = 'control_presupuesto',
  buildData,
  defaultDocumentLoader,
  fileName = 'documento',
  disabled = false,
  onError,
  tituloEditable = false,
  defaultTitulo = '',
  modosDisponibles = [],
  modoDefault = 'nominal',
}) {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState(null);
  const [titulo, setTitulo] = useState(defaultTitulo);
  const [modo, setModo] = useState(modoDefault);
  const open = Boolean(anchorEl);
  const { plantillas, loadingList, generating, cargarOpciones, exportar } = useExportarPdf({
    empresaId, empresaNombre, documentType, buildData, defaultDocumentLoader, fileName, onError,
  });

  // Mantener título y modo sincronizados con el default cuando cambia el contexto (ej. otro presupuesto).
  useEffect(() => { setTitulo(defaultTitulo); }, [defaultTitulo]);
  useEffect(() => { setModo(modoDefault); }, [modoDefault]);

  const mostrarSelectorModo = Array.isArray(modosDisponibles) && modosDisponibles.length > 1;

  const abrir = (e) => {
    setAnchorEl(e.currentTarget);
    cargarOpciones();
  };
  const cerrar = () => setAnchorEl(null);

  const handleExportar = (plantilla) => {
    cerrar();
    const opts = {
      ...(tituloEditable ? { titulo: (titulo || '').trim() || defaultTitulo } : {}),
      ...(mostrarSelectorModo ? { modo } : {}),
    };
    exportar(plantilla, Object.keys(opts).length ? opts : undefined);
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

        {tituloEditable && (
          <Box
            sx={{ px: 2, pt: 0.5, pb: 1 }}
            onKeyDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <TextField
              label="Título del documento"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              size="small"
              fullWidth
              variant="outlined"
            />
          </Box>
        )}

        {mostrarSelectorModo && (
          <Box
            sx={{ px: 2, pt: 0.5, pb: 1 }}
            onKeyDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Mostrar importes en
            </Typography>
            <ToggleButtonGroup
              value={modo}
              exclusive
              size="small"
              fullWidth
              onChange={(e, v) => { if (v) setModo(v); }}
            >
              {modosDisponibles.map((m) => (
                <ToggleButton key={m} value={m} sx={{ fontSize: '0.65rem', py: 0.4, textTransform: 'none' }}>
                  {MODO_LABELS[m] || m}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        )}

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
