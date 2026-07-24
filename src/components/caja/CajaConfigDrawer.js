import React from 'react';
import {
  Drawer, Box, Stack, Typography, IconButton, TextField, FormControl, InputLabel,
  Select, MenuItem, Button, Divider, Chip,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CajaFilterBuilder from 'src/components/caja/CajaFilterBuilder';

/**
 * Panel lateral compartido para crear/editar una caja virtual (TAR-633).
 * Envuelve el CajaFilterBuilder + los controles de presentación (moneda,
 * equivalencia, base de cálculo). Controlado por la página que lo usa.
 */

const SectionLabel = ({ children }) => (
  <Typography
    variant="overline"
    sx={{ display: 'block', fontWeight: 700, color: 'text.secondary', letterSpacing: '.06em', mb: 1 }}
  >
    {children}
  </Typography>
);

const CajaConfigDrawer = ({
  open,
  onClose,
  savedViewMode = false,
  esEdicion = false,
  filterChips = [],
  nombreCaja,
  onNombreChange,
  monedaCaja,
  onMonedaChange,
  filtrosCaja,
  onFiltrosChange,
  equivalenciaCaja,
  onEquivalenciaChange,
  equivalenciaOptions = [],
  baseCalculoCaja,
  onBaseCalculoChange,
  options,
  empresa,
  onGuardar,
}) => {
  const titulo = savedViewMode
    ? 'Guardar vista actual como caja'
    : (esEdicion ? 'Editar caja' : 'Crear vista de caja personalizada');
  const labelGuardar = esEdicion ? 'Guardar' : 'Crear';

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 700 },
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        },
      }}
    >
      {/* Header sticky */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', flex: '0 0 auto' }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{titulo}</Typography>
        <IconButton onClick={onClose} aria-label="Cerrar" size="small">
          <CloseRoundedIcon />
        </IconButton>
      </Stack>

      {/* Body scrolleable */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
        {savedViewMode && filterChips.length > 0 && (
          <Box sx={{ mb: 2.5, p: 1.5, bgcolor: 'primary.alpha4', borderRadius: 2, border: '1px solid', borderColor: 'primary.alpha30' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75 }}>
              Filtros que se guardarán en esta caja:
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              {filterChips.map((chip, idx) => (
                // eslint-disable-next-line react/no-array-index-key
                <Chip key={idx} label={chip.label} size="small" variant="outlined" />
              ))}
            </Box>
          </Box>
        )}

        <SectionLabel>Qué movimientos entran</SectionLabel>
        <TextField
          label="Nombre de la caja"
          fullWidth
          value={nombreCaja}
          onChange={(e) => onNombreChange(e.target.value)}
          sx={{ mb: 2 }}
        />

        {!savedViewMode && (
          <>
            <CajaFilterBuilder
              value={filtrosCaja}
              onChange={onFiltrosChange}
              options={options}
              empresa={empresa}
            />

            <Divider sx={{ my: 3 }} />

            <SectionLabel>Cómo se muestra el saldo</SectionLabel>
            <Stack spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Moneda</InputLabel>
                <Select value={monedaCaja} label="Moneda" onChange={(e) => onMonedaChange(e.target.value)}>
                  <MenuItem value="">Todas</MenuItem>
                  <MenuItem value="ARS">Pesos</MenuItem>
                  <MenuItem value="USD">Dólares</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Mostrar como</InputLabel>
                <Select value={equivalenciaCaja} label="Mostrar como" onChange={(e) => onEquivalenciaChange(e.target.value)}>
                  {equivalenciaOptions.map((o) => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Base de cálculo</InputLabel>
                <Select value={baseCalculoCaja} label="Base de cálculo" onChange={(e) => onBaseCalculoChange(e.target.value)}>
                  <MenuItem value="total">Total (con impuestos)</MenuItem>
                  <MenuItem value="subtotal">Subtotal (sin impuestos)</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </>
        )}

        {savedViewMode && (
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Base de cálculo</InputLabel>
            <Select value={baseCalculoCaja} label="Base de cálculo" onChange={(e) => onBaseCalculoChange(e.target.value)}>
              <MenuItem value="total">Total (con impuestos)</MenuItem>
              <MenuItem value="subtotal">Subtotal (sin impuestos)</MenuItem>
            </Select>
          </FormControl>
        )}
      </Box>

      {/* Footer sticky */}
      <Stack
        direction="row"
        spacing={1.5}
        justifyContent="flex-end"
        sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', flex: '0 0 auto' }}
      >
        <Button onClick={onClose} color="inherit" sx={{ textTransform: 'none', fontWeight: 700 }}>
          Cancelar
        </Button>
        <Button onClick={onGuardar} variant="contained" sx={{ textTransform: 'none', fontWeight: 700, px: 3 }}>
          {labelGuardar}
        </Button>
      </Stack>
    </Drawer>
  );
};

export default CajaConfigDrawer;
