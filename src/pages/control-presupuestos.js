// 📖 Doc del módulo de control de presupuestos (funcional + técnico, incluye CAC y
//    agrupación por moneda/índice): sorby_bot_wa/docs/control-presupuestos/
import { useEffect, useState, useMemo, Fragment } from 'react';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import Head from 'next/head';
import {
  Box,
  Container,
  Stack,
  Typography,
  Paper,
  Card,
  CardContent,
  CardActionArea,
  IconButton,
  TextField,
  Button,
  Snackbar,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  Chip,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Autocomplete,
  Popover,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader
} from '@mui/material';
import Drawer from '@mui/material/Drawer';
import CircularProgress from '@mui/material/CircularProgress';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import RefreshIcon from '@mui/icons-material/Refresh';
import CategoryIcon from '@mui/icons-material/Category';
import TimelineIcon from '@mui/icons-material/Timeline';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { useRouter } from 'next/router';
import { useAuthContext } from 'src/contexts/auth-context';
import presupuestoService from 'src/services/presupuestoService';
import MonedasService from 'src/services/monedasService';
import { getEmpresaById, getEmpresaDetailsFromUser } from 'src/services/empresaService';
import proveedorService from 'src/services/proveedorService';
import { getProyectosFromUser } from 'src/services/proyectosService';
import { formatCurrency, formatTimestamp } from 'src/utils/formatters';
import { getClasificacionesEfectivas, formatClasificacionesText } from 'src/utils/presupuestoLegacy';
import { CAC_LABELS } from 'src/components/presupuestosProfesionales/monedaAjusteConfig';

// ─── Helpers de item de presupuesto (multi-categoría / multi-proveedor) ──────
const itemTieneCategorias = (item) =>
  Array.isArray(item?.clasificaciones) && item.clasificaciones.length > 0;
const itemTieneProveedores = (item) =>
  Array.isArray(item?.proveedores) && item.proveedores.length > 0;
const itemEsGeneral = (item) =>
  !itemTieneCategorias(item) && !item?.etapa && !itemTieneProveedores(item);

