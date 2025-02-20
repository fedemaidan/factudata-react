import React from 'react';
import {
  Stack,
  Button,
  ButtonGroup,
  TextField,
  Chip,
  useMediaQuery,
} from '@mui/material';

const FiltersBar = ({
  filters = {},
  onFiltersChange,
  notas = [],
  resetFilters,
}) => {
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));

  // Calcular estadosCount dinámicamente basado en las notas
  const estadosCount = notas.reduce((acc, nota) => {
    acc[nota.estado] = (acc[nota.estado] || 0) + 1;
    return acc;
  }, {});

  const handleEstadoFilter = (estado) => {
    onFiltersChange({ ...filters, estado: filters.estado === estado ? '' : estado });
  };

  return (
    <Stack
      direction={isMobile ? 'column' : 'row'}
      spacing={2}
      alignItems={isMobile ? 'center' : 'flex-start'}
      mb={3}
    >
      {/* Filtro por texto */}
      <TextField
        label="Buscar por texto"
        value={filters.text || ''}
        onChange={(e) =>
          onFiltersChange({ ...filters, text: e.target.value })
        }
        fullWidth={isMobile}
      />

      {/* Filtro por estado */}
      {isMobile ? (
        <ButtonGroup variant="text" color="primary" orientation="horizontal">
          {Object.entries(estadosCount).map(([estado, count]) => (
            <Button
              key={estado}
              startIcon={<Chip label={count} color={estado === 'Pendiente' ? 'warning' : estado === 'En proceso' ? 'primary' : 'success'} />}
              onClick={() => handleEstadoFilter(estado)}
              sx={{ fontSize: '0.8rem' }}
            >
              {estado[0]} {/* Muestra solo la primera letra del estado */}
            </Button>
          ))}
        </ButtonGroup>
      ) : (
        Object.entries(estadosCount).map(([estado, count]) => (
          <Button
            key={estado}
            variant={filters.estado === estado ? 'contained' : 'outlined'}
            startIcon={<Chip label={count} color={estado === 'Pendiente' ? 'warning' : estado === 'En proceso' ? 'primary' : 'success'} />}
            onClick={() => handleEstadoFilter(estado)}
            color={estado === 'Pendiente' ? 'warning' : estado === 'En proceso' ? 'primary' : 'success'}
          >
            {estado}
          </Button>
        ))
      )}

      {/* Botón para restablecer filtros */}
      <Button
        variant="outlined"
        color="default"
        onClick={resetFilters}
      >
        Limpiar Filtros
      </Button>
    </Stack>
  );
};

export default FiltersBar;
