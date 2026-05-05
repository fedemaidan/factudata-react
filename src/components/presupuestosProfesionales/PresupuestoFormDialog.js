import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
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
  Slider,
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
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
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
import { validateLogoFileForUpload } from 'src/utils/presupuestos/logoFileValidation';
import { loadImageAsDataUrl } from 'src/utils/presupuestos/loadLogoForPdf';
import { calcularCostoM2DataForPdf } from 'src/utils/presupuestos/exportPresupuestoToPdfRenderer';
import { buildPresupuestoDraftForPdfPreview } from 'src/utils/presupuestos/buildPresupuestoDraftForPdfPreview';
import PresupuestoPdfFullPreviewDialog from './PresupuestoPdfFullPreviewDialog';
import { sumaIncidenciasObjetivo, sumaIncidenciasObjetivoTareas } from './incidenciaHelpers';
import { sumaEfectivaTareas } from './presupuestosHandlers';
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

const isoADateLocal = (iso) => {
  if (!iso || typeof iso !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || !mo || !d) return null;
  return new Date(y, mo - 1, d);
};

const COEF_PATIOS_DEFAULT = 0.5;
const COEF_VEREDA_DEFAULT = 0.25;
const HEADER_BG_DEFAULT = '#0a4791';
const HEADER_TEXT_DEFAULT = '#ffffff';

