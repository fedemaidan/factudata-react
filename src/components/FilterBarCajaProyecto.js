import { useEffect, useMemo, useState, forwardRef, useRef, useCallback } from 'react';
import {
  Stack, TextField, Select, MenuItem, FormControl, InputLabel, Button, Autocomplete,
  Chip, Divider, Box, Typography, Collapse, IconButton, Popover, List, ListItem,
  ListItemText, ListItemSecondaryAction, ListItemIcon,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DatePicker from 'react-datepicker';
import { subDays, startOfMonth, endOfMonth } from 'date-fns';
import FiltrosGuardadosService from 'src/services/filtrosGuardadosService';

/* ────────────────────────── constantes ────────────────────────── */

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

const DATE_KEYS = ['fechaDesde', 'fechaHasta', 'fechaPagoDesde', 'fechaPagoHasta'];
const serializeFilters = (f) => {
  const out = { ...f };
  DATE_KEYS.forEach((k) => { if (out[k] instanceof Date) out[k] = out[k].toISOString(); });
  // no guardar caja ni orden (son del layout, no del filtro)
  delete out.caja;
  delete out.ordenarPor;
  delete out.ordenarDir;
  return out;
};
const deserializeFilters = (f) => {
  const out = { ...f };
  DATE_KEYS.forEach((k) => { if (typeof out[k] === 'string' && out[k]) out[k] = new Date(out[k]); });
  return out;
};

/* ────────────────────────── componente ────────────────────────── */

export const FilterBarCajaProyecto = ({
  filters,
  setFilters,
  options,
  onRefresh,
  empresa,
  expanded = false,
  onToggleExpanded,
  storageKey,          // proyectoId
  empresaId,           // empresa.id — para persistir en Mongo
  userId,              // uid del usuario logueado
}) => {
  const [focusField, setFocusField] = useState(null);

  /* ── DateInput helper ── */
  const DateInput = forwardRef(function DateInput(props, ref) {
    return (
      <TextField
        {...props}
        inputRef={ref}
        size="small"
        variant="outlined"
        sx={{ width: 110 }}
      />
    );
  });

  const presets = [
    { label: 'Hoy', from: new Date(), to: new Date() },
    { label: '7 días', from: subDays(new Date(), 7), to: new Date() },
    { label: '30 días', from: subDays(new Date(), 30), to: new Date() },
    { label: 'Mes', from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
  ];

  /* ── Subcategorías dependientes de categorías ── */
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
      if ((filters.subcategorias || []).length > 0) setFilters((f) => ({ ...f, subcategorias: [] }));
      return;
    }
    const allowed = new Set(subcategoriasDisponibles);
    const next = (filters.subcategorias || []).filter((s) => allowed.has(s));
    if (next.length !== (filters.subcategorias || []).length) setFilters((f) => ({ ...f, subcategorias: next }));
  }, [filters.categorias, subcategoriasDisponibles, filters.subcategorias, setFilters]);

  /* ── Definición de filtros ── */
  const DEFINICION_FILTROS = [
    { name: 'observacion', label: 'Observación', type: 'text', visibleIf: () => true },
    { name: 'palabras', label: 'Buscar', type: 'text', visibleIf: () => true },
    { name: 'codigoSync', label: 'Código de importación', type: 'text', visibleIf: () => false },
    { name: 'tipo', label: 'Tipo', type: 'selectMultiple', options: ['ingreso', 'egreso'], visibleIf: () => true },
    { name: 'moneda', label: 'Moneda', type: 'selectMultiple', optionsKey: 'monedas', visibleIf: () => true },
    { name: 'proveedores', label: 'Proveedor', type: 'selectMultiple', optionsKey: 'proveedores', visibleIf: (emp) => emp?.proveedores?.length > 0 },
    { name: 'categorias', label: 'Categoría', type: 'selectMultiple', optionsKey: 'categorias', visibleIf: (emp) => (emp?.categorias?.length > 0) || (options?.categorias?.length > 0) },
    { name: 'subcategorias', label: 'Subcategoría', type: 'selectMultiple', optionsKey: 'subcategorias', visibleIf: (emp) => emp?.comprobante_info?.subcategoria && (options?.subcategorias?.length > 0) },
    { name: 'medioPago', label: 'Medio de pago', type: 'selectMultiple', optionsKey: 'mediosPago', visibleIf: (emp) => emp?.comprobante_info?.medio_pago },
    { name: 'etapa', label: 'Etapa', type: 'selectMultiple', optionsKey: 'etapas', visibleIf: (emp) => emp?.comprobante_info?.etapa },
    { name: 'estados', label: 'Estado', type: 'selectMultiple', options: ['Pendiente', 'Pagado'], visibleIf: (emp) => emp?.con_estados },
    { name: 'montoMin', label: 'Monto mínimo', type: 'number', visibleIf: () => true },
    { name: 'montoMax', label: 'Monto máximo', type: 'number', visibleIf: () => true },
    { name: 'empresaFacturacion', label: 'Empresa facturación', type: 'selectMultiple', optionsKey: 'empresasFacturacion', visibleIf: () => empresa?.comprobante_info?.empresa_facturacion },
    { name: 'facturaCliente', label: 'Factura cliente', type: 'select', options: ['cliente', 'propia'], visibleIf: () => empresa?.comprobante_info?.factura_cliente },
    { name: 'tagsExtra', label: 'Tags extra', type: 'selectMultiple', optionsKey: 'tags', visibleIf: () => options?.tags?.length > 0 },
  ];

  const getFiltrosVisibles = useCallback(
    (emp) => DEFINICION_FILTROS.filter((f) => f.visibleIf ? f.visibleIf(emp) : true),
    [options, empresa],
  );

  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const formatDate = (d) => (d ? d.toLocaleDateString('es-AR') : '');
  const clearAll = () => setFilters((prev) => ({ ...prev, ...defaultFilters }));

  /* ── Chips activos ── */
  const activeChips = useMemo(() => {
    const chips = [];
    const add = (label, onDelete, focusKey = null) => chips.push({ label, onDelete, focusKey });

    if (filters.fechaDesde || filters.fechaHasta) {
      const l = filters.fechaDesde && filters.fechaHasta
        ? `${formatDate(filters.fechaDesde)} – ${formatDate(filters.fechaHasta)}`
        : (filters.fechaDesde ? `Desde: ${formatDate(filters.fechaDesde)}` : `Hasta: ${formatDate(filters.fechaHasta)}`);
      add(l, () => setFilters((f) => ({ ...f, fechaDesde: null, fechaHasta: null })), 'fechaDesde');
    }
    if (filters.fechaPagoDesde || filters.fechaPagoHasta) {
      const l = filters.fechaPagoDesde && filters.fechaPagoHasta
        ? `Pago: ${formatDate(filters.fechaPagoDesde)} – ${formatDate(filters.fechaPagoHasta)}`
        : (filters.fechaPagoDesde ? `Pago desde: ${formatDate(filters.fechaPagoDesde)}` : `Pago hasta: ${formatDate(filters.fechaPagoHasta)}`);
      add(l, () => setFilters((f) => ({ ...f, fechaPagoDesde: null, fechaPagoHasta: null })), 'fechaPagoDesde');
    }
    if (filters.palabras) add(`"${filters.palabras}"`, () => set('palabras', ''), 'palabras');
    if (filters.observacion) add(`Obs: ${filters.observacion}`, () => set('observacion', ''), 'observacion');
    if (filters.codigoSync) add(`Código: ${filters.codigoSync}`, () => set('codigoSync', ''), 'codigoSync');

    (filters.tipo || []).forEach((v) => add(`Tipo: ${v}`, () => set('tipo', (filters.tipo || []).filter((x) => x !== v)), 'tipo'));
    (filters.moneda || []).forEach((v) => add(`${v}`, () => set('moneda', (filters.moneda || []).filter((x) => x !== v)), 'moneda'));
    (filters.proveedores || []).forEach((v) => add(`Prov: ${v}`, () => set('proveedores', (filters.proveedores || []).filter((x) => x !== v)), 'proveedores'));
    (filters.categorias || []).forEach((v) => add(`Cat: ${v}`, () => set('categorias', (filters.categorias || []).filter((x) => x !== v)), 'categorias'));
    (filters.subcategorias || []).forEach((v) => add(`Subcat: ${v}`, () => set('subcategorias', (filters.subcategorias || []).filter((x) => x !== v)), 'subcategorias'));
    (filters.medioPago || []).forEach((v) => add(`Medio: ${v}`, () => set('medioPago', (filters.medioPago || []).filter((x) => x !== v)), 'medioPago'));
    (filters.etapa || []).forEach((v) => add(`Etapa: ${v}`, () => set('etapa', (filters.etapa || []).filter((x) => x !== v)), 'etapa'));
    (filters.estados || []).forEach((v) => add(`Estado: ${v}`, () => set('estados', (filters.estados || []).filter((x) => x !== v)), 'estados'));
    (filters.cuentaInterna || []).forEach((v) => add(`Cuenta: ${v}`, () => set('cuentaInterna', (filters.cuentaInterna || []).filter((x) => x !== v)), 'cuentaInterna'));
    (filters.tagsExtra || []).forEach((v) => add(`Tag: ${v}`, () => set('tagsExtra', (filters.tagsExtra || []).filter((x) => x !== v)), 'tagsExtra'));
    (filters.empresaFacturacion || []).forEach((v) => add(`Emp: ${v}`, () => set('empresaFacturacion', (filters.empresaFacturacion || []).filter((x) => x !== v)), 'empresaFacturacion'));
    if (filters.facturaCliente) add(filters.facturaCliente === 'cliente' ? 'Fact: Cliente' : 'Fact: Propia', () => set('facturaCliente', ''), 'facturaCliente');
    if (filters.montoMin) add(`≥ $${filters.montoMin}`, () => set('montoMin', ''), 'montoMin');
    if (filters.montoMax) add(`≤ $${filters.montoMax}`, () => set('montoMax', ''), 'montoMax');

    return chips;
  }, [filters, setFilters]);

  useEffect(() => {
    if (!focusField) return;
    const t = setTimeout(() => setFocusField(null), 0);
    return () => clearTimeout(t);
  }, [focusField]);

  /* ── Clasificación de filtros ── */
  // Siempre visibles en la barra (sin expandir)
  const alwaysVisibleNames = new Set(['proveedores', 'categorias']);

  const filtrosVisibles = getFiltrosVisibles(empresa);
  const filtrosAlwaysVisible = filtrosVisibles.filter((f) => alwaysVisibleNames.has(f.name));
  const filtrosExpandibles = filtrosVisibles.filter((f) => !alwaysVisibleNames.has(f.name) && f.name !== 'palabras');

  /* ── Render genérico de un campo de filtro ── */
  const renderFiltro = (filtro, overrideSx) => {
    const value = filters[filtro.name];

    if (filtro.type === 'text') {
      return (
        <TextField
          key={filtro.name}
          label={filtro.label}
          value={value}
          onChange={(e) => set(filtro.name, e.target.value)}
          size="small"
          variant="outlined"
          sx={overrideSx || { minWidth: 0, width: '100%' }}
          autoFocus={focusField === filtro.name}
        />
      );
    }

    if (filtro.type === 'selectMultiple') {
      if (filtro.name === 'proveedores') {
        const selectOptions = filtro.options || options[filtro.optionsKey] || [];
        return (
          <Autocomplete
            key={filtro.name}
            multiple
            options={selectOptions}
            value={value}
            onChange={(_e, v) => set(filtro.name, v)}
            filterSelectedOptions
            renderInput={(params) => (
              <TextField {...params} label={filtro.label} size="small" variant="outlined" autoFocus={focusField === filtro.name} />
            )}
            size="small"
            sx={{ minWidth: 0, width: '100%', ...(overrideSx || {}) }}
          />
        );
      }

      const isSub = filtro.name === 'subcategorias';
      const selectOptions = isSub ? subcategoriasDisponibles : (filtro.options || options[filtro.optionsKey] || []);

      return (
        <FormControl sx={overrideSx || { minWidth: 0, width: '100%' }} key={filtro.name} disabled={isSub && !filters.categorias?.length} size="small">
          <InputLabel>{filtro.label}</InputLabel>
          <Select multiple value={value} onChange={(e) => set(filtro.name, e.target.value)} label={filtro.label} autoFocus={focusField === filtro.name} size="small">
            {selectOptions.map((opt) => (<MenuItem key={opt} value={opt}>{opt}</MenuItem>))}
          </Select>
        </FormControl>
      );
    }

    if (filtro.type === 'select') {
      const selectOptions = filtro.options || options[filtro.optionsKey] || [];
      return (
        <FormControl sx={overrideSx || { minWidth: 0, width: '100%' }} key={filtro.name} size="small">
          <InputLabel>{filtro.label}</InputLabel>
          <Select value={value} onChange={(e) => set(filtro.name, e.target.value)} label={filtro.label} autoFocus={focusField === filtro.name} size="small">
            <MenuItem value="">Todos</MenuItem>
            {selectOptions.map((opt) => (<MenuItem key={opt} value={opt}>{opt}</MenuItem>))}
          </Select>
        </FormControl>
      );
    }

    if (filtro.type === 'number') {
      return (
        <TextField
          key={filtro.name}
          type="number"
          label={filtro.label}
          value={value}
          onChange={(e) => set(filtro.name, e.target.value)}
          size="small"
          variant="outlined"
          sx={overrideSx || { minWidth: 0, width: '100%' }}
          autoFocus={focusField === filtro.name}
        />
      );
    }

    return null;
  };

  /* ══════════════════════ FILTROS GUARDADOS (MongoDB) ══════════════════════ */
  const [savedFilters, setSavedFilters] = useState([]);
  const [savedAnchor, setSavedAnchor] = useState(null);
  const [saveName, setSaveName] = useState('');
  const [savingFilter, setSavingFilter] = useState(false);
  const defaultAppliedRef = useRef(false);

  // Cargar filtros guardados desde la API
  const fetchSaved = useCallback(async () => {
    if (!empresaId) return;
    try {
      const data = await FiltrosGuardadosService.listar(empresaId);
      setSavedFilters(data);

      // Aplicar default solo la primera vez
      if (!defaultAppliedRef.current) {
        defaultAppliedRef.current = true;
        const def = data.find((f) => f.is_default);
        if (def) setFilters((prev) => ({ ...prev, ...deserializeFilters(def.filtros) }));
      }
    } catch (err) {
      console.error('Error al cargar filtros guardados:', err);
    }
  }, [empresaId]);

  useEffect(() => { fetchSaved(); }, [fetchSaved]);

  const handleSaveFilter = async () => {
    const name = saveName.trim();
    if (!name || savingFilter) return;
    setSavingFilter(true);
    try {
      await FiltrosGuardadosService.crear({
        empresa_id: empresaId,
        nombre: name,
        filtros: serializeFilters(filters),
        creado_por: userId || null,
      });
      setSaveName('');
      await fetchSaved();
    } catch (err) {
      console.error('Error al guardar filtro:', err);
    } finally {
      setSavingFilter(false);
    }
  };

  const handleApplySaved = (sf) => {
    setFilters((prev) => ({ ...prev, ...defaultFilters, ...deserializeFilters(sf.filtros) }));
    setSavedAnchor(null);
  };

  const handleToggleDefault = async (id) => {
    try {
      await FiltrosGuardadosService.toggleDefault(id);
      await fetchSaved();
    } catch (err) {
      console.error('Error al cambiar default:', err);
    }
  };

  const handleDeleteSaved = async (id) => {
    try {
      await FiltrosGuardadosService.eliminar(id);
      await fetchSaved();
    } catch (err) {
      console.error('Error al eliminar filtro:', err);
    }
  };

  const hasSaved = savedFilters.length > 0;
  const hasDefault = savedFilters.some((f) => f.is_default);

  /* ══════════════════════ RENDER ══════════════════════ */
  return (
    <Box sx={{
      border: '1px solid',
      borderColor: activeChips.length > 0 ? 'primary.light' : 'divider',
      borderRadius: 2,
      bgcolor: 'background.paper',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      {/* ═══ BARRA SIEMPRE VISIBLE ═══ */}
      <Box sx={{ px: 2, py: 1.25 }}>

        {/* Fila 1: Toggle + Chips + Guardados */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', rowGap: 0.5 }}>
          <Button
            size="small"
            variant={expanded ? 'contained' : 'outlined'}
            startIcon={<FilterListIcon />}
            endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={onToggleExpanded}
            sx={{ flexShrink: 0 }}
          >
            Filtros{activeChips.length > 0 ? ` (${activeChips.length})` : ''}
          </Button>

          {activeChips.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
              {activeChips.map((chip, idx) => (
                <Chip
                  key={`${chip.label}-${idx}`}
                  label={chip.label}
                  onDelete={chip.onDelete}
                  onClick={chip.focusKey ? () => { setFocusField(chip.focusKey); if (!expanded) onToggleExpanded?.(); } : undefined}
                  size="small"
                  clickable={Boolean(chip.focusKey)}
                  sx={{ maxWidth: 200 }}
                />
              ))}
              <Button size="small" variant="text" onClick={clearAll} sx={{ flexShrink: 0, ml: 0.5 }}>
                Limpiar
              </Button>
            </Box>
          )}

        </Stack>

        {/* Fila 2: Todo en una fila — Fechas compactas | Presets | Buscar | Proveedor | Categoría */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
          {/* Rango de fechas compacto */}
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
            <DatePicker
              selected={filters.fechaDesde}
              onChange={(date) => set('fechaDesde', date)}
              selectsStart
              startDate={filters.fechaDesde}
              endDate={filters.fechaHasta}
              placeholderText="Desde"
              dateFormat="dd/MM/yy"
              autoFocus={focusField === 'fechaDesde'}
              customInput={<DateInput />}
            />
            <Typography variant="body2" color="text.secondary" sx={{ px: 0.25 }}>–</Typography>
            <DatePicker
              selected={filters.fechaHasta}
              onChange={(date) => set('fechaHasta', date)}
              selectsEnd
              startDate={filters.fechaDesde}
              endDate={filters.fechaHasta}
              minDate={filters.fechaDesde}
              placeholderText="Hasta"
              dateFormat="dd/MM/yy"
              autoFocus={focusField === 'fechaHasta'}
              customInput={<DateInput />}
            />
          </Stack>
          <Stack direction="row" spacing={0} alignItems="center" sx={{ flexShrink: 0 }}>
            {presets.map((p) => (
              <Button
                key={p.label}
                size="small"
                variant="text"
                onClick={() => setFilters((f) => ({ ...f, fechaDesde: p.from, fechaHasta: p.to }))}
                sx={{ minWidth: 'auto', px: 0.75, fontSize: '0.7rem', lineHeight: 1.2 }}
              >
                {p.label}
              </Button>
            ))}
          </Stack>
          <Divider orientation="vertical" flexItem />
          {/* Buscar */}
          <TextField
            value={filters.palabras}
            onChange={(e) => set('palabras', e.target.value)}
            size="small"
            variant="outlined"
            sx={{ flex: 1, minWidth: 140 }}
            autoFocus={focusField === 'palabras'}
            placeholder="Buscar…"
          />
          <Divider orientation="vertical" flexItem />
          {/* Proveedor y Categoría inline */}
          {filtrosAlwaysVisible.map((f) => (
            <Box key={f.name} sx={{ minWidth: 140, flex: '0 1 180px' }}>
              {renderFiltro(f)}
            </Box>
          ))}

          {/* Botón filtros guardados — posición fija al final de la fila */}
          {empresaId && (
            <IconButton
              size="small"
              onClick={(e) => setSavedAnchor(e.currentTarget)}
              sx={{ flexShrink: 0, ml: 'auto' }}
              title="Filtros guardados"
            >
              {hasSaved ? <BookmarkIcon color={hasDefault ? 'primary' : 'action'} /> : <BookmarkBorderIcon />}
            </IconButton>
          )}
        </Stack>
      </Box>

      {/* ═══ PANEL EXPANDIBLE ═══ */}
      <Collapse in={expanded} timeout={250}>
        <Divider />
        <Box sx={{ px: 2, py: 1.5 }}>
          {/* Filtros expandibles en grid */}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Más filtros
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 1.5 }}>
            {filtrosExpandibles.map((filtro) => renderFiltro(filtro))}
          </Box>

          {/* Fecha de pago */}
          {empresa?.con_estados && (
            <>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                Fecha de pago
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <DatePicker
                  selected={filters.fechaPagoDesde}
                  onChange={(date) => set('fechaPagoDesde', date)}
                  selectsStart
                  startDate={filters.fechaPagoDesde}
                  endDate={filters.fechaPagoHasta}
                  placeholderText="Pago desde"
                  dateFormat="dd/MM/yyyy"
                  autoFocus={focusField === 'fechaPagoDesde'}
                  customInput={<DateInput />}
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
                  customInput={<DateInput />}
                />
              </Stack>
            </>
          )}

          {/* Footer */}
          <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={1} sx={{ mt: 2 }}>
            <Button size="small" variant="text" onClick={clearAll}>Restaurar defaults</Button>
            {onRefresh && <Button size="small" variant="outlined" onClick={onRefresh}>Actualizar</Button>}
          </Stack>
        </Box>
      </Collapse>

      {/* ═══ POPOVER FILTROS GUARDADOS ═══ */}
      <Popover
        open={Boolean(savedAnchor)}
        anchorEl={savedAnchor}
        onClose={() => setSavedAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 320, maxHeight: 420 } } }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Filtros guardados</Typography>

          {savedFilters.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              No tenés filtros guardados todavía.
            </Typography>
          )}

          {savedFilters.length > 0 && (
            <List dense disablePadding sx={{ mb: 1.5 }}>
              {savedFilters.map((sf) => (
                <ListItem
                  key={sf._id}
                  disableGutters
                  sx={{
                    borderRadius: 1,
                    px: 1,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  onClick={() => handleApplySaved(sf)}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); handleToggleDefault(sf._id); }}
                      title={sf.is_default ? 'Quitar como default' : 'Usar como default al abrir'}
                    >
                      {sf.is_default ? <StarIcon fontSize="small" color="warning" /> : <StarBorderIcon fontSize="small" />}
                    </IconButton>
                  </ListItemIcon>
                  <ListItemText
                    primary={sf.nombre}
                    secondary={sf.is_default ? 'Se aplica al abrir' : null}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: sf.is_default ? 600 : 400 }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                  <ListItemSecondaryAction>
                    <IconButton size="small" edge="end" onClick={(e) => { e.stopPropagation(); handleDeleteSaved(sf._id); }}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}

          <Divider sx={{ my: 1 }} />

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Guardar filtros actuales
          </Typography>
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              placeholder="Nombre del filtro"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveFilter(); }}
              sx={{ flex: 1 }}
            />
            <Button size="small" variant="contained" onClick={handleSaveFilter} disabled={!saveName.trim() || savingFilter}>
              Guardar
            </Button>
          </Stack>
        </Box>
      </Popover>
    </Box>
  );
};
