import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, TextField,
  FormControl, InputLabel, Select, MenuItem, Typography, Box, IconButton,
  Divider, Switch, FormControlLabel, Chip, Autocomplete, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

// ─── Constantes ───

const BLOCK_TYPES = [
  { value: 'metric_cards', label: 'Tarjetas de Métricas', desc: 'Muestra KPIs como total egresos, cantidad de movimientos, ticket promedio, etc.' },
  { value: 'summary_table', label: 'Tabla Resumen', desc: 'Agrupa movimientos por categoría, proveedor, etapa, mes, etc. con totales.' },
  { value: 'movements_table', label: 'Tabla de Movimientos', desc: 'Lista individual de movimientos con paginación.' },
  { value: 'budget_vs_actual', label: 'Presupuesto vs Real', desc: 'Compara presupuesto de control vs gastos reales por categoría.' },
  { value: 'supplier_budgets', label: 'Presupuestos por Proveedor', desc: 'Lista presupuestos vinculados a proveedores en distintas obras activas.' },
  { value: 'monthly_budget_control', label: 'Control Presupuestario Mensual', desc: 'Agrupa gastos por mes y por categorías de presupuesto, con total acumulado y % de avance.' },
  { value: 'category_budget_matrix', label: 'Matriz de Presupuestos por Proyecto', desc: 'Para una categoría específica, muestra presupuesto inicial, adicionales, total, recibido y saldo por proyecto.' },
  { value: 'income_budget_control', label: 'Control de Ingresos CAC', desc: 'Muestra presupuesto de ingreso, adicionales, pagos recibidos y saldo CAC valorizado a hoy.' },
  { value: 'chart', label: 'Gráfico', desc: 'Muestra datos agrupados en gráficos de barras, torta, línea o área.' },
  { value: 'cashflow_monthly', label: 'Cash Flow mensual', desc: 'Compara ingresos, gastos por categoría y neto por mes o por semanas.' },
  { value: 'grouped_detail', label: 'Detalle por Grupo', desc: 'Muestra chips o mini-cards de grupos con tabla de movimientos filtrada al seleccionar.' },
  { value: 'category_subcategory_accordion', label: 'Categorías y Subcategorías', desc: 'Accordion de egresos por categoría con detalle clickeable por subcategoría.' },
  { value: 'subcategory_monthly_evolution', label: 'Evolución mensual por subcategoría', desc: 'Compara mes a mes cómo se distribuyen los egresos entre subcategorías.' },
  { value: 'group_month_matrix', label: 'Matriz por grupo y mes', desc: 'Tabla cruzada: filas por categoría/proveedor/etapa/proyecto y columnas por mes, con el monto en cada celda.' },
  { value: 'balance_between_partners', label: 'Balance entre Socios', desc: 'Calcula saldo neto por socio (telefono), diferencia contra saldo ideal y deudas entre socios.' },
  { value: 'collections_summary', label: 'Cobranzas · KPIs', desc: 'Total a cobrar, cobrado, pendiente, vencido y próximo cobro según los planes de cobro.' },
  { value: 'collections_schedule', label: 'Cobranzas · Proyección por mes', desc: 'Cobros esperados a futuro agrupados por mes de vencimiento de las cuotas.' },
  { value: 'collections_due_ranges', label: 'Cobranzas · Vencimientos por plazo', desc: 'Saldo pendiente por rangos futuros: 1-30, 31-120, 121-180, más de 180, vencido y sin fecha.' },
  { value: 'collections_chart', label: 'Cobranzas · Gráfico por mes', desc: 'Proyección de cobros a futuro como gráfico de barras/línea por mes de vencimiento.' },
  { value: 'collections_aging', label: 'Cobranzas · Antigüedad (aging)', desc: 'Saldo pendiente clasificado por antigüedad: por vencer, 1-30, 31-60, 61-90 y 90+ días.' },
  { value: 'collections_plans', label: 'Cobranzas · Planes', desc: 'Una fila por plan de cobro: total, cobrado, pendiente, avance, próxima cuota y estado.' },
  { value: 'collections_installments', label: 'Cobranzas · Cuotas', desc: 'Detalle de cuotas pendientes con vencimiento, monto, cobrado y saldo.' },
  { value: 'collections_payment_plan', label: 'Cobranzas · Plan de cuotas', desc: 'Plan de pagos con monto histórico, índice, unidades CAC/USD y actualizado a hoy.' },
];

const OPERACIONES = [
  { value: 'sum', label: 'Suma' },
  { value: 'saldo_neto', label: 'Saldo neto' },
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

const MONEDAS_MOVIMIENTO = [
  { value: '', label: 'Todas' },
  { value: 'ARS', label: 'Solo ARS' },
  { value: 'USD', label: 'Solo USD' },
  { value: 'CAC', label: 'Solo CAC' },
];

const MONEDAS_CALCULO = [
  { value: '', label: 'Moneda del reporte' },
  { value: 'ARS', label: 'ARS' },
  { value: 'USD', label: 'USD' },
  { value: 'CAC', label: 'CAC' },
];

const AGRUPAR_POR = [
  { value: 'categoria', label: 'Categoría' },
  { value: 'proveedor', label: 'Proveedor' },
  { value: 'etapa', label: 'Etapa' },
  { value: 'proyecto', label: 'Proyecto' },
  { value: 'mes', label: 'Mes' },
  { value: 'moneda_original', label: 'Moneda Original' },
  { value: 'medio_pago', label: 'Medio de Pago' },
  { value: 'usuario', label: 'Usuario' },
];

const COLUMNAS_VISIBLES_OPTIONS = [
  { value: 'fecha_factura', label: 'Fecha' },
  { value: 'tipo', label: 'Tipo' },
  { value: 'categoria', label: 'Categoría' },
  { value: 'subcategoria', label: 'Subcategoría' },
  { value: 'proveedor_nombre', label: 'Proveedor' },
  { value: 'proyecto_nombre', label: 'Proyecto' },
  { value: 'monto_original', label: 'Monto original' },
  { value: 'equivalente_display', label: 'Monto equivalente' },
  { value: 'monto_display', label: 'Monto' },
  { value: 'subtotal_display', label: 'Subtotal' },
  { value: 'ingreso_display', label: 'Ingreso' },
  { value: 'egreso_display', label: 'Egreso' },
  { value: 'moneda', label: 'Moneda' },
  { value: 'medioPago', label: 'Medio de Pago' },
  { value: 'notas', label: 'Notas' },
  { value: 'etapa', label: 'Etapa' },
  { value: 'estado', label: 'Estado' },
  { value: 'usuario_nombre', label: 'Usuario' },
];

const getColumnasVisiblesValue = (selected = []) => (
  selected
    .map((value) => COLUMNAS_VISIBLES_OPTIONS.find((o) => o.value === value))
    .filter(Boolean)
);

function ColumnOrderControls({ selected = [], onChange }) {
  const selectedOptions = getColumnasVisiblesValue(selected);

  if (selectedOptions.length <= 1) return null;

  const moveColumn = (fromIndex, direction) => {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= selected.length) return;

    const next = [...selected];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    onChange(next);
  };

  return (
    <Stack spacing={1}>
      <Typography variant="caption" color="text.secondary">
        Orden de columnas
      </Typography>
      <Stack spacing={0.75}>
        {selectedOptions.map((option, index) => (
          <Box
            key={option.value}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              px: 1,
              py: 0.5,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
            }}
          >
            <Typography variant="body2">{index + 1}. {option.label}</Typography>
            <Stack direction="row" spacing={0.5}>
              <IconButton
                size="small"
                onClick={() => moveColumn(index, -1)}
                disabled={index === 0}
                title="Subir columna"
              >
                <KeyboardArrowUpIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => moveColumn(index, 1)}
                disabled={index === selectedOptions.length - 1}
                title="Bajar columna"
              >
                <KeyboardArrowDownIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}

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
    excluir: {},
  };
}

function emptyColumna() {
  return {
    id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    titulo: '',
    operacion: 'sum',
    campo: 'total',
    formato: 'currency',
    filtro_tipo: null,
  };
}

