import React from 'react';
import {
  Box,
  Button,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';

const PresupuestosFilters = ({
  filtroTitulo,
  onFiltroTituloChange,
  filtroEstado,
  onFiltroEstadoChange,
  estados,
  estadoLabel,
  filtroMoneda,
  onFiltroMonedaChange,
  monedas,
  onNuevoPresupuesto,
}) => {
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
        <TextField
          size="small"
          label="Buscar por título"
          value={filtroTitulo}
          onChange={(e) => onFiltroTituloChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Estado</InputLabel>
          <Select
            value={filtroEstado}
            label="Estado"
            onChange={(e) => onFiltroEstadoChange(e.target.value)}
          >
            <MenuItem value="">Todos</MenuItem>
            {estados.map((estado) => (
              <MenuItem key={estado} value={estado}>
                {estadoLabel[estado]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Moneda</InputLabel>
          <Select
            value={filtroMoneda}
            label="Moneda"
            onChange={(e) => onFiltroMonedaChange(e.target.value)}
          >
            <MenuItem value="">Todas</MenuItem>
            {monedas.map((moneda) => (
              <MenuItem key={moneda} value={moneda}>
                {moneda}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" startIcon={<AddIcon />} onClick={onNuevoPresupuesto}>
          Nuevo presupuesto
        </Button>
      </Stack>
    </Paper>
  );
};

export default PresupuestosFilters;