const isValidHex = (v) => /^#[0-9A-Fa-f]{6}$/.test(v);
const toHex = (v) => {
  if (!v || typeof v !== 'string') return null;
  const s = v.replace(/^#/, '').trim();
  return /^[0-9A-Fa-f]{6}$/.test(s) ? `#${s.toLowerCase()}` : null;
};

const ColorInput = ({ label, value, onChange, defaultColor = HEADER_BG_DEFAULT }) => {
  const hex = value || defaultColor;
  const valid = isValidHex(hex);
  const handleHexBlur = (e) => {
    const result = toHex(e.target.value);
    if (result) onChange(result);
    else if (e.target.value.trim()) onChange(defaultColor);
  };
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <TextField
        size="small"
        label={label}
        value={hex}
        onChange={(e) => {
          const v = e.target.value.replace(/[^0-9A-Fa-f#]/g, '');
          if (v.startsWith('#')) {
            if (v.length <= 7) onChange(v || defaultColor);
          } else if (v.length <= 6) {
            onChange(v ? `#${v}` : defaultColor);
          }
        }}
        onBlur={handleHexBlur}
        placeholder={defaultColor}
        inputProps={{ maxLength: 7 }}
        sx={{ minWidth: 120 }}
      />
      <Box
        component="input"
        type="color"
        value={valid ? hex : defaultColor}
        onChange={(e) => onChange(e.target.value)}
        sx={{
          width: 40,
          height: 40,
          p: 0,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          cursor: 'pointer',
          bgcolor: 'transparent',
        }}
      />
    </Stack>
  );
};

const HeaderColorBlock = ({ form, onFormChange }) => (
  <Stack spacing={1.5}>
    <Typography variant="subtitle2" color="text.secondary">
      Colores de la cabecera del PDF
    </Typography>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
      <ColorInput
        label="Fondo"
        value={form.header_bg_color}
        onChange={(v) => onFormChange({ ...form, header_bg_color: v })}
      />
      <ColorInput
        label="Texto"
        value={form.header_text_color}
        onChange={(v) => onFormChange({ ...form, header_text_color: v })}
        defaultColor={HEADER_TEXT_DEFAULT}
      />
    </Stack>
  </Stack>
);

const computeSupPonderada = (supCubierta, supPatios, coefPatios, supVereda, coefVereda) => {
  const a = Number(supCubierta) || 0;
  const b = Number(supPatios) || 0;
  const c = Number(coefPatios) >= 0 ? (Number(coefPatios) || COEF_PATIOS_DEFAULT) : COEF_PATIOS_DEFAULT;
  const d = Number(supVereda) || 0;
  const e = Number(coefVereda) >= 0 ? (Number(coefVereda) || COEF_VEREDA_DEFAULT) : COEF_VEREDA_DEFAULT;
  if (a < 0 || b < 0 || d < 0) return null;
  const result = a + b * c + d * e;
  return Math.round(result * 100) / 100;
};

const AnalisisSuperficiesBlock = ({ form, onFormChange }) => {
  const as = form.analisis_superficies || {};
  const supCubierta = as.sup_cubierta_m2 ?? '';
  const supPatios = as.sup_patios_m2 ?? '';
  const coefPatios = as.coef_patios ?? COEF_PATIOS_DEFAULT;
  const supVereda = as.sup_vereda_m2 ?? '';
  const coefVereda = as.coef_vereda ?? COEF_VEREDA_DEFAULT;

  const supPonderada = useMemo(() => {
    const computed = computeSupPonderada(supCubierta, supPatios, coefPatios, supVereda, coefVereda);
    return computed !== null ? computed : '';
  }, [supCubierta, supPatios, coefPatios, supVereda, coefVereda]);

  const handleChange = (field, value) => {
    const next = { ...as, [field]: value };
    const nextSupCubierta = field === 'sup_cubierta_m2' ? value : supCubierta;
    const nextSupPatios = field === 'sup_patios_m2' ? value : supPatios;
    const nextCoefPatios = field === 'coef_patios' ? value : coefPatios;
    const nextSupVereda = field === 'sup_vereda_m2' ? value : supVereda;
    const nextCoefVereda = field === 'coef_vereda' ? value : coefVereda;
    const nextPonderada = computeSupPonderada(nextSupCubierta, nextSupPatios, nextCoefPatios, nextSupVereda, nextCoefVereda);
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
          label="Sup. vereda (m²)"
          value={formatNumberForInput(supVereda, 2)}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') {
              handleChange('sup_vereda_m2', '');
              return;
            }
            const v = parseNumberInput(raw);
            if (v !== null) handleChange('sup_vereda_m2', v);
          }}
          onBlur={(e) => handleBlur('sup_vereda_m2', e.target.value)}
          onKeyDown={handleNumericKeyDown}
          inputProps={{ inputMode: 'decimal', autoComplete: 'off' }}
        />
        <TextField
          size="small"
          label="Coef. vereda"
          value={formatNumberForInput(coefVereda, 2)}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') {
              handleChange('coef_vereda', '');
              return;
            }
            const v = parseNumberInput(raw);
            if (v !== null) handleChange('coef_vereda', v);
          }}
          onBlur={(e) => handleBlur('coef_vereda', e.target.value)}
          onKeyDown={handleNumericKeyDown}
          helperText="Ponderación de superficie de vereda"
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
    const fechaRef = (form.fecha && String(form.fecha).trim()) || hoyIso();
    MonedasService.obtenerDolar(fechaRef)
      .then((dolarData) => {
        const valor = pickUsdValue(dolarData, ajuste.usd_fuente, ajuste.usd_valor);
        setValorUsd(valor);
        setFechaUsd(dolarData?.fecha || fechaRef);
      })
      .catch(() => {
        setValorUsd(null);
        setFechaUsd(null);
      })
      .finally(() => setLoadingUsd(false));
  }, [mostrarConfigUsd, ajuste.usd_fuente, ajuste.usd_valor, form.fecha]);

  useEffect(() => {
    if (!mostrarConfigCac) {
      setValorCac(null);
      setFechaCac(null);
      return;
    }
    setLoadingCac(true);
    const fechaRef = (form.fecha && String(form.fecha).trim()) || hoyIso();
    const mesRef = toMesAnterior(fechaRef);
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
  }, [mostrarConfigCac, ajuste.cac_tipo, form.fecha]);

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
              ? `Índice ${CAC_LABELS[ajuste.cac_tipo]} (2 meses atrás): ${formatCurrency(valorCac, 'ARS')} — ${fechaCac || ''}`
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
                          ? {
                              tipo: 'CAC',
                              fuente: 'cac',
                              referencia: ajuste.cac_tipo,
                              valor: parsed,
                              fecha_origen: (form.fecha && String(form.fecha).trim()) || hoyIso(),
                            }
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
                          ? {
                              tipo: 'USD',
                              fuente: ajuste.usd_fuente,
                              referencia: ajuste.usd_valor,
                              valor: parsed,
                              fecha_origen: (form.fecha && String(form.fecha).trim()) || hoyIso(),
                            }
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
  onUpdateTareaMonto,
  onUpdateTareaCantidad,
  onUpdateTareaIncidenciaObjetivo,
  moveTarea,
  focusRef,
  logoUploading = false,
  logoPreviewUrl = '',
  onUploadLogo,
  onRemoveLogo,
       onLogoPickError,
  empresaNombre = '',
  onPdfPreviewError,
}) => {
  const puedeDistribuirPorIncidencias = !isEdit;
  const sumaIncidencias = useMemo(() => sumaIncidenciasObjetivo(form.rubros), [form.rubros]);
  const sumaInvalida = sumaIncidencias > 100;
  const sumaBaja = sumaIncidencias < 100 && sumaIncidencias >= 0;
  // En modo distribuir, detectar desfase entre el total objetivo y la suma real
  // de rubros (que cambia si el usuario edita cantidad/monto de un subrubro).
  const totalObjetivoNum = Number(totalObjetivo);
  const totalObjetivoValido =
    totalObjetivo !== '' && Number.isFinite(totalObjetivoNum) && totalObjetivoNum > 0;
  const desfaseTotal = totalObjetivoValido ? totalVivo - totalObjetivoNum : 0;
  const desfaseTotalSignificativo =
    modoDistribuir && totalObjetivoValido && Math.abs(desfaseTotal) > 1;
  const logoInputRef = useRef(null);
  const logoPdfEscala = (() => {
    const n = Number(form.logo_pdf_escala);
    if (!Number.isFinite(n)) return 1;
    return Math.min(2, Math.max(0.5, Math.round(n * 100) / 100));
  })();
  const tieneLogoVisual = Boolean(logoPreviewUrl || form.empresa_logo_url);

  /** Evita setPpForm en cada paso del Slider (regeneraba todo el árbol de la página). */
  const [logoEscalaLocal, setLogoEscalaLocal] = useState(null);
  useEffect(() => {
    setLogoEscalaLocal(null);
  }, [form.logo_pdf_escala]);
  useEffect(() => {
    if (!tieneLogoVisual) setLogoEscalaLocal(null);
  }, [tieneLogoVisual]);

  const logoPdfEscalaMostrada =
    logoEscalaLocal !== null && Number.isFinite(logoEscalaLocal) ? logoEscalaLocal : logoPdfEscala;

  // Detectar si el formulario tiene cambios sin guardar
  const initialFormRef = useRef(null);
  useEffect(() => {
    if (open) {
      initialFormRef.current = JSON.stringify(form);
    }
  // Solo capturar snapshot cuando se abre el dialog
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const isDirty = open && initialFormRef.current !== null && JSON.stringify(form) !== initialFormRef.current;

  const [confirmSalir, setConfirmSalir] = useState(false);
  const handleRequestClose = () => {
    if (isDirty && !saving) {
      setConfirmSalir(true);
    } else {
      onClose();
    }
  };

  const [pdfFullPreviewOpen, setPdfFullPreviewOpen] = useState(false);
  const [pdfFullPreviewLoading, setPdfFullPreviewLoading] = useState(false);
  const [pdfFullPreviewState, setPdfFullPreviewState] = useState(null);

  const handleClosePdfFullPreview = useCallback(() => {
    setPdfFullPreviewOpen(false);
    setPdfFullPreviewState(null);
    setPdfFullPreviewLoading(false);
  }, []);

  const handleOpenPdfFullPreview = async () => {
    const rubrosConNombre = (form.rubros || []).filter((r) => r.nombre?.trim());
    if (!rubrosConNombre.length) {
      onPdfPreviewError?.('Agregá al menos un rubro con nombre para ver la vista previa.', 'warning');
      return;
    }
    setPdfFullPreviewOpen(true);
    setPdfFullPreviewLoading(true);
    setPdfFullPreviewState(null);
    try {
      const presupuesto = buildPresupuestoDraftForPdfPreview(form, empresaNombre);
      if (!presupuesto) {
        throw new Error('Datos incompletos');
      }
      let logoDataUrl = null;
      const logoSrc = logoPreviewUrl || form.empresa_logo_url;
      if (logoSrc) {
        logoDataUrl = await loadImageAsDataUrl(logoSrc);
      }
      let costoM2Data = null;
      try {
        costoM2Data = await calcularCostoM2DataForPdf(presupuesto);
      } catch (err) {
        console.warn('Vista previa PDF: costo m²', err);
      }
      setPdfFullPreviewState({
        presupuesto,
        empresa: { nombre: empresaNombre || '' },
        logoDataUrl,
        costoM2Data,
        incluirTotalesM2: true,
      });
    } catch (err) {
      console.error(err);
      onPdfPreviewError?.('No se pudo generar la vista previa. Intentá de nuevo.', 'error');
      setPdfFullPreviewOpen(false);
    } finally {
      setPdfFullPreviewLoading(false);
    }
  };

  const handleLogoInputChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const check = validateLogoFileForUpload(file);
    if (!check.ok) {
      onLogoPickError?.(check.message);
      return;
    }
    await onUploadLogo?.(file);
  };

  return (
    <>
  <Dialog open={open} onClose={handleRequestClose} fullWidth maxWidth="lg">
    <DialogTitle>{isEdit ? 'Editar Presupuesto' : 'Nuevo Presupuesto Profesional'}</DialogTitle>
    <DialogContent dividers>
      <Stack spacing={2} sx={{ mt: 1 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'flex-start' }}>
          <TextField
            label="Título *"
            fullWidth
            sx={{ flex: 1 }}
            value={form.titulo}
            onChange={(e) => onFormChange({ ...form, titulo: e.target.value })}
          />
          <DatePicker
            label="Fecha del presupuesto"
            value={isoADateLocal((form.fecha && String(form.fecha).trim()) || hoyIso())}
            onChange={(date) => {
              if (!date || Number.isNaN(date.getTime())) {
                onFormChange({ ...form, fecha: hoyIso() });
                return;
              }
              const y = date.getFullYear();
              const m = String(date.getMonth() + 1).padStart(2, '0');
              const d = String(date.getDate()).padStart(2, '0');
              onFormChange({ ...form, fecha: `${y}-${m}-${d}` });
            }}
            format="dd/MM/yyyy"
            slotProps={{
              textField: {
                size: 'small',
                fullWidth: true,
                sx: { width: { xs: '100%', md: 220 }, flexShrink: 0 },
              },
            }}
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
          <Stack spacing={1}>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
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
            {desfaseTotalSignificativo && (
              <Box
                sx={{
                  px: 1.25,
                  py: 0.75,
                  borderRadius: 0.75,
                  bgcolor: 'rgba(237,108,2,0.08)',
                  border: '1px solid',
                  borderColor: 'warning.light',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Typography variant="caption" color="warning.dark" sx={{ lineHeight: 1.5 }}>
                  <Box component="span" sx={{ fontWeight: 600 }}>
                    Desfase con el total objetivo:
                  </Box>{' '}
                  el total real es {formatCurrency(totalVivo, form.moneda)} (
                  {desfaseTotal > 0 ? '+' : '−'}
                  {formatCurrency(Math.abs(desfaseTotal), form.moneda)} respecto al objetivo de{' '}
                  {formatCurrency(totalObjetivoNum, form.moneda)}). Se produjo por editar{' '}
                  cantidad o precio en algún subrubro. Volvé a escribir el total para redistribuir,
                  o ajustá los subrubros.
                </Typography>
              </Box>
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
                {(() => {
                  // Decisión: TextField editable o Chip derivado.
                  //  - Modo distribuir: TextField (el usuario fija un monto que se reparte).
                  //  - Modo normal sin desglose (Σ tareas = 0): TextField (rubro suelto).
                  //  - Modo normal con desglose: Chip derivado (= Σ tareas).
                  const sumaSubrubros = sumaEfectivaTareas(rubro.tareas);
                  const esDerivado = !modoDistribuir && sumaSubrubros > 0;
                  if (esDerivado) {
                    return (
                      <Tooltip title="Calculado a partir de los subrubros" placement="top" arrow>
                        <Chip
                          label={formatCurrency(Number(rubro.monto) || 0, form.moneda)}
                          size="small"
                          sx={{
                            minWidth: 130,
                            height: 32,
                            bgcolor: 'action.hover',
                            color: 'text.primary',
                            fontWeight: 600,
                            '& .MuiChip-label': { px: 1.25 },
                          }}
                        />
                      </Tooltip>
                    );
                  }
                  return (
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
                  );
                })()}
                {totalVivo > 0 && (Number(rubro.monto) || 0) > 0 && (
                  <Chip
                    label={formatPct(((Number(rubro.monto) || 0) / totalVivo) * 100)}
                    size="small"
                    variant="outlined"
                    sx={{
                      fontSize: '0.65rem',
                      height: 22,
                      color: 'text.secondary',
                      borderColor: 'divider',
                      flexShrink: 0,
                      '& .MuiChip-label': { px: 0.75 },
                    }}
                  />
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

              <Box sx={{ ml: { xs: 0, sm: 3 } }}>
                {/* Hint visible siempre que haya subrubros */}
                {(rubro.tareas || []).length > 0 && (
                  <Box
                    sx={{
                      mb: 1.25,
                      px: 1.25,
                      py: 0.6,
                      bgcolor: 'grey.50',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                      {modoDistribuir && puedeDistribuirPorIncidencias ? (
                        <>
                          <Box component="span" sx={{ fontWeight: 600 }}>Modo distribuir:</Box>{' '}
                          el sistema reparte el monto del rubro entre los subrubros según el{' '}
                          <Box component="span" sx={{ fontWeight: 600 }}>% del rubro</Box>{' '}
                          que asignes. La cantidad y el precio son resultado del cálculo.
                        </>
                      ) : (
                        <>
                          <Box component="span" sx={{ fontWeight: 600 }}>Descripción:</Box>{' '}
                          obligatoria.{' '}
                          <Box component="span" sx={{ fontWeight: 600 }}>Cantidad y precio:</Box>{' '}
                          opcionales. El total del rubro y del presupuesto se calculan solos.
                        </>
                      )}
                    </Typography>
                  </Box>
                )}

                {/* Warning de incidencias */}
                {(rubro.tareas || []).some((t) => (Number(t.monto) || 0) > 0 || t.incidencia_objetivo_pct != null) && (() => {
                  const suma = sumaIncidenciasObjetivoTareas(rubro.tareas);
                  const isError = suma > 100;
                  const isWarn = suma > 0 && suma < 99.5;
                  if (!isError && !isWarn) return null;
                  return (
                    <Box
                      sx={{
                        mb: 1,
                        px: 1.25,
                        py: 0.5,
                        borderRadius: 0.75,
                        bgcolor: isError ? 'rgba(211,47,47,0.07)' : 'rgba(237,108,2,0.07)',
                        border: '1px solid',
                        borderColor: isError ? 'error.main' : 'warning.main',
                      }}
                    >
                      <Typography variant="caption" color={isError ? 'error.main' : 'warning.main'}>
                        Subrubros: suma {suma.toFixed(1)}% del rubro
                        {isError && ' — no puede superar 100%'}
                        {isWarn && ' — falta completar hasta 100% si usás distribución por %'}
                      </Typography>
                    </Box>
                  );
                })()}

                {/* Filas de subrubros */}
                {(rubro.tareas || []).map((tarea, ti) => {
                  const montoRubro = Number(rubro.monto) || 0;
                  const cantidadNum = Number(tarea.cantidad) || 1;
                  const efectiveMonto = cantidadNum * (Number(tarea.monto) || 0);
                  const pctDelRubro = montoRubro > 0 ? (efectiveMonto / montoRubro) * 100 : 0;
                  const tieneValor = (Number(tarea.monto) || 0) > 0 || tarea.cantidad != null;
                  return (
                    <Box
                      key={ti}
                      sx={{
                        mb: 0.75,
                        pl: 1.25,
                        borderLeft: '2px solid',
                        borderColor: tieneValor ? 'primary.main' : 'divider',
                        transition: 'border-color 0.15s',
                      }}
                    >
                      <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                        <Typography variant="caption" color="text.disabled" sx={{ minWidth: 24, flexShrink: 0, lineHeight: '32px' }}>
                          {ri + 1}.{ti + 1}
                        </Typography>

                        {/* Descripción */}
                        <TextField
                          size="small"
                          sx={{ flex: '1 1 180px', minWidth: 130 }}
                          placeholder="Descripción del subrubro"
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
                            if (
                              el &&
                              focusRef?.current?.type === 'tarea' &&
                              focusRef.current.rubroIdx === ri &&
                              focusRef.current.tareaIdx === ti
                            ) {
                              setTimeout(() => el.focus(), 0);
                              focusRef.current = null;
                            }
                          }}
                        />

                        {/* Bloque de precio: cant × unit = total */}
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={0.5}
                          sx={{
                            border: '1px solid',
                            borderStyle: tieneValor ? 'solid' : 'dashed',
                            borderColor: tieneValor ? 'primary.main' : 'action.disabledBackground',
                            borderRadius: 1,
                            px: 0.75,
                            py: 0.25,
                            bgcolor: tieneValor ? 'action.hover' : 'transparent',
                            transition: 'border-color 0.15s, background-color 0.15s',
                          }}
                        >
                          <TextField
                            size="small"
                            label="Cant."
                            placeholder="1"
                            value={tarea.cantidad != null ? formatNumberForInput(tarea.cantidad, 2) : ''}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === '') {
                                onUpdateTareaCantidad?.(ri, ti, null);
                                return;
                              }
                              const v = parseNumberInput(raw);
                              if (v !== null) onUpdateTareaCantidad?.(ri, ti, v);
                            }}
                            onKeyDown={handleNumericKeyDown}
                            sx={{ width: 62 }}
                            inputProps={{ inputMode: 'decimal', autoComplete: 'off' }}
                          />
                          <Typography variant="caption" color="text.disabled" sx={{ userSelect: 'none', px: 0.25, lineHeight: 1 }}>
                            ×
                          </Typography>
                          <TextField
                            size="small"
                            label={cantidadNum > 1 ? 'Val. unit.' : 'Precio'}
                            placeholder="opcional"
                            value={tarea.monto == null ? '' : formatNumberForInput(tarea.monto, 2)}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === '') {
                                onUpdateTareaMonto?.(ri, ti, '');
                                return;
                              }
                              const v = parseNumberInput(raw);
                              if (v !== null) onUpdateTareaMonto?.(ri, ti, String(v));
                            }}
                            onKeyDown={handleNumericKeyDown}
                            sx={{ width: 118 }}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            }}
                            inputProps={{ inputMode: 'decimal', autoComplete: 'off' }}
                          />
                          {cantidadNum > 1 && efectiveMonto > 0 && (
                            <Stack direction="row" alignItems="center" spacing={0.25}>
                              <Typography variant="caption" color="text.secondary" sx={{ userSelect: 'none' }}>=</Typography>
                              <Chip
                                label={formatCurrency(efectiveMonto, form.moneda)}
                                size="small"
                                sx={{
                                  fontWeight: 700,
                                  fontSize: '0.68rem',
                                  height: 22,
                                  bgcolor: 'primary.main',
                                  color: 'primary.contrastText',
                                  '& .MuiChip-label': { px: 1 },
                                }}
                              />
                            </Stack>
                          )}
                        </Stack>

                        {/* Campo % del rubro: input solo en modo distribuir.
                            En modo normal, el % es derivado y se muestra como chip más abajo. */}
                        {modoDistribuir && puedeDistribuirPorIncidencias && (
                          <TextField
                            size="small"
                            label="% del rubro"
                            value={
                              typeof tarea.incidencia_objetivo_pct === 'string' &&
                              /[.,]$/.test(tarea.incidencia_objetivo_pct)
                                ? tarea.incidencia_objetivo_pct
                                : formatNumberForInput(tarea.incidencia_objetivo_pct ?? '', 1)
                            }
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === '') {
                                onUpdateTareaIncidenciaObjetivo?.(ri, ti, '');
                                return;
                              }
                              if (/[.,]$/.test(raw)) {
                                onUpdateTareaIncidenciaObjetivo?.(ri, ti, raw);
                                return;
                              }
                              const v = parseNumberInput(raw);
                              if (v !== null) onUpdateTareaIncidenciaObjetivo?.(ri, ti, v);
                            }}
                            onBlur={(e) => {
                              const v = parseNumberInput(e.target.value);
                              if (e.target.value !== '' && v !== null) {
                                if (v < 0) onUpdateTareaIncidenciaObjetivo?.(ri, ti, 0);
                                else if (v > 100) onUpdateTareaIncidenciaObjetivo?.(ri, ti, 100);
                              }
                            }}
                            onKeyDown={handleNumericKeyDown}
                            placeholder="opcional"
                            sx={{ width: 100, minWidth: 100 }}
                            inputProps={{ inputMode: 'decimal', autoComplete: 'off' }}
                            error={
                              tarea.incidencia_objetivo_pct != null &&
                              (Number(tarea.incidencia_objetivo_pct) < 0 ||
                                Number(tarea.incidencia_objetivo_pct) > 100)
                            }
                          />
                        )}

                        {/* % calculado como chip */}
                        {!modoDistribuir && montoRubro > 0 && efectiveMonto > 0 && (
                          <Chip
                            label={formatPct(pctDelRubro)}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontSize: '0.65rem',
                              height: 22,
                              color: 'text.secondary',
                              borderColor: 'divider',
                              '& .MuiChip-label': { px: 0.75 },
                            }}
                          />
                        )}

                        {/* Acciones */}
                        <Stack direction="row" spacing={0} flexShrink={0}>
                          <Tooltip title="Subir">
                            <span>
                              <IconButton size="small" disabled={ti === 0} onClick={() => moveTarea?.(ri, ti, -1)}>
                                <ArrowUpwardIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Bajar">
                            <span>
                              <IconButton
                                size="small"
                                disabled={ti === (rubro.tareas || []).length - 1}
                                onClick={() => moveTarea?.(ri, ti, 1)}
                              >
                                <ArrowDownwardIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <IconButton size="small" color="error" onClick={() => removeTarea(ri, ti)}>
                            <DeleteIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </Box>
                  );
                })}

                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 0.75 }}>
                  <Button size="small" onClick={() => addTarea(ri)}>
                    + Subrubro
                  </Button>
                  {(rubro.tareas || []).length === 0 && (
                    <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                      opcional — para listar ítems del rubro
                    </Typography>
                  )}
                </Stack>
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
                imgProps={{
                  onError: (e) => {
                    e.currentTarget.onerror = null;
                  },
                }}
                sx={{ width: 72, height: 72, bgcolor: 'grey.100', border: 1, borderColor: 'divider' }}
              />
              <Stack spacing={0.75} sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Cargá una imagen clara para que aparezca en el presupuesto y PDF.
                </Typography>
                <Typography variant="caption" color="text.disabled" component="div">
                  Formatos: JPG, PNG, WEBP, GIF, AVIF, BMP, TIFF, ICO, SVG, HEIC/HEIF. Máx. 8&nbsp;MB.
                  En algunos navegadores el tipo de archivo no se detecta: si la extensión es correcta, se acepta.
                  HEIC/Fotos de iPhone: la vista previa puede fallar en la PC; al guardar se optimiza el logo.
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
              accept="image/*,.jpg,.jpeg,.jfif,.png,.gif,.webp,.avif,.bmp,.tif,.tiff,.heic,.heif,.svg,.ico"
              style={{ display: 'none' }}
              onChange={handleLogoInputChange}
            />
            {logoUploading && <LinearProgress />}
          </Stack>
            <Divider sx={{ my: 1 }} />
            <Stack spacing={1}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} flexWrap="wrap">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PictureAsPdfIcon />}
                  onClick={handleOpenPdfFullPreview}
                  disabled={saving || logoUploading}
                >
                  Ver vista previa del PDF
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 420 }}>
                  Mismo documento que al descargar el PDF desde el listado o el detalle.
                </Typography>
              </Stack>
            </Stack>
            <Stack spacing={0.5} sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Tamaño del logo en el PDF ({Math.round(logoPdfEscalaMostrada * 100)}% del tamaño base)
              </Typography>
              <Slider
                size="small"
                value={logoPdfEscalaMostrada}
                min={0.5}
                max={2}
                step={0.05}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `${Math.round(Number(v) * 100)}%`}
                disabled={!tieneLogoVisual}
                onChange={(_, v) => {
                  if (!tieneLogoVisual) return;
                  setLogoEscalaLocal(v);
                }}
                onChangeCommitted={(_, v) => {
                  if (!tieneLogoVisual) return;
                  setLogoEscalaLocal(null);
                  onFormChange((prev) => ({ ...prev, logo_pdf_escala: v }));
                  setPdfFullPreviewState((prev) => {
                    if (!prev?.presupuesto) return prev;
                    return {
                      ...prev,
                      presupuesto: { ...prev.presupuesto, logo_pdf_escala: v },
                    };
                  });
                }}
              />
              {!tieneLogoVisual ? (
                <Typography variant="caption" color="text.disabled">
                  Cargá un logo para activar el control de escala.
                </Typography>
              ) : null}
            </Stack>
          <HeaderColorBlock form={form} onFormChange={onFormChange} />
        </Paper>
      </Stack>
    </DialogContent>
    <DialogActions>
      <Button onClick={handleRequestClose}>Cancelar</Button>
      <Button
        variant="contained"
        onClick={onSave}
        disabled={saving || !form.titulo?.trim() || (modoDistribuir && (sumaInvalida || sumaBaja))}
      >
        {saving ? <CircularProgress size={20} /> : isEdit ? 'Guardar cambios' : 'Crear presupuesto'}
      </Button>
    </DialogActions>
  </Dialog>
    {/* Dialog de confirmación para salir sin guardar */}
    <Dialog open={confirmSalir} onClose={() => setConfirmSalir(false)} maxWidth="xs" fullWidth>
      <DialogTitle>¿Salir sin guardar?</DialogTitle>
      <DialogContent>
        <Typography sx={{ pt: 1 }}>Tenés cambios sin guardar. Si salís ahora, se perderá la información ingresada.</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setConfirmSalir(false)}>Seguir editando</Button>
        <Button color="error" variant="contained" onClick={() => { setConfirmSalir(false); onClose(); }}>Salir sin guardar</Button>
      </DialogActions>
    </Dialog>

    <PresupuestoPdfFullPreviewDialog
      open={pdfFullPreviewOpen}
      onClose={handleClosePdfFullPreview}
      loading={pdfFullPreviewLoading}
      presupuesto={pdfFullPreviewState?.presupuesto}
      empresa={pdfFullPreviewState?.empresa}
      logoDataUrl={pdfFullPreviewState?.logoDataUrl}
      costoM2Data={pdfFullPreviewState?.costoM2Data}
      incluirTotalesM2={pdfFullPreviewState?.incluirTotalesM2 ?? true}
    />
    </>
  );
};

export default PresupuestoFormDialog;
