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
};


export const FilterBarCajaProyecto = ({
  filters,
  setFilters,
  options,
  onRefresh,
}) => {
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

      <TextField
        label="Observación"
        value={filters.observacion}
        onChange={(e) => set('observacion', e.target.value)}
        sx={{ minWidth: 200 }}
      />

      <TextField
        label="Palabras sueltas"
        value={filters.palabras}
        onChange={(e) => set('palabras', e.target.value)}
        sx={{ minWidth: 200 }}
      />

      <FormControl sx={{ minWidth: 180 }}>
        <InputLabel>Tipo</InputLabel>
        <Select
          multiple
          value={filters.tipo}
          onChange={(e) => set('tipo', e.target.value)}
          label="Tipo"
        >
          <MenuItem value="ingreso">Ingreso</MenuItem>
          <MenuItem value="egreso">Egreso</MenuItem>
        </Select>
      </FormControl>

      <FormControl sx={{ minWidth: 180 }}>
        <InputLabel>Moneda</InputLabel>
        <Select
          multiple
          value={filters.moneda}
          onChange={(e) => set('moneda', e.target.value)}
          label="Moneda"
        >
          {(options?.monedas ?? []).map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
        </Select>
      </FormControl>
       <FormControl sx={{ minWidth: 200 }}>
        <InputLabel>Proveedor</InputLabel>
        <Select
          multiple
          value={filters.proveedores}
          onChange={(e) => set('proveedores', e.target.value)}
          label="Proveedor"
        >
          {(options?.proveedores ?? []).map((p) => (
            <MenuItem key={p} value={p}>{p}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl sx={{ minWidth: 200 }}>
        <InputLabel>Categoría</InputLabel>
        <Select
          multiple
          value={filters.categorias}
          onChange={(e) => set('categorias', e.target.value)}
          label="Categoría"
        >
          {options.categorias.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </Select>
      </FormControl>

      <FormControl sx={{ minWidth: 200 }}>
        <InputLabel>Subcategoría</InputLabel>
        <Select
          multiple
          value={filters.subcategorias}
          onChange={(e) => set('subcategorias', e.target.value)}
          label="Subcategoría"
        >
          {options.subcategorias.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </Select>
      </FormControl>

      <FormControl sx={{ minWidth: 200 }}>
        <InputLabel>Medio de pago</InputLabel>
        <Select
          multiple
          value={filters.medioPago}
          onChange={(e) => set('medioPago', e.target.value)}
          label="Medio de pago"
        >
          {options.mediosPago.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
        </Select>
      </FormControl>

      <TextField
        label="Monto mínimo"
        type="number"
        value={filters.montoMin}
        onChange={(e) => set('montoMin', e.target.value)}
        sx={{ width: 120 }}
      />
      <TextField
        label="Monto máximo"
        type="number"
        value={filters.montoMax}
        onChange={(e) => set('montoMax', e.target.value)}
        sx={{ width: 120 }}
      />

      <Button variant="outlined" onClick={() => setFilters(prev => ({ ...prev, ...defaultFilters }))}>
        Limpiar
      </Button>
      {onRefresh && <Button onClick={onRefresh}>Actualizar</Button>}
    </Stack>
  );
};
