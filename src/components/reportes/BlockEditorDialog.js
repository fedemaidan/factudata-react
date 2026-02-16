import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, TextField,
  FormControl, InputLabel, Select, MenuItem, Typography, Box, IconButton,
  Divider, Switch, FormControlLabel, Chip, Autocomplete, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

// ─── Constantes ───

const BLOCK_TYPES = [
  { value: 'metric_cards', label: 'Tarjetas de Métricas', desc: 'Muestra KPIs como total egresos, cantidad de movimientos, ticket promedio, etc.' },
  { value: 'summary_table', label: 'Tabla Resumen', desc: 'Agrupa movimientos por categoría, proveedor, etapa, mes, etc. con totales.' },
  { value: 'movements_table', label: 'Tabla de Movimientos', desc: 'Lista individual de movimientos con paginación.' },
  { value: 'budget_vs_actual', label: 'Presupuesto vs Real', desc: 'Compara presupuesto de control vs gastos reales por categoría.' },
];

const OPERACIONES = [
  { value: 'sum', label: 'Suma' },
  { value: 'count', label: 'Contar' },
  { value: 'avg', label: 'Promedio' },
  { value: 'min', label: 'Mínimo' },
  { value: 'max', label: 'Máximo' },
];

const CAMPOS = [
  { value: 'total', label: 'Monto Total' },
  { value: 'subtotal', label: 'Subtotal (sin impuestos)' },
];

const FORMATOS = [
  { value: 'currency', label: 'Moneda ($)' },
  { value: 'number', label: 'Número' },
  { value: 'percentage', label: 'Porcentaje (%)' },
];

const COLORES = [
  { value: 'default', label: 'Default' },
  { value: 'success', label: 'Verde (éxito)' },
  { value: 'error', label: 'Rojo (error)' },
  { value: 'warning', label: 'Naranja (alerta)' },
  { value: 'info', label: 'Azul (info)' },
];

const FILTRO_TIPOS = [
  { value: '', label: 'Todos' },
  { value: 'egreso', label: 'Solo Egresos' },
  { value: 'ingreso', label: 'Solo Ingresos' },
];

const AGRUPAR_POR = [
  { value: 'categoria', label: 'Categoría' },
  { value: 'proveedor', label: 'Proveedor' },
  { value: 'etapa', label: 'Etapa' },
  { value: 'proyecto', label: 'Proyecto' },
  { value: 'mes', label: 'Mes' },
  { value: 'moneda_original', label: 'Moneda Original' },
  { value: 'medio_pago', label: 'Medio de Pago' },
];

const COLUMNAS_VISIBLES_OPTIONS = [
  { value: 'fecha_factura', label: 'Fecha' },
  { value: 'tipo', label: 'Tipo' },
  { value: 'categoria', label: 'Categoría' },
  { value: 'proveedor_nombre', label: 'Proveedor' },
  { value: 'proyecto_nombre', label: 'Proyecto' },
  { value: 'monto_display', label: 'Monto' },
  { value: 'subtotal_display', label: 'Subtotal' },
  { value: 'moneda', label: 'Moneda' },
  { value: 'medioPago', label: 'Medio de Pago' },
  { value: 'notas', label: 'Notas' },
  { value: 'etapa', label: 'Etapa' },
  { value: 'estado', label: 'Estado' },
  { value: 'usuario_nombre', label: 'Usuario' },
];

// ─── Helpers ───

function emptyMetrica() {
  return {
    id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    titulo: '',
    operacion: 'sum',
    campo: 'total',
    filtro_tipo: null,
    formato: 'currency',
    color: 'default',
  };
}

function emptyColumna() {
  return {
    id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    titulo: '',
    operacion: 'sum',
    campo: 'total',
    formato: 'currency',
  };
}