function defaultBlock(type) {
  const base = { type, titulo: '', col_span: 12 };
  switch (type) {
    case 'metric_cards':
      return { ...base, metricas: [emptyMetrica()], mostrar_sin_cotizacion: false };
    case 'summary_table':
      return {
        ...base,
        agrupar_por: 'categoria',
        columnas: [{ id: 'total', titulo: 'Total', operacion: 'sum', campo: 'total', formato: 'currency' }],
        mostrar_porcentaje: false,
        filtro_tipo: null,
        mostrar_total: true,
        top_n: null,
        excluir: {},
      };
    case 'movements_table':
      return {
        ...base,
        columnas_visibles: ['fecha_factura', 'tipo', 'categoria', 'proveedor_nombre', 'proyecto_nombre', 'monto_display', 'moneda'],
        page_size: 25,
        filtro_tipo: null,
        resumen_desplegable: false,
        resumen_titulo: '',
        mostrar_cantidad_resumen: false,
        mostrar_sin_cotizacion: false,
        excluir: {},
      };
    case 'budget_vs_actual':
      return {
        ...base,
        agrupar_por: 'categoria',
        mostrar_tipo: 'egreso',
        alerta_sobreejecucion: true,
        incluir_sin_presupuesto: false,
        mostrar_desglose_presupuestos: false,
        presupuestos_con_campo: null,
        excluir: {},
      };
    case 'supplier_budgets':
      return {
        ...base,
        titulo: 'Presupuestos por Proveedor',
        mostrar_tipo: 'egreso',
        solo_obras_activas: true,
        mostrar_resumen_obras: true,
        excluir: {},
      };
    case 'monthly_budget_control':
      return {
        ...base,
        titulo: 'Control Presupuestario',
        tipo_presupuesto: 'egreso',
        campo_monto: 'subtotal',
        categorias_control: [],
        presupuesto_ids: [],
        presupuesto_total_manual: null,
        presupuesto_label: 'Egresos proyectados',
        obra_nombre: '',
        fecha_inicio: '',
        fecha_fin: '',
        excluir: {},
      };
    case 'category_budget_matrix':
      return {
        ...base,
        categoria_objetivo: '',
        tipo_presupuesto: 'egreso',
        columna_concepto_titulo: 'Concepto',
        asumir_monto_incluye_adicionales: true,
        label_presupuesto_inicial: 'Presupuesto inicial',
        label_total_presupuesto: 'Total presupuesto',
        label_recibido: 'Recibido',
        label_saldo: 'Saldo',
        proyectos_seleccionados: [], // [] significa todos por default
      };
    case 'income_budget_control':
      return {
        ...base,
        titulo: 'Control presupuesto ingresos',
        campo_monto: 'subtotal',
      };
    case 'chart':
      return {
        ...base,
        col_span: 6,
        chart_type: 'bar',
        agrupar_por: 'categoria',
        columnas: [{ id: 'total', titulo: 'Total', operacion: 'sum', campo: 'total', formato: 'currency' }],
        filtro_tipo: null,
        top_n: 10,
        excluir: {},
      };
    case 'cashflow_monthly':
      return {
        ...base,
        titulo: 'Cash Flow',
        periodo: 'mensual',
        campo_monto: 'total',
        mostrar_sin_cotizacion: false,
        excluir: {},
      };
    case 'grouped_detail':
      return {
        ...base,
        agrupar_por: 'etapa',
        chips_style: 'metric',
        columnas_visibles: ['fecha_factura', 'categoria', 'proveedor_nombre', 'egreso_display', 'ingreso_display', 'moneda', 'notas'],
        page_size: 25,
        filtro_tipo: null,
        excluir: {},
      };
    case 'category_subcategory_accordion':
      return {
        ...base,
        titulo: 'Egresos por categoría',
        filtro_tipo: 'egreso',
        campo_monto: 'total',
        mostrar_cantidad_movimientos: true,
        desglose_subcategorias: true,
        mostrar_sin_cotizacion: false,
        ocultar_en_pdf: false,
        excluir: {},
      };
    case 'subcategory_monthly_evolution':
      return {
        ...base,
        titulo: 'Evolución mensual por subcategoría',
        filtro_tipo: 'egreso',
        campo_monto: 'total',
        categoria_objetivo: '',
        chart_type: 'bar',
        top_n: 8,
        mostrar_matriz: true,
        mostrar_sin_cotizacion: false,
        excluir: {},
      };
    case 'balance_between_partners':
      return {
        ...base,
        show_summary_cards: true,
        socios_telefonos: [],
      };
    case 'group_month_matrix':
      return {
        ...base,
        titulo: 'Por categoría y mes',
        agrupar_por: 'categoria',
        filtro_tipo: 'egreso',
        meses_n: 6,
        campo_monto: 'total',
        top_n: null,
        mostrar_total: true,
      };
    case 'collections_payment_plan':
      return {
        ...base,
        titulo: 'Plan de cuotas',
        plan_estados: ['activo'],
        cuotas_estado: 'pendientes',
        tipo_indexacion: 'auto',
        valuar_a_hoy: true,
        mostrar_indices: true,
        page_size: 100,
      };
    default:
      return base;
  }
}

function normalizeOptionText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function sanitizeExcludeValues(values = []) {
  const out = [];
  const seen = new Set();
  for (const value of values || []) {
    const label = String(value || '').trim();
    if (!label) continue;
    const key = normalizeOptionText(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

function ExcludeCategoriesControl({ block, onChange, excludeOptions = {}, value, onChangeValue }) {
  const selected = value || block?.excluir?.categorias || [];
  const handleChange = (nextValue) => {
    const sanitized = sanitizeExcludeValues(nextValue);
    if (onChangeValue) {
      onChangeValue(sanitized);
      return;
    }
    onChange('excluir', { ...(block.excluir || {}), categorias: sanitized });
  };

  return (
    <>
      <Divider />
      <Typography variant="subtitle2" fontWeight={600}>Ocultar categorías</Typography>
      <Autocomplete
        multiple
        freeSolo
        size="small"
        options={excludeOptions.categorias || []}
        filterSelectedOptions
        value={selected}
        onChange={(_, val) => handleChange(val)}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip key={option} label={option} size="small" color="error" variant="outlined" {...getTagProps({ index })} />
          ))
        }
        renderInput={(params) => <TextField {...params} label="Excluir categorías" placeholder="Escribí y presioná Enter" />}
      />
    </>
  );
}

// ─── Componente Principal ───

