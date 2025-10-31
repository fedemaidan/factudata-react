// src/components/HeaderAcopioSummary.js
import React from 'react';
import {
  Box, Stack, Typography, Chip, Button, LinearProgress, Tooltip
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

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
  onUploadClick,
  onRecalibrarImagenes,
  onRefrescar,
  isAdmin
}) {
  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
        <Button variant="text" startIcon={<ArrowBackIcon />} onClick={onVolver}>
          Volver
        </Button>

        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Acopio {acopio?.codigo ? `• ${acopio.codigo}` : ''}
        </Typography>

        <Chip
          size="small"
          label={acopio?.activo === false ? 'Inactivo' : 'Activo'}
          color={acopio?.activo === false ? 'default' : 'success'}
          variant="outlined"
        />

        {acopio?.proyecto_nombre && (
          <Chip size="small" label={`Proyecto: ${acopio.proyecto_nombre}`} />
        )}
        {acopio?.proveedor && (
          <Chip size="small" label={`Proveedor: ${acopio.proveedor}`} />
        )}

        <Box sx={{ flex: 1 }} />

        <Stack direction="row" spacing={1}>
          <Button variant="outlined" size="small" startIcon={<EditOutlinedIcon />} onClick={onEditar}>
            Editar
          </Button>
          <Button variant="outlined" size="small" startIcon={<UploadFileIcon />} onClick={onUploadClick}>
            Subir hojas
          </Button>
          {isAdmin && (
            <Tooltip title="Recalibrar imágenes (admin)">
              <span>
                <Button variant="outlined" size="small" onClick={onRecalibrarImagenes}>
                  Recalibrar
                </Button>
              </span>
            </Tooltip>
          )}
          <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={onRefrescar}>
            Actualizar
          </Button>
        </Stack>
      </Stack>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          bgcolor: 'background.paper'
        }}
      >
        <Kpi label="Valor Acopiado" value={fmtCurrency(acopio?.valor_acopio)} />
        <Kpi label="Valor Desacopiado" value={fmtCurrency(acopio?.valor_desacopio)} />
        <Box sx={{ minWidth: 280 }}>
          <Typography variant="caption" color="text.secondary">Disponible</Typography>
          <LinearProgress variant="determinate" value={porcentajeDisponible} sx={{ my: 0.5 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {fmtCurrency((Number(acopio?.valor_acopio) || 0) - (Number(acopio?.valor_desacopio) || 0))} ({porcentajeDisponible.toFixed(2)}%)
          </Typography>
        </Box>
        <Kpi label="Tipo" value={(acopio?.tipo || 'materiales').replace('_', ' ')} />
      </Stack>
    </Box>
  );
}

function Kpi({ label, value }) {
  return (
    <Box sx={{ minWidth: 200 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{value}</Typography>
    </Box>
  );
}
