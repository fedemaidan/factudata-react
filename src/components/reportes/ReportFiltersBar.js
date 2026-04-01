import React from 'react';
import {
  Box, TextField, Autocomplete, Chip, FormControl, InputLabel,
  Select, MenuItem, Button, Stack, Collapse, ToggleButton, ToggleButtonGroup,
  Typography,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';

/**
 * Barra de filtros runtime para un reporte
 *
 * @param {Object} filtrosSchema  - Configuración de filtros del reporte
 * @param {Object} filters        - Valores actuales de los filtros
 * @param {Function} onFiltersChange - Callback cuando cambian los filtros
 * @param {Object} availableOptions - { proyectos, categorias, proveedores, etapas, mediosPago, monedas }
 * @param {boolean} expanded       - Si está expandido
 * @param {Function} onToggle      - Toggle de expansión
 */
const ReportFiltersBar = ({
  filtrosSchema = {},
  filters = {},
  onFiltersChange,
  availableOptions = {},
  expanded = true,
  onToggle,
}) => {
  const handleChange = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleClear = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(
    (v) => v != null && (Array.isArray(v) ? v.length > 0 : v !== ''),
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Button
          size="small"
          startIcon={<FilterListIcon />}
          onClick={onToggle}
          variant={hasActiveFilters ? 'contained' : 'outlined'}
          color={hasActiveFilters ? 'primary' : 'inherit'}
        >
          Filtros {hasActiveFilters ? '●' : ''}
        </Button>
        {hasActiveFilters && (
          <Button size="small" startIcon={<ClearIcon />} onClick={handleClear} color="inherit">
            Limpiar
          </Button>
        )}
      </Box>

      <Collapse in={expanded}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
          {/* Fecha desde / hasta */}
          {filtrosSchema.fecha?.enabled && (
            <>
              <TextField
                label="Desde"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={filters.fecha_from ? formatDateInput(filters.fecha_from) : ''}
                onChange={(e) => handleChange('fecha_from', e.target.value || null)}
                sx={{ width: 160 }}
              />
              <TextField
                label="Hasta"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={filters.fecha_to ? formatDateInput(filters.fecha_to) : ''}
                onChange={(e) => handleChange('fecha_to', e.target.value || null)}
                sx={{ width: 160 }}
              />
            </>
          )}

          {/* Proyectos multi-select (OCULTO si viene de arriba) */}
          {filtrosSchema.proyectos?.enabled && !filtrosSchema.proyectos?.fijos && !availableOptions.proyectos?.length && (
            <Autocomplete
              multiple
              size="small"
              options={availableOptions.proyectos || []}
              getOptionLabel={(o) => o.nombre || o}
              value={
                (filters.proyectos || [])
                  .map((id) => (availableOptions.proyectos || []).find((p) => (p.id || p) === id))
                  .filter(Boolean)
              }
              onChange={(_, val) => handleChange('proyectos', val.map((v) => v.id || v))}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    key={option.id || option}
                    label={option.nombre || option}
                    size="small"
                    {...getTagProps({ index })}
                  />
                ))
              }
              renderInput={(params) => <TextField {...params} label="Proyectos" />}
              sx={{ minWidth: 250 }}
            />
          )}

          {/* Tipo */}
          {filtrosSchema.tipo?.enabled && (
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Tipo</InputLabel>
              <Select
                value={filters.tipo || ''}
                label="Tipo"
                onChange={(e) => handleChange('tipo', e.target.value || null)}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="egreso">Egreso</MenuItem>
                <MenuItem value="ingreso">Ingreso</MenuItem>
              </Select>
            </FormControl>
          )}

          {/* Categorías */}
          {filtrosSchema.categorias?.enabled && (
            <Autocomplete
              multiple
              size="small"
              options={availableOptions.categorias || []}
              value={filters.categorias || []}
              onChange={(_, val) => handleChange('categorias', val)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip key={option} label={option} size="small" {...getTagProps({ index })} />
                ))
              }
              renderInput={(params) => <TextField {...params} label="Categorías" />}
              sx={{ minWidth: 200 }}
            />
          )}

          {/* Proveedores */}
          {filtrosSchema.proveedores?.enabled && (
            <Autocomplete
              multiple
              size="small"
              options={availableOptions.proveedores || []}
              value={filters.proveedores || []}
              onChange={(_, val) => handleChange('proveedores', val)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip key={option} label={option} size="small" {...getTagProps({ index })} />
                ))
              }
              renderInput={(params) => <TextField {...params} label="Proveedores" />}
              sx={{ minWidth: 200 }}
            />
          )}

          {/* Etapas */}
          {filtrosSchema.etapas?.enabled && (
            <Autocomplete
              multiple
              size="small"
              options={availableOptions.etapas || []}
              value={filters.etapas || []}
              onChange={(_, val) => handleChange('etapas', val)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip key={option} label={option} size="small" {...getTagProps({ index })} />
                ))
              }
              renderInput={(params) => <TextField {...params} label="Etapas" />}
              sx={{ minWidth: 200 }}
            />
          )}

          {/* Usuarios */}
          {filtrosSchema.usuarios?.enabled && (
            <Autocomplete
              multiple
              size="small"
              options={availableOptions.usuarios || []}
              value={filters.usuarios || []}
              onChange={(_, val) => handleChange('usuarios', val)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip key={option} label={option} size="small" {...getTagProps({ index })} />
                ))
              }
              renderInput={(params) => <TextField {...params} label="Usuarios" />}
              sx={{ minWidth: 200 }}
            />
          )}

          {/* Medio de pago */}
          {filtrosSchema.medio_pago?.enabled && (
            <Autocomplete
              multiple
              size="small"
              options={availableOptions.mediosPago || []}
              value={filters.medio_pago || []}
              onChange={(_, val) => handleChange('medio_pago', val)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip key={option} label={option} size="small" {...getTagProps({ index })} />
                ))
              }
              renderInput={(params) => <TextField {...params} label="Medio de pago" />}
              sx={{ minWidth: 200 }}
            />
          )}

          {/* Moneda del movimiento (filtra por moneda nativa) */}
          {filtrosSchema.moneda_movimiento?.enabled && (
            <Autocomplete
              multiple
              size="small"
              options={availableOptions.monedas || []}
              value={filters.moneda_movimiento || []}
              onChange={(_, val) => handleChange('moneda_movimiento', val)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip key={option} label={option} size="small" {...getTagProps({ index })} />
                ))
              }
              renderInput={(params) => <TextField {...params} label="Moneda origen" />}
              sx={{ minWidth: 150 }}
            />
          )}

          {/* Factura cliente */}
          {filtrosSchema.factura_cliente?.enabled && (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Factura cliente</InputLabel>
              <Select
                value={filters.factura_cliente ?? ''}
                label="Factura cliente"
                onChange={(e) => handleChange('factura_cliente', e.target.value === '' ? null : e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="cliente">Cliente</MenuItem>
                <MenuItem value="propia">Propia</MenuItem>
              </Select>
            </FormControl>
          )}

          {/* Moneda equivalente (en qué moneda VER los valores) */}
          {filtrosSchema.moneda_equivalente?.enabled !== false && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                Ver valores en
              </Typography>
              <ToggleButtonGroup
                exclusive
                value={(filters.moneda_equivalente && filters.moneda_equivalente[0]) || 'ARS'}
                onChange={(_, val) => {
                  if (val) {
                    handleChange('moneda_equivalente', [val]);
                  }
                }}
                size="small"
              >
                <ToggleButton value="ARS" sx={{ px: 1.5 }}>ARS</ToggleButton>
                <ToggleButton value="USD" sx={{ px: 1.5 }}>USD</ToggleButton>
                <ToggleButton value="CAC" sx={{ px: 1.5 }}>CAC</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          )}
        </Stack>
      </Collapse>
    </Box>
  );
};

function formatDateInput(d) {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

export default ReportFiltersBar;