const BlockEditorDialog = ({
  open,
  onClose,
  onSave,
  initialBlock,
  proyectos = [],
  presupuestos = [],
  sociosOptions = [],
  excludeOptions = {},
}) => {
  const isEditing = !!initialBlock;
  const [step, setStep] = useState(isEditing ? 1 : 0); // 0=elegir tipo, 1=configurar
  const [block, setBlock] = useState(null);

  useEffect(() => {
    if (open) {
      if (initialBlock) {
        // Asegurar que el block tiene todos los campos necesarios
        const block = { ...initialBlock };
        // Para category_budget_matrix, asegurar que existe proyectos_seleccionados
        if (block.type === 'category_budget_matrix' && !block.proyectos_seleccionados) {
          block.proyectos_seleccionados = [];
        }
        setBlock(block);
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

          {/* Ancho del bloque (col_span) */}
          <FormControl size="small" fullWidth>
            <InputLabel>Ancho del bloque</InputLabel>
            <Select
              value={block.col_span || 12}
              label="Ancho del bloque"
              onChange={(e) => updateBlock('col_span', e.target.value)}
            >
              <MenuItem value={3}>1/4 de fila (25%)</MenuItem>
              <MenuItem value={4}>1/3 de fila (33%)</MenuItem>
              <MenuItem value={6}>Media fila (50%)</MenuItem>
              <MenuItem value={8}>2/3 de fila (66%)</MenuItem>
              <MenuItem value={12}>Fila completa (100%)</MenuItem>
            </Select>
          </FormControl>

          {/* Filtro de tipo (compartido) */}
          {!['budget_vs_actual', 'supplier_budgets', 'monthly_budget_control', 'category_budget_matrix', 'income_budget_control', 'cashflow_monthly'].includes(block.type) && (
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
            <MetricCardsConfig block={block} onChange={updateBlock} proyectos={proyectos} excludeOptions={excludeOptions} />
          )}
          {block.type === 'group_month_matrix' && (
            <GroupMonthMatrixConfig block={block} onChange={updateBlock} />
          )}
          {block.type === 'summary_table' && (
            <SummaryTableConfig block={block} onChange={updateBlock} excludeOptions={excludeOptions} />
          )}
          {block.type === 'movements_table' && (
            <MovementsTableConfig block={block} onChange={updateBlock} excludeOptions={excludeOptions} />
          )}
          {block.type === 'budget_vs_actual' && (
            <BudgetVsActualConfig block={block} onChange={updateBlock} excludeOptions={excludeOptions} />
          )}
          {block.type === 'supplier_budgets' && (
            <SupplierBudgetsConfig block={block} onChange={updateBlock} excludeOptions={excludeOptions} />
          )}
          {block.type === 'monthly_budget_control' && (
            <MonthlyBudgetControlConfig block={block} onChange={updateBlock} presupuestos={presupuestos} />
          )}
          {block.type === 'category_budget_matrix' && (
            <CategoryBudgetMatrixConfig block={block} onChange={updateBlock} proyectos={proyectos} />
          )}
          {block.type === 'income_budget_control' && (
            <IncomeBudgetControlConfig block={block} onChange={updateBlock} />
          )}
          {block.type === 'chart' && (
            <ChartConfig block={block} onChange={updateBlock} excludeOptions={excludeOptions} />
          )}
          {block.type === 'cashflow_monthly' && (
            <CashflowMonthlyConfig block={block} onChange={updateBlock} />
          )}
          {block.type === 'grouped_detail' && (
            <GroupedDetailConfig block={block} onChange={updateBlock} excludeOptions={excludeOptions} />
          )}
          {block.type === 'category_subcategory_accordion' && (
            <CategorySubcategoryAccordionConfig block={block} onChange={updateBlock} excludeOptions={excludeOptions} />
          )}
          {block.type === 'subcategory_monthly_evolution' && (
            <SubcategoryMonthlyEvolutionConfig block={block} onChange={updateBlock} categoryOptions={excludeOptions.categorias || []} />
          )}
          {block.type === 'balance_between_partners' && (
            <BalanceBetweenPartnersConfig block={block} onChange={updateBlock} sociosOptions={sociosOptions} />
          )}
          {block.type?.startsWith('collections_') && (
            <CollectionsConfig block={block} onChange={updateBlock} />
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

/**
 * Selector múltiple de proyectos/cajas. Persiste IDs (cae al nombre si no hay id).
 * value = array de ids/nombres; onChange(nuevoArray).
 */
function ProyectoMultiSelect({ value = [], onChange, proyectos = [], label = 'Proyectos (cajas)', helperText }) {
  const selectedCount = (value || []).length;
  return (
    <Autocomplete
      multiple
      size="small"
      options={proyectos || []}
      getOptionLabel={(o) => (typeof o === 'string' ? o : o.nombre || o.id || '')}
      value={(value || [])
        .map((selectedId) => proyectos.find((p) => {
          const pId = typeof p === 'string' ? p : (p.id || p);
          const pName = typeof p === 'string' ? p : (p.nombre || '');
          return String(pId) === String(selectedId) || String(pName) === String(selectedId);
        }) || selectedId)
        .filter(Boolean)}
      onChange={(_, val) => onChange(val.map((v) => {
        if (typeof v === 'string') return v;
        return String(v.id || '').trim() || String(v.nombre || '').trim();
      }))}
      renderTags={(vals, getTagProps) =>
        vals.map((option, index) => {
          let lbl = typeof option === 'string' ? option : option.nombre || option.id || '';
          if (typeof option === 'string') {
            const proyecto = proyectos.find((p) => String(typeof p === 'string' ? p : (p.id || p)) === String(option));
            if (proyecto) lbl = typeof proyecto === 'string' ? proyecto : (proyecto.nombre || proyecto.id);
          }
          return <Chip key={index} label={lbl} size="small" {...getTagProps({ index })} />;
        })
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          helperText={helperText || (selectedCount === 0
            ? 'Dejar vacío = todas las cajas/proyectos'
            : `${selectedCount} caja(s) seleccionada(s)`)}
        />
      )}
    />
  );
}

function MetricCardsConfig({ block, onChange, proyectos = [], excludeOptions = {} }) {
  const metricas = block.metricas || [];

  const updateMetrica = (idx, field, value) => {
    const updated = [...metricas];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange('metricas', updated);
  };

  const updateMetricaFilter = (idx, field, value) => {
    const updated = [...metricas];
    updated[idx] = {
      ...updated[idx],
      filtros_extra: {
        ...(updated[idx].filtros_extra || {}),
        [field]: value,
      },
    };
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

      <FormControlLabel
        control={
          <Switch
            checked={block.mostrar_sin_cotizacion === true}
            onChange={(e) => onChange('mostrar_sin_cotizacion', e.target.checked)}
          />
        }
        label="Mostrar avisos de movimientos sin cotización"
      />

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
            <Stack direction="row" spacing={2}>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Moneda del movimiento</InputLabel>
                <Select
                  value={Array.isArray(m.filtros_extra?.moneda_movimiento)
                    ? (m.filtros_extra.moneda_movimiento[0] || '')
                    : (m.filtros_extra?.moneda_movimiento || '')}
                  label="Moneda del movimiento"
                  onChange={(e) => updateMetricaFilter(idx, 'moneda_movimiento', e.target.value || null)}
                >
                  {MONEDAS_MOVIMIENTO.map((moneda) => (
                    <MenuItem key={moneda.value} value={moneda.value}>{moneda.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Calcular en</InputLabel>
                <Select
                  value={m.display_currency || ''}
                  label="Calcular en"
                  onChange={(e) => updateMetrica(idx, 'display_currency', e.target.value || null)}
                >
                  {MONEDAS_CALCULO.map((moneda) => (
                    <MenuItem key={moneda.value} value={moneda.value}>{moneda.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            {proyectos.length > 0 && (
              <ProyectoMultiSelect
                proyectos={proyectos}
                value={m.filtros_extra?.proyectos || []}
                onChange={(val) => updateMetricaFilter(idx, 'proyectos', val)}
                helperText={(m.filtros_extra?.proyectos || []).length === 0
                  ? 'Esta tarjeta suma TODAS las cajas. Elegí una/s para acotarla.'
                  : `${(m.filtros_extra.proyectos).length} caja(s) seleccionada(s)`}
              />
            )}
            <ExcludeCategoriesControl
              excludeOptions={excludeOptions}
              value={m.excluir?.categorias || []}
              onChangeValue={(val) => updateMetrica(idx, 'excluir', { ...(m.excluir || {}), categorias: val })}
            />
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

const MATRIZ_AGRUPAR_POR = [
  { value: 'categoria', label: 'Categoría' },
  { value: 'proveedor', label: 'Proveedor' },
  { value: 'etapa', label: 'Etapa' },
  { value: 'proyecto', label: 'Proyecto' },
];

function GroupMonthMatrixConfig({ block, onChange }) {
  return (
    <Stack spacing={2}>
      <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
        Tabla cruzada: filas por el grupo que elijas, columnas por mes. Para ver ingresos y egresos
        por separado armá dos bloques (uno de cada tipo); con "Todos" se suman en la misma celda.
      </Alert>

      <FormControl size="small" fullWidth>
        <InputLabel>Agrupar filas por</InputLabel>
        <Select
          value={block.agrupar_por || 'categoria'}
          label="Agrupar filas por"
          onChange={(e) => onChange('agrupar_por', e.target.value)}
        >
          {MATRIZ_AGRUPAR_POR.map((a) => (
            <MenuItem key={a.value} value={a.value}>{a.label}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          label="Cantidad de meses"
          type="number"
          value={block.meses_n ?? 6}
          onChange={(e) => onChange('meses_n', Math.max(1, Number(e.target.value) || 6))}
          size="small"
          fullWidth
          inputProps={{ min: 1, max: 36 }}
          helperText="Columnas, del más nuevo al más viejo"
        />
        <FormControl size="small" fullWidth>
          <InputLabel>Campo de monto</InputLabel>
          <Select
            value={block.campo_monto || 'total'}
            label="Campo de monto"
            onChange={(e) => onChange('campo_monto', e.target.value)}
          >
            {CAMPOS.map((c) => (
              <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <TextField
        label="Máximo de filas (top N)"
        type="number"
        value={block.top_n ?? ''}
        onChange={(e) => onChange('top_n', e.target.value === '' ? null : Math.max(1, Number(e.target.value) || 1))}
        size="small"
        fullWidth
        inputProps={{ min: 1 }}
        helperText="Vacío = todas. El resto se agrupa en 'Otras'."
      />

      <FormControlLabel
        control={
          <Switch
            checked={block.mostrar_total !== false}
            onChange={(e) => onChange('mostrar_total', e.target.checked)}
          />
        }
        label="Mostrar fila de totales"
      />
    </Stack>
  );
}

function SummaryTableConfig({ block, onChange, excludeOptions = {} }) {
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
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
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
                {OPERACIONES.filter((o) => ['sum', 'saldo_neto', 'count', 'avg'].includes(o.value)).map((o) => (
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
            <FormControl size="small" sx={{ flex: 1, minWidth: 130 }}>
              <InputLabel>Filtro tipo</InputLabel>
              <Select
                value={c.filtro_tipo || ''}
                label="Filtro tipo"
                onChange={(e) => updateColumna(idx, 'filtro_tipo', e.target.value || null)}
              >
                {FILTRO_TIPOS.map((ft) => (
                  <MenuItem key={ft.value} value={ft.value}>{ft.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ flex: 1, minWidth: 130 }}>
              <InputLabel>Moneda mov.</InputLabel>
              <Select
                value={Array.isArray(c.moneda_movimiento) ? (c.moneda_movimiento[0] || '') : (c.moneda_movimiento || '')}
                label="Moneda mov."
                onChange={(e) => updateColumna(idx, 'moneda_movimiento', e.target.value || null)}
              >
                {MONEDAS_MOVIMIENTO.map((m) => (
                  <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ flex: 1, minWidth: 150 }}>
              <InputLabel>Calcular en</InputLabel>
              <Select
                value={c.display_currency || ''}
                label="Calcular en"
                onChange={(e) => updateColumna(idx, 'display_currency', e.target.value || null)}
              >
                {MONEDAS_CALCULO.map((m) => (
                  <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
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

      <Divider />

      {/* Excluir items específicos */}
          <Typography variant="subtitle2" fontWeight={600}>Ocultar items</Typography>
      <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
        Escribí los valores que querés excluir del resumen. Se aplican al campo de agrupación y a los datos.
      </Alert>
      <Autocomplete
        multiple
        freeSolo
        size="small"
        options={excludeOptions.categorias || []}
        filterSelectedOptions
        value={block.excluir?.categorias || []}
        onChange={(_, val) => onChange('excluir', { ...(block.excluir || {}), categorias: sanitizeExcludeValues(val) })}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip key={option} label={option} size="small" color="error" variant="outlined" {...getTagProps({ index })} />
          ))
        }
        renderInput={(params) => <TextField {...params} label="Excluir categorías" placeholder="Escribí y presioná Enter" />}
      />
      <Autocomplete
        multiple
        freeSolo
        size="small"
        options={[]}
        value={block.excluir?.proveedores || []}
        onChange={(_, val) => onChange('excluir', { ...(block.excluir || {}), proveedores: val })}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip key={option} label={option} size="small" color="error" variant="outlined" {...getTagProps({ index })} />
          ))
        }
        renderInput={(params) => <TextField {...params} label="Excluir proveedores" placeholder="Escribí y presioná Enter" />}
      />
      <Autocomplete
        multiple
        freeSolo
        size="small"
        options={[]}
        value={block.excluir?.etapas || []}
        onChange={(_, val) => onChange('excluir', { ...(block.excluir || {}), etapas: val })}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip key={option} label={option} size="small" color="error" variant="outlined" {...getTagProps({ index })} />
          ))
        }
        renderInput={(params) => <TextField {...params} label="Excluir etapas" placeholder="Escribí y presioná Enter" />}
      />
      <Autocomplete
        multiple
        freeSolo
        size="small"
        options={[]}
        value={block.excluir?.usuarios || []}
        onChange={(_, val) => onChange('excluir', { ...(block.excluir || {}), usuarios: val })}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip key={option} label={option} size="small" color="error" variant="outlined" {...getTagProps({ index })} />
          ))
        }
        renderInput={(params) => <TextField {...params} label="Excluir usuarios" placeholder="Escribí y presioná Enter" />}
      />
    </Stack>
  );
}

function MovementsTableConfig({ block, onChange, excludeOptions = {} }) {
  const selected = block.columnas_visibles || [];

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <FormControl size="small" fullWidth>
          <InputLabel>Moneda del movimiento</InputLabel>
          <Select
            value={Array.isArray(block.filtros_extra?.moneda_movimiento)
              ? (block.filtros_extra.moneda_movimiento[0] || '')
              : (block.filtros_extra?.moneda_movimiento || '')}
            label="Moneda del movimiento"
            onChange={(e) => onChange('filtros_extra', {
              ...(block.filtros_extra || {}),
              moneda_movimiento: e.target.value || null,
            })}
          >
            {MONEDAS_MOVIMIENTO.map((moneda) => (
              <MenuItem key={moneda.value} value={moneda.value}>{moneda.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" fullWidth>
          <InputLabel>Calcular equivalencia en</InputLabel>
          <Select
            value={block.display_currency || ''}
            label="Calcular equivalencia en"
            onChange={(e) => onChange('display_currency', e.target.value || null)}
          >
            {MONEDAS_CALCULO.map((moneda) => (
              <MenuItem key={moneda.value} value={moneda.value}>{moneda.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
        Para comparar ambas monedas, agregá las columnas Monto original, Moneda y Monto equivalente.
      </Alert>

      <FormControlLabel
        control={
          <Switch
            checked={block.mostrar_sin_cotizacion === true}
            onChange={(e) => onChange('mostrar_sin_cotizacion', e.target.checked)}
          />
        }
        label="Mostrar avisos de movimientos sin cotización"
      />

      <ExcludeCategoriesControl block={block} onChange={onChange} excludeOptions={excludeOptions} />

      <Typography variant="subtitle2" fontWeight={600}>Columnas visibles</Typography>
      <Autocomplete
        multiple
        size="small"
        options={COLUMNAS_VISIBLES_OPTIONS}
        getOptionLabel={(o) => o.label}
        value={getColumnasVisiblesValue(selected)}
        onChange={(_, val) => onChange('columnas_visibles', val.map((v) => v.value))}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip key={option.value} label={option.label} size="small" {...getTagProps({ index })} />
          ))
        }
        renderInput={(params) => <TextField {...params} label="Seleccioná columnas" />}
        disableCloseOnSelect
      />

      <ColumnOrderControls
        selected={selected}
        onChange={(next) => onChange('columnas_visibles', next)}
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

      <FormControlLabel
        control={
          <Switch
            checked={block.resumen_desplegable === true}
            onChange={(e) => onChange('resumen_desplegable', e.target.checked)}
          />
        }
        label="Mostrar como resumen desplegable"
      />

      {block.resumen_desplegable === true && (
        <>
          <TextField
            label="Título del resumen"
            value={block.resumen_titulo || ''}
            onChange={(e) => onChange('resumen_titulo', e.target.value)}
            size="small"
            fullWidth
            placeholder="Ej: Ingresos"
            helperText="Si queda vacío se usa Ingresos, Egresos o Movimientos según el filtro del bloque."
          />
          <FormControlLabel
            control={
              <Switch
                checked={block.mostrar_cantidad_resumen === true}
                onChange={(e) => onChange('mostrar_cantidad_resumen', e.target.checked)}
              />
            }
            label="Mostrar cantidad de movimientos"
          />
        </>
      )}
    </Stack>
  );
}

function BudgetVsActualConfig({ block, onChange, excludeOptions = {} }) {
  return (
    <Stack spacing={2}>
      <FormControl size="small" fullWidth>
        <InputLabel>Agrupar por</InputLabel>
        <Select
          value={block.agrupar_por || 'categoria'}
          label="Agrupar por"
          onChange={(e) => onChange('agrupar_por', e.target.value)}
        >
          <MenuItem value="categoria">Categoría</MenuItem>
          <MenuItem value="etapa">Etapa</MenuItem>
          <MenuItem value="proveedor">Proveedor</MenuItem>
        </Select>
      </FormControl>

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

      <FormControl size="small" fullWidth>
        <InputLabel>Solo presupuestos que tienen</InputLabel>
        <Select
          value={block.presupuestos_con_campo || ''}
          label="Solo presupuestos que tienen"
          onChange={(e) => onChange('presupuestos_con_campo', e.target.value || null)}
        >
          <MenuItem value="">Todos los presupuestos</MenuItem>
          <MenuItem value="categoria">Categoría cargada</MenuItem>
          <MenuItem value="etapa">Etapa cargada</MenuItem>
          <MenuItem value="proveedor">Proveedor cargado</MenuItem>
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

      <FormControlLabel
        control={
          <Switch
            checked={block.incluir_sin_presupuesto === true}
            onChange={(e) => onChange('incluir_sin_presupuesto', e.target.checked)}
          />
        }
        label="Incluir categorías con movimientos pero sin presupuesto"
      />

      <FormControlLabel
        control={
          <Switch
            checked={block.mostrar_desglose_presupuestos === true}
            onChange={(e) => onChange('mostrar_desglose_presupuestos', e.target.checked)}
          />
        }
        label="Mostrar desglose de presupuestos"
      />

      <Divider />

      {/* Excluir items */}
      <Typography variant="subtitle2" fontWeight={600}>Ocultar items</Typography>
      <Autocomplete
        multiple
        freeSolo
        size="small"
        options={[]}
        value={block.excluir?.presupuestos || []}
        onChange={(_, val) => onChange('excluir', { ...(block.excluir || {}), presupuestos: val })}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip key={option} label={option} size="small" color="error" variant="outlined" {...getTagProps({ index })} />
          ))
        }
        renderInput={(params) => <TextField {...params} label="Excluir presupuestos (por nombre)" placeholder="Escribí y presioná Enter" />}
      />
      <Autocomplete
        multiple
        freeSolo
        size="small"
        options={excludeOptions.categorias || []}
        filterSelectedOptions
        value={block.excluir?.categorias || []}
        onChange={(_, val) => onChange('excluir', { ...(block.excluir || {}), categorias: sanitizeExcludeValues(val) })}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip key={option} label={option} size="small" color="error" variant="outlined" {...getTagProps({ index })} />
          ))
        }
        renderInput={(params) => <TextField {...params} label="Excluir categorías" placeholder="Escribí y presioná Enter" />}
      />
      <Autocomplete
        multiple
        freeSolo
        size="small"
        options={[]}
        value={block.excluir?.etapas || []}
        onChange={(_, val) => onChange('excluir', { ...(block.excluir || {}), etapas: val })}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip key={option} label={option} size="small" color="error" variant="outlined" {...getTagProps({ index })} />
          ))
        }
        renderInput={(params) => <TextField {...params} label="Excluir etapas" placeholder="Escribí y presioná Enter" />}
      />

      <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
        Este bloque cruza los presupuestos de control cargados en Sorby con los movimientos reales.
        Hacé click en una fila para ver los movimientos que la componen.
      </Alert>
    </Stack>
  );
}

function SupplierBudgetsConfig({ block, onChange, excludeOptions = {} }) {
  return (
    <Stack spacing={2}>
      <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
        Este bloque usa presupuestos de control con proveedor cargado. Para ver un proveedor puntual,
        activá el filtro global de Proveedores del reporte y elegilo arriba en la vista.
      </Alert>

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
            checked={block.solo_obras_activas !== false}
            onChange={(e) => onChange('solo_obras_activas', e.target.checked)}
          />
        }
        label="Mostrar solo obras activas"
      />

      <FormControlLabel
        control={
          <Switch
            checked={block.mostrar_resumen_obras !== false}
            onChange={(e) => onChange('mostrar_resumen_obras', e.target.checked)}
          />
        }
        label="Mostrar resumen por obra"
      />

      <Divider />
      <Typography variant="subtitle2" fontWeight={600}>Ocultar items</Typography>

      <Autocomplete
        multiple
        freeSolo
        size="small"
        options={[]}
        value={block.excluir?.presupuestos || []}
        onChange={(_, val) => onChange('excluir', { ...(block.excluir || {}), presupuestos: val })}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip key={option} label={option} size="small" color="error" variant="outlined" {...getTagProps({ index })} />
          ))
        }
        renderInput={(params) => <TextField {...params} label="Excluir presupuestos" placeholder="Escribí y presioná Enter" />}
      />

      <Autocomplete
        multiple
        freeSolo
        size="small"
        options={excludeOptions.proveedores || []}
        filterSelectedOptions
        value={block.excluir?.proveedores || []}
        onChange={(_, val) => onChange('excluir', { ...(block.excluir || {}), proveedores: sanitizeExcludeValues(val) })}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip key={option} label={option} size="small" color="error" variant="outlined" {...getTagProps({ index })} />
          ))
        }
        renderInput={(params) => <TextField {...params} label="Excluir proveedores" placeholder="Escribí y presioná Enter" />}
      />
    </Stack>
  );
}

function getPresupuestoOptionId(presupuesto) {
  return String(presupuesto?._id || presupuesto?.id || '').trim();
}

function getPresupuestoOptionLabel(presupuesto) {
  if (presupuesto?._missingPresupuesto) return presupuesto.label;
  const codigo = presupuesto?.codigo ? `#${presupuesto.codigo}` : 'Sin código';
  const categorias = Array.isArray(presupuesto?.clasificaciones) && presupuesto.clasificaciones.length > 0
    ? presupuesto.clasificaciones.map((c) => c?.categoria).filter(Boolean).join(' + ')
    : (presupuesto?.rubro || 'General');
  const proyecto = presupuesto?.proyecto_nombre || presupuesto?.nombre_proyecto || '';
  const monto = presupuesto?.monto_ingresado ?? presupuesto?.monto;
  const moneda = presupuesto?.moneda_display || presupuesto?.moneda || '';
  const montoTxt = monto != null ? ` · ${Number(monto).toLocaleString('es-AR')} ${moneda}` : '';
  return [codigo, categorias, proyecto].filter(Boolean).join(' · ') + montoTxt;
}

function MonthlyBudgetControlConfig({ block, onChange, presupuestos = [] }) {
  const presupuestoIds = Array.isArray(block.presupuesto_ids) ? block.presupuesto_ids : [];
  const presupuestoOptions = (Array.isArray(presupuestos) ? presupuestos : [])
    .filter((p) => getPresupuestoOptionId(p));
  const selectedPresupuestos = presupuestoIds
    .map((id) => (
      presupuestoOptions.find((p) => getPresupuestoOptionId(p) === id)
      || { _id: id, _missingPresupuesto: true, label: `Presupuesto guardado ${id.slice(-6)}` }
    ))
    .filter(Boolean);

  return (
    <Stack spacing={2}>
      <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
        Armá una planilla mensual: columnas por categoría, total del mes, acumulado y porcentaje de avance contra los egresos proyectados.
      </Alert>

      <Autocomplete
        multiple
        size="small"
        options={presupuestoOptions}
        value={selectedPresupuestos}
        getOptionLabel={getPresupuestoOptionLabel}
        isOptionEqualToValue={(option, value) => getPresupuestoOptionId(option) === getPresupuestoOptionId(value)}
        onChange={(_, val) => onChange('presupuesto_ids', val.map(getPresupuestoOptionId).filter(Boolean))}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip key={getPresupuestoOptionId(option)} label={getPresupuestoOptionLabel(option)} size="small" {...getTagProps({ index })} />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label="Presupuesto puntual"
            placeholder="Opcional: elegí uno o varios presupuestos"
            helperText="Si elegís presupuesto(s), el bloque no mezcla otros presupuestos de la obra."
          />
        )}
      />

      <TextField
        label="Nombre de la obra"
        value={block.obra_nombre || ''}
        onChange={(e) => onChange('obra_nombre', e.target.value)}
        size="small"
        fullWidth
        placeholder="Ej: YPF Caja Edificada Contrato 6"
      />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <FormControl size="small" fullWidth>
          <InputLabel>Tipo de presupuesto</InputLabel>
          <Select
            value={block.tipo_presupuesto || 'egreso'}
            label="Tipo de presupuesto"
            onChange={(e) => onChange('tipo_presupuesto', e.target.value)}
          >
            <MenuItem value="egreso">Solo Egresos</MenuItem>
            <MenuItem value="ingreso">Solo Ingresos</MenuItem>
            <MenuItem value="ambos">Ambos</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" fullWidth>
          <InputLabel>Monto a descontar</InputLabel>
          <Select
            value={block.campo_monto || 'subtotal'}
            label="Monto a descontar"
            onChange={(e) => onChange('campo_monto', e.target.value)}
          >
            <MenuItem value="total">Total</MenuItem>
            <MenuItem value="subtotal">Subtotal neto</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          label="Desde"
          type="date"
          value={block.fecha_inicio || ''}
          onChange={(e) => onChange('fecha_inicio', e.target.value)}
          size="small"
          fullWidth
          InputLabelProps={{ shrink: true }}
          helperText="Vacío = usa el filtro del reporte"
        />
        <TextField
          label="Hasta"
          type="date"
          value={block.fecha_fin || ''}
          onChange={(e) => onChange('fecha_fin', e.target.value)}
          size="small"
          fullWidth
          InputLabelProps={{ shrink: true }}
          helperText="Vacío = usa el filtro del reporte"
        />
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          label="Etiqueta del presupuesto"
          value={block.presupuesto_label || 'Egresos proyectados'}
          onChange={(e) => onChange('presupuesto_label', e.target.value)}
          size="small"
          fullWidth
        />
        <TextField
          label="Presupuesto manual"
          type="number"
          value={block.presupuesto_total_manual || ''}
          onChange={(e) => onChange('presupuesto_total_manual', e.target.value ? Number(e.target.value) : null)}
          size="small"
          fullWidth
          helperText="Vacío = suma presupuestos de las categorías"
        />
      </Stack>
    </Stack>
  );
}

function ChartConfig({ block, onChange, excludeOptions = {} }) {
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
      <Stack direction="row" spacing={2}>
        <FormControl size="small" sx={{ flex: 1 }}>
          <InputLabel>Tipo de gráfico</InputLabel>
          <Select
            value={block.chart_type || 'bar'}
            label="Tipo de gráfico"
            onChange={(e) => onChange('chart_type', e.target.value)}
          >
            <MenuItem value="bar">Barras</MenuItem>
            <MenuItem value="pie">Torta</MenuItem>
            <MenuItem value="donut">Dona</MenuItem>
            <MenuItem value="line">Línea</MenuItem>
            <MenuItem value="area">Área</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ flex: 1 }}>
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
      </Stack>

      <Typography variant="subtitle2" fontWeight={600}>Valores a graficar</Typography>

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
            <IconButton size="small" onClick={() => removeColumna(idx)} color="error" disabled={columnas.length <= 1}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Box>
      ))}

      {columnas.length < 4 && (
        <Button startIcon={<AddIcon />} onClick={addColumna} variant="outlined" size="small">
          Agregar serie
        </Button>
      )}

      <Divider />

      <TextField
        label="Mostrar solo los primeros N (vacío = todos)"
        type="number"
        value={block.top_n || ''}
        onChange={(e) => onChange('top_n', e.target.value ? parseInt(e.target.value) : null)}
        size="small"
        fullWidth
        inputProps={{ min: 1 }}
      />

      {/* Excluir items */}
      <Typography variant="subtitle2" fontWeight={600}>Ocultar items</Typography>
      <Autocomplete
        multiple
        freeSolo
        size="small"
        options={excludeOptions.categorias || []}
        filterSelectedOptions
        value={block.excluir?.categorias || []}
        onChange={(_, val) => onChange('excluir', { ...(block.excluir || {}), categorias: sanitizeExcludeValues(val) })}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip key={option} label={option} size="small" color="error" variant="outlined" {...getTagProps({ index })} />
          ))
        }
        renderInput={(params) => <TextField {...params} label="Excluir categorías" placeholder="Escribí y presioná Enter" />}
      />
      <Autocomplete
        multiple
        freeSolo
        size="small"
        options={[]}
        value={block.excluir?.proveedores || []}
        onChange={(_, val) => onChange('excluir', { ...(block.excluir || {}), proveedores: val })}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip key={option} label={option} size="small" color="error" variant="outlined" {...getTagProps({ index })} />
          ))
        }
        renderInput={(params) => <TextField {...params} label="Excluir proveedores" placeholder="Escribí y presioná Enter" />}
      />
    </Stack>
  );
}

