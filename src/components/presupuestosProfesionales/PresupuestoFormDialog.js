import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import {
  MONEDAS,
  formatCurrency,
  formatPct,
  TEXTO_NOTAS_DEFAULT,
  PLANTILLA_SORBYDATA_ID,
  formatNumberForInput,
  parseNumberInput,
  handleNumericKeyDown,
} from './constants';
import { sumaIncidenciasObjetivo } from './incidenciaHelpers';
import MonedasService from 'src/services/monedasService';
import cacService from 'src/services/cacService';
import {
  CAC_LABELS,
  CAC_TIPOS,
  INDEXACION_VALUES,
  USD_FUENTES,
  USD_FUENTE_LABELS,
  USD_VALOR_LABELS,
  USD_VALORES,
  hoyIso,
  normalizarAjusteMoneda,
  toMesAnterior,
} from './monedaAjusteConfig';

const COEF_PATIOS_DEFAULT = 0.5;

const computeSupPonderada = (supCubierta, supPatios, coefPatios) => {
  const a = Number(supCubierta) || 0;
  const b = Number(supPatios) || 0;
  const c = Number(coefPatios) >= 0 ? (Number(coefPatios) || COEF_PATIOS_DEFAULT) : COEF_PATIOS_DEFAULT;
  if (a < 0 || b < 0) return null;
  const result = a + b * c;
  return Math.round(result * 100) / 100;
};

const AnalisisSuperficiesBlock = ({ form, onFormChange }) => {
  const as = form.analisis_superficies || {};
  const supCubierta = as.sup_cubierta_m2 ?? '';
  const supPatios = as.sup_patios_m2 ?? '';
  const coefPatios = as.coef_patios ?? COEF_PATIOS_DEFAULT;

  const supPonderada = useMemo(() => {
    const computed = computeSupPonderada(supCubierta, supPatios, coefPatios);
    return computed !== null ? computed : '';
  }, [supCubierta, supPatios, coefPatios]);

  const handleChange = (field, value) => {
    const next = { ...as, [field]: value };
    const nextSupCubierta = field === 'sup_cubierta_m2' ? value : supCubierta;
    const nextSupPatios = field === 'sup_patios_m2' ? value : supPatios;
    const nextCoefPatios = field === 'coef_patios' ? value : coefPatios;
    const nextPonderada = computeSupPonderada(nextSupCubierta, nextSupPatios, nextCoefPatios);
    if (nextPonderada !== null) next.sup_ponderada_m2 = nextPonderada;
    onFormChange({ ...form, analisis_superficies: next });
  };

  const handleBlur = (field, value) => {
    const num = parseNumberInput(value) ?? Number(value);
    if (value !== '' && num !== null && !Number.isNaN(num) && num < 0) {
      handleChange(field, 0);
    }
  };

  return (
    <>
      <Typography variant="subtitle2" color="text.secondary">
        Análisis de superficies (opcional)
      </Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap">
        <TextField
          size="small"
          label="Sup. cubierta (m²)"
          value={formatNumberForInput(supCubierta, 2)}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') {
              handleChange('sup_cubierta_m2', '');
              return;
            }
            const v = parseNumberInput(raw);
            if (v !== null) handleChange('sup_cubierta_m2', v);
          }}
          onBlur={(e) => handleBlur('sup_cubierta_m2', e.target.value)}
          onKeyDown={handleNumericKeyDown}
          inputProps={{ inputMode: 'decimal', autoComplete: 'off' }}
        />
        <TextField
          size="small"
          label="Sup. patios (m²)"
          value={formatNumberForInput(supPatios, 2)}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') {
              handleChange('sup_patios_m2', '');
              return;
            }
            const v = parseNumberInput(raw);
            if (v !== null) handleChange('sup_patios_m2', v);
          }}
          onBlur={(e) => handleBlur('sup_patios_m2', e.target.value)}
          onKeyDown={handleNumericKeyDown}
          inputProps={{ inputMode: 'decimal', autoComplete: 'off' }}
        />
        <TextField
          size="small"
          label="Coef. patios"
          value={formatNumberForInput(coefPatios, 2)}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') {
              handleChange('coef_patios', '');
              return;
            }
            const v = parseNumberInput(raw);
            if (v !== null) handleChange('coef_patios', v);
          }}
          onBlur={(e) => handleBlur('coef_patios', e.target.value)}
          onKeyDown={handleNumericKeyDown}
          helperText="Ponderación de superficie de patios"
          inputProps={{ inputMode: 'decimal', autoComplete: 'off' }}
        />
        <TextField
          size="small"
          label="Sup. ponderada (m²)"
          value={supPonderada !== '' ? formatNumberForInput(supPonderada, 2) : ''}
          disabled
          inputProps={{ readOnly: true }}
        />
      </Stack>
    </>
  );
};

