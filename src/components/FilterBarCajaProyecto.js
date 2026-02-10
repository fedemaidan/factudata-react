import { useEffect, useMemo, useState } from 'react';
import { Stack, TextField, Select, MenuItem, FormControl, InputLabel, Button, Autocomplete, Chip } from '@mui/material';
import DatePicker from 'react-datepicker';

// arriba del archivo
const defaultFilters = {
  fechaDesde: null,
  fechaHasta: null,
  palabras: '',
  observacion: '',
  codigoSync: '',
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
  estados: [],
  empresaFacturacion: [],
  fechaPagoDesde: null,
  fechaPagoHasta: null,
  facturaCliente: '',
};

export const FilterBarCajaProyecto = ({
  filters,
  setFilters,
  options,
  onRefresh,
  empresa, 
}) => {
  const [focusField, setFocusField] = useState(null);

  const subcategoriasDisponibles = useMemo(() => {
    const cats = filters.categorias || [];
    if (!cats.length) return [];
    const map = options?.subcategoriasByCategoria || {};
    const acc = new Set();
    cats.forEach((c) => (map[c] || []).forEach((s) => acc.add(s)));
    return Array.from(acc);
  }, [filters.categorias, options?.subcategoriasByCategoria]);

  useEffect(() => {
    const cats = filters.categorias || [];
    if (!cats.length) {
      if ((filters.subcategorias || []).length > 0) {
        setFilters((f) => ({ ...f, subcategorias: [] }));
      }
      return;
    }
    const allowed = new Set(subcategoriasDisponibles);
    const next = (filters.subcategorias || []).filter((s) => allowed.has(s));
    if (next.length !== (filters.subcategorias || []).length) {
      setFilters((f) => ({ ...f, subcategorias: next }));
    }
  }, [filters.categorias, subcategoriasDisponibles, filters.subcategorias, setFilters]);

  const DEFINICION_FILTROS = [
    { name: 'observacion', label: 'Observación', type: 'text', visibleIf: () => true },
    { name: 'palabras', label: 'Palabras sueltas', type: 'text', visibleIf: () => true },
    { name: 'codigoSync', label: 'Código de importación', type: 'text', visibleIf: () => false }, // Oculto - solo por URL
    { name: 'tipo', label: 'Tipo', type: 'selectMultiple', options: ['ingreso', 'egreso'], visibleIf: () => true },
    { name: 'moneda', label: 'Moneda', type: 'selectMultiple', optionsKey: 'monedas', visibleIf: () => true },
    { name: 'proveedores', label: 'Proveedor', type: 'selectMultiple', optionsKey: 'proveedores', visibleIf: (empresa) => empresa?.proveedores?.length > 0 },
    { name: 'categorias', label: 'Categoría', type: 'selectMultiple', optionsKey: 'categorias', visibleIf: (empresa) => empresa?.categorias?.length > 0 },
    { name: 'subcategorias', label: 'Subcategoría', type: 'selectMultiple', optionsKey: 'subcategorias', visibleIf: (empresa) => empresa?.comprobante_info?.subcategoria },
    { name: 'medioPago', label: 'Medio de pago', type: 'selectMultiple', optionsKey: 'mediosPago', visibleIf: (empresa) => empresa?.comprobante_info?.medio_pago },
    { name: 'etapa', label: 'Etapa', type: 'selectMultiple', optionsKey: 'etapas', visibleIf: (empresa) => empresa?.comprobante_info?.etapa },
    { name: 'estados', label: 'Estado', type: 'selectMultiple', options: ['Pendiente', 'Pagado'], visibleIf: (empresa) => empresa?.con_estados },
    { name: 'montoMin', label: 'Monto mínimo', type: 'number', visibleIf: () => true },
    { name: 'montoMax', label: 'Monto máximo', type: 'number', visibleIf: () => true },
    { name: 'empresaFacturacion', label: 'Empresa facturación', type: 'selectMultiple', optionsKey: 'empresasFacturacion', visibleIf: () => empresa?.comprobante_info?.empresa_facturacion },
    { name: 'facturaCliente', label: 'Factura cliente', type: 'select', options: ['cliente', 'propia'], visibleIf: () => empresa?.comprobante_info?.factura_cliente },
    { name: 'tagsExtra', label: 'Tags extra', type: 'selectMultiple', optionsKey: 'tags', visibleIf: (empresa) => options?.tags?.length > 0 },
  ];
  
  function getFiltrosVisibles(empresa) {
    return DEFINICION_FILTROS.filter((f) => {
      if (!f.visibleIf) return true;
      return f.visibleIf(empresa);
    });
  }

  
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  const formatDate = (d) => d ? d.toLocaleDateString('es-AR') : '';

  const activeChips = useMemo(() => {
    const chips = [];
    const addChip = (label, onDelete, focusKey = null) => chips.push({ label, onDelete, focusKey });

    if (filters.fechaDesde || filters.fechaHasta) {
      const label = filters.fechaDesde && filters.fechaHasta
        ? `Fecha: ${formatDate(filters.fechaDesde)} - ${formatDate(filters.fechaHasta)}`
        : (filters.fechaDesde ? `Fecha desde: ${formatDate(filters.fechaDesde)}` : `Fecha hasta: ${formatDate(filters.fechaHasta)}`);
      addChip(label, () => setFilters((f) => ({ ...f, fechaDesde: defaultFilters.fechaDesde, fechaHasta: defaultFilters.fechaHasta })), 'fechaDesde');
    }

    if (filters.fechaPagoDesde || filters.fechaPagoHasta) {
      const label = filters.fechaPagoDesde && filters.fechaPagoHasta
        ? `Pago: ${formatDate(filters.fechaPagoDesde)} - ${formatDate(filters.fechaPagoHasta)}`
        : (filters.fechaPagoDesde ? `Pago desde: ${formatDate(filters.fechaPagoDesde)}` : `Pago hasta: ${formatDate(filters.fechaPagoHasta)}`);
      addChip(label, () => setFilters((f) => ({ ...f, fechaPagoDesde: null, fechaPagoHasta: null })), 'fechaPagoDesde');
    }

    if (filters.palabras) {
      addChip(`Palabras: ${filters.palabras}`, () => set('palabras', ''), 'palabras');
    }
    if (filters.observacion) {
      addChip(`Observación: ${filters.observacion}`, () => set('observacion', ''), 'observacion');
    }
    if (filters.codigoSync) {
      addChip(`Código: ${filters.codigoSync}`, () => set('codigoSync', ''), 'codigoSync');
    }

    (filters.tipo || []).forEach((v) => addChip(`Tipo: ${v}`, () => set('tipo', (filters.tipo || []).filter((x) => x !== v)), 'tipo'));
    (filters.moneda || []).forEach((v) => addChip(`Moneda: ${v}`, () => set('moneda', (filters.moneda || []).filter((x) => x !== v)), 'moneda'));
    (filters.proveedores || []).forEach((v) => addChip(`Proveedor: ${v}`, () => set('proveedores', (filters.proveedores || []).filter((x) => x !== v)), 'proveedores'));
    (filters.categorias || []).forEach((v) => addChip(`Categoría: ${v}`, () => set('categorias', (filters.categorias || []).filter((x) => x !== v)), 'categorias'));
    (filters.subcategorias || []).forEach((v) => addChip(`Subcategoría: ${v}`, () => set('subcategorias', (filters.subcategorias || []).filter((x) => x !== v)), 'subcategorias'));
    (filters.medioPago || []).forEach((v) => addChip(`Medio: ${v}`, () => set('medioPago', (filters.medioPago || []).filter((x) => x !== v)), 'medioPago'));
    (filters.etapa || []).forEach((v) => addChip(`Etapa: ${v}`, () => set('etapa', (filters.etapa || []).filter((x) => x !== v)), 'etapa'));
    (filters.estados || []).forEach((v) => addChip(`Estado: ${v}`, () => set('estados', (filters.estados || []).filter((x) => x !== v)), 'estados'));
    (filters.cuentaInterna || []).forEach((v) => addChip(`Cuenta: ${v}`, () => set('cuentaInterna', (filters.cuentaInterna || []).filter((x) => x !== v)), 'cuentaInterna'));
    (filters.tagsExtra || []).forEach((v) => addChip(`Tag: ${v}`, () => set('tagsExtra', (filters.tagsExtra || []).filter((x) => x !== v)), 'tagsExtra'));
    (filters.empresaFacturacion || []).forEach((v) => addChip(`Emp. fact.: ${v}`, () => set('empresaFacturacion', (filters.empresaFacturacion || []).filter((x) => x !== v)), 'empresaFacturacion'));

    if (filters.facturaCliente) {
      const label = filters.facturaCliente === 'cliente' ? 'Factura: Cliente' : 'Factura: Propia';
      addChip(label, () => set('facturaCliente', ''), 'facturaCliente');
    }

    if (filters.montoMin) {
      addChip(`Monto min: ${filters.montoMin}`, () => set('montoMin', ''), 'montoMin');
    }
    if (filters.montoMax) {
      addChip(`Monto max: ${filters.montoMax}`, () => set('montoMax', ''), 'montoMax');
    }

    return chips;
  }, [filters, setFilters]);

  useEffect(() => {
    if (!focusField) return;
    const t = setTimeout(() => setFocusField(null), 0);
    return () => clearTimeout(t);
  }, [focusField]);

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
          autoFocus={focusField === 'fechaDesde'}
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
          autoFocus={focusField === 'fechaHasta'}
        />
      </Stack>

      {empresa?.comprobante_info?.fecha_pago && <Stack direction="row" spacing={1} alignItems="center">
          <DatePicker
            selected={filters.fechaPagoDesde}
            onChange={(date) => set('fechaPagoDesde', date)}
            selectsStart
            startDate={filters.fechaPagoDesde}
            endDate={filters.fechaPagoHasta}
            placeholderText="Pago desde"
            dateFormat="dd/MM/yyyy"
            autoFocus={focusField === 'fechaPagoDesde'}
          />
          <DatePicker
            selected={filters.fechaPagoHasta}
            onChange={(date) => set('fechaPagoHasta', date)}
            selectsEnd
            startDate={filters.fechaPagoDesde}
            endDate={filters.fechaPagoHasta}
            minDate={filters.fechaPagoDesde}
            placeholderText="Pago hasta"
            dateFormat="dd/MM/yyyy"
            autoFocus={focusField === 'fechaPagoHasta'}
          />
        </Stack>
      }

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
        autoFocus={focusField === filtro.name}
      />
    );
  }

  // select múltiple
  if (filtro.type === 'selectMultiple') {
    if (filtro.name === 'proveedores') {
      const selectOptions = filtro.options || options[filtro.optionsKey] || [];
      return (
        <Autocomplete
          key={filtro.name}
          multiple
          options={selectOptions}
          value={value}
          onChange={(_e, newValue) => set(filtro.name, newValue)}
          filterSelectedOptions
          renderInput={(params) => (
            <TextField {...params} label={filtro.label} sx={{ minWidth: 240 }} autoFocus={focusField === filtro.name} />
          )}
          sx={{ minWidth: 240 }}
        />
      );
    }

    const isSubcategorias = filtro.name === 'subcategorias';
    const selectOptions = isSubcategorias
      ? subcategoriasDisponibles
      : (filtro.options || options[filtro.optionsKey] || []);

    return (
      <FormControl sx={{ minWidth: 200 }} key={filtro.name} disabled={isSubcategorias && !filters.categorias?.length}>
        <InputLabel>{filtro.label}</InputLabel>
        <Select
          multiple
          value={value}
          onChange={(e) => set(filtro.name, e.target.value)}
          label={filtro.label}
          autoFocus={focusField === filtro.name}
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
          autoFocus={focusField === filtro.name}
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
        autoFocus={focusField === filtro.name}
      />
    );
  }

  return null;
})}

      {onRefresh && <Button onClick={onRefresh}>Actualizar</Button>}

      {activeChips.length > 0 ? (
        <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" sx={{ width: '100%' }}>
          {activeChips.map((chip, idx) => (
            <Chip
              key={`${chip.label}-${idx}`}
              label={chip.label}
              onDelete={chip.onDelete}
              onClick={chip.focusKey ? () => setFocusField(chip.focusKey) : undefined}
              size="small"
              clickable={Boolean(chip.focusKey)}
            />
          ))}
          <Button size="small" variant="text" onClick={() => setFilters(prev => ({ ...prev, ...defaultFilters }))}>
            Limpiar todo
          </Button>
        </Stack>
      ) : (
        <Button variant="outlined" onClick={() => setFilters(prev => ({ ...prev, ...defaultFilters }))}>
          Limpiar todo
        </Button>
      )}
    </Stack>
  );
};