function CategoryBudgetMatrixConfig({ block, onChange, proyectos = [] }) {
  return (
    <Stack spacing={2}>
      <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
        Este bloque usa presupuestos de control y arma una planilla por proyecto para una sola categoria.
      </Alert>

      <TextField
        label="Categoria objetivo"
        value={block.categoria_objetivo || ''}
        onChange={(e) => onChange('categoria_objetivo', e.target.value)}
        size="small"
        fullWidth
        placeholder="Ej: Mano de obra"
        helperText="Se compara contra las clasificaciones del presupuesto (matchea si alguna categoría coincide)."
      />

      <FormControl size="small" fullWidth>
        <InputLabel>Tipo de presupuesto</InputLabel>
        <Select
          value={block.tipo_presupuesto || 'egreso'}
          label="Tipo de presupuesto"
          onChange={(e) => onChange('tipo_presupuesto', e.target.value)}
        >
          <MenuItem value="egreso">Solo Egresos</MenuItem>
          <MenuItem value="ingreso">Solo Ingresos</MenuItem>
          <MenuItem value="ambos">Ambos</MenuItem>
        </Select>
      </FormControl>

      <TextField
        label="Titulo columna conceptos"
        value={block.columna_concepto_titulo || 'Concepto'}
        onChange={(e) => onChange('columna_concepto_titulo', e.target.value)}
        size="small"
        fullWidth
      />

      <Autocomplete
        multiple
        size="small"
        options={proyectos || []}
        getOptionLabel={(o) => (typeof o === 'string' ? o : o.nombre || o.id || '')}
        value={(block.proyectos_seleccionados || [])
          .map((selectedId) => {
            // Buscar el proyecto en la lista de opciones disponibles
            const proyecto = proyectos.find((p) => {
              const pId = typeof p === 'string' ? p : (p.id || p);
              const pName = typeof p === 'string' ? p : (p.nombre || '');
              return String(pId) === String(selectedId) || String(pName) === String(selectedId);
            });
            return proyecto || selectedId;
          })
          .filter(Boolean)}
        onChange={(_, val) => {
          const selected = val.map((v) => {
            if (typeof v === 'string') return v;
            const id = String(v.id || '').trim();
            const nombre = String(v.nombre || '').trim();
            // Persistir ID cuando existe para que no dependa de cambios de nombre.
            return id || nombre;
          });
          onChange('proyectos_seleccionados', selected);
        }}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => {
            // Obtener el nombre del proyecto
            let label = typeof option === 'string' ? option : option.nombre || option.id || '';
            if (typeof option === 'string') {
              // Si es un ID, buscar su nombre
              const proyecto = proyectos.find((p) => {
                const pId = typeof p === 'string' ? p : (p.id || p);
                return String(pId) === String(option);
              });
              if (proyecto) {
                label = (typeof proyecto === 'string' ? proyecto : (proyecto.nombre || proyecto.id));
              }
            }
            return (
              <Chip
                key={index}
                label={label}
                size="small"
                {...getTagProps({ index })}
              />
            );
          })
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label="Proyectos a incluir"
            helperText={
              (block.proyectos_seleccionados || []).length === 0
                ? 'Dejar vacío para incluir todos los proyectos'
                : `${(block.proyectos_seleccionados || []).length} proyecto(s) seleccionado(s)`
            }
          />
        )}
      />

      <FormControlLabel
        control={
          <Switch
            checked={block.asumir_monto_incluye_adicionales !== false}
            onChange={(e) => onChange('asumir_monto_incluye_adicionales', e.target.checked)}
          />
        }
        label="Asumir que el monto del presupuesto ya incluye adicionales"
      />

      <Divider />

      <Typography variant="subtitle2" fontWeight={600}>Etiquetas de filas</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          label="Fila inicial"
          value={block.label_presupuesto_inicial || 'Presupuesto inicial'}
          onChange={(e) => onChange('label_presupuesto_inicial', e.target.value)}
          size="small"
          fullWidth
        />
        <TextField
          label="Fila total"
          value={block.label_total_presupuesto || 'Total presupuesto'}
          onChange={(e) => onChange('label_total_presupuesto', e.target.value)}
          size="small"
          fullWidth
        />
      </Stack>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          label="Fila recibido"
          value={block.label_recibido || 'Recibido'}
          onChange={(e) => onChange('label_recibido', e.target.value)}
          size="small"
          fullWidth
        />
        <TextField
          label="Fila saldo"
          value={block.label_saldo || 'Saldo'}
          onChange={(e) => onChange('label_saldo', e.target.value)}
          size="small"
          fullWidth
        />
      </Stack>
    </Stack>
  );
}