function defaultBlock(type) {
  const base = { type, titulo: '' };
  switch (type) {
    case 'metric_cards':
      return { ...base, metricas: [emptyMetrica()] };
    case 'summary_table':
      return {
        ...base,
        agrupar_por: 'categoria',
        columnas: [{ id: 'total', titulo: 'Total', operacion: 'sum', campo: 'total', formato: 'currency' }],
        mostrar_porcentaje: false,
        filtro_tipo: null,
        mostrar_total: true,
        top_n: null,
      };
    case 'movements_table':
      return {
        ...base,
        columnas_visibles: ['fecha_factura', 'tipo', 'categoria', 'proveedor_nombre', 'proyecto_nombre', 'monto_display', 'moneda'],
        page_size: 25,
        filtro_tipo: null,
      };
    case 'budget_vs_actual':
      return {
        ...base,
        mostrar_tipo: 'egreso',
        alerta_sobreejecucion: true,
      };
    default:
      return base;
  }
}

// ─── Componente Principal ───

const BlockEditorDialog = ({ open, onClose, onSave, initialBlock }) => {
  const isEditing = !!initialBlock;
  const [step, setStep] = useState(isEditing ? 1 : 0); // 0=elegir tipo, 1=configurar
  const [block, setBlock] = useState(null);

  useEffect(() => {
    if (open) {
      if (initialBlock) {
        setBlock({ ...initialBlock });
        setStep(1);
      } else {
        setBlock(null);
        setStep(0);
      }
    }
  }, [open, initialBlock]);

  const handleSelectType = (type) => {
    setBlock(defaultBlock(type));
    setStep(1);
  };

  const handleSave = () => {
    if (!block) return;
    onSave(block);
    onClose();
  };

  const updateBlock = (field, value) => {
    setBlock((prev) => ({ ...prev, [field]: value }));
  };

  // ─── Step 0: Elegir tipo ───
  if (step === 0) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Elegí el tipo de bloque</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {BLOCK_TYPES.map((bt) => (
              <Box
                key={bt.value}
                onClick={() => handleSelectType(bt.value)}
                sx={{
                  p: 2, border: 1, borderColor: 'divider', borderRadius: 1,
                  cursor: 'pointer', '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                }}
              >
                <Typography variant="subtitle2" fontWeight={600}>{bt.label}</Typography>
                <Typography variant="body2" color="text.secondary">{bt.desc}</Typography>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
        </DialogActions>
      </Dialog>
    );
  }

  // ─── Step 1: Configurar bloque ───
  if (!block) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEditing ? 'Editar' : 'Configurar'} bloque: {BLOCK_TYPES.find((b) => b.value === block.type)?.label}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3} mt={1}>
          {/* Título del bloque */}
          <TextField
            label="Título del bloque"
            value={block.titulo || ''}
            onChange={(e) => updateBlock('titulo', e.target.value)}
            fullWidth
            size="small"
            placeholder="Ej: Resumen de Gastos"
          />

          {/* Filtro de tipo (compartido) */}
          {block.type !== 'budget_vs_actual' && (
            <FormControl size="small" fullWidth>
              <InputLabel>Filtrar por tipo de movimiento</InputLabel>
              <Select
                value={block.filtro_tipo || ''}
                label="Filtrar por tipo de movimiento"
                onChange={(e) => updateBlock('filtro_tipo', e.target.value || null)}
              >
                {FILTRO_TIPOS.map((ft) => (
                  <MenuItem key={ft.value} value={ft.value}>{ft.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Divider />

          {/* Config específica por tipo */}
          {block.type === 'metric_cards' && (
            <MetricCardsConfig block={block} onChange={updateBlock} />
          )}
          {block.type === 'summary_table' && (
            <SummaryTableConfig block={block} onChange={updateBlock} />
          )}
          {block.type === 'movements_table' && (
            <MovementsTableConfig block={block} onChange={updateBlock} />
          )}
          {block.type === 'budget_vs_actual' && (
            <BudgetVsActualConfig block={block} onChange={updateBlock} />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {!isEditing && (
          <Button onClick={() => setStep(0)} sx={{ mr: 'auto' }}>
            ← Cambiar tipo
          </Button>
        )}
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave}>
          {isEditing ? 'Guardar cambios' : 'Agregar bloque'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ═══════════════════════════════════════════
//  Configuradores por tipo de bloque
// ═══════════════════════════════════════════

function MetricCardsConfig({ block, onChange }) {
  const metricas = block.metricas || [];

  const updateMetrica = (idx, field, value) => {
    const updated = [...metricas];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange('metricas', updated);
  };

  const addMetrica = () => {
    onChange('metricas', [...metricas, emptyMetrica()]);
  };

  const removeMetrica = (idx) => {
    onChange('metricas', metricas.filter((_, i) => i !== idx));
  };

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2" fontWeight={600}>
        Métricas ({metricas.length})
      </Typography>
      <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
        Cada métrica se muestra como una tarjeta con un valor grande. Podés agregar hasta 8.
      </Alert>

      {metricas.map((m, idx) => (
        <Box
          key={m.id || idx}
          sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1, position: 'relative' }}
        >
          <IconButton
            size="small"
            onClick={() => removeMetrica(idx)}
            sx={{ position: 'absolute', top: 4, right: 4 }}
            color="error"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>

          <Stack spacing={2}>
            <TextField
              label="Nombre de la métrica"
              value={m.titulo || ''}
              onChange={(e) => updateMetrica(idx, 'titulo', e.target.value)}
              size="small"
              fullWidth
              placeholder="Ej: Total Egresos"
            />
            <Stack direction="row" spacing={2}>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Operación</InputLabel>
                <Select
                  value={m.operacion || 'sum'}
                  label="Operación"
                  onChange={(e) => updateMetrica(idx, 'operacion', e.target.value)}
                >
                  {OPERACIONES.map((o) => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Campo</InputLabel>
                <Select
                  value={m.campo || 'total'}
                  label="Campo"
                  onChange={(e) => updateMetrica(idx, 'campo', e.target.value)}
                >
                  {CAMPOS.map((c) => (
                    <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            <Stack direction="row" spacing={2}>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Filtro tipo</InputLabel>
                <Select
                  value={m.filtro_tipo || ''}
                  label="Filtro tipo"
                  onChange={(e) => updateMetrica(idx, 'filtro_tipo', e.target.value || null)}
                >
                  {FILTRO_TIPOS.map((ft) => (
                    <MenuItem key={ft.value} value={ft.value}>{ft.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Formato</InputLabel>
                <Select
                  value={m.formato || 'currency'}
                  label="Formato"
                  onChange={(e) => updateMetrica(idx, 'formato', e.target.value)}
                >
                  {FORMATOS.map((f) => (
                    <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Color</InputLabel>
                <Select
                  value={m.color || 'default'}
                  label="Color"
                  onChange={(e) => updateMetrica(idx, 'color', e.target.value)}
                >
                  {COLORES.map((c) => (
                    <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </Box>
      ))}

      {metricas.length < 8 && (
        <Button startIcon={<AddIcon />} onClick={addMetrica} variant="outlined" size="small">
          Agregar métrica
        </Button>
      )}
    </Stack>
  );
}

function SummaryTableConfig({ block, onChange }) {
  const columnas = block.columnas || [];

  const updateColumna = (idx, field, value) => {
    const updated = [...columnas];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange('columnas', updated);
  };

  const addColumna = () => {
    onChange('columnas', [...columnas, emptyColumna()]);
  };

  const removeColumna = (idx) => {
    onChange('columnas', columnas.filter((_, i) => i !== idx));
  };

  return (
    <Stack spacing={2}>
      <FormControl size="small" fullWidth>
        <InputLabel>Agrupar por</InputLabel>
        <Select
          value={block.agrupar_por || 'categoria'}
          label="Agrupar por"
          onChange={(e) => onChange('agrupar_por', e.target.value)}
        >
          {AGRUPAR_POR.map((a) => (
            <MenuItem key={a.value} value={a.value}>{a.label}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <Typography variant="subtitle2" fontWeight={600}>Columnas</Typography>

      {columnas.map((c, idx) => (
        <Box key={c.id || idx} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              label="Título"
              value={c.titulo || ''}
              onChange={(e) => updateColumna(idx, 'titulo', e.target.value)}
              size="small"
              sx={{ flex: 2 }}
            />
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>Operación</InputLabel>
              <Select
                value={c.operacion || 'sum'}
                label="Operación"
                onChange={(e) => updateColumna(idx, 'operacion', e.target.value)}
              >
                {OPERACIONES.filter((o) => ['sum', 'count', 'avg'].includes(o.value)).map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>Campo</InputLabel>
              <Select
                value={c.campo || 'total'}
                label="Campo"
                onChange={(e) => updateColumna(idx, 'campo', e.target.value)}
              >
                {CAMPOS.map((f) => (
                  <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <IconButton size="small" onClick={() => removeColumna(idx)} color="error">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Box>
      ))}

      <Button startIcon={<AddIcon />} onClick={addColumna} variant="outlined" size="small">
        Agregar columna
      </Button>

      <Divider />

      <Stack direction="row" spacing={2}>
        <FormControlLabel
          control={
            <Switch
              checked={block.mostrar_porcentaje || false}
              onChange={(e) => onChange('mostrar_porcentaje', e.target.checked)}
            />
          }
          label="Mostrar % del total"
        />
        <FormControlLabel
          control={
            <Switch
              checked={block.mostrar_total !== false}
              onChange={(e) => onChange('mostrar_total', e.target.checked)}
            />
          }
          label="Mostrar fila Total"
        />
      </Stack>

      <TextField
        label="Mostrar solo los primeros N (vacío = todos)"
        type="number"
        value={block.top_n || ''}
        onChange={(e) => onChange('top_n', e.target.value ? parseInt(e.target.value) : null)}
        size="small"
        fullWidth
        inputProps={{ min: 1 }}
      />
    </Stack>
  );
}

function MovementsTableConfig({ block, onChange }) {
  const selected = block.columnas_visibles || [];

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2" fontWeight={600}>Columnas visibles</Typography>
      <Autocomplete
        multiple
        size="small"
        options={COLUMNAS_VISIBLES_OPTIONS}
        getOptionLabel={(o) => o.label}
        value={COLUMNAS_VISIBLES_OPTIONS.filter((o) => selected.includes(o.value))}
        onChange={(_, val) => onChange('columnas_visibles', val.map((v) => v.value))}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip key={option.value} label={option.label} size="small" {...getTagProps({ index })} />
          ))
        }
        renderInput={(params) => <TextField {...params} label="Seleccioná columnas" />}
        disableCloseOnSelect
      />

      <TextField
        label="Movimientos por página"
        type="number"
        value={block.page_size || 25}
        onChange={(e) => onChange('page_size', parseInt(e.target.value) || 25)}
        size="small"
        fullWidth
        inputProps={{ min: 5, max: 100 }}
      />
    </Stack>
  );
}

function BudgetVsActualConfig({ block, onChange }) {
  return (
    <Stack spacing={2}>
      <FormControl size="small" fullWidth>
        <InputLabel>Mostrar tipo</InputLabel>
        <Select
          value={block.mostrar_tipo || 'egreso'}
          label="Mostrar tipo"
          onChange={(e) => onChange('mostrar_tipo', e.target.value)}
        >
          <MenuItem value="egreso">Solo Egresos</MenuItem>
          <MenuItem value="ingreso">Solo Ingresos</MenuItem>
          <MenuItem value="ambos">Ambos</MenuItem>
        </Select>
      </FormControl>

      <FormControlLabel
        control={
          <Switch
            checked={block.alerta_sobreejecucion !== false}
            onChange={(e) => onChange('alerta_sobreejecucion', e.target.checked)}
          />
        }
        label="Alertar cuando haya sobreejecución (>100%)"
      />

      <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
        Este bloque cruza los presupuestos de control cargados en Sorby con los movimientos reales, agrupados por categoría.
      </Alert>
    </Stack>
  );
}

export default BlockEditorDialog;