// ─── Identidad de moneda/índice de un presupuesto (TAR-423) ──────────────────
// Cada presupuesto vive en una moneda/índice (ARS fijo, USD, o CAC por subíndice).
// El control no mezcla unidades distintas en un mismo número: se agrupa por esta clave.
const itemIndiceKey = (item) => {
  const m = item?.moneda || 'ARS';
  return m === 'CAC' ? `CAC:${item?.cac_tipo || 'general'}` : m;
};
const indiceKeyMoneda = (key) => (key.startsWith('CAC') ? 'CAC' : key);
const indiceKeyCacTipo = (key) => (key.startsWith('CAC:') ? key.slice(4) : null);
const indiceKeyLabel = (key) => {
  if (key === 'ARS') return 'Pesos (ARS)';
  if (key === 'USD') return 'Dólares (USD)';
  return `CAC ${CAC_LABELS[indiceKeyCacTipo(key)] || 'Promedio'}`;
};
const indiceKeyOrden = (key) => (key === 'ARS' ? 0 : key === 'USD' ? 1 : 2);
// Formatea un monto en su moneda nativa (sin convertir): USD/CAC con su sufijo, ARS con $.
const fmtMontoNativo = (v, monedaNativa) => {
  const n = Number(v || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 });
  if (monedaNativa === 'USD') return `USD ${n}`;
  if (monedaNativa === 'CAC') return `${n} CAC`;
  return `$${Number(v || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
};
const itemMatcheaCategoria = (item, cat) =>
  (item?.clasificaciones || []).some((c) => c.categoria === cat);
const itemMatcheaProveedor = (item, nombre) =>
  (item?.proveedores || []).some((p) => p.nombre === nombre);
const itemNombresProveedores = (item) =>
  (item?.proveedores || []).map((p) => p.nombre).filter(Boolean);
const labelItem = (item, fallback = 'Ingreso general') => {
  const partes = [];
  if (itemTieneCategorias(item)) partes.push(formatClasificacionesText(item.clasificaciones));
  if (item?.etapa) partes.push(item.etapa);
  const provNombres = itemNombresProveedores(item);
  if (provNombres.length > 0) partes.push(provNombres.join(', '));
  return partes.length > 0 ? partes.join(' · ') : fallback;
};
import dayjs from 'dayjs';
import PresupuestoDrawer from 'src/components/PresupuestoDrawer';
import ExportarPdfMenu from 'src/components/plantillasPdf/ExportarPdfMenu';
import { buildControlPresupuestoData } from 'src/utils/controlPresupuesto/buildControlPresupuestoData';
import { snapshotCacIndice } from 'src/utils/cac/pickCac';
import Tooltip from '@mui/material/Tooltip';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CloseIcon from '@mui/icons-material/Close';

const loadDefaultControlPresupuestoDoc = () =>
  import('src/utils/controlPresupuesto/PdfControlPresupuestoDocument').then(
    (m) => m.PdfControlPresupuestoDocument
  );
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ListAltIcon from '@mui/icons-material/ListAlt';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

// Helper: calcular totales de un resumen multimoneda (para ProyectoCard)
// Si existe presupuesto general (sin categoría/etapa/proveedor), lo usa como techo
const calcularTotalesResumen = (resumen, tipoCambio = null, monedaVista = 'ARS') => {
  if (!resumen) return { egresosTotal: 0, egresosEjecutado: 0, ingresosTotal: 0, ingresosEjecutado: 0 };
  
  // Todos los subíndices CAC disponibles
  const cacIndices = {
    general: resumen.cotizacionActual?.cac_indice || null,
    mano_obra: resumen.cotizacionActual?.cac_mano_obra || null,
    materiales: resumen.cotizacionActual?.cac_materiales || null,
  };
  
  const convertir = (monto, monedaOriginal, cacTipoItem = null) => {
    if (monedaVista === monedaOriginal) return monto;
    if (!tipoCambio && monedaOriginal !== 'CAC') return monto;
    // Seleccionar el subíndice CAC correcto según el cac_tipo del item
    const cacIdx = cacIndices[cacTipoItem || 'general'] || cacIndices.general;
    if (monedaVista === 'USD' && monedaOriginal === 'ARS') return tipoCambio ? monto / tipoCambio : monto;
    if (monedaVista === 'ARS' && monedaOriginal === 'USD') return tipoCambio ? monto * tipoCambio : monto;
    if (monedaOriginal === 'CAC' && monedaVista === 'ARS') return cacIdx ? monto * cacIdx : monto;
    if (monedaOriginal === 'CAC' && monedaVista === 'USD') return (cacIdx && tipoCambio) ? (monto * cacIdx) / tipoCambio : monto;
    if (monedaOriginal === 'ARS' && monedaVista === 'CAC') return cacIdx ? monto / cacIdx : monto;
    if (monedaOriginal === 'USD' && monedaVista === 'CAC') return (cacIdx && tipoCambio) ? (monto * tipoCambio) / cacIdx : monto;
    return monto;
  };

  // Sumar items separando general (techo) de específicos (asignaciones)
  const sumarPorTipo = (porMoneda) => {
    const allItems = Object.values(porMoneda || {}).flatMap(m => m.items || []);
    const generales = allItems.filter(itemEsGeneral);
    const especificos = allItems.filter((i) => !itemEsGeneral(i));
    
    if (generales.length > 0) {
      let total = generales.reduce((s, i) => s + convertir(i.monto || 0, i.moneda || 'ARS', i.cac_tipo), 0);
      const ejecutado = generales.reduce((s, i) => s + convertir(i.ejecutado || 0, i.moneda || 'ARS', i.cac_tipo), 0);
      const especTotal = especificos.reduce((s, i) => s + convertir(i.monto || 0, i.moneda || 'ARS', i.cac_tipo), 0);
      if (especTotal > total) total = especTotal;
      return { total, ejecutado };
    }
    
    return allItems.reduce((acc, i) => ({
      total: acc.total + convertir(i.monto || 0, i.moneda || 'ARS', i.cac_tipo),
      ejecutado: acc.ejecutado + convertir(i.ejecutado || 0, i.moneda || 'ARS', i.cac_tipo),
    }), { total: 0, ejecutado: 0 });
  };

  const egresos = sumarPorTipo(resumen.egresosPorMoneda);
  const ingresos = sumarPorTipo(resumen.ingresosPorMoneda);
  
  return { egresosTotal: egresos.total, egresosEjecutado: egresos.ejecutado, ingresosTotal: ingresos.total, ingresosEjecutado: ingresos.ejecutado };
};

// ============ COMPONENTE: CARD DE PROYECTO (VISTA GENERAL) ============
const ProyectoCard = ({ proyecto, resumen, onSelect, formatMonto, tipoCambio, moneda }) => {
  const { egresosTotal, egresosEjecutado, ingresosTotal, ingresosEjecutado } = calcularTotalesResumen(resumen, tipoCambio, moneda);
  const porcentajeEgresos = egresosTotal > 0 ? (egresosEjecutado / egresosTotal) * 100 : 0;
  const gananciaProyectada = ingresosTotal - egresosTotal;

  // Detectar si hay multi-moneda para mostrar indicador
  const monedasIngreso = resumen?.ingresosPorMoneda ? Object.keys(resumen.ingresosPorMoneda) : [];
  const monedasEgreso = resumen?.egresosPorMoneda ? Object.keys(resumen.egresosPorMoneda) : [];
  const esMultiMonedaIng = monedasIngreso.length > 1;
  const esMultiMonedaEgr = monedasEgreso.length > 1;
  const gananciaReal = ingresosEjecutado - egresosEjecutado;
  const gananciaProyectadaPendiente = gananciaProyectada - gananciaReal;
  const tieneIngresos = ingresosTotal > 0;
  
  return (
    <Card sx={{ height: '100%' }}>
      <CardActionArea onClick={() => onSelect(proyecto.id)} sx={{ height: '100%' }}>
        <CardContent sx={{ p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } }}>
          <Typography variant="h6" gutterBottom noWrap sx={{ fontSize: { xs: '0.95rem', md: '1.25rem' } }}>{proyecto.nombre}</Typography>
          <Stack spacing={0.75}>
            {/* Ingresos: presupuestado y cobrado */}
            {tieneIngresos && (
              <>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <TrendingUpIcon sx={{ fontSize: 14, color: 'success.main' }} />
                    <Typography variant="body2" color="text.secondary">Pres. ingresos</Typography>
                    {esMultiMonedaIng && (
                      <Tooltip title="Incluye múltiples monedas (ver detalle adentro)" arrow>
                        <SwapHorizIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                      </Tooltip>
                    )}
                  </Stack>
                  <Typography variant="body2" fontWeight={600}>{formatMonto(ingresosTotal, moneda)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary" sx={{ pl: 2.5 }}>Cobrado</Typography>
                  <Typography variant="caption" fontWeight={600} color="success.main">
                    {formatMonto(ingresosEjecutado, moneda)}
                  </Typography>
                </Stack>
              </>
            )}
            {/* Egresos: presupuestado y gastado */}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={0.5} alignItems="center">
                <TrendingDownIcon sx={{ fontSize: 14, color: 'error.main' }} />
                <Typography variant="body2" color="text.secondary">Pres. egresos</Typography>
                {esMultiMonedaEgr && (
                  <Tooltip title="Incluye múltiples monedas (ver detalle adentro)" arrow>
                    <SwapHorizIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                  </Tooltip>
                )}
              </Stack>
              <Typography variant="body2" fontWeight={600}>{formatMonto(egresosTotal, moneda)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary" sx={{ pl: 2.5 }}>Gastado</Typography>
              <Typography variant="caption" fontWeight={600} color={porcentajeEgresos > 100 ? 'error.main' : 'text.secondary'}>
                {formatMonto(egresosEjecutado, moneda)}
              </Typography>
            </Stack>
            <LinearProgress 
              variant="determinate" 
              value={Math.min(porcentajeEgresos, 100)}
              sx={{ height: 6, borderRadius: 3 }}
              color={porcentajeEgresos > 100 ? 'error' : porcentajeEgresos > 80 ? 'warning' : 'primary'}
            />
            {/* Ganancia proyectada, ejecutada y pendiente (solo si hay ingresos) */}
            {tieneIngresos && (
              <>
                <Divider sx={{ my: 0.25 }} />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary">Ganancia proyectada</Typography>
                  <Typography variant="body2" fontWeight={700} color={gananciaProyectada >= 0 ? 'success.main' : 'error.main'}>
                    {formatMonto(gananciaProyectada, moneda)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>Ejecutada</Typography>
                  <Typography variant="caption" fontWeight={600} color={gananciaReal >= 0 ? 'success.main' : 'error.main'}>
                    {formatMonto(gananciaReal, moneda)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>Pendiente</Typography>
                  <Typography variant="caption" fontWeight={600} color={gananciaProyectadaPendiente >= 0 ? 'success.main' : 'error.main'}>
                    {formatMonto(gananciaProyectadaPendiente, moneda)}
                  </Typography>
                </Stack>
              </>
            )}
            {!tieneIngresos && (
              <Typography variant="caption" color="text.secondary" align="center">
                {porcentajeEgresos.toFixed(1)}% ejecutado
              </Typography>
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

// ============ COMPONENTE: ITEM DE PRESUPUESTO ============
// Modo normal: click en la card abre el detalle (onEditar).
// Modo selección (modoSeleccion=true): click toggle selección; checkbox visible.
// Ícono editar (esquina sup. derecha) → abre drawer aunque esté en modo selección.
const PresupuestoItem = ({
  label, presupuesto, ejecutado, formatMonto, onEditar, onCrear, onToggleSeleccion, seleccionada = false,
  historial, moneda, indexacion, baseCalculo, cotizacionSnapshot, montoIngresado,
  cacIndiceActual: cacIdx, tipoCambioActual, cacTipo, cacEstado,
  modoSeleccion = false,
}) => {
  const tienePresupuesto = presupuesto !== null && presupuesto !== undefined;
  const ejec = ejecutado || 0;
  const porcentaje = tienePresupuesto && presupuesto > 0 ? (ejec / presupuesto) * 100 : 0;
  const tieneHistorial = historial && historial.length > 0;
  const monedaItem = moneda || 'ARS';
  const esIndexado = !!indexacion;
  const cacTipoLabel = cacTipo === 'mano_obra' ? 'MO' : cacTipo === 'materiales' ? 'MAT' : '';
  // Mostramos en unidad NATIVA (con su equivalente en pesos a hoy) tanto cuando hay
  // indexación (CAC/USD) como cuando la moneda nativa es USD/CAC. Solo el peso plano
  // (ARS sin indexar) usa formatMonto (que sigue el toggle de moneda de la página).
  const esCAClike = indexacion === 'CAC' || (!esIndexado && monedaItem === 'CAC');
  const esUSDlike = indexacion === 'USD' || (!esIndexado && monedaItem === 'USD');
  const unidadIdx = esCAClike ? `CAC${cacTipoLabel ? ' ' + cacTipoLabel : ''}` : (esUSDlike ? 'USD' : '');
  const mostrarUnidad = unidadIdx !== '';
  const indiceActual = esCAClike ? cacIdx : (esUSDlike ? tipoCambioActual : null);

  // Para indexados: mostrar equivalencia ARS hoy
  const fmtARS = (v) => v != null ? `$${Number(v).toLocaleString('es-AR', { maximumFractionDigits: 0 })}` : '';
  const fmtUnidad = (v) => `${Number(v || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })} ${unidadIdx}`;
  const presEnARS = mostrarUnidad && indiceActual && presupuesto ? presupuesto * indiceActual : null;
  const ejEnARS = mostrarUnidad && indiceActual && ejec ? ejec * indiceActual : null;
  const saldoEnARS = mostrarUnidad && indiceActual ? (presupuesto - ejec) * indiceActual : null;

  const stylesSeleccion = seleccionada
    ? { borderColor: 'primary.main', borderWidth: 2, bgcolor: 'action.selected' }
    : { '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' } };

  // Handler unificado del click en la card.
  // - Modo selección activo: toggle.
  // - Modo normal: abrir detalle (onEditar) si lo hay; caso contrario, toggle (entra a selección con esta card).
  const handleCardClick = (e) => {
    if (modoSeleccion) return onToggleSeleccion?.(e);
    if (onEditar) return onEditar(e);
    if (onCrear) return onCrear(e);
    // Sin presupuesto y sin handler de crear: no hacer nada (no debería seleccionarse fuera de modoSeleccion).
  };

  // Ícono editar visible solo si hay presupuesto que editar.
  const renderEditarBtn = tienePresupuesto && onEditar ? (
    <IconButton
      size="small"
      onClick={(e) => { e.stopPropagation(); onEditar(e); }}
      sx={{ position: 'absolute', top: 6, right: 6, opacity: 0.6, '&:hover': { opacity: 1, bgcolor: 'action.hover' } }}
      aria-label="Editar presupuesto"
    >
      <EditIcon fontSize="inherit" sx={{ fontSize: 16 }} />
    </IconButton>
  ) : null;

  // Indicador visual de selección (checkbox a la izquierda del label).
  const renderCheck = (
    <Box
      sx={{
        width: 18, height: 18, minWidth: 18, borderRadius: '4px',
        border: '1.5px solid',
        borderColor: seleccionada ? 'primary.main' : 'divider',
        bgcolor: seleccionada ? 'primary.main' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}
    >
      {seleccionada && (
        <Box component="span" sx={{ color: 'primary.contrastText', fontSize: 14, lineHeight: 1, fontWeight: 700 }}>✓</Box>
      )}
    </Box>
  );

  if (!tienePresupuesto) {
    return (
      <Paper
        variant="outlined"
        sx={{ p: { xs: 1.5, md: 2 }, cursor: 'pointer', position: 'relative', transition: 'all 0.15s', ...stylesSeleccion }}
        onClick={handleCardClick}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            {modoSeleccion && renderCheck}
            <Typography sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}>{label}</Typography>
          </Stack>
          <Chip label="Sin presupuesto" size="small" variant="outlined" color="default" />
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={{ p: { xs: 1.5, md: 2 }, cursor: 'pointer', position: 'relative', transition: 'all 0.15s', ...stylesSeleccion }}
      onClick={handleCardClick}
    >
      {renderEditarBtn}
      {/* Fila superior: check + label + badges */}
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0, mb: 0.5, pr: 3 }} flexWrap="wrap" useFlexGap>
        {modoSeleccion && renderCheck}
        <Typography fontWeight={500} noWrap sx={{ fontSize: { xs: '0.85rem', md: '1rem' }, flex: { xs: '1 1 auto', sm: '0 1 auto' }, minWidth: 0 }}>{label}</Typography>
        {esIndexado && (
          <Chip label={`idx ${unidadIdx}`} size="small" color="secondary" variant="outlined" sx={{ height: 20, '& .MuiChip-label': { px: 0.5, fontSize: '0.65rem' } }} />
        )}
        {indexacion === 'CAC' && cacEstado === 'estimado' && (
          <Tooltip title="Usa el último CAC disponible; se actualiza solo cuando se publique el CAC oficial del mes" arrow>
            <Chip label="Estimado" size="small" color="warning" variant="outlined" sx={{ height: 20, '& .MuiChip-label': { px: 0.5, fontSize: '0.65rem' } }} />
          </Tooltip>
        )}
        {baseCalculo === 'subtotal' && (
          <Chip label="neto" size="small" color="default" variant="outlined" sx={{ height: 20, '& .MuiChip-label': { px: 0.5, fontSize: '0.65rem' } }} />
        )}
        {tieneHistorial && (
          <Chip label={`${historial.length}`} size="small" color="info" variant="outlined" sx={{ height: 20, '& .MuiChip-label': { px: 0.5, fontSize: '0.65rem' } }} />
        )}
      </Stack>
      {/* Fila de montos: presupuesto y ejecutado */}
      <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
        {mostrarUnidad ? (
          <>
            <Tooltip title={presEnARS != null ? `Hoy: ${fmtARS(presEnARS)}` : ''} arrow>
              <Chip label={`Pres: ${fmtUnidad(presupuesto)}`} size="small" variant="outlined" />
            </Tooltip>
            <Tooltip title={ejEnARS != null ? `Hoy: ${fmtARS(ejEnARS)}` : ''} arrow>
              <Chip 
                label={`Ejec: ${fmtUnidad(ejec)}`}
                size="small" 
                color={porcentaje > 100 ? 'error' : 'success'}
              />
            </Tooltip>
          </>
        ) : (
          <>
            <Chip label={`Pres: ${formatMonto(presupuesto, monedaItem)}`} size="small" variant="outlined" />
            <Chip 
              label={`Ejec: ${formatMonto(ejec, monedaItem)}`} 
              size="small" 
              color={porcentaje > 100 ? 'error' : 'success'}
            />
          </>
        )}
      </Stack>
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.75 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
          {porcentaje.toFixed(1)}% ejecutado
          {mostrarUnidad && ejEnARS != null && ` · ${fmtARS(ejEnARS)} ARS`}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
          Saldo: {mostrarUnidad ? `${fmtUnidad(presupuesto - ejec)}` : formatMonto(presupuesto - ejec, monedaItem)}
          {mostrarUnidad && saldoEnARS != null && ` · ${fmtARS(saldoEnARS)} ARS`}
        </Typography>
      </Stack>
    </Paper>
  );
};

// ============ COMPONENTE PRINCIPAL ============
const ControlPresupuestosPage = () => {
  const { user } = useAuthContext();
  const router = useRouter();
  
  // Estado principal
  const [proyectos, setProyectos] = useState([]);
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(null);
  const [empresaId, setEmpresaId] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [resumenesProyectos, setResumenesProyectos] = useState({});
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  
  // Tabs
  const [tabActivo, setTabActivo] = useState(0); // 0: Categoría, 1: Etapa, 2: Proveedor
  
  // Estado de moneda y cotización
  const [moneda, setMoneda] = useState('ARS');
  const [tipoCambio, setTipoCambio] = useState(null);
  const [tipoCambioManual, setTipoCambioManual] = useState('');
  const [cotizacionCargada, setCotizacionCargada] = useState(false);
  
  // Categorías, etapas y proveedores configurados
  const [categorias, setCategorias] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [proveedoresAgregados, setProveedoresAgregados] = useState([]);
  const [proveedoresEmpresa, setProveedoresEmpresa] = useState([]);
  
  // Drawer de presupuesto (reemplaza todos los modals de presupuesto)
  const [drawerPresupuesto, setDrawerPresupuesto] = useState({
    open: false,
    mode: 'crear', // 'crear' | 'editar'
    tipoAgrupacion: null,
    valorAgrupacion: null,
    preFill: null,
    tipoDefault: 'egreso',
    showFullForm: false,
    presupuesto: null,
  });

  // Popover de bucket: cuando un bucket de agrupación tiene N>1 presupuestos matcheando,
  // el ícono editar abre este popover para que el usuario elija cuál editar.
  const [bucketPopover, setBucketPopover] = useState({
    open: false,
    anchorEl: null,
    items: [],
    tipoAgrupacion: null,
    valorAgrupacion: null,
  });

  // Selección multi-card cross-tab: el usuario clickea cards de categoría/proveedor/etapa para
  // acumular y luego crear un presupuesto que cubra todas las dimensiones seleccionadas.
  // Etapa es single (modelo): al clickear una nueva etapa, reemplaza la anterior (o toggle si es la misma).
  const [seleccionMulti, setSeleccionMulti] = useState({
    clasificaciones: [], // string[] nombres de categoría
    proveedores: [],     // string[] nombres
    etapa: null,         // string | null
  });
  const totalSeleccionados =
    seleccionMulti.clasificaciones.length +
    seleccionMulti.proveedores.length +
    (seleccionMulti.etapa ? 1 : 0);

  const toggleSeleccionCategoria = (cat) => {
    setSeleccionMulti(prev => ({
      ...prev,
      clasificaciones: prev.clasificaciones.includes(cat)
        ? prev.clasificaciones.filter(c => c !== cat)
        : [...prev.clasificaciones, cat],
    }));
  };
  const toggleSeleccionProveedor = (prov) => {
    setSeleccionMulti(prev => ({
      ...prev,
      proveedores: prev.proveedores.includes(prov)
        ? prev.proveedores.filter(p => p !== prov)
        : [...prev.proveedores, prov],
    }));
  };
  const toggleSeleccionEtapa = (et) => {
    setSeleccionMulti(prev => ({
      ...prev,
      etapa: prev.etapa === et ? null : et,
    }));
  };
  const limpiarSeleccion = () => setSeleccionMulti({ clasificaciones: [], proveedores: [], etapa: null });

  // Modo selección múltiple: cuando true, click en las cards toggle selección; cuando false, abre detalle.
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const salirModoSeleccion = () => { setModoSeleccion(false); limpiarSeleccion(); };
  
  // Modal agregar proveedor (se mantiene como dialog simple)
  const [proveedorModal, setProveedorModal] = useState(false);
  const [nuevoProveedor, setNuevoProveedor] = useState('');

  // Drawer de movimientos (desde tarjetas resumen)
  const [movDrawer, setMovDrawer] = useState({ open: false, tipo: null, label: '' });
  const [movDrawerData, setMovDrawerData] = useState([]);
  const [movDrawerLoading, setMovDrawerLoading] = useState(false);
  const [movDrawerOrdenAsc, setMovDrawerOrdenAsc] = useState(true);
  const [movDrawerEquiv, setMovDrawerEquiv] = useState({ usd: false, cac: false });
  


  // Fetch movimientos cuando se abre el drawer de resumen
  useEffect(() => {
    if (!movDrawer.open || !proyectoSeleccionado) return;
    let cancelled = false;
    setMovDrawerLoading(true);
    presupuestoService.obtenerMovimientosProyecto(proyectoSeleccionado, movDrawer.tipo)
      .then(data => { if (!cancelled) setMovDrawerData(data); })
      .catch(() => { if (!cancelled) setMovDrawerData([]); })
      .finally(() => { if (!cancelled) setMovDrawerLoading(false); });
    return () => { cancelled = true; };
  }, [movDrawer.open, movDrawer.tipo, proyectoSeleccionado]);

  // Helper: abrir drawer de movimientos
  const abrirMovDrawer = (tipo, label) => {
    setMovDrawerData([]);
    setMovDrawerOrdenAsc(true);
    setMovDrawer({ open: true, tipo, label });
  };

  // Cargar cotización del dólar
  useEffect(() => {
    const cargarCotizacion = async () => {
      try {
        const data = await MonedasService.listarDolar({ limit: 1 });
        if (data && data.length > 0) {
          const ultimo = data[0];
          // Usar blue promedio si existe, si no oficial
          const valor = ultimo.blue?.promedio || ultimo.blue?.venta || ultimo.oficial?.venta || null;
          if (valor) {
            setTipoCambio(valor);
            setCotizacionCargada(true);
          }
        }
      } catch (err) {
        console.error('No se pudo cargar cotización del dólar:', err);
      }
    };
    cargarCotizacion();
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { proyectoId } = router.query;
        let empresaData;

        if (router.query.empresaId) {
          empresaData = await getEmpresaById(router.query.empresaId);
        } else {
          const fromUser = await getEmpresaDetailsFromUser(user);
          // user.empresaData es un snapshot del login y puede no traer la config más
          // nueva (ej. el índice por categoría de TAR-423). Releemos fresco por id.
          empresaData = fromUser?.id ? await getEmpresaById(fromUser.id) : fromUser;
        }

        setEmpresa(empresaData);
        setEmpresaId(empresaData.id);
        setCategorias(empresaData.categorias || []);
        setEtapas(empresaData.etapas || ['Cimientos', 'Estructura', 'Cerramientos', 'Instalaciones', 'Terminaciones']);
        
        // Cargar proveedores de la empresa
        const proveedoresNombres = await proveedorService.getNombres(empresaData.id);
        setProveedoresEmpresa(proveedoresNombres);

        const proyectosUsuario = await getProyectosFromUser(user);
        setProyectos(proyectosUsuario);

        // Si viene proyectoId en query, seleccionarlo
        if (proyectoId) {
          setProyectoSeleccionado(proyectoId);
        }
      } catch (err) {
        console.error(err);
        setAlert({ open: true, message: 'Error al cargar datos', severity: 'error' });
      }
    };
    fetchData();
  }, [user]);

  // Sincronizar estado con URL (para navegación con botón atrás/adelante del browser)
  useEffect(() => {
    const proyectoIdFromQuery = router.query.proyectoId || null;
    if (proyectoIdFromQuery !== proyectoSeleccionado) {
      setProyectoSeleccionado(proyectoIdFromQuery);
      if (!proyectoIdFromQuery) {
        setResumen(null);
      }
    }
  }, [router.query.proyectoId]);

  // Cargar resúmenes de todos los proyectos cuando no hay selección
  useEffect(() => {
    if (!proyectoSeleccionado && proyectos.length > 0 && empresaId) {
      cargarResumenesTodosProyectos();
    }
  }, [proyectoSeleccionado, proyectos, empresaId]);

  // Cargar resumen cuando cambia el proyecto seleccionado
  useEffect(() => {
    if (proyectoSeleccionado && empresaId) {
      cargarResumen();
    }
  }, [proyectoSeleccionado, empresaId]);

  const cargarResumenesTodosProyectos = async () => {
    setLoading(true);
    try {
      const resumenes = {};
      for (const proyecto of proyectos) {
        try {
          const result = await presupuestoService.obtenerResumenProyecto(proyecto.id, empresaId);
          if (result.success) {
            resumenes[proyecto.id] = result.resumen;
          }
        } catch (e) {
          console.error(`Error cargando resumen proyecto ${proyecto.id}`, e);
        }
      }
      setResumenesProyectos(resumenes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Seleccionar proyecto y actualizar URL
  const handleSeleccionarProyecto = (proyectoId) => {
    setProyectoSeleccionado(proyectoId);
    router.push(
      { pathname: router.pathname, query: { ...router.query, proyectoId } },
      undefined,
      { shallow: true }
    );
  };

  // Volver a la vista general y limpiar URL
  const handleVolverAGeneral = () => {
    setProyectoSeleccionado(null);
    setResumen(null);
    const { proyectoId, ...restQuery } = router.query;
    router.push(
      { pathname: router.pathname, query: restQuery },
      undefined,
      { shallow: true }
    );
  };

  const cargarResumen = async () => {
    setLoading(true);
    try {
      const result = await presupuestoService.obtenerResumenProyecto(proyectoSeleccionado, empresaId);
      if (result.success) {
        setResumen(result.resumen);
        // Extraer proveedores únicos del resumen (de todas las monedas, egresos e ingresos).
        // Soporta tanto el array nuevo `proveedores: [{id, nombre}]` como el legacy `proveedor` string.
        const proveedores = new Set();
        const scan = (items) => (items || []).forEach((item) => {
          if (Array.isArray(item.proveedores)) {
            item.proveedores.forEach((p) => p?.nombre && proveedores.add(p.nombre));
          }
          if (typeof item.proveedor === 'string' && item.proveedor.trim()) {
            proveedores.add(item.proveedor.trim());
          }
        });
        Object.values(result.resumen.egresosPorMoneda || {}).forEach(m => scan(m.items));
        Object.values(result.resumen.ingresosPorMoneda || {}).forEach(m => scan(m.items));
        setProveedoresAgregados(Array.from(proveedores));
      }
    } catch (err) {
      console.error(err);
      setAlert({ open: true, message: 'Error al cargar resumen', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Helper: obtener todos los items de egresos de todas las monedas
  const obtenerTodosLosItemsEgresos = () => {
    if (!resumen?.egresosPorMoneda) return [];
    return Object.values(resumen.egresosPorMoneda).flatMap(m => m.items || []);
  };

  // Helper: obtener todos los items de ingresos de todas las monedas
  const obtenerTodosLosItemsIngresos = () => {
    if (!resumen?.ingresosPorMoneda) return [];
    return Object.values(resumen.ingresosPorMoneda).flatMap(m => m.items || []);
  };

  // Helper: calcular totales de ingresos/egresos (convertidos a la moneda de visualización)
  // Si existe un presupuesto "general" (sin categoría/etapa/proveedor), se usa como techo del total
  // porque los presupuestos por categoría/proveedor son asignaciones DENTRO del general.
  // El ejecutado del general ya acumula todos los movimientos (matchea contra todo).
  const calcularTotales = () => {
    if (!resumen) return { ingresos: { total: 0, ejecutado: 0 }, egresos: { total: 0, ejecutado: 0 }, gananciaProyectada: 0, gananciaActual: 0, gananciaProyectadaPendiente: 0 };
    
    const sumarPorTipo = (obtenerItems) => {
      const items = obtenerItems();
      const generales = items.filter(itemEsGeneral);
      const especificos = items.filter((i) => !itemEsGeneral(i));
      
      if (generales.length > 0) {
        // Hay presupuesto general: usarlo como techo
        let total = generales.reduce((s, i) => s + convertir(i.monto || 0, i.moneda || 'ARS', i.cac_tipo), 0);
        const ejecutado = generales.reduce((s, i) => s + convertir(i.ejecutado || 0, i.moneda || 'ARS', i.cac_tipo), 0);
        // Si la suma de específicos excede el general, mostrar la suma real
        const especTotal = especificos.reduce((s, i) => s + convertir(i.monto || 0, i.moneda || 'ARS', i.cac_tipo), 0);
        if (especTotal > total) total = especTotal;
        return { total, ejecutado };
      }
      
      // Sin general: sumar todos
      return items.reduce((acc, i) => ({
        total: acc.total + convertir(i.monto || 0, i.moneda || 'ARS', i.cac_tipo),
        ejecutado: acc.ejecutado + convertir(i.ejecutado || 0, i.moneda || 'ARS', i.cac_tipo),
      }), { total: 0, ejecutado: 0 });
    };
    
    const ingresos = sumarPorTipo(obtenerTodosLosItemsIngresos);
    const egresos = sumarPorTipo(obtenerTodosLosItemsEgresos);
    
    const gananciaProyectada = ingresos.total - egresos.total;
    const gananciaActual = ingresos.ejecutado - egresos.ejecutado;
    return {
      ingresos,
      egresos,
      gananciaProyectada,
      gananciaActual,
      gananciaProyectadaPendiente: gananciaProyectada - gananciaActual
    };
  };

  // Función para convertir montos según la moneda del presupuesto y la moneda de visualización
  // Todos los subíndices CAC disponibles
  const cacIndicesActuales = {
    general: resumen?.cotizacionActual?.cac_indice || null,
    mano_obra: resumen?.cotizacionActual?.cac_mano_obra || null,
    materiales: resumen?.cotizacionActual?.cac_materiales || null,
  };
  const cacIndiceActual = cacIndicesActuales.general; // backward compat para header chip

  // Helper: obtener el subíndice CAC correcto para un tipo dado
  const getCacIndice = (cacTipo) => cacIndicesActuales[cacTipo || 'general'] || cacIndicesActuales.general || null;

  // Modo de CAC de la empresa (para elegir la variante del snapshot en lecturas locales).
  const cacModo = empresa?.presupuesto_cac_modo || 'legacy';

  const convertir = (monto, monedaOriginal = 'ARS', cacTipoItem = null) => {
    // Si la moneda de visualización y la original son iguales, no convertir
    if (moneda === monedaOriginal) return monto;
    
    // Seleccionar el subíndice CAC correcto según el cac_tipo del item
    const cacIdx = getCacIndice(cacTipoItem);
    
    // ARS ↔ USD
    if (moneda === 'USD' && monedaOriginal === 'ARS') return tipoCambio ? monto / tipoCambio : monto;
    if (moneda === 'ARS' && monedaOriginal === 'USD') return tipoCambio ? monto * tipoCambio : monto;
    
    // CAC → ARS: monto_cac * cac_indice (presupuestos indexados por CAC vistos en ARS)
    if (monedaOriginal === 'CAC' && moneda === 'ARS') return cacIdx ? monto * cacIdx : monto;
    // CAC → USD: (monto_cac * cac_indice) / tipoCambio
    if (monedaOriginal === 'CAC' && moneda === 'USD') return (cacIdx && tipoCambio) ? (monto * cacIdx) / tipoCambio : monto;
    // ARS → CAC
    if (monedaOriginal === 'ARS' && moneda === 'CAC') return cacIdx ? monto / cacIdx : monto;
    // USD → CAC
    if (monedaOriginal === 'USD' && moneda === 'CAC') return (cacIdx && tipoCambio) ? (monto * tipoCambio) / cacIdx : monto;
    
    return monto;
  };

  // formatMonto acepta moneda original opcional para mostrar en la moneda del presupuesto
  // formatMonto: convierte desde monedaOriginal a la moneda de visualización actual
  // Si monedaOriginal === moneda de vista, convertir() no hace nada (valor ya está en moneda correcta)
  const formatMonto = (monto, monedaOriginal) => {
    if (monto === null || monto === undefined) return '-';
    
    const valor = convertir(monto, monedaOriginal || 'ARS');
    
    if (moneda === 'USD') {
      return `USD ${valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (moneda === 'CAC') {
      return `CAC ${Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return formatCurrency(valor);
  };

  // Helper: construir desglose multi-moneda para tooltips
  // Muestra cuánto hay en cada moneda original antes de la conversión
  const buildBreakdownTooltip = (tipo = 'egresos') => {
    const porMoneda = tipo === 'ingresos' ? resumen?.ingresosPorMoneda : resumen?.egresosPorMoneda;
    if (!porMoneda) return null;
    const monedas = Object.keys(porMoneda);
    if (monedas.length <= 1) return null; // No hay multi-moneda, no hace falta desglose
    
    const fmtNativo = (valor, mon) => {
      if (mon === 'USD') return `USD ${Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      if (mon === 'CAC') return `CAC ${Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      return `$${Number(valor).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
    };

    // El backend (egresosPorMoneda.total) suma general + categorías; como los específicos
    // son asignaciones DENTRO del general, eso doble-cuenta. Recalculamos por moneda con el
    // general como techo, igual que calcularTotales, así la composición cierra con el total.
    const totalesNativos = (items = []) => {
      const generales = items.filter(itemEsGeneral);
      const especificos = items.filter((i) => !itemEsGeneral(i));
      const sum = (arr, campo) => arr.reduce((s, i) => s + (i[campo] || 0), 0);
      if (generales.length > 0) {
        return { total: Math.max(sum(generales, 'monto'), sum(especificos, 'monto')), ejecutado: sum(generales, 'ejecutado') };
      }
      return { total: sum(items, 'monto'), ejecutado: sum(items, 'ejecutado') };
    };

    return (
      <Box sx={{ fontSize: '0.75rem', lineHeight: 1.8 }}>
        <strong>Composición ({tipo}):</strong>
        {monedas.map(mon => {
          const data = porMoneda[mon];
          const { total: totalNativo, ejecutado: ejecutadoNativo } = totalesNativos(data.items);
          return (
            <Box key={mon}>
              {mon}: Pres. {fmtNativo(totalNativo, mon)} · Ejec. {fmtNativo(ejecutadoNativo, mon)}
              {mon !== moneda && tipoCambio && mon === 'USD' && moneda === 'ARS' && (
                <> (×${Number(tipoCambio).toLocaleString('es-AR', {maximumFractionDigits: 0})})</>)}
              {mon !== moneda && cacIndiceActual && mon === 'CAC' && moneda === 'ARS' && (
                <> (×{Number(cacIndiceActual).toLocaleString('es-AR', {maximumFractionDigits: 2})})</>)}
            </Box>
          );
        })}
      </Box>
    );
  };

  // Helper: obtener info de conversiones de moneda del resumen
  const conversionesInfo = useMemo(() => {
    const conv = resumen?.conversionesPorMoneda;
    if (!conv || Object.keys(conv).length === 0) return null;
    return conv;
  }, [resumen]);

  // Suma el ejecutado del bucket del backend (todas las monedas, convertido a la moneda de vista).
  // Útil cuando hay presupuestos multi-cat o multi-proveedor: el backend divide el ejecutado real.
  const ejecutadoBucketBackend = (bucketKey, valor) => {
    let total = 0;
    Object.entries(resumen?.egresosPorMoneda || {}).forEach(([mon, monedaData]) => {
      const ejCrudo = monedaData[bucketKey]?.[valor]?.ejecutado || 0;
      total += convertir(ejCrudo, mon);
    });
    return total;
  };
  const ejecutadoBucketCategoria = (catName) => ejecutadoBucketBackend('porCategoria', catName);
  const ejecutadoBucketProveedor = (provNombre) => ejecutadoBucketBackend('porProveedor', provNombre);

  // Obtener presupuesto por agrupación.
  // Con N items matcheando devuelve la suma agregada (convertida a la moneda de vista)
  // y la lista en `items` para que el caller decida si abre drawer directo (N=1) o popover (N>1).
  const getPresupuestoPorAgrupacion = (tipoAgrupacion, valor) => {
    const empty = { presupuesto: null, ejecutado: 0, id: null, historial: [], moneda: 'ARS', items: [] };
    const allItems = obtenerTodosLosItemsEgresos();
    if (allItems.length === 0) return empty;

    const items = allItems.filter(item => {
      if (tipoAgrupacion === 'categoria') return itemMatcheaCategoria(item, valor) && !item.etapa && !itemTieneProveedores(item);
      if (tipoAgrupacion === 'etapa') return item.etapa === valor && !itemTieneCategorias(item) && !itemTieneProveedores(item);
      if (tipoAgrupacion === 'proveedor') return itemMatcheaProveedor(item, valor) && !itemTieneCategorias(item) && !item.etapa;
      return false;
    });

    // Para los buckets multi-clave (categoría, proveedor), el ejecutado real viene del backend
    // ya agrupado por movimiento.categoria / movimiento.nombre_proveedor. Etapa es single, no aplica.
    const ejecutadoDelBucket = () => {
      if (tipoAgrupacion === 'categoria') return ejecutadoBucketCategoria(valor);
      if (tipoAgrupacion === 'proveedor') return ejecutadoBucketProveedor(valor);
      return null; // etapa u otros: cae al ejecutado del item
    };

    if (items.length === 0) {
      // Sin presupuesto, pero puede haber ejecutado (movimientos sin asignación)
      const ej = ejecutadoDelBucket();
      return { ...empty, ejecutado: ej || 0 };
    }

    if (items.length === 1) {
      const item = items[0];
      // Ejecutado en la MISMA unidad que item.monto (moneda nativa del presupuesto),
      // SIN convertir a la moneda de vista. Para indexados (CAC/USD) item.moneda es la
      // unidad indexada y monto/ejecutado deben compararse en esa unidad; usar el bucket
      // convertido (ejecutadoDelBucket) mezclaba ARS con CAC en la card.
      const bucketKey = tipoAgrupacion === 'categoria' ? 'porCategoria'
        : tipoAgrupacion === 'proveedor' ? 'porProveedor' : null;
      const ejNativo = bucketKey
        ? resumen?.egresosPorMoneda?.[item.moneda || 'ARS']?.[bucketKey]?.[valor]?.ejecutado
        : null;
      const ejecutadoReal = ejNativo != null ? ejNativo : (item.ejecutado || 0);
      return {
        presupuesto: item.monto,
        ejecutado: ejecutadoReal,
        id: item.id,
        historial: item.historial || [],
        adicionales: item.adicionales || [],
        adjuntos: item.adjuntos || [],
        moneda: item.moneda || 'ARS',
        moneda_display: item.moneda_display || item.moneda || 'ARS',
        indexacion: item.indexacion || null,
        monto_ingresado: item.monto_ingresado || item.monto,
        base_calculo: item.base_calculo || 'total',
        cotizacion_snapshot: item.cotizacion_snapshot || null,
        cac_tipo: item.cac_tipo || null,
        cac_estado: item.cac_estado || null,
        fecha_presupuesto: item.fecha_presupuesto || null,
        tipo: item.tipo || 'egreso',
        proveedores: Array.isArray(item.proveedores) ? item.proveedores : [],
        clasificaciones: getClasificacionesEfectivas(item),
        etapa: item.etapa || null,
        items,
      };
    }

    // N > 1: agregar montos en la moneda de vista (cada item puede estar en moneda distinta)
    const presupuesto = items.reduce((s, i) => s + convertir(i.monto || 0, i.moneda || 'ARS', i.cac_tipo), 0);
    const ejBucket = ejecutadoDelBucket();
    const ejecutado = ejBucket != null
      ? ejBucket
      : items.reduce((s, i) => s + convertir(i.ejecutado || 0, i.moneda || 'ARS', i.cac_tipo), 0);
    return {
      presupuesto,
      ejecutado,
      moneda: moneda, // ya convertido a la moneda de vista
      indexacion: null, // no aplica el chip de indexación cuando es agregado
      id: null, // marca de "no es un item único" → el click abre popover
      historial: [],
      items,
    };
  };

  // Handler unificado: cuando el drawer completa una operación
  const handleDrawerSuccess = (message) => {
    setAlert({ open: true, message, severity: 'success' });
    limpiarSeleccion();
    setModoSeleccion(false);
    cargarResumen();
  };

  // Eliminar presupuesto directamente
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null, label: '' });
  const handleEliminarPresupuesto = async () => {
    if (!deleteConfirm.id) return;
    try {
      await presupuestoService.eliminarPresupuestoPorId(deleteConfirm.id);
      setAlert({ open: true, message: `Presupuesto "${deleteConfirm.label}" eliminado`, severity: 'success' });
      cargarResumen();
    } catch (err) {
      setAlert({ open: true, message: 'Error al eliminar presupuesto', severity: 'error' });
    } finally {
      setDeleteConfirm({ open: false, id: null, label: '' });
    }
  };

  // Helper: abrir drawer para crear. Siempre con form completo.
  // - preFill: shape {clasificaciones, proveedores, etapa, monto?} para pre-cargar el form.
  //   monto opcional: si viene, se usa como sugerencia inicial del monto.
  const abrirDrawerCrear = ({ preFill = null, tipoDefault = 'egreso' } = {}) => {
    setDrawerPresupuesto({
      open: true,
      mode: 'crear',
      tipoAgrupacion: null,
      valorAgrupacion: null,
      preFill: preFill || { clasificaciones: [], proveedores: [], etapa: null },
      tipoDefault,
      showFullForm: true,
      presupuesto: null,
    });
  };

  // Abre el drawer con la selección multi-card actual pre-cargada y limpia la selección al cerrar.
  const crearDesdeSeleccion = (tipoDefault = 'egreso') => {
    abrirDrawerCrear({
      tipoDefault,
      preFill: {
        clasificaciones: seleccionMulti.clasificaciones.map(c => ({ categoria: c, subcategorias: [] })),
        proveedores: seleccionMulti.proveedores.map(n => ({ id: null, nombre: n })),
        etapa: seleccionMulti.etapa || null,
      },
    });
  };

  // Helper: abrir drawer para editar
  const abrirDrawerEditar = (item, label) => {
    setDrawerPresupuesto({
      open: true,
      mode: 'editar',
      drawerView: 'full',
      tipoAgrupacion: null,
      valorAgrupacion: null,
      tipoDefault: 'egreso',
      showFullForm: true,
      presupuesto: {
        id: item.id,
        monto: item.monto || item.presupuesto,
        moneda: item.moneda || 'ARS',
        moneda_display: item.moneda_display || item.moneda || 'ARS',
        indexacion: item.indexacion || null,
        monto_ingresado: item.monto_ingresado || item.monto || item.presupuesto,
        base_calculo: item.base_calculo || 'total',
        tipo: item.tipo || 'egreso',
        label: label,
        historial: item.historial || [],
        adicionales: item.adicionales || [],
        adjuntos: item.adjuntos || [],
        ejecutado: item.ejecutado || 0,
        cotizacion_snapshot: item.cotizacion_snapshot || null,
        cac_tipo: item.cac_tipo || null,
        cac_estado: item.cac_estado || null,
        fecha_presupuesto: item.fecha_presupuesto || null,
        proveedores: Array.isArray(item.proveedores) ? item.proveedores : [],
        clasificaciones: getClasificacionesEfectivas(item),
        etapa: item.etapa || null,
        proyecto_id: item.proyecto_id || proyectoSeleccionado || null,
      },
    });
  };

  // Helper: armar presupuesto data para los drawers
  const _buildPresupuestoPayload = (item, label) => ({
    id: item.id,
    monto: item.monto || item.presupuesto,
    moneda: item.moneda || 'ARS',
    moneda_display: item.moneda_display || item.moneda || 'ARS',
    indexacion: item.indexacion || null,
    monto_ingresado: item.monto_ingresado || item.monto || item.presupuesto,
    base_calculo: item.base_calculo || 'total',
    tipo: item.tipo || 'egreso',
    label: label,
    historial: item.historial || [],
    adicionales: item.adicionales || [],
    adjuntos: item.adjuntos || [],
    ejecutado: item.ejecutado || 0,
    cotizacion_snapshot: item.cotizacion_snapshot || null,
    cac_tipo: item.cac_tipo || null,
    cac_estado: item.cac_estado || null,
    fecha_presupuesto: item.fecha_presupuesto || null,
    proveedores: Array.isArray(item.proveedores) ? item.proveedores : [],
    clasificaciones: getClasificacionesEfectivas(item),
    etapa: item.etapa || null,
    proyecto_id: item.proyecto_id || proyectoSeleccionado || null,
  });

  // Helper: abrir drawer directo en modo adicional
  const abrirDrawerAdicional = (item, label) => {
    setDrawerPresupuesto({
      open: true,
      mode: 'editar',
      drawerView: 'adicional',
      tipoAgrupacion: null,
      valorAgrupacion: null,
      tipoDefault: 'egreso',
      showFullForm: true,
      presupuesto: _buildPresupuestoPayload(item, label),
    });
  };

  // Handler del ícono editar de un bucket.
  // - 1 presupuesto matcheando → abre drawer editar directo.
  // - N>1 → abre popover con la lista para elegir cuál editar.
  const handleEditarBucket = (e, data, valor) => {
    if (!data?.items || data.items.length === 0) return;
    if (data.items.length === 1) {
      abrirDrawerEditar(data.items[0], valor);
      return;
    }
    setBucketPopover({
      open: true,
      anchorEl: e.currentTarget,
      items: data.items,
      valorAgrupacion: valor,
    });
  };

  // Helper: abrir drawer directo en modo historial
  const abrirDrawerHistorial = (item, label) => {
    setDrawerPresupuesto({
      open: true,
      mode: 'editar',
      drawerView: 'historial',
      tipoAgrupacion: null,
      valorAgrupacion: null,
      tipoDefault: 'egreso',
      showFullForm: true,
      presupuesto: _buildPresupuestoPayload(item, label),
    });
  };

  // Presupuestos que cubren múltiples categorías (sin etapa ni proveedor).
  // Se muestran como cards combinadas (label "Cat A + Cat B") en vez de duplicarse
  // en cada card de categoría individual.
  const presupuestosMultiCategoria = useMemo(() => {
    const items = obtenerTodosLosItemsEgresos();
    return items.filter(
      (i) => itemTieneCategorias(i)
        && (i.clasificaciones || []).length > 1
        && !i.etapa
        && !itemTieneProveedores(i),
    );
  }, [resumen, moneda, tipoCambio, cacIndiceActual]);

  // Presupuestos de egreso que NO se renderizan en los tabs de Categoría ni Proveedor:
  //  - solo etapa (el tab de etapa está oculto)
  //  - combinaciones de dimensiones (categoría+proveedor, categoría+etapa, proveedor+etapa)
  //  - categoría única que no está en las categorías configuradas de la empresa
  // El general se muestra arriba como "Presupuesto General", así que se excluye.
  const presupuestosFueraDeTabs = useMemo(() => {
    const items = obtenerTodosLosItemsEgresos();
    const categoriasNombres = new Set(categorias.map((c) => c.name || c));
    return items.filter((i) => {
      if (itemEsGeneral(i)) return false;
      const tieneCats = itemTieneCategorias(i);
      const tieneProvs = itemTieneProveedores(i);
      // Tab Categoría: solo-categorías (sin etapa ni proveedor).
      // Multi-categoría siempre se renderiza como card combinada; single solo si la categoría está configurada.
      if (tieneCats && !i.etapa && !tieneProvs) {
        const cats = (i.clasificaciones || []).map((c) => c.categoria);
        if (cats.length > 1) return false;
        return !categoriasNombres.has(cats[0]);
      }
      // Tab Proveedor: solo-proveedores (sin categorías ni etapa), visible si algún nombre está agregado.
      if (tieneProvs && !tieneCats && !i.etapa) {
        const nombres = itemNombresProveedores(i);
        return !nombres.some((n) => proveedoresAgregados.includes(n));
      }
      // Cualquier otra combinación no aparece en ningún tab.
      return true;
    });
  }, [resumen, categorias, proveedoresAgregados]);

  // Calcular sumas por cada agrupación (son 3 formas de ver el MISMO presupuesto)
  // Convierte cada item a la moneda de visualización antes de sumar
  const calcularSumas = useMemo(() => {
    if (!resumen) return { porCategoria: 0, porEtapa: 0, porProveedor: 0, general: 0 };
    
    const items = obtenerTodosLosItemsEgresos();
    const conv = (i) => convertir(i.monto || 0, i.moneda || 'ARS', i.cac_tipo);
    
    // Presupuesto general (sin clasificaciones, etapa ni proveedor)
    const general = items
      .filter(itemEsGeneral)
      .reduce((sum, i) => sum + conv(i), 0);

    const generalItem = items.find(itemEsGeneral);
    const generalId = generalItem?.id || null;
    const generalHistorial = generalItem?.historial || [];

    // Suma de presupuestos con clasificaciones (cada item cuenta una sola vez, aunque cubra N categorías)
    const porCategoria = items
      .filter(i => itemTieneCategorias(i) && !i.etapa && !itemTieneProveedores(i))
      .reduce((sum, i) => sum + conv(i), 0);

    // Suma de presupuestos por etapa
    const porEtapa = items
      .filter(i => i.etapa && !itemTieneCategorias(i) && !itemTieneProveedores(i))
      .reduce((sum, i) => sum + conv(i), 0);

    // Suma de presupuestos por proveedor (cada item cuenta una sola vez, aunque cubra N proveedores)
    const porProveedor = items
      .filter(i => itemTieneProveedores(i) && !itemTieneCategorias(i) && !i.etapa)
      .reduce((sum, i) => sum + conv(i), 0);
    
    return { porCategoria, porEtapa, porProveedor, general, generalId, generalHistorial, generalItem: generalItem || null };
  }, [resumen, moneda, tipoCambio, cacIndiceActual]);

  // Obtener el presupuesto general del proyecto
  const presupuestoGeneral = calcularSumas.general || 0;

  // ─── Generales por moneda/índice (TAR-423) ─────────────────────────────────
  // Cada moneda/índice tiene su propio "general" con Asignado (Σ específicos de esa
  // unidad) y Sin asignar (General − Asignado). Todo en moneda nativa, sin mezclar.
  // El ejecutado de cada unidad usa el techo (general si existe, si no la suma de hijos).
  const gruposGeneralEgreso = useMemo(() => {
    if (!resumen) return [];
    const items = obtenerTodosLosItemsEgresos();
    const map = new Map();
    for (const it of items) {
      const key = itemIndiceKey(it);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    }
    return [...map.entries()]
      .sort((a, b) => indiceKeyOrden(a[0]) - indiceKeyOrden(b[0]))
      .map(([key, grupoItems]) => {
        const generales = grupoItems.filter(itemEsGeneral);
        const especificos = grupoItems.filter((i) => !itemEsGeneral(i));
        // Puede haber más de un general por unidad: se suman todos (igual que el modelo viejo).
        const general = generales[0] || null;
        const generalMonto = generales.reduce((s, i) => s + (i.monto || 0), 0);
        const asignado = especificos.reduce((s, i) => s + (i.monto || 0), 0);
        const presupuestado = Math.max(generalMonto, asignado);
        const ejecutado = generales.length > 0
          ? generales.reduce((s, i) => s + (i.ejecutado || 0), 0)
          : especificos.reduce((s, i) => s + (i.ejecutado || 0), 0);
        const monedaNativa = indiceKeyMoneda(key);
        const cacTipo = indiceKeyCacTipo(key);
        const idxARS = monedaNativa === 'CAC' ? getCacIndice(cacTipo) : monedaNativa === 'USD' ? tipoCambio : 1;
        return {
          key,
          label: indiceKeyLabel(key),
          monedaNativa,
          cacTipo,
          indexacion: monedaNativa === 'CAC' ? 'CAC' : monedaNativa === 'USD' ? 'USD' : null,
          general,
          generalMonto,
          asignado,
          sinAsignar: generalMonto - asignado,
          presupuestado,
          ejecutado,
          tieneGeneral: !!general,
          tieneEspecificos: especificos.length > 0,
          // Referencia en ARS de hoy (null si falta cotización).
          idxARS: idxARS || null,
        };
      });
  }, [resumen, tipoCambio, cacIndiceActual]);

  // Verificar si alguna suma de hijos excede el presupuesto general
  const verificarExcesoHijos = () => {
    if (presupuestoGeneral <= 0) return;
    
    const maximo = Math.max(calcularSumas.porCategoria, calcularSumas.porEtapa, calcularSumas.porProveedor);
    
    if (maximo > presupuestoGeneral) {
      let origen = '';
      if (maximo === calcularSumas.porCategoria) origen = 'categorías';
      else if (maximo === calcularSumas.porEtapa) origen = 'etapas';
      else origen = 'proveedores';
      
      setAjusteGeneralModal({
        open: true,
        sumaHijos: maximo,
        origen: origen
      });
    }
  };

  // Estado para modal de ajuste del general
  const [ajusteGeneralModal, setAjusteGeneralModal] = useState({
    open: false,
    sumaHijos: 0,
    origen: ''
  });

  // Handler para crear nuevo presupuesto (solo para presupuesto general y ajustes)
  const handleCrearPresupuestoGeneral = async (monto, monedaVal) => {
    try {
      await presupuestoService.crearPresupuesto({
        empresa_id: empresaId,
        proyecto_id: proyectoSeleccionado,
        tipo: 'egreso',
        monto: parseFloat(monto),
        moneda: monedaVal || 'ARS'
      });
      setAlert({ open: true, message: 'Presupuesto creado correctamente', severity: 'success' });
      await cargarResumen();
    } catch (err) {
      setAlert({ open: true, message: 'Error al crear presupuesto', severity: 'error' });
    }
  };

  // Abre el drawer para definir/crear el presupuesto general de una moneda/índice.
  // Prefilla la unidad y sugiere el monto ya asignado (en la unidad de entrada del drawer:
  // ARS para CAC indexado, la moneda nativa para ARS/USD).
  const abrirDefinirGeneral = (grupo) => {
    const sugeridoNativo = grupo.asignado || 0;
    const monto = grupo.monedaNativa === 'CAC'
      ? (grupo.idxARS ? sugeridoNativo * grupo.idxARS : null)
      : sugeridoNativo;
    abrirDrawerCrear({
      tipoDefault: 'egreso',
      preFill: {
        clasificaciones: [],
        proveedores: [],
        etapa: null,
        monto: monto > 0 ? monto : null,
        moneda: grupo.monedaNativa === 'USD' ? 'USD' : 'ARS',
        indexacion: grupo.indexacion,
        cac_tipo: grupo.cacTipo,
      },
    });
  };

  // Verificar exceso después de que cambie calcularSumas
  useEffect(() => {
    if (presupuestoGeneral > 0) {
      const maximo = Math.max(calcularSumas.porCategoria, calcularSumas.porEtapa, calcularSumas.porProveedor);
      if (maximo > presupuestoGeneral) {
        let origen = '';
        if (maximo === calcularSumas.porCategoria) origen = 'categorías';
        else if (maximo === calcularSumas.porEtapa) origen = 'etapas';
        else origen = 'proveedores';
        
        setAjusteGeneralModal({
          open: true,
          sumaHijos: maximo,
          origen: origen
        });
      }
    }
  }, [calcularSumas.porCategoria, calcularSumas.porEtapa, calcularSumas.porProveedor]);

  // Handler para ajustar presupuesto general
  const handleAjustarGeneral = async () => {
    try {
      if (calcularSumas.generalId) {
        await presupuestoService.editarPresupuesto(calcularSumas.generalId, {
          nuevoMonto: ajusteGeneralModal.sumaHijos,
          motivo: `Ajuste automático por suma de ${ajusteGeneralModal.origen}`,
          creadoPor: user?.uid
        });
      } else {
        await handleCrearPresupuestoGeneral(ajusteGeneralModal.sumaHijos);
      }
      setAlert({ open: true, message: 'Presupuesto general ajustado', severity: 'success' });
      setAjusteGeneralModal({ open: false, sumaHijos: 0, origen: '' });
      cargarResumen();
    } catch (err) {
      setAlert({ open: true, message: 'Error al ajustar presupuesto', severity: 'error' });
    }
  };

  // Agregar proveedor a la lista
  const handleAgregarProveedor = () => {
    if (nuevoProveedor && !proveedoresAgregados.includes(nuevoProveedor)) {
      setProveedoresAgregados(prev => [...prev, nuevoProveedor]);
      setNuevoProveedor('');
      setProveedorModal(false);
    }
  };

  const proyectoActual = proyectos.find(p => p.id === proyectoSeleccionado);

  // ============ VISTA: TODOS LOS PROYECTOS ============
  if (!proyectoSeleccionado) {
    return (
      <>
        <Head><title>Control de Presupuestos</title></Head>
        <Box component="main" sx={{ flexGrow: 1, py: { xs: 2, md: 4 } }}>
          <Container maxWidth={false} sx={{ px: { xs: 1.5, sm: 3, md: 4 } }}>
            <Stack spacing={{ xs: 2, md: 3 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', md: '2.125rem' } }}>Control de Presupuestos</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <ToggleButtonGroup
                    value={moneda}
                    exclusive
                    onChange={(e, val) => val && setMoneda(val)}
                    size="small"
                  >
                    <ToggleButton value="ARS">ARS</ToggleButton>
                    <ToggleButton value="USD">USD</ToggleButton>
                    <ToggleButton value="CAC">CAC</ToggleButton>
                  </ToggleButtonGroup>
                  <Button 
                    variant="outlined" 
                    startIcon={<RefreshIcon />}
                    onClick={cargarResumenesTodosProyectos}
                    disabled={loading}
                    sx={{ minWidth: 'auto', px: { xs: 1, sm: 2 } }}
                  >
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Actualizar</Box>
                  </Button>
                </Stack>
              </Stack>

              {loading && <LinearProgress />}

              {proyectos.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">No hay proyectos configurados</Typography>
                </Paper>
              ) : (
                <Grid container spacing={3}>
                  {/* Card destacada: acceso a la tabla completa de presupuestos */}
                  <Grid item xs={12} sm={6} md={4} lg={3}>
                    <Card
                      sx={{
                        height: '100%',
                        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                        color: 'white',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                      }}
                    >
                      <CardActionArea onClick={() => router.push('/presupuestos')} sx={{ height: '100%' }}>
                        <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: { xs: 2.5, md: 4 } }}>
                          <ListAltIcon sx={{ fontSize: { xs: 36, md: 48 }, mb: 1.5, opacity: 0.9 }} />
                          <Typography variant="h6" gutterBottom align="center">
                            Todos los presupuestos
                          </Typography>
                          <Typography variant="body2" align="center" sx={{ opacity: 0.85 }}>
                            Ver, crear y gestionar todos los presupuestos en una tabla detallada
                          </Typography>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>

                  {proyectos.map((proyecto) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={proyecto.id}>
                      <ProyectoCard 
                        proyecto={proyecto}
                        resumen={resumenesProyectos[proyecto.id]}
                        onSelect={handleSeleccionarProyecto}
                        formatMonto={formatMonto}
                        tipoCambio={tipoCambio}
                        moneda={moneda}
                      />
                    </Grid>
                  ))}
                </Grid>
              )}
            </Stack>
          </Container>
        </Box>
      </>
    );
  }

  // ============ VISTA: PROYECTO SELECCIONADO ============
  return (
    <>
      <Head><title>Control - {proyectoActual?.nombre || 'Proyecto'}</title></Head>
      <Box component="main" sx={{ flexGrow: 1, py: { xs: 2, md: 4 } }}>
        <Container maxWidth={false} sx={{ px: { xs: 1.5, sm: 3, md: 4 } }}>
          <Stack spacing={{ xs: 2, md: 3 }}>
            
            {/* Header */}
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <IconButton onClick={handleVolverAGeneral} size="small">
                  <ArrowBackIcon />
                </IconButton>
                <Typography variant="h4" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2.125rem' }, flex: 1 }} noWrap>
                  {proyectoActual?.nombre}
                </Typography>
                <IconButton onClick={cargarResumen} disabled={loading} sx={{ display: { xs: 'flex', sm: 'none' } }}>
                  <RefreshIcon />
                </IconButton>
              </Stack>
              
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <ToggleButtonGroup
                  value={moneda}
                  exclusive
                  onChange={(e, val) => val && setMoneda(val)}
                  size="small"
                >
                  <ToggleButton value="ARS">ARS</ToggleButton>
                  <ToggleButton value="USD">USD</ToggleButton>
                  <ToggleButton value="CAC">CAC</ToggleButton>
                </ToggleButtonGroup>

                {/* Indicadores de cotización */}
                {cacIndiceActual && (
                  <Chip
                    label={`CAC: ${Number(cacIndiceActual).toLocaleString('es-AR')}`}
                    size="small"
                    color="secondary"
                    variant="outlined"
                    icon={<TimelineIcon />}
                  />
                )}
                {cotizacionCargada && tipoCambio ? (
                  <Chip
                    label={`USD: $${Number(tipoCambio).toLocaleString('es-AR')}`}
                    size="small"
                    color="info"
                    variant="outlined"
                    icon={<AttachMoneyIcon />}
                  />
                ) : (
                  <TextField
                    label="Cotización USD"
                    type="number"
                    size="small"
                    sx={{ width: { xs: 130, sm: 160 } }}
                    value={tipoCambioManual}
                    onChange={(e) => {
                      setTipoCambioManual(e.target.value);
                      const val = parseFloat(e.target.value);
                      if (val > 0) setTipoCambio(val);
                    }}
                    placeholder="Ej: 1450"
                    InputProps={{
                      startAdornment: <Typography variant="caption" sx={{ mr: 0.5 }}>$</Typography>,
                    }}
                    helperText={!tipoCambio ? 'Requerido' : ''}
                    error={!tipoCambio}
                  />
                )}
                
                <Button 
                  variant="outlined" 
                  startIcon={<RefreshIcon />}
                  onClick={cargarResumen}
                  disabled={loading}
                  sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                >
                  Actualizar
                </Button>
              </Stack>
            </Stack>

            {loading && <LinearProgress />}

            {!loading && !resumen && (
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <ReceiptLongIcon sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Cargando presupuestos del proyecto...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Si tarda demasiado, probá actualizando la página.
                </Typography>
              </Box>
            )}

            {resumen && (
              <>
                {/* Resumen General (convertido a la moneda de vista — modo opcional) */}
                {(() => {
                  const totales = calcularTotales();
                  return (
                    <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      Totales convertidos a {moneda} (con el índice de hoy) — usá el selector de arriba para cambiar la moneda.
                    </Typography>
                    <Grid container spacing={{ xs: 1.5, md: 3 }}>
                      <Grid item xs={6} sm={4}>
                        <Card>
                          <CardActionArea onClick={() => abrirMovDrawer('ingreso', 'Ingresos')}>
                          <CardContent sx={{ p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } }}>
                            <Stack direction="row" alignItems="center" spacing={{ xs: 1, md: 2 }}>
                              <TrendingUpIcon color="success" sx={{ fontSize: { xs: 28, md: 40 } }} />
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem', md: '0.875rem' } }} noWrap>Ingresos Proyectados</Typography>
                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                  <Typography variant="h5" sx={{ fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' } }} noWrap>{formatMonto(totales.ingresos.total, moneda)}</Typography>
                                  {buildBreakdownTooltip('ingresos') && (
                                    <Tooltip title={buildBreakdownTooltip('ingresos')} arrow placement="bottom">
                                      <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.disabled', cursor: 'help' }} />
                                    </Tooltip>
                                  )}
                                </Stack>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem', md: '0.875rem' } }} noWrap>
                                  Recibido: {formatMonto(totales.ingresos.ejecutado, moneda)}
                                </Typography>
                              </Box>
                            </Stack>
                          </CardContent>
                          </CardActionArea>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={6} sm={4}>
                        <Card>
                          <CardActionArea onClick={() => abrirMovDrawer('egreso', 'Egresos')}>
                          <CardContent sx={{ p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } }}>
                            <Stack direction="row" alignItems="center" spacing={{ xs: 1, md: 2 }}>
                              <TrendingDownIcon color="error" sx={{ fontSize: { xs: 28, md: 40 } }} />
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem', md: '0.875rem' } }} noWrap>Egresos Proyectados</Typography>
                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                  <Typography variant="h5" sx={{ fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' } }} noWrap>{formatMonto(totales.egresos.total, moneda)}</Typography>
                                  {buildBreakdownTooltip('egresos') && (
                                    <Tooltip title={buildBreakdownTooltip('egresos')} arrow placement="bottom">
                                      <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.disabled', cursor: 'help' }} />
                                    </Tooltip>
                                  )}
                                </Stack>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem', md: '0.875rem' } }} noWrap>
                                  Gastado: {formatMonto(totales.egresos.ejecutado, moneda)}
                                </Typography>
                              </Box>
                            </Stack>
                          </CardContent>
                          </CardActionArea>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={12} sm={4}>
                        <Card sx={{ bgcolor: totales.gananciaProyectada >= 0 ? 'success.light' : 'error.light' }}>
                          <CardActionArea onClick={() => abrirMovDrawer(null, 'Todos los movimientos')}>
                          <CardContent sx={{ p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } }}>
                            <Stack direction="row" alignItems="center" spacing={{ xs: 1, md: 2 }}>
                              <AccountBalanceWalletIcon sx={{ fontSize: { xs: 28, md: 40 }, color: 'white' }} />
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" sx={{ color: 'white', fontSize: { xs: '0.65rem', sm: '0.75rem', md: '0.875rem' } }} noWrap>Ganancia Proyectada</Typography>
                                <Typography variant="h5" sx={{ color: 'white', fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' } }} noWrap>{formatMonto(totales.gananciaProyectada, moneda)}</Typography>
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: { xs: '0.6rem', sm: '0.7rem', md: '0.875rem' } }} noWrap>
                                  Ejecutada: {formatMonto(totales.gananciaActual, moneda)}
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: { xs: '0.6rem', sm: '0.7rem', md: '0.875rem' } }} noWrap>
                                  Pendiente: {formatMonto(totales.gananciaProyectadaPendiente, moneda)}
                                </Typography>
                              </Box>
                            </Stack>
                          </CardContent>
                          </CardActionArea>
                        </Card>
                      </Grid>
                    </Grid>
                    </Box>
                  );
                })()}

                {/* Sección de Ingresos */}
                {(() => {
                  const itemsIngreso = obtenerTodosLosItemsIngresos();
                  const totales = calcularTotales();
                  return (
                    <Paper sx={{ p: { xs: 1.5, md: 2 } }}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <TrendingUpIcon color="success" sx={{ fontSize: { xs: 20, md: 24 } }} />
                          <Typography variant="h6" sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>Ingresos</Typography>
                          {itemsIngreso.length > 0 && (
                            <Chip label={`${itemsIngreso.length}`} size="small" variant="outlined" />
                          )}
                        </Stack>
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          startIcon={<AddCircleIcon />}
                          onClick={() => abrirDrawerCrear({ tipoDefault: 'ingreso' })}
                          sx={{ alignSelf: { xs: 'flex-start', sm: 'auto' } }}
                        >
                          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Crear presupuesto de ingreso</Box>
                          <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Crear ingreso</Box>
                        </Button>
                      </Stack>
                      {itemsIngreso.length === 0 ? (
                        <Box sx={{ py: 4, textAlign: 'center' }}>
                          <TrendingUpIcon sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
                          <Typography color="text.secondary" variant="body2">
                            No hay ingresos presupuestados.
                          </Typography>
                          <Typography color="text.secondary" variant="caption" sx={{ display: 'block', mb: 2 }}>
                            Creá un presupuesto de ingreso para controlar cobros al cliente.
                          </Typography>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<AddCircleIcon />}
                            onClick={() => abrirDrawerCrear({ tipoDefault: 'ingreso' })}
                          >
                            Crear presupuesto de ingreso
                          </Button>
                        </Box>
                      ) : (
                        <Stack spacing={1.5}>
                          {itemsIngreso.map((item) => {
                            const porcentaje = item.monto > 0 ? (item.ejecutado / item.monto) * 100 : 0;
                            const monedaItem = item.moneda || 'ARS';
                            const esIdx = !!item.indexacion;
                            const cacTipoLbl = item.cac_tipo === 'mano_obra' ? ' MO' : item.cac_tipo === 'materiales' ? ' MAT' : '';
                            // Unidad nativa (con equiv en pesos a hoy) para indexados Y para moneda nativa USD/CAC.
                            const esCAClike = item.indexacion === 'CAC' || (!esIdx && monedaItem === 'CAC');
                            const esUSDlike = item.indexacion === 'USD' || (!esIdx && monedaItem === 'USD');
                            const mostrarUnidad = esCAClike || esUSDlike;
                            const unidadIdx = esCAClike ? `CAC${cacTipoLbl}` : (esUSDlike ? 'USD' : '');
                            const idxActual = esCAClike ? getCacIndice(item.cac_tipo) : (esUSDlike ? tipoCambio : null);
                            const presEnARS = mostrarUnidad && idxActual ? item.monto * idxActual : null;
                            const ejEnARS = mostrarUnidad && idxActual ? (item.ejecutado || 0) * idxActual : null;
                            const saldoEnARS = mostrarUnidad && idxActual ? (item.monto - (item.ejecutado || 0)) * idxActual : null;
                            const fmtARS = (v) => v != null ? `$${Number(v).toLocaleString('es-AR', { maximumFractionDigits: 0 })}` : '';
                            const fmtUnidad = (v) => `${Number(v).toLocaleString('es-AR', { maximumFractionDigits: 2 })} ${unidadIdx}`;
                            const label = labelItem(item);
                            // Nominal total = presupuesto inicial (monto_ingresado) + suma de adicionales (TAR-376).
                            // - Item indexado: monto_ingresado guarda los ARS originales al crear.
                            //   Cada adicional tiene monto en unidades CAC/USD + cotizacion_snapshot → convertir a ARS
                            //   usando el snapshot (NO la cotización actual) para mantener el valor "nominal".
                            // - Item no indexado: monto_ingresado / monto ya están en la moneda del item.
                            const nominalBase = Number(item.monto_ingresado ?? item.monto ?? 0);
                            const adicionalesArr = Array.isArray(item.adicionales) ? item.adicionales : [];
                            const nominalDeAdicional = (a) => {
                              const m = Number(a?.monto || 0);
                              if (!esIdx) return m;
                              const snap = a?.cotizacion_snapshot || {};
                              if (item.indexacion === 'CAC') {
                                const idx = snapshotCacIndice(snap, item.cac_tipo, cacModo);
                                return idx ? m * idx : 0;
                              }
                              if (item.indexacion === 'USD') {
                                const usd = snap.dolar_blue ?? null;
                                return usd ? m * usd : 0;
                              }
                              return m;
                            };
                            const nominalAdicionales = adicionalesArr.reduce((s, a) => s + nominalDeAdicional(a), 0);
                            const nominalTotal = nominalBase + nominalAdicionales;
                            const monedaNominal = esIdx ? 'ARS' : (item.moneda_display || monedaItem);
                            const hasAdicionales = nominalAdicionales > 0.005;
                            const tooltipPresTitle = (nominalTotal > 0 || (esIdx && presEnARS != null)) ? (
                              <Box sx={{ fontSize: '0.75rem', lineHeight: 1.6 }}>
                                {esIdx && presEnARS != null && (
                                  <>Hoy: {fmtARS(presEnARS)}<br /></>
                                )}
                                {nominalTotal > 0 && (
                                  <>
                                    <strong>Nominal total: {formatMonto(nominalTotal, monedaNominal)}</strong>
                                    {hasAdicionales && (
                                      <>
                                        <br />
                                        <Box component="span" sx={{ color: 'grey.300' }}>
                                          Inicial: {formatMonto(nominalBase, monedaNominal)} + Adicionales: {formatMonto(nominalAdicionales, monedaNominal)}
                                        </Box>
                                      </>
                                    )}
                                  </>
                                )}
                              </Box>
                            ) : '';
                            return (
                              <Paper key={item.id} variant="outlined" sx={{ p: { xs: 1.5, md: 2 } }}>
                                {/* Fila 1: label + badges */}
                                <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 0.5 }}>
                                  <Typography fontWeight={500} sx={{ fontSize: { xs: '0.85rem', md: '1rem' } }}>{label}</Typography>
                                  <Chip label={esIdx ? unidadIdx : (monedaItem === 'USD' ? '🇺🇸' : '🇦🇷')} size="small" variant="outlined" sx={{ minWidth: 32 }} />
                                  {esIdx && (
                                    <Tooltip arrow title={
                                      <Box sx={{ fontSize: '0.75rem', lineHeight: 1.6 }}>
                                        <strong>Indexado por {item.indexacion}</strong><br />
                                        Guardado: {fmtUnidad(item.monto)}<br />
                                        Índice actual: {idxActual ? Number(idxActual).toLocaleString('es-AR', { maximumFractionDigits: 2 }) : '?'}<br />
                                        {presEnARS != null && <>Valor hoy: {fmtARS(presEnARS)} ARS</>}
                                      </Box>
                                    }>
                                      <Chip label={`idx ${item.indexacion}`} size="small" color="secondary" variant="outlined" sx={{ height: 20, '& .MuiChip-label': { px: 0.5, fontSize: '0.65rem' }, cursor: 'help' }} />
                                    </Tooltip>
                                  )}
                                  {item.base_calculo === 'subtotal' && (
                                    <Tooltip title="Calcula ejecutado por subtotal neto" arrow>
                                      <Chip label="neto" size="small" color="default" variant="outlined" sx={{ height: 20, '& .MuiChip-label': { px: 0.5, fontSize: '0.65rem' } }} />
                                    </Tooltip>
                                  )}
                                  <Box sx={{ flex: 1 }} />
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => abrirDrawerEditar({ ...item, tipo: 'ingreso' }, label)}
                                    sx={{ minWidth: 'auto', px: 1 }}
                                  >
                                    Editar
                                  </Button>
                                  {item.historial?.length > 0 && (
                                    <Chip
                                      label={`${item.historial.length}`}
                                      size="small"
                                      color="info"
                                      variant="outlined"
                                      onClick={() => abrirDrawerEditar({ ...item, tipo: 'ingreso' }, label)}
                                      sx={{ cursor: 'pointer' }}
                                    />
                                  )}
                                  <Tooltip title="Eliminar presupuesto" arrow>
                                    <IconButton size="small" color="error" onClick={() => setDeleteConfirm({ open: true, id: item.id, label })}>
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                                {/* Fila 2: chips de montos */}
                                <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                                  {mostrarUnidad ? (
                                    <>
                                      <Tooltip title={tooltipPresTitle} arrow>
                                        <Chip label={`Pres: ${fmtUnidad(item.monto)}`} size="small" variant="outlined" sx={{ cursor: 'help' }} />
                                      </Tooltip>
                                      <Tooltip title={ejEnARS != null ? `Hoy: ${fmtARS(ejEnARS)}` : ''} arrow>
                                        <Chip
                                          label={`Cobrado: ${fmtUnidad(item.ejecutado || 0)}`}
                                          size="small"
                                          color={porcentaje > 100 ? 'error' : 'success'}
                                        />
                                      </Tooltip>
                                    </>
                                  ) : (
                                    <>
                                      <Tooltip title={tooltipPresTitle} arrow disableHoverListener={!nominalTotal}>
                                        <Chip label={`Pres: ${formatMonto(item.monto, monedaItem)}`} size="small" variant="outlined" sx={{ cursor: nominalTotal ? 'help' : 'default' }} />
                                      </Tooltip>
                                      <Chip
                                        label={`Cobrado: ${formatMonto(item.ejecutado || 0, monedaItem)}`}
                                        size="small"
                                        color={porcentaje > 100 ? 'error' : 'success'}
                                      />
                                    </>
                                  )}
                                </Stack>
                                <Tooltip title={tooltipPresTitle} arrow disableHoverListener={!tooltipPresTitle}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={Math.min(porcentaje, 100)}
                                    sx={{ mt: 1, height: { xs: 6, md: 8 }, borderRadius: 4, cursor: tooltipPresTitle ? 'help' : 'default' }}
                                    color={porcentaje > 100 ? 'error' : porcentaje > 80 ? 'warning' : 'success'}
                                  />
                                </Tooltip>
                                <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
                                    {porcentaje.toFixed(1)}% cobrado
                                    {mostrarUnidad && ejEnARS != null && ` · ${fmtARS(ejEnARS)} ARS`}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
                                    Pendiente: {mostrarUnidad ? fmtUnidad(item.monto - (item.ejecutado || 0)) : formatMonto(item.monto - (item.ejecutado || 0), monedaItem)}
                                    {mostrarUnidad && saldoEnARS != null && ` · ${fmtARS(saldoEnARS)} ARS`}
                                  </Typography>
                                </Stack>
                              </Paper>
                            );
                          })}
                        </Stack>
                      )}
                    </Paper>
                  );
                })()}

                {/* Sección informativa: Conversiones de moneda (compra/venta USD) */}
                {conversionesInfo && (
                  <Paper sx={{ p: { xs: 1.5, md: 2 }, bgcolor: 'grey.50', border: '1px dashed', borderColor: 'grey.300' }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <SwapHorizIcon sx={{ fontSize: { xs: 18, md: 22 }, color: 'text.secondary' }} />
                      <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', md: '0.9rem' } }}>
                        Conversiones USD ↔ ARS
                      </Typography>
                      <Chip 
                        label="No impactan presupuesto" 
                        size="small" 
                        variant="outlined" 
                        sx={{ height: 20, '& .MuiChip-label': { px: 0.5, fontSize: '0.6rem' }, color: 'text.secondary' }} 
                      />
                    </Stack>
                    <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                      {Object.entries(conversionesInfo).map(([mon, data]) => (
                        <Box key={mon}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                            {mon}: {data.ingresos > 0 && <>Ingresos: {mon === 'USD' ? `USD ${data.ingresos.toLocaleString('es-AR', {maximumFractionDigits: 2})}` : `$${data.ingresos.toLocaleString('es-AR', {maximumFractionDigits: 0})}`}</>}
                            {data.ingresos > 0 && data.egresos > 0 && ' · '}
                            {data.egresos > 0 && <>Egresos: {mon === 'USD' ? `USD ${data.egresos.toLocaleString('es-AR', {maximumFractionDigits: 2})}` : `$${data.egresos.toLocaleString('es-AR', {maximumFractionDigits: 0})}`}</>}
                            {' '}({data.cantidad} mov.)
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Paper>
                )}

                {/* Tabs de Egresos */}
                <Paper sx={{ p: { xs: 1.5, md: 2 } }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <TrendingDownIcon color="error" sx={{ fontSize: { xs: 20, md: 24 } }} />
                    <Typography variant="h6" sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>Egresos</Typography>
                  </Stack>
                  <Tabs 
                    value={tabActivo} 
                    onChange={(e, v) => setTabActivo(v)}
                    variant="fullWidth"
                    sx={{ 
                      minHeight: { xs: 40, md: 48 },
                      '& .MuiTab-root': { 
                        minHeight: { xs: 40, md: 48 },
                        fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' },
                        px: { xs: 0.5, md: 2 },
                        minWidth: 0,
                      }
                    }}
                  >
                    <Tab value={0} icon={<CategoryIcon sx={{ fontSize: { xs: 16, md: 20 } }} />} iconPosition="start" label="Categoría" />
                    <Tab value={2} icon={<StorefrontIcon sx={{ fontSize: { xs: 16, md: 20 } }} />} iconPosition="start" label="Proveedor" />
                  </Tabs>
                  
                  {/* Presupuesto general por moneda/índice (TAR-423): cada unidad por separado */}
                  <Stack spacing={1.5} sx={{ mt: 2 }}>
                    {gruposGeneralEgreso.length === 0 && (
                      <Box sx={{ p: { xs: 1.5, md: 2 }, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                          <Typography variant="body2" color="text.secondary">Todavía no hay presupuesto general</Typography>
                          <Button size="small" variant="outlined"
                            onClick={() => abrirDrawerCrear({ tipoDefault: 'egreso', preFill: { clasificaciones: [], proveedores: [], etapa: null } })}>
                            Definir
                          </Button>
                        </Stack>
                      </Box>
                    )}
                    {gruposGeneralEgreso.map((g) => {
                      const refARS = g.idxARS && g.monedaNativa !== 'ARS';
                      const pct = g.generalMonto > 0 ? (g.asignado / g.generalMonto) * 100 : null;
                      return (
                        <Box key={g.key} sx={{ p: { xs: 1.5, md: 2 }, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                            <Chip label={g.label} size="small" variant="outlined"
                              color={g.monedaNativa === 'ARS' ? 'default' : 'secondary'} />
                            {pct != null && (
                              <Chip size="small" label={`${pct.toFixed(0)}%`}
                                color={g.asignado > g.generalMonto ? 'error' : 'primary'} />
                            )}
                          </Stack>
                          <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr 1fr', sm: 'auto auto auto' },
                            gap: { xs: 1.5, md: 3 },
                            alignItems: 'center',
                          }}>
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>Presupuesto general</Typography>
                              {g.tieneGeneral ? (
                                <Stack direction="row" alignItems="baseline" spacing={0.75} flexWrap="wrap" useFlexGap>
                                  <Typography variant="h6" sx={{ fontSize: { xs: '0.95rem', md: '1.25rem' } }}>
                                    {fmtMontoNativo(g.generalMonto, g.monedaNativa)}
                                  </Typography>
                                  {refARS && (
                                    <Typography variant="caption" color="text.secondary">
                                      ≈ ${Number(g.generalMonto * g.idxARS).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                                    </Typography>
                                  )}
                                  <Button size="small" sx={{ minWidth: 'auto', px: 0.5, fontSize: '0.7rem' }}
                                    onClick={() => abrirDrawerEditar(g.general, 'General')}>
                                    Editar
                                  </Button>
                                </Stack>
                              ) : (
                                <Box>
                                  <Button size="small" variant="outlined" onClick={() => abrirDefinirGeneral(g)}
                                    sx={{ fontSize: { xs: '0.7rem', md: '0.8rem' }, mt: 0.5 }}>
                                    Definir
                                  </Button>
                                </Box>
                              )}
                            </Box>
                            <Box>
                              {/* Sin general, lo presupuestado en la unidad no es "asignado" (no hay techo del que repartir). */}
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
                                {g.tieneGeneral ? 'Asignado' : 'Presupuestado'}
                              </Typography>
                              <Typography variant="h6" sx={{ fontSize: { xs: '0.95rem', md: '1.25rem' } }}
                                color={g.tieneGeneral && g.asignado > g.generalMonto ? 'error.main' : 'text.primary'}>
                                {fmtMontoNativo(g.asignado, g.monedaNativa)}
                              </Typography>
                            </Box>
                            {g.tieneGeneral && (
                              <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>Sin asignar</Typography>
                                <Typography variant="h6" sx={{ fontSize: { xs: '0.95rem', md: '1.25rem' } }}
                                  color={g.sinAsignar < 0 ? 'error.main' : 'success.main'}>
                                  {fmtMontoNativo(g.sinAsignar, g.monedaNativa)}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                          {!g.tieneGeneral && g.tieneEspecificos && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                              Hay presupuestos en {g.label} sin un general que los englobe.
                              Podés <Box component="span" sx={{ color: 'primary.main', cursor: 'pointer', textDecoration: 'underline' }}
                                onClick={() => abrirDefinirGeneral(g)}>crear el general de {g.label}</Box> o dejarlos sueltos.
                            </Typography>
                          )}
                        </Box>
                      );
                    })}
                  </Stack>

                  <Box sx={{ mt: 3 }}>
                    {/* Toggle modo selección múltiple */}
                    <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1.5 }}>
                      {modoSeleccion ? (
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          onClick={salirModoSeleccion}
                          sx={{ textTransform: 'none' }}
                        >
                          Cancelar selección
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="text"
                          color="primary"
                          startIcon={<AddCircleIcon fontSize="small" />}
                          onClick={() => setModoSeleccion(true)}
                          sx={{ textTransform: 'none' }}
                        >
                          Crear agrupando varios
                        </Button>
                      )}
                    </Stack>

                    {/* TAB: POR CATEGORÍA */}
                    {tabActivo === 0 && (
                      <Stack spacing={2}>
                        {categorias.length === 0 ? (
                          <Box sx={{ py: 4, textAlign: 'center' }}>
                            <CategoryIcon sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
                            <Typography color="text.secondary">No hay categorías configuradas en la empresa.</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Agregá categorías desde la configuración de la empresa para asignar presupuestos.
                            </Typography>
                          </Box>
                        ) : (
                          <>
                            {categorias.map((cat) => {
                              const catName = cat.name || cat;
                              const data = getPresupuestoPorAgrupacion('categoria', catName);
                              // Sólo incluir presupuestos asignados exclusivamente a esta categoría.
                              // Los multi-categoría se renderizan abajo como cards combinadas.
                              const itemsSingle = (data.items || []).filter(
                                (i) => (i.clasificaciones || []).length <= 1,
                              );
                              const nItems = itemsSingle.length;
                              const presupuestoSingle = itemsSingle.reduce(
                                (s, i) => s + convertir(i.monto || 0, i.moneda || 'ARS', i.cac_tipo),
                                0,
                              );
                              const itemUnico = nItems === 1 ? itemsSingle[0] : null;
                              const dataAjustada = nItems === 0
                                ? { ...data, presupuesto: null, items: [], historial: [], moneda: 'ARS' }
                                : nItems === 1
                                ? {
                                    ...data,
                                    presupuesto: itemUnico.monto,
                                    items: itemsSingle,
                                    historial: itemUnico.historial || [],
                                    moneda: itemUnico.moneda || 'ARS',
                                    indexacion: itemUnico.indexacion || null,
                                    base_calculo: itemUnico.base_calculo || 'total',
                                    cotizacion_snapshot: itemUnico.cotizacion_snapshot || null,
                                    monto_ingresado: itemUnico.monto_ingresado || itemUnico.monto,
                                    cac_tipo: itemUnico.cac_tipo || null,
                                  }
                                : { ...data, presupuesto: presupuestoSingle, items: itemsSingle, indexacion: null };
                              const labelConChip = nItems > 1 ? `${catName} · ${nItems} presupuestos` : catName;
                              return (
                                <PresupuestoItem
                                  key={catName}
                                  label={labelConChip}
                                  presupuesto={dataAjustada.presupuesto}
                                  ejecutado={dataAjustada.ejecutado}
                                  formatMonto={formatMonto}
                                  historial={dataAjustada.historial}
                                  moneda={dataAjustada.moneda}
                                  indexacion={dataAjustada.indexacion}
                                  baseCalculo={dataAjustada.base_calculo}
                                  cotizacionSnapshot={dataAjustada.cotizacion_snapshot}
                                  montoIngresado={dataAjustada.monto_ingresado}
                                  cacIndiceActual={getCacIndice(dataAjustada.cac_tipo)}
                                  tipoCambioActual={tipoCambio}
                                  cacTipo={dataAjustada.cac_tipo}
                                  cacEstado={dataAjustada.cac_estado}
                                  seleccionada={seleccionMulti.clasificaciones.includes(catName)}
                                  modoSeleccion={modoSeleccion}
                                  onToggleSeleccion={() => toggleSeleccionCategoria(catName)}
                                  onEditar={nItems > 0 ? (e) => handleEditarBucket(e, dataAjustada, catName) : undefined}
                                  onCrear={() => abrirDrawerCrear({
                                    preFill: { clasificaciones: [{ categoria: catName, subcategorias: [] }], proveedores: [], etapa: null },
                                  })}
                                />
                              );
                            })}
                            {presupuestosMultiCategoria.map((item) => {
                              const cats = (item.clasificaciones || []).map((c) => c.categoria);
                              const label = cats.join(' + ');
                              return (
                                <PresupuestoItem
                                  key={`multi-${item.id}`}
                                  label={label}
                                  presupuesto={item.monto}
                                  ejecutado={item.ejecutado || 0}
                                  formatMonto={formatMonto}
                                  historial={item.historial || []}
                                  moneda={item.moneda || 'ARS'}
                                  indexacion={item.indexacion || null}
                                  baseCalculo={item.base_calculo || 'total'}
                                  cotizacionSnapshot={item.cotizacion_snapshot || null}
                                  montoIngresado={item.monto_ingresado || item.monto}
                                  cacIndiceActual={getCacIndice(item.cac_tipo)}
                                  tipoCambioActual={tipoCambio}
                                  cacTipo={item.cac_tipo || null}
                                  cacEstado={item.cac_estado}
                                  seleccionada={false}
                                  modoSeleccion={false}
                                  onToggleSeleccion={() => abrirDrawerEditar(item, label)}
                                  onEditar={(e) => abrirDrawerEditar(item, label)}
                                />
                              );
                            })}
                          </>
                        )}
                      </Stack>
                    )}

                    {/* TAB: POR ETAPA */}
                    {tabActivo === 1 && (
                      <Stack spacing={2}>
                        {etapas.length === 0 ? (
                          <Box sx={{ py: 4, textAlign: 'center' }}>
                            <TimelineIcon sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
                            <Typography color="text.secondary">No hay etapas configuradas.</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Agregá etapas desde la configuración de la empresa para asignar presupuestos por etapa.
                            </Typography>
                          </Box>
                        ) : (
                          etapas.map((etapa) => {
                            const etapaName = etapa.nombre || etapa.name || etapa;
                            const data = getPresupuestoPorAgrupacion('etapa', etapaName);
                            const nItems = data.items?.length || 0;
                            const labelConChip = nItems > 1 ? `${etapaName} · ${nItems} presupuestos` : etapaName;
                            return (
                              <PresupuestoItem
                                key={etapaName}
                                label={labelConChip}
                                presupuesto={data.presupuesto}
                                ejecutado={data.ejecutado}
                                formatMonto={formatMonto}
                                historial={data.historial}
                                moneda={data.moneda}
                                indexacion={data.indexacion}
                                baseCalculo={data.base_calculo}
                                cotizacionSnapshot={data.cotizacion_snapshot}
                                montoIngresado={data.monto_ingresado}
                                cacIndiceActual={getCacIndice(data.cac_tipo)}
                                tipoCambioActual={tipoCambio}
                                cacTipo={data.cac_tipo}
                                cacEstado={data.cac_estado}
                                seleccionada={seleccionMulti.etapa === etapaName}
                                modoSeleccion={modoSeleccion}
                                onToggleSeleccion={() => toggleSeleccionEtapa(etapaName)}
                                onEditar={nItems > 0 ? (e) => handleEditarBucket(e, data, etapaName) : undefined}
                                onCrear={() => abrirDrawerCrear({
                                  preFill: { clasificaciones: [], proveedores: [], etapa: etapaName },
                                })}
                              />
                            );
                          })
                        )}
                      </Stack>
                    )}

                    {/* TAB: POR PROVEEDOR */}
                    {tabActivo === 2 && (
                      <Stack spacing={2}>
                        <Button 
                          variant="outlined" 
                          startIcon={<AddCircleIcon />}
                          onClick={() => setProveedorModal(true)}
                          sx={{ alignSelf: 'flex-start' }}
                        >
                          Agregar Proveedor
                        </Button>
                        
                        {proveedoresAgregados.length === 0 ? (
                          <Box sx={{ py: 4, textAlign: 'center' }}>
                            <StorefrontIcon sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
                            <Typography color="text.secondary">
                              No hay proveedores agregados a este proyecto.
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                              Agregá proveedores para asignarles presupuesto individual.
                            </Typography>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<AddCircleIcon />}
                              onClick={() => setProveedorModal(true)}
                            >
                              Agregar proveedor
                            </Button>
                          </Box>
                        ) : (
                          proveedoresAgregados.map((proveedor) => {
                            const data = getPresupuestoPorAgrupacion('proveedor', proveedor);
                            const nItems = data.items?.length || 0;
                            const labelConChip = nItems > 1 ? `${proveedor} · ${nItems} presupuestos` : proveedor;
                            return (
                              <PresupuestoItem
                                key={proveedor}
                                label={labelConChip}
                                presupuesto={data.presupuesto}
                                ejecutado={data.ejecutado}
                                formatMonto={formatMonto}
                                historial={data.historial}
                                moneda={data.moneda}
                                indexacion={data.indexacion}
                                baseCalculo={data.base_calculo}
                                cotizacionSnapshot={data.cotizacion_snapshot}
                                montoIngresado={data.monto_ingresado}
                                cacIndiceActual={getCacIndice(data.cac_tipo)}
                                tipoCambioActual={tipoCambio}
                                cacTipo={data.cac_tipo}
                                cacEstado={data.cac_estado}
                                seleccionada={seleccionMulti.proveedores.includes(proveedor)}
                                modoSeleccion={modoSeleccion}
                                onToggleSeleccion={() => toggleSeleccionProveedor(proveedor)}
                                onEditar={nItems > 0 ? (e) => handleEditarBucket(e, data, proveedor) : undefined}
                                onCrear={() => abrirDrawerCrear({
                                  preFill: { clasificaciones: [], proveedores: [{ id: null, nombre: proveedor }], etapa: null },
                                })}
                              />
                            );
                          })
                        )}
                      </Stack>
                    )}
                  </Box>
                </Paper>

                {/* Otros presupuestos: los que no aparecen en los tabs de Categoría ni Proveedor */}
                {presupuestosFueraDeTabs.length > 0 && (
                  <Paper sx={{ p: { xs: 1.5, md: 2 } }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <ReceiptLongIcon color="action" sx={{ fontSize: { xs: 20, md: 24 } }} />
                      <Typography variant="h6" sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>Otros presupuestos</Typography>
                      <Chip label={`${presupuestosFueraDeTabs.length}`} size="small" variant="outlined" />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                      Presupuestos de esta obra que no aparecen en las pestañas de Categoría ni Proveedor
                      (etapas, combinaciones de dimensiones o categorías no configuradas en la empresa).
                    </Typography>
                    <Stack spacing={1.5}>
                      {presupuestosFueraDeTabs.map((item) => {
                        const label = labelItem(item, 'Sin detalle');
                        return (
                          <PresupuestoItem
                            key={item.id}
                            label={label}
                            presupuesto={item.monto}
                            ejecutado={item.ejecutado || 0}
                            formatMonto={formatMonto}
                            historial={item.historial || []}
                            moneda={item.moneda || 'ARS'}
                            indexacion={item.indexacion || null}
                            baseCalculo={item.base_calculo || 'total'}
                            cotizacionSnapshot={item.cotizacion_snapshot || null}
                            montoIngresado={item.monto_ingresado || item.monto}
                            cacIndiceActual={getCacIndice(item.cac_tipo)}
                            tipoCambioActual={tipoCambio}
                            cacTipo={item.cac_tipo || null}
                            cacEstado={item.cac_estado}
                            onEditar={() => abrirDrawerEditar(item, label)}
                          />
                        );
                      })}
                    </Stack>
                  </Paper>
                )}
              </>
            )}

          </Stack>
        </Container>

        {/* Sticky bar de selección multi-card: aparece cuando hay >=1 selección cross-tab. */}
        {totalSeleccionados > 0 && (
          <Paper
            elevation={8}
            sx={{
              position: 'sticky',
              bottom: 16,
              mx: { xs: 1.5, sm: 3, md: 4 },
              mt: 2,
              p: { xs: 1.5, md: 2 },
              borderRadius: 2,
              borderLeft: '4px solid',
              borderColor: 'primary.main',
              zIndex: (theme) => theme.zIndex.appBar - 1,
            }}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} justifyContent="space-between">
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ minWidth: 0 }}>
                <Chip label={`${totalSeleccionados} seleccionada${totalSeleccionados > 1 ? 's' : ''}`} color="primary" size="small" />
                {seleccionMulti.clasificaciones.map((c) => (
                  <Chip
                    key={`c-${c}`}
                    icon={<CategoryIcon sx={{ fontSize: 14 }} />}
                    label={c}
                    size="small"
                    variant="outlined"
                    onDelete={() => toggleSeleccionCategoria(c)}
                  />
                ))}
                {seleccionMulti.etapa && (
                  <Chip
                    icon={<TimelineIcon sx={{ fontSize: 14 }} />}
                    label={seleccionMulti.etapa}
                    size="small"
                    variant="outlined"
                    onDelete={() => toggleSeleccionEtapa(seleccionMulti.etapa)}
                  />
                )}
                {seleccionMulti.proveedores.map((p) => (
                  <Chip
                    key={`p-${p}`}
                    icon={<StorefrontIcon sx={{ fontSize: 14 }} />}
                    label={p}
                    size="small"
                    variant="outlined"
                    onDelete={() => toggleSeleccionProveedor(p)}
                  />
                ))}
              </Stack>
              <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                <Button size="small" variant="text" onClick={salirModoSeleccion}>Limpiar</Button>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<AddCircleIcon />}
                  onClick={() => crearDesdeSeleccion('egreso')}
                >
                  Crear presupuesto
                </Button>
              </Stack>
            </Stack>
          </Paper>
        )}
      </Box>

      {/* Popover de bucket con N>1 presupuestos: lista compacta para elegir cuál editar */}
      <Popover
        open={bucketPopover.open}
        anchorEl={bucketPopover.anchorEl}
        onClose={() => setBucketPopover(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { width: 360, maxWidth: '90vw', maxHeight: 480 } } }}
      >
        <List
          dense
          subheader={
            <ListSubheader sx={{ bgcolor: 'background.paper', lineHeight: '32px', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'text.secondary' }}>
              {bucketPopover.items.length} presupuestos en {bucketPopover.valorAgrupacion}
            </ListSubheader>
          }
          sx={{ py: 0 }}
        >
          {bucketPopover.items.map((it) => {
            const detalle = labelItem(it, 'Sin detalle');
            return (
              <ListItemButton
                key={it.id}
                onClick={() => {
                  setBucketPopover(prev => ({ ...prev, open: false }));
                  abrirDrawerEditar(it, detalle);
                }}
              >
                <ListItemText
                  primary={
                    <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="center">
                      <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>{detalle}</Typography>
                      <Typography variant="body2" fontWeight={600} sx={{ whiteSpace: 'nowrap' }}>
                        {formatMonto(it.monto, it.moneda)}
                      </Typography>
                    </Stack>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      Ejecutado: {formatMonto(it.ejecutado || 0, it.moneda)}
                      {it.indexacion ? ` · ${it.indexacion}` : ''}
                    </Typography>
                  }
                />
              </ListItemButton>
            );
          })}
          <Divider />
          <ListItemButton
            onClick={() => {
              setBucketPopover(prev => ({ ...prev, open: false }));
              abrirDrawerCrear({ tipoDefault: 'egreso' });
            }}
            sx={{ color: 'primary.main' }}
          >
            <AddCircleIcon fontSize="small" sx={{ mr: 1 }} />
            <ListItemText primary={<Typography variant="body2" color="primary">Crear nuevo presupuesto</Typography>} />
          </ListItemButton>
        </List>
      </Popover>

      {/* Drawer de Presupuesto (crear/editar/adicional/historial) */}
      <PresupuestoDrawer
        open={drawerPresupuesto.open}
        onClose={() => setDrawerPresupuesto(prev => ({ ...prev, open: false }))}
        onSuccess={handleDrawerSuccess}
        mode={drawerPresupuesto.mode}
        empresaId={empresaId}
        empresaNombre={empresa?.nombre || ''}
        proyectoId={proyectoSeleccionado}
        userId={user?.uid}
        tipoAgrupacion={drawerPresupuesto.tipoAgrupacion}
        valorAgrupacion={drawerPresupuesto.valorAgrupacion}
        preFill={drawerPresupuesto.preFill}
        tipoDefault={drawerPresupuesto.tipoDefault}
        proveedoresEmpresa={proveedoresEmpresa}
        proyectos={proyectos}
        categorias={categorias}
        etapas={etapas}
        showFullForm={drawerPresupuesto.showFullForm}
        presupuesto={drawerPresupuesto.presupuesto}
        drawerView={drawerPresupuesto.drawerView || 'full'}
        filtrosColapsados
        onRecalcular={async (id) => {
          try {
            const { success } = await presupuestoService.recalcularPresupuesto(id, empresaId);
            if (success) {
              setAlert({ open: true, message: 'Presupuesto recalculado correctamente', severity: 'success' });
              cargarResumen();
            } else {
              setAlert({ open: true, message: 'No se pudo recalcular', severity: 'warning' });
            }
          } catch (err) {
            setAlert({ open: true, message: 'Error al recalcular', severity: 'error' });
          }
        }}
      />

      {/* Drawer de movimientos del proyecto */}
      <Drawer
        anchor="right"
        open={movDrawer.open}
        onClose={() => setMovDrawer(prev => ({ ...prev, open: false }))}
        PaperProps={{ sx: { width: { xs: '100%', sm: 720 }, p: 0 } }}
      >
        <Box sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontSize: '1rem' }}>{movDrawer.label}</Typography>
            <IconButton size="small" onClick={() => setMovDrawer(prev => ({ ...prev, open: false }))}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Stack direction="row" spacing={0.5} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
            {[{ key: 'usd', label: 'USD' }, { key: 'cac', label: 'CAC' }].map(eq => (
              <Chip
                key={eq.key}
                label={eq.label}
                size="small"
                variant={movDrawerEquiv[eq.key] ? 'filled' : 'outlined'}
                onClick={() => setMovDrawerEquiv(prev => ({ ...prev, [eq.key]: !prev[eq.key] }))}
                sx={{ cursor: 'pointer', fontSize: '0.7rem', height: 22 }}
              />
            ))}
            <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', ml: 0.5 }}>
              {movDrawerData.length} mov.
            </Typography>
            <Tooltip title={movDrawerOrdenAsc ? 'Más recientes primero' : 'Más antiguos primero'} arrow>
              <Chip
                label={movDrawerOrdenAsc ? '↑ Antiguos' : '↓ Recientes'}
                size="small"
                variant="outlined"
                onClick={() => setMovDrawerOrdenAsc(prev => !prev)}
                sx={{ cursor: 'pointer', fontSize: '0.65rem', height: 22, ml: 'auto' }}
              />
            </Tooltip>
            {movDrawerData.length > 0 && (
              <ExportarPdfMenu
                empresaId={empresaId}
                empresaNombre={empresa?.nombre || ''}
                documentType="control_presupuesto"
                fileName={`movimientos-${proyectoActual?.nombre || 'proyecto'}-${movDrawer.label}`}
                defaultDocumentLoader={loadDefaultControlPresupuestoDoc}
                onError={(message) => setAlert({ open: true, message, severity: 'error' })}
                tituloEditable
                defaultTitulo={
                  movDrawer.tipo === 'egreso' ? 'RECIBO DE PAGOS'
                    : movDrawer.tipo === 'ingreso' ? 'RECIBO DE INGRESOS'
                      : 'ESTADO DE CUENTA'
                }
                buildData={(opts) => {
                  const totales = calcularTotales();
                  const presupuestado =
                    movDrawer.tipo === 'egreso' ? totales.egresos.total
                      : movDrawer.tipo === 'ingreso' ? totales.ingresos.total
                        : 0;
                  const titulo = opts?.titulo || (
                    movDrawer.tipo === 'egreso' ? 'RECIBO DE PAGOS'
                      : movDrawer.tipo === 'ingreso' ? 'RECIBO DE INGRESOS'
                        : 'ESTADO DE CUENTA'
                  );
                  // Export a nivel proyecto: presupuestos mixtos, sin indexación única.
                  // El builder cae al modo "moneda de vista" (sin columna de equivalencia).
                  return buildControlPresupuestoData({
                    movimientos: movDrawerData,
                    titulo,
                    presupuestoLabel: movDrawer.label,
                    obra: proyectoActual?.nombre || '',
                    empresaNombre: empresa?.nombre || '',
                    monedaPresupuesto: moneda,
                    presupuestadoNativo: presupuestado,
                    tipo: movDrawer.tipo === 'ingreso' ? 'ingresos' : 'gastos',
                    cacModo,
                  });
                }}
              />
            )}
          </Stack>

          {movDrawerLoading ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <CircularProgress size={28} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Cargando movimientos…</Typography>
            </Box>
          ) : movDrawerData.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <ReceiptLongIcon sx={{ fontSize: 40, color: 'grey.300', mb: 1 }} />
              <Typography color="text.secondary" variant="body2">No hay movimientos</Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ '& td, & th': { px: 0.75, py: 0.4, fontSize: '0.7rem', borderColor: 'grey.100' } }}>
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.65rem', color: 'text.secondary', whiteSpace: 'nowrap' } }}>
                    <TableCell sx={{ width: 28 }} />
                    <TableCell>Fecha</TableCell>
                    <TableCell>Detalle</TableCell>
                    <TableCell align="right">Monto</TableCell>
                    <TableCell align="right">Acumulado</TableCell>
                    {movDrawerEquiv.usd && <TableCell align="right" sx={{ color: 'success.main' }}>USD</TableCell>}
                    {movDrawerEquiv.cac && <TableCell align="right" sx={{ color: 'secondary.main' }}>CAC</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(() => {
                    const sorted = [...movDrawerData].sort((a, b) => {
                      const ta = a.fecha_factura?._seconds || a.fecha_factura?.seconds || 0;
                      const tb = b.fecha_factura?._seconds || b.fecha_factura?.seconds || 0;
                      return movDrawerOrdenAsc ? ta - tb : tb - ta;
                    });
                    // Acumulado siempre cronológico
                    const crono = movDrawerOrdenAsc ? sorted : [...sorted].reverse();
                    const acumMap = {};
                    let runARS = 0, runUSD = 0;
                    crono.forEach(m => {
                      const monto = m.total || 0;
                      if ((m.moneda || 'ARS') === 'USD') runUSD += monto; else runARS += monto;
                      acumMap[m.id] = { ars: runARS, usd: runUSD };
                    });
                    return sorted.map(mov => {
                      const montoNativo = mov.total || 0;
                      const monedaMov = mov.moneda || 'ARS';
                      const acum = acumMap[mov.id] || { ars: 0, usd: 0 };
                      const acumuladoDisplay = monedaMov === 'USD'
                        ? `USD ${Number(acum.usd).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
                        : `$${Number(acum.ars).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
                      const fechaSecs = mov.fecha_factura?._seconds || mov.fecha_factura?.seconds;
                      const fechaStr = fechaSecs
                        ? dayjs.unix(fechaSecs).format('DD/MM/YY')
                        : mov.fecha_factura ? dayjs(mov.fecha_factura).format('DD/MM/YY') : '—';
                      const eq = mov.equivalencias?.total || {};
                      const detalle = mov.nombre_proveedor || 'Sin proveedor';
                      const obs = mov.observacion;
                      const comprobante = mov.tipo_comprobante ? `${mov.tipo_comprobante}${mov.nro_comprobante ? ` ${mov.nro_comprobante}` : ''}` : '';
                      const tipoColor = mov.type === 'ingreso' ? 'success.main' : 'error.main';
                      return (
                        <Fragment key={mov.id}>
                          <TableRow sx={{ '&:hover': { bgcolor: 'grey.50' } }}>
                            <TableCell sx={{ p: 0, pl: 0.25, width: 28 }}>
                              <Tooltip title="Editar movimiento" arrow>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push({
                                      pathname: '/movementForm',
                                      query: {
                                        movimientoId: mov.id,
                                        proyectoId: proyectoSeleccionado,
                                        lastPageUrl: router.asPath,
                                      },
                                    });
                                  }}
                                  sx={{ p: 0.25 }}
                                >
                                  <EditIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>{fechaStr}</TableCell>
                            <TableCell sx={{ maxWidth: 200 }}>
                              <Typography variant="caption" fontWeight={600} noWrap sx={{ display: 'block', fontSize: '0.7rem' }}>
                                {detalle}
                              </Typography>
                              <Typography variant="caption" noWrap sx={{ display: 'block', fontSize: '0.6rem', lineHeight: 1.2 }}>
                                <Box component="span" sx={{ color: tipoColor, fontWeight: 600 }}>{mov.type === 'ingreso' ? '↑' : '↓'}</Box>
                                {' '}{[mov.categoria, mov.etapa, comprobante].filter(Boolean).join(' · ') || mov.type}
                              </Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600, whiteSpace: 'nowrap', color: mov.type === 'ingreso' ? 'success.main' : 'text.primary' }}>
                              {monedaMov === 'USD' ? 'USD ' : '$'}
                              {Number(montoNativo).toLocaleString('es-AR', { maximumFractionDigits: monedaMov === 'USD' ? 2 : 0 })}
                            </TableCell>
                            <TableCell align="right" sx={{ whiteSpace: 'nowrap', color: 'text.secondary', fontWeight: 500 }}>
                              {acumuladoDisplay}
                            </TableCell>
                            {movDrawerEquiv.usd && (
                              <TableCell align="right" sx={{ whiteSpace: 'nowrap', color: 'success.main' }}>
                                {monedaMov === 'USD' ? `$${Number(eq.ars || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}` : (eq.usd_blue != null ? Number(eq.usd_blue).toLocaleString('es-AR', { maximumFractionDigits: 1 }) : '—')}
                              </TableCell>
                            )}
                            {movDrawerEquiv.cac && (
                              <TableCell align="right" sx={{ whiteSpace: 'nowrap', color: 'secondary.main' }}>
                                {eq.cac != null ? Number(eq.cac).toLocaleString('es-AR', { maximumFractionDigits: 2 }) : '—'}
                              </TableCell>
                            )}
                          </TableRow>
                          {obs && (
                            <TableRow>
                              <TableCell colSpan={5 + (movDrawerEquiv.usd ? 1 : 0) + (movDrawerEquiv.cac ? 1 : 0)} sx={{ pt: 0, pb: 0.5, borderBottom: 0 }}>
                                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem', fontStyle: 'italic', pl: 0.5 }}>
                                  💬 {obs}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    });
                  })()}
                  {/* Fila total */}
                  {(() => {
                    const tots = { ars: 0, usd: 0 };
                    movDrawerData.forEach(m => {
                      if (m.moneda === 'USD') tots.usd += (m.total || 0); else tots.ars += (m.total || 0);
                    });
                    return (
                      <TableRow sx={{ '& td': { borderTop: 2, borderColor: 'divider', fontWeight: 700, fontSize: '0.72rem' } }}>
                        <TableCell />
                        <TableCell>Total</TableCell>
                        <TableCell />
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          {tots.ars !== 0 && `$${Number(tots.ars).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`}
                          {tots.ars !== 0 && tots.usd !== 0 && <br />}
                          {tots.usd !== 0 && <Typography component="span" sx={{ color: 'success.main', fontSize: 'inherit', fontWeight: 'inherit' }}>USD {Number(tots.usd).toLocaleString('es-AR', { maximumFractionDigits: 2 })}</Typography>}
                        </TableCell>
                        <TableCell />
                        {movDrawerEquiv.usd && <TableCell />}
                        {movDrawerEquiv.cac && <TableCell />}
                      </TableRow>
                    );
                  })()}
                </TableBody>
              </Table>
            </Box>
          )}
        </Box>
      </Drawer>

      {/* Modal de Agregar Proveedor */}
      <Dialog open={proveedorModal} onClose={() => setProveedorModal(false)}>
        <DialogTitle>Agregar Proveedor al Proyecto</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1, minWidth: 350 }}>
            <Typography variant="body2" color="text.secondary">
              Seleccioná un proveedor de la empresa o escribí uno nuevo
            </Typography>
            <Autocomplete
              freeSolo
              options={proveedoresEmpresa.filter(p => p && !proveedoresAgregados.includes(p))}
              inputValue={nuevoProveedor || ''}
              onInputChange={(e, newInputValue, reason) => {
                if (reason === 'input' || reason === 'clear') {
                  setNuevoProveedor(newInputValue || '');
                }
              }}
              onChange={(e, newValue) => setNuevoProveedor(newValue || '')}
              getOptionLabel={(option) => option || ''}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Proveedor"
                  placeholder="Buscar o escribir nuevo..."
                  autoFocus
                />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <StorefrontIcon fontSize="small" color="action" />
                    <Typography>{option}</Typography>
                  </Stack>
                </li>
              )}
              noOptionsText="No hay proveedores. Escribí para crear uno nuevo."
            />
            {nuevoProveedor && !proveedoresEmpresa.includes(nuevoProveedor) && (
              <Alert severity="info" icon={<AddCircleIcon />}>
                Se creará un nuevo proveedor: <strong>{nuevoProveedor}</strong>
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProveedorModal(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleAgregarProveedor} disabled={!nuevoProveedor.trim()}>Agregar</Button>
        </DialogActions>
      </Dialog>



      {/* Modal de Ajuste del Presupuesto General */}
      <Dialog open={ajusteGeneralModal.open} onClose={() => setAjusteGeneralModal({ open: false, sumaHijos: 0, origen: '' })}>
        <DialogTitle>⚠️ Presupuesto excedido</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1, minWidth: 380 }}>
            <Alert severity="warning">
              La suma de presupuestos por <strong>{ajusteGeneralModal.origen}</strong> supera el presupuesto general del proyecto.
            </Alert>
            <Stack direction="row" justifyContent="space-between">
              <Typography color="text.secondary">Presupuesto general actual:</Typography>
              <Typography fontWeight={600}>{formatMonto(presupuestoGeneral, moneda)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography color="text.secondary">Suma por {ajusteGeneralModal.origen}:</Typography>
              <Typography fontWeight={600} color="error">{formatMonto(ajusteGeneralModal.sumaHijos, moneda)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography color="text.secondary">Exceso:</Typography>
              <Typography fontWeight={600} color="error">
                +{formatMonto(ajusteGeneralModal.sumaHijos - presupuestoGeneral, moneda)}
              </Typography>
            </Stack>
            <Divider />
            <Typography variant="body2">
              ¿Desea ajustar el presupuesto general a {formatMonto(ajusteGeneralModal.sumaHijos, moneda)}?
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAjusteGeneralModal({ open: false, sumaHijos: 0, origen: '' })}>
            No, mantener actual
          </Button>
          <Button variant="contained" color="warning" onClick={handleAjustarGeneral}>
            Sí, ajustar a {formatMonto(ajusteGeneralModal.sumaHijos, moneda)}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar 
        open={alert.open} 
        autoHideDuration={4000} 
        onClose={() => setAlert(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={alert.severity}>{alert.message}</Alert>
      </Snackbar>

      {/* Dialog confirmar eliminación */}
      <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, id: null, label: '' })}>
        <DialogTitle>Eliminar presupuesto</DialogTitle>
        <DialogContent>
          <Typography>¿Estás seguro de que querés eliminar el presupuesto <strong>{deleteConfirm.label}</strong>? Esta acción no se puede deshacer.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm({ open: false, id: null, label: '' })}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleEliminarPresupuesto}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

ControlPresupuestosPage.getLayout = (page) => (
  <DashboardLayout>{page}</DashboardLayout>
);

export default ControlPresupuestosPage;