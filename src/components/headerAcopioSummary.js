import React, { useState } from 'react';
import {
  Box, Stack, Typography, Chip, Button, LinearProgress, Tooltip,
  IconButton, Menu, MenuItem,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import TooltipHelp from 'src/components/TooltipHelp';
import { TOOLTIP_MOVIMIENTOS } from 'src/constant/tooltipTexts';

function fmtCurrency(n) {
  if (n === null || n === undefined) return '$ 0';
  const num = Number(n) || 0;
  return num.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });
}

export default function HeaderAcopioSummary({
  acopio,
  porcentajeDisponible,
  onVolver,
  onEditar,
  onRecalibrarImagenes,
  onRefrescar,
  isAdmin,
  sucursalesMap = {},
}) {
  const esCliente = acopio?.contraparte_rol === 'cliente';
  const labelContraparte = esCliente ? 'Cliente' : 'Proveedor';
  const labelSecundaria = esCliente ? 'Sucursal' : 'Proyecto';
  const valorSecundaria = esCliente
    ? (sucursalesMap[acopio?.sucursal_id] || 'Sin asignar')
    : (acopio?.proyecto_nombre || 'Sin asignar');
  const [moreAnchor, setMoreAnchor] = useState(null);

  return (
    <Box sx={{ mb: 2 }}>
      {/* Fila de título + acciones */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
        <Button variant="text" startIcon={<ArrowBackIcon />} onClick={onVolver} size="small">
          Volver
        </Button>

        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {acopio?.codigo || 'Acopio'}
        </Typography>

        <Chip
          size="small"
          label={acopio?.activo === false ? 'Inactivo' : 'Activo'}
          color={acopio?.activo === false ? 'default' : 'success'}
          variant="outlined"
        />

        <Box sx={{ flex: 1 }} />

        <Stack direction="row" spacing={1} alignItems="center">
          <TooltipHelp {...TOOLTIP_MOVIMIENTOS.editar}>
            <Button variant="outlined" size="small" startIcon={<EditOutlinedIcon />} onClick={onEditar}>
              Editar
            </Button>
          </TooltipHelp>

          <Tooltip title="Actualizar datos">
            <IconButton size="small" onClick={onRefrescar}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* Acciones secundarias en menú */}
          {isAdmin && (
            <>
              <IconButton size="small" onClick={(e) => setMoreAnchor(e.currentTarget)}>
                <MoreVertIcon fontSize="small" />
              </IconButton>
              <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)}>
                <MenuItem onClick={() => { onRecalibrarImagenes?.(); setMoreAnchor(null); }}>
                  Recalibrar imágenes
                </MenuItem>
              </Menu>
            </>
          )}
        </Stack>
      </Stack>

      {/* Fila de KPIs */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          bgcolor: 'background.paper',
          flexWrap: 'wrap',
        }}
      >
        <Kpi label={labelSecundaria}   value={valorSecundaria} />
        <Kpi label={labelContraparte}  value={acopio?.proveedor || '—'} />
        <Kpi label="Valor Acopiado"    value={fmtCurrency(acopio?.valor_acopio)} />
        <Kpi label="Valor Desacopiado" value={fmtCurrency(acopio?.valor_desacopio)} />
        <Box sx={{ minWidth: 240, flex: 1 }}>
          <Typography variant="caption" color="text.secondary">Disponible</Typography>
          <LinearProgress
            variant="determinate"
            value={Math.max(0, Math.min(100, porcentajeDisponible))}
            sx={{ my: 0.5 }}
            color={porcentajeDisponible < 10 ? 'error' : porcentajeDisponible < 20 ? 'warning' : 'primary'}
          />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {fmtCurrency((Number(acopio?.valor_acopio) || 0) - (Number(acopio?.valor_desacopio) || 0))}{' '}
            <Typography component="span" variant="caption" color="text.secondary">
              ({porcentajeDisponible.toFixed(1)}%)
            </Typography>
          </Typography>
        </Box>
        <Kpi label="Tipo" value={(acopio?.tipo || 'materiales').replace('_', ' ')} />
      </Stack>
    </Box>
  );
}

function Kpi({ label, value, highlight = false }) {
  return (
    <Box sx={{
      minWidth: 160,
      ...(highlight && { bgcolor: 'primary.50', borderRadius: 1, px: 1.5, py: 0.5, border: '1px solid', borderColor: 'primary.200' })
    }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, ...(highlight && { color: 'primary.main' }) }}>
        {value}
      </Typography>
    </Box>
  );
}