const PLAN_ESTADOS_OPTS = [
  { value: 'activo', label: 'Activos' },
  { value: 'completado', label: 'Completados' },
  { value: 'borrador', label: 'Borradores' },
];

function CollectionsConfig({ block, onChange }) {
  const estados = Array.isArray(block.plan_estados) && block.plan_estados.length ? block.plan_estados : ['activo'];
  const esChart = block.type === 'collections_chart';
  const muestraVencidas = block.type === 'collections_schedule' || block.type === 'collections_aging' || esChart;
  const esCuotas = block.type === 'collections_installments' || block.type === 'collections_payment_plan';
  const esPlanCuotas = block.type === 'collections_payment_plan';

  return (
    <Stack spacing={2}>
      <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
        Lee los planes de cobro y sus cuotas (no usa movimientos). Los montos se valorizan según la indexación de cada plan.
      </Alert>

      {esChart && (
        <FormControl size="small" fullWidth>
          <InputLabel>Tipo de gráfico</InputLabel>
          <Select
            value={block.chart_type || 'bar'}
            label="Tipo de gráfico"
            onChange={(e) => onChange('chart_type', e.target.value)}
          >
            <MenuItem value="bar">Barras</MenuItem>
            <MenuItem value="line">Línea</MenuItem>
            <MenuItem value="area">Área</MenuItem>
          </Select>
        </FormControl>
      )}

      <FormControlLabel
        control={
          <Switch
            checked={block.valuar_a_hoy !== false}
            onChange={(e) => onChange('valuar_a_hoy', e.target.checked)}
          />
        }
        label={<Typography variant="body2">Valorizar cuotas indexadas a hoy (CAC/USD)</Typography>}
      />

      {muestraVencidas && (
        <FormControlLabel
          control={
            <Switch
              // El gráfico es "solo futuro" por default (vencidas off); las tablas, vencidas on.
              checked={esChart ? block.incluir_vencidas === true : block.incluir_vencidas !== false}
              onChange={(e) => onChange('incluir_vencidas', e.target.checked)}
            />
          }
          label={<Typography variant="body2">Incluir cuotas vencidas</Typography>}
        />
      )}

      {esPlanCuotas && (
        <>
          <FormControl size="small" fullWidth>
            <InputLabel>Cuotas a mostrar</InputLabel>
            <Select
              value={block.cuotas_estado || 'pendientes'}
              label="Cuotas a mostrar"
              onChange={(e) => onChange('cuotas_estado', e.target.value)}
            >
              <MenuItem value="pendientes">Pendientes</MenuItem>
              <MenuItem value="todas">Todas</MenuItem>
              <MenuItem value="cobradas">Cobradas</MenuItem>
              <MenuItem value="vencidas">Vencidas</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel>Indexación a mostrar</InputLabel>
            <Select
              value={block.tipo_indexacion || 'auto'}
              label="Indexación a mostrar"
              onChange={(e) => onChange('tipo_indexacion', e.target.value)}
            >
              <MenuItem value="auto">Automática según el plan</MenuItem>
              <MenuItem value="ninguna">Sin indexación / ARS</MenuItem>
              <MenuItem value="CAC">CAC</MenuItem>
              <MenuItem value="USD">USD</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={block.mostrar_indices !== false}
                onChange={(e) => onChange('mostrar_indices', e.target.checked)}
              />
            }
            label={<Typography variant="body2">Mostrar índice base y unidades CAC/USD</Typography>}
          />

        </>
      )}

      <Autocomplete
        multiple
        size="small"
        options={PLAN_ESTADOS_OPTS.map((o) => o.value)}
        getOptionLabel={(v) => PLAN_ESTADOS_OPTS.find((o) => o.value === v)?.label || v}
        value={estados}
        onChange={(_, v) => onChange('plan_estados', v.length ? v : ['activo'])}
        renderInput={(params) => <TextField {...params} label="Estados de plan a incluir" size="small" />}
      />

      {esCuotas && (
        <TextField
          size="small"
          type="number"
          label="Máximo de cuotas a listar"
          value={block.page_size || (esPlanCuotas ? 100 : 50)}
          onChange={(e) => onChange('page_size', Number(e.target.value) || (esPlanCuotas ? 100 : 50))}
        />
      )}
    </Stack>
  );
}