const pickUsdValue = (dolarData, fuente, tipo) => {
  const bloque = dolarData?.[fuente];
  if (!bloque) return null;
  const value = Number(bloque?.[tipo]);
  return Number.isFinite(value) && value > 0 ? value : null;
};

const pickCacValue = (cacData, tipo) => {
  const value = Number(cacData?.[tipo]);
  return Number.isFinite(value) && value > 0 ? value : null;
};

const MonedaAjusteBlock = ({ form, onFormChange }) => {
  const ajuste = normalizarAjusteMoneda(form);
  const isArs = ajuste.moneda === 'ARS';
  const mostrarConfigUsd = ajuste.moneda === 'USD' || ajuste.indexacion === INDEXACION_VALUES.USD;
  const mostrarConfigCac = ajuste.indexacion === INDEXACION_VALUES.CAC;
  const mostrarOverrideCotiz = isArs && (mostrarConfigCac || (mostrarConfigUsd && isArs));
  const INDEXACION_FIJO_UI_VALUE = '__FIJO__';
  const indexacionToggleValue = ajuste.indexacion ?? INDEXACION_FIJO_UI_VALUE;

  const [mostrarOverrideInput, setMostrarOverrideInput] = useState(!!form.cotizacion_snapshot?.valor);
  const cotizacionValor = form.cotizacion_snapshot?.valor != null ? String(form.cotizacion_snapshot.valor) : '';

  useEffect(() => {
    if (form.cotizacion_snapshot?.valor) setMostrarOverrideInput(true);
  }, [form.cotizacion_snapshot?.valor]);

  const [valorUsd, setValorUsd] = useState(null);
  const [fechaUsd, setFechaUsd] = useState(null);
  const [loadingUsd, setLoadingUsd] = useState(false);
  const [valorCac, setValorCac] = useState(null);
  const [fechaCac, setFechaCac] = useState(null);
  const [loadingCac, setLoadingCac] = useState(false);

  useEffect(() => {
    if (!mostrarConfigUsd) {
      setValorUsd(null);
      setFechaUsd(null);
      return;
    }
    setLoadingUsd(true);
    const fechaHoy = hoyIso();
    MonedasService.obtenerDolar(fechaHoy)
      .then((dolarData) => {
        const valor = pickUsdValue(dolarData, ajuste.usd_fuente, ajuste.usd_valor);
        setValorUsd(valor);
        setFechaUsd(dolarData?.fecha || fechaHoy);
      })
      .catch(() => {
        setValorUsd(null);
        setFechaUsd(null);
      })
      .finally(() => setLoadingUsd(false));
  }, [mostrarConfigUsd, ajuste.usd_fuente, ajuste.usd_valor]);

  useEffect(() => {
    if (!mostrarConfigCac) {
      setValorCac(null);
      setFechaCac(null);
      return;
    }
    setLoadingCac(true);
    const mesRef = toMesAnterior(hoyIso());
    cacService.getCacPorFecha(mesRef)
      .then((cacData) => {
        const valor = pickCacValue(cacData, ajuste.cac_tipo);
        setValorCac(valor);
        setFechaCac(cacData?.fecha || mesRef);
      })
      .catch(() => {
        setValorCac(null);
        setFechaCac(null);
      })
      .finally(() => setLoadingCac(false));
  }, [mostrarConfigCac, ajuste.cac_tipo]);

  const patchForm = (patch) => onFormChange({ ...form, ...patch });

  return (
    <Stack spacing={1.5}>
      <FormControl sx={{ minWidth: 140 }}>
        <InputLabel>Moneda</InputLabel>
        <Select
          value={ajuste.moneda}
          label="Moneda"
          onChange={(e) => {
            const nextMoneda = e.target.value;
            if (nextMoneda === 'USD') {
              patchForm({ moneda: 'USD', indexacion: INDEXACION_VALUES.USD });
              return;
            }
            patchForm({ moneda: 'ARS', indexacion: ajuste.indexacion === INDEXACION_VALUES.CAC ? INDEXACION_VALUES.CAC : INDEXACION_VALUES.FIJO });
          }}
        >
          {MONEDAS.map((m) => (
            <MenuItem key={m} value={m}>{m}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {isArs && (
        <Box>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            ¿Querés protegerte de la inflación?
          </Typography>
          <ToggleButtonGroup
            value={indexacionToggleValue}
            exclusive
            onChange={(_, val) =>
              patchForm({
                indexacion:
                  val === INDEXACION_FIJO_UI_VALUE ? INDEXACION_VALUES.FIJO : val,
                cotizacion_snapshot: null,
              })
            }
            size="small"
            fullWidth
          >
            <ToggleButton value={INDEXACION_FIJO_UI_VALUE} sx={{ flex: 1 }}>
              Pesos fijos
            </ToggleButton>
            <ToggleButton value={INDEXACION_VALUES.CAC} sx={{ flex: 1 }}>
              Ajustar por CAC
            </ToggleButton>
            <ToggleButton value={INDEXACION_VALUES.USD} sx={{ flex: 1 }}>
              Ajustar por dólar
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}

      {mostrarConfigUsd && (
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
            Configuración de dólar
          </Typography>
          <Stack spacing={1}>
            <ToggleButtonGroup
              value={ajuste.usd_fuente}
              exclusive
              onChange={(_, val) => val && patchForm({ usd_fuente: val })}
              size="small"
              fullWidth
            >
              <ToggleButton value={USD_FUENTES.OFICIAL} sx={{ flex: 1 }}>
                USD Oficial
              </ToggleButton>
              <ToggleButton value={USD_FUENTES.BLUE} sx={{ flex: 1 }}>
                USD Blue
              </ToggleButton>
            </ToggleButtonGroup>
            <ToggleButtonGroup
              value={ajuste.usd_valor}
              exclusive
              onChange={(_, val) => val && patchForm({ usd_valor: val })}
              size="small"
              fullWidth
            >
              <ToggleButton value={USD_VALORES.COMPRA} sx={{ flex: 1 }}>
                Compra
              </ToggleButton>
              <ToggleButton value={USD_VALORES.VENTA} sx={{ flex: 1 }}>
                Venta
              </ToggleButton>
              <ToggleButton value={USD_VALORES.PROMEDIO} sx={{ flex: 1 }}>
                Promedio
              </ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {loadingUsd ? 'Cargando…' : valorUsd != null
                ? `${USD_FUENTE_LABELS[ajuste.usd_fuente]} (${USD_VALOR_LABELS[ajuste.usd_valor]}): ${formatCurrency(valorUsd, 'ARS')} — ${fechaUsd || ''}`
                : '—'}
            </Typography>
          </Stack>
        </Box>
      )}

      {ajuste.indexacion === INDEXACION_VALUES.CAC && (
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
            Tipo de índice CAC
          </Typography>
          <ToggleButtonGroup
            value={ajuste.cac_tipo}
            exclusive
            onChange={(_, val) => val && patchForm({ cac_tipo: val })}
            size="small"
            fullWidth
          >
            <ToggleButton value={CAC_TIPOS.GENERAL} sx={{ flex: 1, fontSize: '0.75rem' }}>
              Promedio
            </ToggleButton>
            <ToggleButton value={CAC_TIPOS.MANO_OBRA} sx={{ flex: 1, fontSize: '0.75rem' }}>
              Mano de obra
            </ToggleButton>
            <ToggleButton value={CAC_TIPOS.MATERIALES} sx={{ flex: 1, fontSize: '0.75rem' }}>
              Materiales
            </ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {loadingCac ? 'Cargando…' : valorCac != null
              ? `Índice ${CAC_LABELS[ajuste.cac_tipo]} (mes anterior): ${formatCurrency(valorCac, 'ARS')} — ${fechaCac || ''}`
              : '—'}
          </Typography>
        </Box>
      )}

      {mostrarOverrideCotiz && (
        <Box sx={{ mt: 0.5 }}>
          {!mostrarOverrideInput ? (
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ cursor: 'pointer', '&:hover': { color: 'text.secondary' } }}
              onClick={() => setMostrarOverrideInput(true)}
            >
              Modificar índice manualmente…
            </Typography>
          ) : (
            <Stack spacing={1} sx={{ mt: 1, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  {ajuste.indexacion === INDEXACION_VALUES.CAC ? 'Índice CAC personalizado' : 'Dólar personalizado'}
                </Typography>
                <Typography
                  variant="caption"
                  color="primary"
                  sx={{ cursor: 'pointer' }}
                  onClick={() => {
                    setMostrarOverrideInput(false);
                    patchForm({ cotizacion_snapshot: null });
                  }}
                >
                  Usar automático
                </Typography>
              </Stack>
              {ajuste.indexacion === INDEXACION_VALUES.CAC ? (
                <>
                  <TextField
                    size="small"
                    type="number"
                    placeholder="Ej: 48523.7"
                    value={cotizacionValor}
                    onChange={(e) => {
                      const v = e.target.value;
                      const parsed = v === '' ? null : parseFloat(v);
                      patchForm({
                        cotizacion_snapshot: parsed != null && !Number.isNaN(parsed)
                          ? { tipo: 'CAC', fuente: 'cac', referencia: ajuste.cac_tipo, valor: parsed, fecha_origen: hoyIso() }
                          : null,
                      });
                    }}
                  />
                  {cotizacionValor && !Number.isNaN(Number(cotizacionValor)) && (
                    <Typography variant="caption" color="text.secondary">
                      Usando CAC = {Number(cotizacionValor).toLocaleString('es-AR')} en vez de {valorCac != null ? formatCurrency(valorCac, 'ARS') : '(no cargado)'}
                    </Typography>
                  )}
                </>
              ) : (
                <>
                  <TextField
                    size="small"
                    type="number"
                    placeholder="Ej: 1250"
                    value={cotizacionValor}
                    onChange={(e) => {
                      const v = e.target.value;
                      const parsed = v === '' ? null : parseFloat(v);
                      patchForm({
                        cotizacion_snapshot: parsed != null && !Number.isNaN(parsed)
                          ? { tipo: 'USD', fuente: ajuste.usd_fuente, referencia: ajuste.usd_valor, valor: parsed, fecha_origen: hoyIso() }
                          : null,
                      });
                    }}
                  />
                  {cotizacionValor && !Number.isNaN(Number(cotizacionValor)) && (
                    <Typography variant="caption" color="text.secondary">
                      Usando USD = ${Number(cotizacionValor).toLocaleString('es-AR')} en vez de {valorUsd != null ? formatCurrency(valorUsd, 'ARS') : '(no cargado)'}
                    </Typography>
                  )}
                </>
              )}
            </Stack>
          )}
        </Box>
      )}

      <Box>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          ¿Cómo comparás contra las facturas?
        </Typography>
        <ToggleButtonGroup
          value={form.base_calculo || 'total'}
          exclusive
          onChange={(_, val) => val && patchForm({ base_calculo: val })}
          size="small"
          fullWidth
        >
          <ToggleButton value="total" sx={{ flex: 1 }}>
            <Tooltip title="Suma el total de cada factura (incluye impuestos)" arrow>
              <span>Total (con imp.)</span>
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="subtotal" sx={{ flex: 1 }}>
            <Tooltip title="Suma el subtotal neto de cada factura (sin impuestos)" arrow>
              <span>Neto (sin imp.)</span>
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
    </Stack>
  );
};

const PresupuestoFormDialog = ({
  open,
  onClose,
  isEdit,
  form,
  onFormChange,
  plantillas = [],
  totalVivo,
  totalObjetivo = '',
  saving,
  onSave,
  onAplicarPlantilla,
  onAplicarPlantillaNotas,
  modoDistribuir = false,
  onModoDistribuirChange,
  onDistribuirPorTotal,
  onUpdateIncidenciaObjetivo,
  addRubro,
  removeRubro,
  updateRubro,
  moveRubro,
  addTarea,
  removeTarea,
  updateTarea,
  focusRef,
  logoUploading = false,
  logoPreviewUrl = '',
  onUploadLogo,
  onRemoveLogo,
}) => {
  const puedeDistribuirPorIncidencias = !isEdit;
  const sumaIncidencias = useMemo(() => sumaIncidenciasObjetivo(form.rubros), [form.rubros]);
  const sumaInvalida = sumaIncidencias > 100;
  const sumaBaja = sumaIncidencias < 100 && sumaIncidencias >= 0;
  const logoInputRef = useRef(null);

  const handleLogoInputChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type?.startsWith('image/')) return;
    await onUploadLogo?.(file);
  };

  return (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
    <DialogTitle>{isEdit ? 'Editar Presupuesto' : 'Nuevo Presupuesto Profesional'}</DialogTitle>
    <DialogContent dividers>
      <Stack spacing={2} sx={{ mt: 1 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            label="Título *"
            fullWidth
            value={form.titulo}
            onChange={(e) => onFormChange({ ...form, titulo: e.target.value })}
          />
        </Stack>

        <MonedaAjusteBlock form={form} onFormChange={onFormChange} />

        <TextField
          label="Domicilio de obra"
          fullWidth
          value={form.obra_direccion}
          onChange={(e) => onFormChange({ ...form, obra_direccion: e.target.value })}
        />

        <Divider />

        {!isEdit && (
          <Stack direction="row" spacing={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 260 }}>
              <InputLabel>Cargar rubros desde plantilla</InputLabel>
              <Select
                value={form.plantilla_id || ''}
                label="Cargar rubros desde plantilla"
                onChange={(e) => onAplicarPlantilla(e.target.value)}
              >
                <MenuItem value="">Ninguna</MenuItem>
                <MenuItem value={PLANTILLA_SORBYDATA_ID}>Plantilla SorbyData</MenuItem>
                {plantillas.filter((p) => p.activa).map((p) => (
                  <MenuItem key={p._id} value={p._id}>{p.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary">
              Reemplaza los rubros actuales con los de la plantilla.
            </Typography>
          </Stack>
        )}

        {puedeDistribuirPorIncidencias && (
          <FormControlLabel
            control={
              <Switch
                checked={modoDistribuir}
                onChange={(e) => onModoDistribuirChange?.(e.target.checked)}
              />
            }
            label="Distribuir por incidencias"
          />
        )}

        {modoDistribuir && puedeDistribuirPorIncidencias && (
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              size="small"
              label="Total neto"
              value={
                totalObjetivo !== ''
                  ? formatNumberForInput(totalObjetivo, 2)
                  : formatNumberForInput(totalVivo, 2)
              }
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  onDistribuirPorTotal?.('');
                  return;
                }
                const v = parseNumberInput(raw);
                if (v !== null) onDistribuirPorTotal?.(String(v));
              }}
              onKeyDown={handleNumericKeyDown}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              inputProps={{ inputMode: 'decimal', autoComplete: 'off' }}
              sx={{ width: 180 }}
            />
            {sumaInvalida && (
              <Typography variant="body2" color="error">
                La suma de incidencias supera 100%
              </Typography>
            )}
            {sumaBaja && !sumaInvalida && (
              <Typography variant="body2" color="warning.main">
                Falta {(100 - sumaIncidencias).toFixed(1)}% sin asignar
              </Typography>
            )}
          </Stack>
        )}

        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle1" fontWeight={600}>
              Rubros ({form.rubros.length})
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              {!modoDistribuir && (
                <Typography variant="body2" color="text.secondary">
                  Total: {formatCurrency(totalVivo, form.moneda)}
                </Typography>
              )}
              <Button size="small" startIcon={<AddIcon />} onClick={addRubro}>
                Agregar rubro
              </Button>
            </Stack>
          </Stack>

          {form.rubros.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              No hay rubros todavía. Agregá uno o cargalos desde una plantilla.
            </Typography>
          )}

          {form.rubros.map((rubro, ri) => (
            <Paper key={ri} variant="outlined" sx={{ p: 2, mb: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 28 }}>
                  #{ri + 1}
                </Typography>
                <TextField
                  size="small"
                  label="Nombre del rubro"
                  value={rubro.nombre}
                  onChange={(e) => updateRubro(ri, 'nombre', e.target.value)}
                  sx={{ flexGrow: 1 }}
                  inputRef={(el) => {
                    if (el && focusRef?.current?.type === 'rubro' && focusRef.current.rubroIdx === ri) {
                      setTimeout(() => el.focus(), 0);
                      focusRef.current = null;
                    }
                  }}
                />
                {modoDistribuir && puedeDistribuirPorIncidencias && (
                  <TextField
                    size="small"
                    label="Incidencia %"
                    value={
                      typeof rubro.incidencia_objetivo_pct === 'string' && /[.,]$/.test(rubro.incidencia_objetivo_pct)
                        ? rubro.incidencia_objetivo_pct
                        : formatNumberForInput(rubro.incidencia_objetivo_pct ?? '', 1)
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        onUpdateIncidenciaObjetivo?.(ri, '');
                        return;
                      }
                      if (/[.,]$/.test(raw)) {
                        onUpdateIncidenciaObjetivo?.(ri, raw);
                        return;
                      }
                      const v = parseNumberInput(raw);
                      if (v !== null) onUpdateIncidenciaObjetivo?.(ri, v);
                    }}
                    onBlur={(e) => {
                      const v = parseNumberInput(e.target.value);
                      if (e.target.value !== '' && v !== null) {
                        if (v < 0) onUpdateIncidenciaObjetivo?.(ri, 0);
                        else if (v > 100) onUpdateIncidenciaObjetivo?.(ri, 100);
                      }
                    }}
                    onKeyDown={handleNumericKeyDown}
                    placeholder="%"
                    sx={{ width: 90 }}
                    inputProps={{ inputMode: 'decimal', autoComplete: 'off' }}
                    error={
                      rubro.incidencia_objetivo_pct != null &&
                      (Number(rubro.incidencia_objetivo_pct) < 0 || Number(rubro.incidencia_objetivo_pct) > 100)
                    }
                  />
                )}
                <TextField
                  size="small"
                  label="Monto"
                  value={formatNumberForInput(rubro.monto, 2)}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      updateRubro(ri, 'monto', 0);
                      return;
                    }
                    const v = parseNumberInput(raw);
                    if (v !== null) updateRubro(ri, 'monto', Math.round(v * 100) / 100);
                  }}
                  onKeyDown={handleNumericKeyDown}
                  sx={{ width: 150 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">$</InputAdornment>
                    ),
                  }}
                  inputProps={{ inputMode: 'decimal', autoComplete: 'off' }}
                />
                {totalVivo > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ minWidth: 50 }}>
                    {formatPct(((Number(rubro.monto) || 0) / totalVivo) * 100)}
                  </Typography>
                )}
                <Tooltip title="Subir">
                  <span>
                    <IconButton size="small" disabled={ri === 0} onClick={() => moveRubro(ri, -1)}>
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Bajar">
                  <span>
                    <IconButton
                      size="small"
                      disabled={ri === form.rubros.length - 1}
                      onClick={() => moveRubro(ri, 1)}
                    >
                      <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Eliminar rubro">
                  <IconButton size="small" color="error" onClick={() => removeRubro(ri)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>

              <Box sx={{ ml: 4 }}>
                {(rubro.tareas || []).map((tarea, ti) => (
                  <Stack key={ti} direction="row" spacing={1} alignItems="center" mb={0.5}>
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 20 }}>
                      {ri + 1}.{ti + 1}
                    </Typography>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Descripción de tarea"
                      value={tarea.descripcion}
                      onChange={(e) => updateTarea(ri, ti, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (e.ctrlKey || e.metaKey) {
                            addRubro();
                          } else {
                            addTarea(ri);
                          }
                        }
                      }}
                      inputRef={(el) => {
                        if (el && focusRef?.current?.type === 'tarea' && focusRef.current.rubroIdx === ri && focusRef.current.tareaIdx === ti) {
                          setTimeout(() => el.focus(), 0);
                          focusRef.current = null;
                        }
                      }}
                    />
                    <IconButton size="small" color="error" onClick={() => removeTarea(ri, ti)}>
                      <DeleteIcon fontSize="inherit" />
                    </IconButton>
                  </Stack>
                ))}
                <Button size="small" onClick={() => addTarea(ri)} sx={{ mt: 0.5 }}>
                  + Tarea
                </Button>
              </Box>
            </Paper>
          ))}
        </Box>

        <Divider />

        {!isEdit && (
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 260 }}>
              <Select
                value={form.plantilla_notas_id || ''}
                label=""
                onChange={(e) => onAplicarPlantillaNotas?.(e.target.value)}
              >
                <MenuItem value="">Ninguna</MenuItem>
                <MenuItem value={PLANTILLA_SORBYDATA_ID}>Plantilla SorbyData</MenuItem>
                {plantillas.filter((p) => p.activa).map((p) => (
                  <MenuItem key={p._id} value={p._id}>{p.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary">
              Cargar notas/condiciones desde plantilla 
            </Typography>
          </Stack>
        )}

        <TextField
          label="Notas / Condiciones"
          multiline
          minRows={4}
          maxRows={10}
          value={form.notas_texto}
          onChange={(e) => onFormChange({ ...form, notas_texto: e.target.value })}
          helperText={
            form.notas_texto === TEXTO_NOTAS_DEFAULT && !form.plantilla_notas_id
              ? 'Se pre-carga un texto sugerido por SorbyData al crear. Podés editarlo libremente.'
              : ''
          }
        />

        <AnalisisSuperficiesBlock form={form} onFormChange={onFormChange} />

        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderStyle: 'dashed',
            borderColor: 'divider',
            bgcolor: 'background.default',
          }}
        >
          <Stack spacing={1.5}>
            <Typography variant="subtitle2" color="text.secondary">
              Logo de la empresa (opcional)
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
              <Avatar
                src={logoPreviewUrl || form.empresa_logo_url || ''}
                alt="Logo empresa"
                variant="rounded"
                sx={{ width: 72, height: 72, bgcolor: 'grey.100', border: 1, borderColor: 'divider' }}
              />
              <Stack spacing={0.75} sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Cargá una imagen clara para que aparezca en el presupuesto y PDF.
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  Formatos: JPG, PNG, o WEBP.
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={logoUploading ? <CircularProgress size={14} color="inherit" /> : <CloudUploadOutlinedIcon />}
                    disabled={logoUploading || saving}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {form.empresa_logo_url ? 'Cambiar imagen' : 'Agregar imagen'}
                  </Button>
                  {form.empresa_logo_url && (
                    <Button
                      variant="text"
                      size="small"
                      color="inherit"
                      startIcon={<DeleteIcon />}
                      disabled={logoUploading || saving}
                      onClick={onRemoveLogo}
                    >
                      Quitar
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Stack>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleLogoInputChange}
            />
            {logoUploading && <LinearProgress />}
          </Stack>
        </Paper>
      </Stack>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancelar</Button>
      <Button
        variant="contained"
        onClick={onSave}
        disabled={saving || !form.titulo?.trim() || (modoDistribuir && (sumaInvalida || sumaBaja))}
      >
        {saving ? <CircularProgress size={20} /> : isEdit ? 'Guardar cambios' : 'Crear presupuesto'}
      </Button>
    </DialogActions>
  </Dialog>
  );
};

export default PresupuestoFormDialog;
