import { Stack, TextField, Select, MenuItem, FormControl, InputLabel, Button } from '@mui/material';
import DatePicker from 'react-datepicker';

// arriba del archivo
const defaultFilters = {
  fechaDesde: null,
  fechaHasta: null,
  palabras: '',
  observacion: '',
  categorias: [],
  subcategorias: [],
  proveedores: [],
  medioPago: [],
  tipo: [],
  moneda: [],
  etapa: [],
  cuentaInterna: [],
  tagsExtra: [],
  montoMin: '',
  montoMax: '',
  ordenarPor: 'fecha_factura',
  ordenarDir: 'desc',
  caja: null,
  estado: [],
};

export const FilterBarCajaProyecto = ({
  filters,
  setFilters,
  options,
  onRefresh,
  empresa, 
}) => {

  const DEFINICION_FILTROS = [
    { name: 'observacion', label: 'Observación', type: 'text', visibleIf: () => true },
    { name: 'palabras', label: 'Palabras sueltas', type: 'text', visibleIf: () => true },
    { name: 'tipo', label: 'Tipo', type: 'selectMultiple', options: ['ingreso', 'egreso'], visibleIf: () => true },
    { name: 'moneda', label: 'Moneda', type: 'selectMultiple', optionsKey: 'monedas', visibleIf: () => true },
    { name: 'proveedores', label: 'Proveedor', type: 'selectMultiple', optionsKey: 'proveedores', visibleIf: (empresa) => empresa?.proveedores?.length > 0 },
    { name: 'categorias', label: 'Categoría', type: 'selectMultiple', optionsKey: 'categorias', visibleIf: (empresa) => empresa?.categorias?.length > 0 },
    { name: 'subcategorias', label: 'Subcategoría', type: 'selectMultiple', optionsKey: 'subcategorias', visibleIf: (empresa) => empresa?.comprobante_info?.subcategoria },
    { name: 'medioPago', label: 'Medio de pago', type: 'selectMultiple', optionsKey: 'mediosPago', visibleIf: (empresa) => empresa?.comprobante_info?.medio_pago },
    { name: 'estado', label: 'Estado', type: 'selectMultiple', options: ['Pendiente', 'Pagado'], visibleIf: (empresa) => empresa?.con_estados },
    { name: 'montoMin', label: 'Monto mínimo', type: 'number', visibleIf: () => true },
    { name: 'montoMax', label: 'Monto máximo', type: 'number', visibleIf: () => true },
  ];
  
  function getFiltrosVisibles(empresa) {
    return DEFINICION_FILTROS.filter((f) => {
      if (!f.visibleIf) return true;
      return f.visibleIf(empresa);
    });
  }

  
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
      <Stack direction="row" spacing={1} alignItems="center">
        <DatePicker
          selected={filters.fechaDesde}
          onChange={(date) => set('fechaDesde', date)}
          selectsStart
          startDate={filters.fechaDesde}
          endDate={filters.fechaHasta}
          placeholderText="Desde"
          dateFormat="dd/MM/yyyy"
        />
        <DatePicker
          selected={filters.fechaHasta}
          onChange={(date) => set('fechaHasta', date)}
          selectsEnd
          startDate={filters.fechaDesde}
          endDate={filters.fechaHasta}
          minDate={filters.fechaDesde}
          placeholderText="Hasta"
          dateFormat="dd/MM/yyyy"
        />
      </Stack>

      {getFiltrosVisibles(empresa).map((filtro) => {
  const value = filters[filtro.name];

  // campo de texto
  if (filtro.type === 'text') {
    return (
      <TextField
        key={filtro.name}
        label={filtro.label}
        value={value}
        onChange={(e) => set(filtro.name, e.target.value)}
        sx={{ minWidth: 200 }}
      />
    );
  }

  // select múltiple
  if (filtro.type === 'selectMultiple') {
    const selectOptions = filtro.options || options[filtro.optionsKey] || [];
    return (
      <FormControl sx={{ minWidth: 200 }} key={filtro.name}>
        <InputLabel>{filtro.label}</InputLabel>
        <Select
          multiple
          value={value}
          onChange={(e) => set(filtro.name, e.target.value)}
          label={filtro.label}
        >
          {selectOptions.map((opt) => (
            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }

  // select simple
  if (filtro.type === 'select') {
    const selectOptions = filtro.options || options[filtro.optionsKey] || [];

    return (
      <FormControl sx={{ minWidth: 160 }} key={filtro.name}>
        <InputLabel>{filtro.label}</InputLabel>
        <Select
          value={value}
          onChange={(e) => set(filtro.name, e.target.value)}
          label={filtro.label}
        >
          <MenuItem value="">Todos</MenuItem>
          {selectOptions.map((opt) => (
            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }

  // number
  if (filtro.type === 'number') {
    return (
      <TextField
        key={filtro.name}
        type="number"
        label={filtro.label}
        value={value}
        onChange={(e) => set(filtro.name, e.target.value)}
        sx={{ width: 120 }}
      />
    );
  }

  return null;
})}

      <Button variant="outlined" onClick={() => setFilters(prev => ({ ...prev, ...defaultFilters }))}>
        Limpiar
      </Button>
      {onRefresh && <Button onClick={onRefresh}>Actualizar</Button>}
    </Stack>
  );
};