function IncomeBudgetControlConfig({ block, onChange }) {
  return (
    <Stack spacing={2}>
      <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
        Este bloque toma presupuestos de control de tipo ingreso y movimientos de ingreso. Respeta el filtro global de proyecto del reporte.
      </Alert>

      <FormControl size="small" fullWidth>
        <InputLabel>Monto de movimientos</InputLabel>
        <Select
          value={block.campo_monto || 'subtotal'}
          label="Monto de movimientos"
          onChange={(e) => onChange('campo_monto', e.target.value)}
        >
          <MenuItem value="subtotal">Subtotal neto</MenuItem>
          <MenuItem value="total">Total</MenuItem>
        </Select>
      </FormControl>
    </Stack>
  );
}

function CashflowMonthlyConfig({ block, onChange }) {
  return (
    <Stack spacing={2}>
      <Alert severity="info" variant="outlined">
        Este bloque arma un cashflow con ingresos, gastos por categoría, total de gastos y neto.
        Usa los filtros globales del reporte.
      </Alert>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <FormControl size="small" fullWidth>
          <InputLabel>Periodo</InputLabel>
          <Select
            value={block.periodo || 'mensual'}
            label="Periodo"
            onChange={(e) => onChange('periodo', e.target.value)}
          >
            <MenuItem value="mensual">Mensual</MenuItem>
            <MenuItem value="semanal">Semanal</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" fullWidth>
          <InputLabel>Monto a usar</InputLabel>
          <Select
            value={block.campo_monto || 'total'}
            label="Monto a usar"
            onChange={(e) => onChange('campo_monto', e.target.value)}
          >
            {CAMPOS.map((campo) => (
              <MenuItem key={campo.value} value={campo.value}>{campo.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <FormControlLabel
        control={
          <Switch
            checked={block.mostrar_sin_cotizacion === true}
            onChange={(e) => onChange('mostrar_sin_cotizacion', e.target.checked)}
          />
        }
        label="Avisar movimientos sin cotización"
      />
    </Stack>
  );
}

function GroupedDetailConfig({ block, onChange, excludeOptions = {} }) {
  const selected = block.columnas_visibles || [];

  return (
    <Stack spacing={2}>
      <FormControl size="small" fullWidth>
        <InputLabel>Agrupar por</InputLabel>
        <Select
          value={block.agrupar_por || 'etapa'}
          label="Agrupar por"
          onChange={(e) => onChange('agrupar_por', e.target.value)}
        >
          {AGRUPAR_POR.map((a) => (
            <MenuItem key={a.value} value={a.value}>{a.label}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" fullWidth>
        <InputLabel>Estilo de selectores</InputLabel>
        <Select
          value={block.chips_style || 'metric'}
          label="Estilo de selectores"
          onChange={(e) => onChange('chips_style', e.target.value)}
        >
          <MenuItem value="chip">Chips simples</MenuItem>
          <MenuItem value="metric">Mini-cards con totales</MenuItem>
        </Select>
      </FormControl>

      <Typography variant="subtitle2" fontWeight={600}>Columnas de la tabla</Typography>
      <Autocomplete
        multiple
        size="small"
        options={COLUMNAS_VISIBLES_OPTIONS}
        getOptionLabel={(o) => o.label}
        value={getColumnasVisiblesValue(selected)}
        onChange={(_, val) => onChange('columnas_visibles', val.map((v) => v.value))}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip key={option.value} label={option.label} size="small" {...getTagProps({ index })} />
          ))
        }
        renderInput={(params) => <TextField {...params} label="Seleccioná columnas" />}
        disableCloseOnSelect
      />

      <ColumnOrderControls
        selected={selected}
        onChange={(next) => onChange('columnas_visibles', next)}
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

      <Divider />

      {/* Excluir items */}
      <Typography variant="subtitle2" fontWeight={600}>Ocultar items</Typography>
      <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
        Excluí valores específicos del agrupamiento. Se filtran del selector de chips y de la tabla.
      </Alert>
      <Autocomplete
        multiple
        freeSolo
        size="small"
        options={excludeOptions.categorias || []}
        filterSelectedOptions
        value={block.excluir?.categorias || []}
        onChange={(_, val) => onChange('excluir', { ...(block.excluir || {}), categorias: sanitizeExcludeValues(val) })}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip key={option} label={option} size="small" color="error" variant="outlined" {...getTagProps({ index })} />
          ))
        }
        renderInput={(params) => <TextField {...params} label="Excluir categorías" placeholder="Escribí y presioná Enter" />}
      />
      <Autocomplete
        multiple
        freeSolo
        size="small"
        options={[]}
        value={block.excluir?.proveedores || []}
        onChange={(_, val) => onChange('excluir', { ...(block.excluir || {}), proveedores: val })}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip key={option} label={option} size="small" color="error" variant="outlined" {...getTagProps({ index })} />
          ))
        }
        renderInput={(params) => <TextField {...params} label="Excluir proveedores" placeholder="Escribí y presioná Enter" />}
      />
      <Autocomplete
        multiple
        freeSolo
        size="small"
        options={[]}
        value={block.excluir?.etapas || []}
        onChange={(_, val) => onChange('excluir', { ...(block.excluir || {}), etapas: val })}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip key={option} label={option} size="small" color="error" variant="outlined" {...getTagProps({ index })} />
          ))
        }
        renderInput={(params) => <TextField {...params} label="Excluir etapas" placeholder="Escribí y presioná Enter" />}
      />
      <Autocomplete
        multiple
        freeSolo
        size="small"
        options={[]}
        value={block.excluir?.usuarios || []}
        onChange={(_, val) => onChange('excluir', { ...(block.excluir || {}), usuarios: val })}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip key={option} label={option} size="small" color="error" variant="outlined" {...getTagProps({ index })} />
          ))
        }
        renderInput={(params) => <TextField {...params} label="Excluir usuarios" placeholder="Escribí y presioná Enter" />}
      />
    </Stack>
  );
}

