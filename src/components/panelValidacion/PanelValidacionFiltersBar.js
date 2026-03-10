import React, { useRef, useState } from 'react';
import {
  Box,
  Stack,
  TextField,
  IconButton,
  InputAdornment,
  Popover,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

const ESTADOS_OPCIONES = [
  { value: '', label: 'Todos' },
  { value: 'completado', label: 'Listo' },
  { value: 'error', label: 'Error' },
  { value: 'confirmado', label: 'Confirmado' },
];

const PanelValidacionFiltersBar = ({
  texto,
  setTexto,
  fechaDesde,
  setFechaDesde,
  fechaHasta,
  setFechaHasta,
  proveedor,
  setProveedor,
  nombre_user,
  setNombre_user,
  estado,
  setEstado,
  onFiltrar,
  onRestablecer,
}) => {
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);

  const handleRestablecer = () => {
    onRestablecer?.();
    setOpen(false);
  };

  const handleFiltrar = () => {
    onFiltrar?.();
    setOpen(false);
  };

  return (
    <Box sx={{ mb: 1 }}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <TextField
          inputRef={anchorRef}
          label="Buscar"
          size="small"
          placeholder="Texto libre"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          sx={{ width: 220 }}
          InputProps={{
            endAdornment: texto.length > 0 && (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setTexto('')}
                  edge="end"
                  size="small"
                  sx={{ color: 'text.secondary' }}
                >
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <IconButton
          aria-label="Filtros"
          onClick={() => setOpen(true)}
          size="small"
          sx={{
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            ml: 0.5,
          }}
        >
          <FilterListIcon fontSize="small" />
        </IconButton>

        <Popover
          open={open}
          onClose={() => setOpen(false)}
          anchorEl={anchorRef.current}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          PaperProps={{
            sx: {
              p: 1.25,
              minWidth: 320,
              maxWidth: 380,
            },
          }}
        >
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Box sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Filtros</Box>
              <IconButton size="small" onClick={() => setOpen(false)} sx={{ p: 0.5 }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            <FormControl size="small" fullWidth variant="filled">
              <InputLabel size="small">Estado</InputLabel>
              <Select
                size="small"
                value={estado}
                label="Estado"
                onChange={(e) => setEstado(e.target.value)}
              >
                {ESTADOS_OPCIONES.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              type="date"
              label="Desde"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              fullWidth
              variant="filled"
            />
            <TextField
              type="date"
              label="Hasta"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              fullWidth
              variant="filled"
            />
            <TextField
              size="small"
              label="Proveedor"
              value={proveedor}
              onChange={(e) => setProveedor(e.target.value)}
              fullWidth
              variant="filled"
            />
            <TextField
              size="small"
              label="Usuario"
              value={nombre_user}
              onChange={(e) => setNombre_user(e.target.value)}
              fullWidth
              variant="filled"
            />

            <Stack direction="row" spacing={1} sx={{ pt: 0.5 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<RestartAltIcon />}
                onClick={handleRestablecer}
                fullWidth
                sx={{ fontSize: '0.75rem' }}
              >
                Restablecer
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={handleFiltrar}
                fullWidth
                sx={{ fontSize: '0.75rem' }}
              >
                Filtrar
              </Button>
            </Stack>
          </Stack>
        </Popover>
      </Stack>
    </Box>
  );
};

export default PanelValidacionFiltersBar;