function CategorySubcategoryAccordionConfig({ block, onChange, excludeOptions = {} }) {
  return (
    <Stack spacing={2}>
      <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
        Agrupa movimientos por categoria y permite desplegar el gasto por subcategoria. Al tocar una subcategoria abre el detalle de movimientos.
      </Alert>

      <FormControl size="small" fullWidth>
        <InputLabel>Campo de monto</InputLabel>
        <Select
          value={block.campo_monto || 'total'}
          label="Campo de monto"
          onChange={(e) => onChange('campo_monto', e.target.value)}
        >
          {CAMPOS.map((c) => (
            <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <FormControl size="small" fullWidth>
          <InputLabel>Moneda del movimiento</InputLabel>
          <Select
            value={Array.isArray(block.filtros_extra?.moneda_movimiento)
              ? (block.filtros_extra.moneda_movimiento[0] || '')
              : (block.filtros_extra?.moneda_movimiento || '')}
            label="Moneda del movimiento"
            onChange={(e) => onChange('filtros_extra', {
              ...(block.filtros_extra || {}),
              moneda_movimiento: e.target.value || null,
            })}
          >
            {MONEDAS_MOVIMIENTO.map((moneda) => (
              <MenuItem key={moneda.value} value={moneda.value}>{moneda.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" fullWidth>
          <InputLabel>Calcular totales en</InputLabel>
          <Select
            value={block.display_currency || ''}
            label="Calcular totales en"
            onChange={(e) => onChange('display_currency', e.target.value || null)}
          >
            {MONEDAS_CALCULO.map((moneda) => (
              <MenuItem key={moneda.value} value={moneda.value}>{moneda.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <FormControlLabel
        control={
          <Switch
            checked={block.mostrar_sin_cotizacion === true}
            onChange={(e) => onChange('mostrar_sin_cotizacion', e.target.checked)}
          />
        }
        label="Mostrar avisos de movimientos sin cotización"
      />

      <FormControlLabel
        control={
          <Switch
            checked={block.mostrar_cantidad_movimientos !== false}
            onChange={(e) => onChange('mostrar_cantidad_movimientos', e.target.checked)}
          />
        }
        label="Mostrar cantidad de movimientos"
      />

      <FormControlLabel
        control={
          <Switch
            checked={block.desglose_subcategorias !== false}
            onChange={(e) => onChange('desglose_subcategorias', e.target.checked)}
          />
        }
        label="Desglosar por subcategoría"
      />

      <FormControlLabel
        control={
          <Switch
            checked={block.ocultar_en_pdf === true}
            onChange={(e) => onChange('ocultar_en_pdf', e.target.checked)}
          />
        }
        label="No exportar este bloque en PDF"
      />

      <Divider />

      <Typography variant="subtitle2" fontWeight={600}>Ocultar categorias</Typography>
      <Autocomplete
        multiple
        freeSolo
        size="small"
        options={excludeOptions.categorias || []}
        filterSelectedOptions
        value={block.excluir?.categorias || []}
        onChange={(_, val) => onChange('excluir', { ...(block.excluir || {}), categorias: sanitizeExcludeValues(val) })}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip key={option} label={option} size="small" color="error" variant="outlined" {...getTagProps({ index })} />
          ))
        }
        renderInput={(params) => <TextField {...params} label="Excluir categorias" placeholder="Escribi y presiona Enter" />}
      />
    </Stack>
  );
}

function SubcategoryMonthlyEvolutionConfig({ block, onChange, categoryOptions = [] }) {
  return (
    <Stack spacing={2}>
      <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
        Muestra la evolución histórica mensual de los egresos, con una serie por subcategoría. Al tocar un segmento abre sus movimientos.
      </Alert>

      <Autocomplete
        freeSolo
        size="small"
        options={categoryOptions}
        value={block.categoria_objetivo || ''}
        onChange={(_, value) => onChange('categoria_objetivo', value || '')}
        onInputChange={(_, value) => onChange('categoria_objetivo', value || '')}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Categoría a analizar"
            placeholder="Todas las categorías"
            helperText="Dejalo vacío para incluir todas las categorías."
          />
        )}
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <FormControl size="small" fullWidth>
          <InputLabel>Campo de monto</InputLabel>
          <Select
            value={block.campo_monto || 'total'}
            label="Campo de monto"
            onChange={(e) => onChange('campo_monto', e.target.value)}
          >
            {CAMPOS.map((campo) => (
              <MenuItem key={campo.value} value={campo.value}>{campo.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" fullWidth>
          <InputLabel>Visualización</InputLabel>
          <Select
            value={block.chart_type || 'bar'}
            label="Visualización"
            onChange={(e) => onChange('chart_type', e.target.value)}
          >
            <MenuItem value="bar">Barras apiladas</MenuItem>
            <MenuItem value="line">Líneas</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <FormControl size="small" fullWidth>
          <InputLabel>Moneda del movimiento</InputLabel>
          <Select
            value={Array.isArray(block.filtros_extra?.moneda_movimiento)
              ? (block.filtros_extra.moneda_movimiento[0] || '')
              : (block.filtros_extra?.moneda_movimiento || '')}
            label="Moneda del movimiento"
            onChange={(e) => onChange('filtros_extra', {
              ...(block.filtros_extra || {}),
              moneda_movimiento: e.target.value || null,
            })}
          >
            {MONEDAS_MOVIMIENTO.map((moneda) => (
              <MenuItem key={moneda.value} value={moneda.value}>{moneda.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" fullWidth>
          <InputLabel>Calcular totales en</InputLabel>
          <Select
            value={block.display_currency || ''}
            label="Calcular totales en"
            onChange={(e) => onChange('display_currency', e.target.value || null)}
          >
            {MONEDAS_CALCULO.map((moneda) => (
              <MenuItem key={moneda.value} value={moneda.value}>{moneda.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <TextField
        label="Subcategorías visibles"
        type="number"
        size="small"
        value={block.top_n || 8}
        onChange={(e) => onChange('top_n', Math.max(1, parseInt(e.target.value, 10) || 8))}
        inputProps={{ min: 1, max: 20 }}
        helperText="Las demás se agrupan como Otras subcategorías."
      />

      <FormControlLabel
        control={
          <Switch
            checked={block.mostrar_matriz !== false}
            onChange={(e) => onChange('mostrar_matriz', e.target.checked)}
          />
        }
        label="Mostrar detalle mensual por subcategoría"
      />

      <FormControlLabel
        control={
          <Switch
            checked={block.mostrar_sin_cotizacion === true}
            onChange={(e) => onChange('mostrar_sin_cotizacion', e.target.checked)}
          />
        }
        label="Mostrar avisos de movimientos sin cotización"
      />
    </Stack>
  );
}

function BalanceBetweenPartnersConfig({ block, onChange, sociosOptions = [] }) {
  const normalizePhone = (value) => String(value || '').replace(/\D/g, '');

  const options = (Array.isArray(sociosOptions) ? sociosOptions : [])
    .map((u) => {
      const phone = normalizePhone(u.phone || u.telefono || u.numero_telefono || u.whatsapp);
      if (!phone) return null;
      const nombre = `${u.firstName || u.nombre || ''} ${u.lastName || u.apellido || ''}`.trim();
      return {
        phone,
        label: nombre ? `${nombre} (${phone})` : phone,
      };
    })
    .filter(Boolean)
    .filter((opt, idx, arr) => arr.findIndex((x) => x.phone === opt.phone) === idx)
    .sort((a, b) => a.label.localeCompare(b.label));

  const selectedValues = (block.socios_telefonos || []).map((phone) => {
    const normalized = normalizePhone(phone);
    return options.find((opt) => opt.phone === normalized) || normalized;
  });

  return (
    <Stack spacing={2}>
      <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
        Este bloque calcula saldo neto entre socios usando movimientos de ingreso y egreso, agrupando por numero de telefono.
      </Alert>

      <FormControlLabel
        control={
          <Switch
            checked={block.show_summary_cards !== false}
            onChange={(e) => onChange('show_summary_cards', e.target.checked)}
          />
        }
        label="Mostrar cards de resumen"
      />

      <Autocomplete
        multiple
        freeSolo
        size="small"
        options={options}
        value={selectedValues}
        getOptionLabel={(option) => (typeof option === 'string' ? option : option.label)}
        isOptionEqualToValue={(option, value) => {
          const a = typeof option === 'string' ? option : option.phone;
          const b = typeof value === 'string' ? value : value.phone;
          return normalizePhone(a) === normalizePhone(b);
        }}
        onChange={(_, val) => {
          const phones = (val || [])
            .map((item) => (typeof item === 'string' ? item : item.phone))
            .map((phone) => normalizePhone(phone))
            .filter(Boolean);
          onChange('socios_telefonos', [...new Set(phones)]);
        }}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              key={typeof option === 'string' ? option : option.phone}
              label={typeof option === 'string' ? option : option.label}
              size="small"
              {...getTagProps({ index })}
            />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label="Telefonos de socios (opcional)"
            placeholder="Escribi y presiona Enter"
            helperText="Si lo dejas vacio, incluye todos los socios detectados en los movimientos filtrados."
          />
        )}
      />
    </Stack>
  );
}

export default BlockEditorDialog;
