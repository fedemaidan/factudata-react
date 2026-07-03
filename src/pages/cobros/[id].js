import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  InputAdornment,
  LinearProgress,
  Paper,
  Skeleton,
  Snackbar,
  Alert,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import FolderIcon from '@mui/icons-material/Folder';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { usePlanCobro } from 'src/hooks/usePlanCobro';
import { formatCurrency, formatNumberInput, parseNumberInput } from 'src/utils/formatters';
import planCobroService from 'src/services/planCobroService';

const ESTADO_COLOR = { borrador: 'default', activo: 'primary', completado: 'success' };
const ESTADO_LABEL = { borrador: 'Borrador', activo: 'Activo', completado: 'Completado' };

const DetallePlanPage = () => {
  const { user } = useAuthContext();
  const router = useRouter();
  const { id } = router.query;

  const [empresaId, setEmpresaId] = useState(null);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [confirmEliminar, setConfirmEliminar] = useState(false);
  const [confirmCobrar, setConfirmCobrar] = useState(null); // cuota object or null
  const [cobrandoId, setCobrandoId] = useState(null);
  const [reverting, setReverting] = useState(null);
  const [tipoCobro, setTipoCobro] = useState('total'); // 'total' | 'parcial'
  const [montoParcial, setMontoParcial] = useState('');
  const [modoCobro, setModoCobro] = useState('nuevo'); // 'nuevo' | 'vincular' | 'solo_estado'
  const [movVinculables, setMovVinculables] = useState([]);
  const [movSel, setMovSel] = useState(null);

  // Edit cuota dialog
  const [editCuota, setEditCuota] = useState(null); // cuota object or null
  const [editForm, setEditForm] = useState({ monto: '', fecha_vencimiento: '', descripcion: '' });
  const [editCacInput, setEditCacInput] = useState(''); // CAC units input para planes indexados
  const [editCacRef, setEditCacRef] = useState(null); // override del índice de referencia (cac_indice_ref)
  const [editCacRefMes, setEditCacRefMes] = useState(''); // mes YYYY-MM para buscar el índice publicado

  // Delete cuota dialog
  const [deleteCuota, setDeleteCuota] = useState(null);
  const [showAdelantarCuota, setShowAdelantarCuota] = useState(false);

  // Add cuota dialog
  const [showAddCuota, setShowAddCuota] = useState(false);
  const [addForm, setAddForm] = useState({ monto: '', fecha_vencimiento: '', descripcion: '' });
  const [addUnidades, setAddUnidades] = useState(''); // unidades CAC/USD en el diálogo de agregar (planes indexados)
  // CAC actual para planes indexados — se usa para calcular el valor en pesos ajustado
  const [cacActual, setCacActual] = useState(null);
  const [usdActual, setUsdActual] = useState(null);
  // A2 (TAR-466 pt.1): desplegar el detalle de cuotas que componen el total cobrado
  const [showCobradoDetail, setShowCobradoDetail] = useState(false);
  // Fase 4 — edición de total y saldo sin asignar
  const [showEditTotal, setShowEditTotal] = useState(false);
  const [editTotalValue, setEditTotalValue] = useState('');
  const [showAsignarSaldo, setShowAsignarSaldo] = useState(false);
  const [savingSaldo, setSavingSaldo] = useState(false);
  // Fase 5 — ajuste manual periódico
  const [showAjuste, setShowAjuste] = useState(false);
  const [ajustePct, setAjustePct] = useState('');
  // Anexos (Fase 6 ronda 2)
  const [showAnexo, setShowAnexo] = useState(false);
  const [anexoForm, setAnexoForm] = useState({ monto: '', motivo: '', modo: 'prorratear' });

  useEffect(() => {
    if (!user) return;
    getEmpresaDetailsFromUser(user).then((empresa) => {
      if (empresa?.id) setEmpresaId(empresa.id);
    });
  }, [user]);

  const { plan, loading, error, refresh, confirmarPlan, marcarCobrada, revertirCobro, editarCuota, eliminarCuota, agregarCuota } = usePlanCobro(
    id || null,
    empresaId
  );

  useEffect(() => {
    if (error) setAlert({ open: true, message: 'Error al cargar el plan', severity: 'error' });
  }, [error]);

  // Fetch del índice actual para mostrar ARS actualizado en planes indexados.
  useEffect(() => {
    if (!plan || !plan.indexacion) return;
    const hoy = new Date().toISOString().split('T')[0];
    const request = plan.indexacion === 'CAC'
      ? planCobroService.previewCAC(hoy, plan.cac_tipo || 'general')
      : planCobroService.previewUSD(hoy, plan.usd_fuente || plan.cotizacion_snapshot?.dolar_fuente || 'blue');

    request
      .then((res) => {
        const data = res?.data?.data;
        setCacActual(data?.cac_indice || null);
        setUsdActual(data?.dolar_indice || null);
      })
      .catch(() => {
        setCacActual(null);
        setUsdActual(null);
      });
  }, [plan?.indexacion, plan?.cac_tipo, plan?.usd_fuente, plan?.cotizacion_snapshot?.dolar_fuente]);

  // Para planes CAC con monto ajustable: valor actual en ARS = monto_cac × cac_actual
  const getMontoCuota = (cuota) => {
    if (!cuota) return 0;
    if (plan?.indexacion === 'CAC' && cuota.monto_cac && cacActual) {
      return Math.round(cuota.monto_cac * cacActual * 100) / 100;
    }
    if (plan?.indexacion === 'USD' && cuota.monto_usd && usdActual) {
      return Math.round(cuota.monto_usd * usdActual * 100) / 100;
    }
    return cuota.monto || 0;
  };

  // A3 (TAR-466 pt.2): para cuotas ya cobradas mostramos el monto REAL cobrado,
  // no el valor ajustado al índice de hoy (que confunde: parece cobrado de más).
  const getMontoDisplay = (cuota) => {
    if (!cuota) return 0;
    if (cuota.estado === 'cobrada') return cuota.monto_cobrado || 0;
    return getMontoCuota(cuota);
  };
  // ¿La cuota cobrada tiene un valor "actualizado a hoy" distinto al real? (para tooltip)
  const getValorActualizado = (cuota) => (cuota?.estado === 'cobrada' ? getMontoCuota(cuota) : null);

  const handleCobrarClick = (cuotaId) => {
    const cuota = (plan.cuotas || []).find((c) => c._id === cuotaId);
    setConfirmCobrar(cuota || { _id: cuotaId });
    setTipoCobro('total');
    setMontoParcial('');
    setModoCobro('nuevo');
    setMovSel(null);
    // Precargar movimientos vinculables (por si el usuario elige "vincular")
    planCobroService.listarMovimientosVinculables(empresaId, plan?.proyecto_id)
      .then((res) => setMovVinculables(res?.data?.data || []))
      .catch(() => setMovVinculables([]));
  };

  const handleCobrarConfirm = async () => {
    if (!confirmCobrar) return;
    const cuotaId = confirmCobrar._id;
    const parcial = tipoCobro === 'parcial' ? parseNumberInput(montoParcial) : null;
    if (tipoCobro === 'parcial' && (!parcial || Number(parcial) <= 0)) return;
    if (modoCobro === 'vincular' && !movSel) {
      setAlert({ open: true, message: 'Elegí un movimiento para vincular', severity: 'warning' });
      return;
    }
    setConfirmCobrar(null);
    setCobrandoId(cuotaId);
    try {
      await marcarCobrada(cuotaId, {
        fecha_cobrado: new Date().toISOString().split('T')[0],
        monto_parcial: parcial ? Number(parcial) : undefined,
        modo: modoCobro,
        movimiento_id: modoCobro === 'vincular' ? movSel?._id : undefined,
      });
      await refresh();
      const msg = modoCobro === 'vincular'
        ? 'Cuota cobrada vinculando el movimiento existente.'
        : modoCobro === 'solo_estado'
          ? 'Cuota marcada como cobrada (sin movimiento de caja).'
          : tipoCobro === 'parcial'
            ? 'Pago parcial registrado.'
            : 'Cuota cobrada. Movimiento de caja registrado.';
      setAlert({ open: true, message: msg, severity: 'success' });
    } catch (err) {
      setAlert({ open: true, message: err?.response?.data?.error || err.message || 'Error al marcar cuota', severity: 'error' });
    } finally {
      setCobrandoId(null);
    }
  };

  const handleRevertir = async (cuotaId) => {
    setReverting(cuotaId);
    try {
      await revertirCobro(cuotaId);
      await refresh();
      setAlert({ open: true, message: 'Cobro revertido correctamente', severity: 'success' });
    } catch (err) {
      setAlert({ open: true, message: err.message || 'Error al revertir', severity: 'error' });
    } finally {
      setReverting(null);
    }
  };

  const handleEditClick = (cuota) => {
    setEditCuota(cuota);
    // El monto persistido (cuota.monto) es el nominal al índice BASE del plan
    // (monto_cac × cac_indice_base). Editamos contra esa base, no contra el índice de hoy,
    // para que las unidades CAC queden consistentes con la creación del plan.
    const esCac = plan?.indexacion === 'CAC' && cuota.monto_cac;
    setEditForm({
      monto: String(cuota.monto || 0),
      fecha_vencimiento: cuota.fecha_vencimiento
        ? new Date(cuota.fecha_vencimiento).toISOString().split('T')[0]
        : '',
      descripcion: cuota.descripcion || '',
    });
    setEditCacInput(esCac ? String(Math.round(cuota.monto_cac * 100) / 100) : '');
    setEditCacRef(cuota.cac_indice_ref || null);
    setEditCacRefMes('');
  };

  // Al elegir un mes, busca el índice CAC publicado y lo fija como referencia de la cuota.
  const handleEditCacRefMes = async (mes) => {
    setEditCacRefMes(mes);
    if (!mes) { setEditCacRef(null); return; }
    try {
      const res = await planCobroService.previewCAC(`${mes}-01`, plan?.cac_tipo || 'general');
      const idx = res?.data?.data?.cac_indice || null;
      if (idx) {
        setEditCacRef(idx);
        // Mantiene los pesos pactados y recalcula las unidades contra la nueva referencia.
        const pesos = parseFloat(parseNumberInput(editForm.monto));
        if (!isNaN(pesos)) setEditCacInput(String(Math.round((pesos / idx) * 100) / 100));
      }
    } catch {
      /* si falla el preview, se mantiene la referencia base */
    }
  };

  const handleEditConfirm = async () => {
    if (!editCuota) return;
    const montoNum = parseNumberInput(editForm.monto);
    if (!montoNum || Number(montoNum) <= 0) return;
    const esCacPlan = plan?.indexacion === 'CAC' && editCuota?.monto_cac;
    const cacNum = esCacPlan ? parseFloat(editCacInput.replace(',', '.')) : null;
    try {
      await editarCuota(editCuota._id, {
        monto: Number(montoNum),
        ...(esCacPlan && cacNum > 0 ? { monto_cac: cacNum } : {}),
        ...(esCacPlan ? { cac_indice_ref: editCacRef || null } : {}),
        fecha_vencimiento: editForm.fecha_vencimiento || undefined,
        descripcion: editForm.descripcion || undefined,
      });
      setEditCuota(null);
      setAlert({ open: true, message: 'Cuota actualizada', severity: 'success' });
    } catch (err) {
      setAlert({ open: true, message: err.message || 'Error al editar cuota', severity: 'error' });
    }
  };

  // ─── Fase 4: total + saldo sin asignar ───────────────────────────────────────
  const handleEditTotalConfirm = async () => {
    const val = parseNumberInput(editTotalValue);
    if (!val || Number(val) <= 0) return;
    setSavingSaldo(true);
    try {
      await planCobroService.editarPlan(id, { empresa_id: empresaId, monto_total: Number(val) });
      setShowEditTotal(false);
      await refresh();
      setAlert({ open: true, message: 'Total del plan actualizado', severity: 'success' });
    } catch (err) {
      setAlert({ open: true, message: err?.response?.data?.error || 'Error al editar total', severity: 'error' });
    } finally {
      setSavingSaldo(false);
    }
  };

  const runSaldoAction = async (fn, okMsg) => {
    setSavingSaldo(true);
    try {
      await fn();
      setShowAsignarSaldo(false);
      await refresh();
      setAlert({ open: true, message: okMsg, severity: 'success' });
    } catch (err) {
      setAlert({ open: true, message: err?.response?.data?.error || 'Error al resolver el saldo', severity: 'error' });
    } finally {
      setSavingSaldo(false);
    }
  };

  const handleAplicarAjuste = async () => {
    const pct = parseFloat(String(ajustePct).replace(',', '.'));
    if (isNaN(pct)) return;
    setSavingSaldo(true);
    try {
      await planCobroService.aplicarAjusteManual(id, { empresa_id: empresaId, pct });
      setShowAjuste(false);
      setAjustePct('');
      await refresh();
      setAlert({ open: true, message: 'Ajuste aplicado a las cuotas pendientes', severity: 'success' });
    } catch (err) {
      setAlert({ open: true, message: err?.response?.data?.error || 'Error al aplicar el ajuste', severity: 'error' });
    } finally {
      setSavingSaldo(false);
    }
  };

  const handleAnexoConfirm = async () => {
    const montoNum = parseFloat(parseNumberInput(anexoForm.monto));
    if (!montoNum) return;
    setSavingSaldo(true);
    try {
      await planCobroService.agregarAnexo(id, {
        empresa_id: empresaId,
        monto: montoNum,
        motivo: anexoForm.motivo || undefined,
        modo: anexoForm.modo,
      });
      setShowAnexo(false);
      setAnexoForm({ monto: '', motivo: '', modo: 'prorratear' });
      await refresh();
      setAlert({ open: true, message: 'Anexo aplicado', severity: 'success' });
    } catch (err) {
      setAlert({ open: true, message: err?.response?.data?.error || 'Error al aplicar el anexo', severity: 'error' });
    } finally {
      setSavingSaldo(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCuota) return;
    try {
      await eliminarCuota(deleteCuota._id);
      setDeleteCuota(null);
      setAlert({ open: true, message: 'Cuota eliminada', severity: 'success' });
    } catch (err) {
      setAlert({ open: true, message: err.message || 'Error al eliminar cuota', severity: 'error' });
    }
  };

  const handleAddConfirm = async () => {
    const montoNum = parseNumberInput(addForm.monto);
    if (!montoNum || Number(montoNum) <= 0) return;
    const cacNum = plan?.indexacion === 'CAC' ? parseFloat(String(addUnidades).replace(',', '.')) : null;
    try {
      await agregarCuota({
        monto: Number(montoNum),
        ...(cacNum > 0 ? { monto_cac: cacNum } : {}),
        fecha_vencimiento: addForm.fecha_vencimiento || undefined,
        descripcion: addForm.descripcion || undefined,
      });
      setShowAddCuota(false);
      setAddForm({ monto: '', fecha_vencimiento: '', descripcion: '' });
      setAddUnidades('');
      setAlert({ open: true, message: 'Cuota agregada', severity: 'success' });
    } catch (err) {
      setAlert({ open: true, message: err.message || 'Error al agregar cuota', severity: 'error' });
    }
  };

  const handleEliminar = async () => {
    setConfirmEliminar(false);
    try {
      const res = await planCobroService.eliminarPlan(id, empresaId);
      const d = res?.data;
      if (!d?.ok) throw new Error(d?.error || 'Error al eliminar');
      router.push('/cobros');
    } catch (err) {
      setAlert({ open: true, message: err.message || 'Error al eliminar el plan', severity: 'error' });
    }
  };

  const handleExportarPDF = async () => {
    try {
      const res = await planCobroService.exportarPDF(id, empresaId);
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plan-cobro-${plan.codigo || id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setAlert({ open: true, message: 'Error al exportar PDF', severity: 'error' });
    }
  };

  const handleConfirmarBorrador = async () => {
    try {
      await confirmarPlan((plan.cuotas || []).map((c) => ({
        fecha_vencimiento: c.fecha_vencimiento,
        monto: c.monto,
        descripcion: c.descripcion,
      })));
      setAlert({ open: true, message: 'Plan confirmado', severity: 'success' });
    } catch (err) {
      setAlert({ open: true, message: err.message || 'Error al confirmar', severity: 'error' });
    }
  };

  // Skeleton loading
  if (loading || !plan) {
    return (
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="lg">
          <Skeleton variant="text" width={120} height={32} sx={{ mb: 2 }} />
          <Skeleton variant="text" width={300} height={40} sx={{ mb: 1 }} />
          <Skeleton variant="text" width={200} height={24} sx={{ mb: 3 }} />
          <Grid container spacing={2} mb={3}>
            {[1, 2, 3].map((k) => (
              <Grid item xs={12} sm={4} key={k}>
                <Skeleton variant="rounded" height={80} />
              </Grid>
            ))}
          </Grid>
          <Skeleton variant="rounded" height={8} sx={{ mb: 3 }} />
          <Skeleton variant="rounded" height={200} />
        </Container>
      </Box>
    );
  }

  const resumen = plan.resumen || {};
  const monedaDisplay = plan.moneda === 'CAC' ? 'ARS' : plan.moneda || 'ARS';
  const cacTipoLabel = plan.cac_tipo === 'general' ? 'Promedio' : plan.cac_tipo === 'mano_obra' ? 'M. Obra' : 'Materiales';
  const usdFuenteLabel = (plan.usd_fuente || plan.cotizacion_snapshot?.dolar_fuente) === 'oficial' ? 'Oficial' : 'Blue';
  const indexacionLabel = plan.indexacion === 'CAC' ? `CAC ${cacTipoLabel}` : plan.indexacion === 'USD' ? `Dólar ${usdFuenteLabel}` : '';
  const allCuotas = plan.cuotas || [];
  const totalCuotas = allCuotas.length;
  const cuotasCobradas = allCuotas.filter((c) => c.estado === 'cobrada').length;
  const proximaCuota = allCuotas.find((c) => c.estado === 'pendiente' || c.estado === 'cobrada_parcial' || c.estado_ui === 'vencida' || c.estado_ui === 'cobrada_parcial_vencida');
  const proximaFecha = proximaCuota?.fecha_vencimiento
    ? new Date(proximaCuota.fecha_vencimiento).toLocaleDateString('es-AR')
    : null;
  const pct =
    resumen.total > 0 ? Math.round(((resumen.cobrado || 0) / resumen.total) * 100) : 0;
  const showCAC = !!plan.indexacion;
  const cacIndiceBase = plan.cotizacion_snapshot?.cac_indice || null;
  const usdIndiceBase = plan.cotizacion_snapshot?.dolar_indice || null;
  // Índice base efectivo para el diálogo de agregar cuota (CAC o USD).
  const addIndiceBase = plan.indexacion === 'CAC' ? cacIndiceBase : plan.indexacion === 'USD' ? usdIndiceBase : null;
  const addUnidadLabel = plan.indexacion === 'CAC' ? 'CAC' : 'USD';
  const isCuotaVencida = (cuota) => cuota?.estado_ui === 'vencida' || cuota?.estado_ui === 'cobrada_parcial_vencida';
  const cuotasOrdenadas = [...allCuotas].sort((a, b) => {
    const numeroA = Number(a?.numero || 0);
    const numeroB = Number(b?.numero || 0);
    if (numeroA !== numeroB) return numeroA - numeroB;
    const fechaA = new Date(a?.fecha_vencimiento || 0).getTime();
    const fechaB = new Date(b?.fecha_vencimiento || 0).getTime();
    return fechaA - fechaB;
  });
  const cuotasAbiertas = cuotasOrdenadas.filter((c) => c.estado !== 'cobrada');
  const cuotasVencidas = cuotasAbiertas.filter(isCuotaVencida);
  const cuotaProximaVisible = cuotasAbiertas.find((c) => !isCuotaVencida(c)) || null;
  const cuotasResto = cuotasOrdenadas.filter((c) => {
    if (cuotasVencidas.some((v) => v._id === c._id)) return false;
    if (cuotaProximaVisible?._id === c._id) return false;
    return true;
  });
  const cuotasAdelantables = cuotasResto.filter((c) => c.estado !== 'cobrada');

  // Totales ajustados por índice actual (CAC o USD, según corresponda)
  const hasIndiceActual =
    showCAC && (
      (plan.indexacion === 'USD' && !!usdActual) ||
      (plan.indexacion !== 'USD' && !!cacActual)
    );
  // Pendiente = lo que resta cobrar de cuotas no saldadas, a valor actualizado.
  const pendienteAjustado = hasIndiceActual
    ? allCuotas
        .filter((c) => c.estado !== 'cobrada')
        .reduce((acc, c) => acc + Math.max(0, getMontoCuota(c) - (c.monto_cobrado || 0)), 0)
    : null;
  // Total = cobrado REAL + pendiente actualizado (no reajusta lo ya cobrado a valor de hoy).
  const totalAjustado = hasIndiceActual ? (resumen.cobrado || 0) + pendienteAjustado : null;

  return (
    <>
      <Head>
        <title>{plan.nombre} | Cobros | Sorby</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="lg">
          {/* Header */}
          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
            <Button
              startIcon={<ArrowBackIcon />}
              variant="text"
              size="small"
              onClick={() => router.push('/cobros')}
            >
              Cobros
            </Button>
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
            <Box>
              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                <Typography variant="h5" fontWeight={700}>
                  {plan.nombre}
                </Typography>
                <Chip
                  label={ESTADO_LABEL[plan.estado] || plan.estado}
                  color={ESTADO_COLOR[plan.estado] || 'default'}
                  size="small"
                />
                {plan.proyecto_nombre && (
                  <Chip
                    icon={<FolderIcon sx={{ fontSize: 16 }} />}
                    label={plan.proyecto_nombre}
                    variant="outlined"
                    size="small"
                    sx={{ fontWeight: 500 }}
                  />
                )}
              </Stack>
              {/* Subtitle metadata line */}
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                {[
                  plan.createdAt && `Creado: ${new Date(plan.createdAt).toLocaleDateString('es-AR')}`,
                  plan.indexacion === 'CAC' &&
                    `Índice: CAC ${cacTipoLabel}${plan.cac_valor_base ? ` (base = ${Number(plan.cac_valor_base).toLocaleString('es-AR')})` : ''}`,
                  `Moneda: ${monedaDisplay}${indexacionLabel ? ` + idx ${indexacionLabel}` : ''}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Typography>
              {plan.notas && (
                <Typography variant="body2" color="text.secondary" mt={0.5} fontStyle="italic">
                  {plan.notas}
                </Typography>
              )}
            </Box>

            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<PictureAsPdfIcon />}
                onClick={handleExportarPDF}
              >
                Exportar PDF
              </Button>
              {plan.estado === 'activo' && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => { setEditTotalValue(String(plan.monto_total || resumen.total || '')); setShowEditTotal(true); }}
                >
                  Editar total
                </Button>
              )}
              {plan.estado === 'activo' && plan.indexacion === 'manual' && (
                <Button variant="outlined" size="small" onClick={() => setShowAjuste(true)}>
                  Aplicar ajuste
                </Button>
              )}
              {plan.estado === 'activo' && (
                <Button variant="outlined" size="small" onClick={() => setShowAnexo(true)}>
                  Agregar anexo
                </Button>
              )}
              {plan.estado === 'borrador' && (
                <>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => router.push(`/cobros/nuevo?edit=${id}`)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<CheckCircleIcon />}
                    onClick={handleConfirmarBorrador}
                    disabled={!plan.cuotas?.length}
                  >
                    Confirmar plan
                  </Button>
                </>
              )}
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteIcon />}
                onClick={() => setConfirmEliminar(true)}
              >
                Eliminar
              </Button>
            </Stack>
          </Stack>

          {/* Métricas con borde superior de color */}
          <Grid container spacing={2} mb={3}>
            {[
              {
                label: 'TOTAL DEL PLAN',
                value: formatCurrency(totalAjustado ?? resumen.total ?? 0, monedaDisplay),
                borderColor: '#1976D2',
                subtitle: showCAC && cacIndiceBase
                  ? `${Math.round((resumen.total || 0) / cacIndiceBase).toLocaleString('es-AR')} CAC al crear`
                  : null,
              },
              {
                label: 'COBRADO',
                value: formatCurrency(resumen.cobrado || 0, monedaDisplay),
                borderColor: '#2E7D32',
                subtitle: `${cuotasCobradas} de ${totalCuotas} cuotas`,
                expandable: cuotasCobradas > 0,
              },
              {
                label: 'PENDIENTE',
                value: formatCurrency(pendienteAjustado ?? resumen.pendiente ?? 0, monedaDisplay),
                borderColor: '#D32F2F',
                subtitle: proximaFecha ? `Próxima: ${proximaFecha}` : null,
              },
            ].map((m) => (
              <Grid item xs={12} sm={4} key={m.label}>
                <Paper
                  variant="outlined"
                  onClick={m.expandable ? () => setShowCobradoDetail((v) => !v) : undefined}
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    borderTop: `3px solid ${m.borderColor}`,
                    cursor: m.expandable ? 'pointer' : 'default',
                    '&:hover': m.expandable ? { bgcolor: 'grey.50' } : undefined,
                  }}
                >
                  <Typography variant="overline" color="text.secondary" display="block">
                    {m.label}
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {m.value}
                  </Typography>
                  {m.subtitle && (
                    <Typography variant="caption" color="text.secondary">
                      {m.subtitle}
                    </Typography>
                  )}
                  {m.expandable && (
                    <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center" mt={0.5}>
                      <Typography variant="caption" color="success.main" fontWeight={600}>
                        {showCobradoDetail ? 'Ocultar detalle' : 'Ver detalle'}
                      </Typography>
                      <KeyboardArrowDownIcon
                        sx={{
                          fontSize: 16,
                          color: 'success.main',
                          transition: 'transform 0.2s',
                          transform: showCobradoDetail ? 'rotate(180deg)' : 'none',
                        }}
                      />
                    </Stack>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* A2: detalle de cuotas cobradas que componen el total */}
          <Collapse in={showCobradoDetail} unmountOnExit>
            <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>
                Detalle de lo cobrado
              </Typography>
              <Stack spacing={0.75}>
                {allCuotas
                  .filter((c) => c.monto_cobrado > 0)
                  .sort((a, b) => new Date(a.fecha_cobrado || 0) - new Date(b.fecha_cobrado || 0))
                  .map((c) => {
                    const actualizado = getValorActualizado(c);
                    const mostrarActualizado =
                      actualizado != null && Math.abs(actualizado - (c.monto_cobrado || 0)) > 1;
                    return (
                      <Stack
                        key={c._id}
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}
                      >
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            Cuota {c.numero}
                            {c.estado === 'cobrada_parcial' ? ' (parcial)' : ''}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {c.fecha_cobrado
                              ? `Cobrada: ${new Date(c.fecha_cobrado).toLocaleDateString('es-AR')}`
                              : 'Sin fecha de cobro'}
                            {c.descripcion ? ` · ${c.descripcion}` : ''}
                          </Typography>
                        </Box>
                        <Stack alignItems="flex-end">
                          <Typography variant="body2" fontWeight={700}>
                            {formatCurrency(c.monto_cobrado || 0, monedaDisplay)}
                          </Typography>
                          {mostrarActualizado && (
                            <Typography variant="caption" color="text.secondary">
                              Valor actualizado hoy: {formatCurrency(actualizado, monedaDisplay)}
                            </Typography>
                          )}
                          {(c.movimientos || []).map((m) => (
                            <Typography key={m._id} variant="caption" color="text.secondary">
                              {m.codigo_operacion ? `#${m.codigo_operacion} · ` : ''}
                              {m.fecha ? new Date(m.fecha).toLocaleDateString('es-AR') : 's/f'}
                              {' · '}
                              {formatCurrency(m.monto || 0, m.moneda || monedaDisplay)}
                              {m.proyecto_nombre ? ` · ${m.proyecto_nombre}` : ''}
                            </Typography>
                          ))}
                        </Stack>
                      </Stack>
                    );
                  })}
                <Stack direction="row" justifyContent="space-between" sx={{ pt: 0.5 }}>
                  <Typography variant="body2" fontWeight={700}>Total cobrado</Typography>
                  <Typography variant="body2" fontWeight={700} color="success.main">
                    {formatCurrency(resumen.cobrado || 0, monedaDisplay)}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>
          </Collapse>

          {/* Fase 4: saldo sin asignar (solo plan activo) */}
          {plan.estado === 'activo' && resumen.hay_saldo && (
            <Paper
              variant="outlined"
              sx={{ p: 2, mb: 3, borderRadius: 2, borderColor: '#FFB74D', bgcolor: '#FFF8E1' }}
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1.5}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Saldo sin asignar: {formatCurrency(resumen.saldo_sin_asignar, monedaDisplay)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {resumen.saldo_sin_asignar > 0
                      ? 'El total del plan es mayor a lo distribuido en cuotas.'
                      : 'Las cuotas suman más que el total del plan.'}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button size="small" variant="outlined" onClick={() => setShowAsignarSaldo(true)}>
                    Asignar a una cuota
                  </Button>
                  {resumen.saldo_sin_asignar > 0 && (
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={savingSaldo}
                      onClick={() => runSaldoAction(
                        () => planCobroService.agregarCuotaDesdeSaldo(id, { empresa_id: empresaId }),
                        'Cuota creada con el saldo',
                      )}
                    >
                      Crear cuota nueva
                    </Button>
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    disabled={savingSaldo}
                    onClick={() => runSaldoAction(
                      () => planCobroService.ajustarTotalAlDistribuido(id, empresaId),
                      'Total ajustado a lo distribuido',
                    )}
                  >
                    Achicar plan al distribuido
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          )}

          {/* Historial de anexos */}
          {(plan.anexos || []).length > 0 && (
            <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>Anexos</Typography>
              <Stack spacing={0.5}>
                {(plan.anexos || []).map((a) => (
                  <Stack key={a.id} direction="row" justifyContent="space-between" alignItems="center"
                    sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box>
                      <Typography variant="body2">{a.motivo || 'Anexo'}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {a.fecha ? new Date(a.fecha).toLocaleDateString('es-AR') : ''} · {a.modo === 'nueva_cuota' ? 'cuota nueva' : 'prorrateado'}
                      </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={700} color={a.monto >= 0 ? 'success.main' : 'error.main'}>
                      {a.monto >= 0 ? '+' : ''}{formatCurrency(a.monto, monedaDisplay)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          )}

          {/* Barra de progreso */}
          <Box mb={4}>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2" color="text.secondary">
                Progreso de cobro
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {pct}%{totalCuotas > 0 ? ` (${cuotasCobradas}/${totalCuotas} cuotas)` : ''}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={pct}
              color={plan.estado === 'completado' ? 'success' : resumen.hay_vencidas ? 'error' : 'primary'}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          {/* Estado de cuenta */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle1" fontWeight={600}>
              Estado de cuenta
            </Typography>
            <Stack direction="row" spacing={1}>
              {plan.estado === 'activo' && cuotasAdelantables.length > 0 && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setShowAdelantarCuota(true)}
                >
                  Adelantar cuota
                </Button>
              )}
              {plan.estado === 'activo' && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setAddForm({ monto: '', fecha_vencimiento: '', descripcion: '' });
                    setShowAddCuota(true);
                  }}
                >
                  Agregar cuota
                </Button>
              )}
            </Stack>
          </Stack>

          <Stack spacing={2}>
            {cuotasVencidas.length > 0 && (
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: '#FFF5F5', borderColor: '#F2B8B5' }}>
                <Stack spacing={1.5}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                    <Box>
                      <Typography variant="overline" color="error.main">Cuotas vencidas</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Estas cuotas necesitan atención primero.
                      </Typography>
                    </Box>
                    <Chip color="error" label={`${cuotasVencidas.length} vencida${cuotasVencidas.length > 1 ? 's' : ''}`} size="small" />
                  </Stack>

                  <Stack spacing={1.25}>
                    {cuotasVencidas.map((cuota) => {
                      const esParcial = cuota.estado === 'cobrada_parcial';
                      const montoActual = getMontoCuota(cuota);
                      const restante = esParcial ? montoActual - (cuota.monto_cobrado || 0) : montoActual;
                      return (
                        <Paper key={cuota._id} variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
                          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5}>
                            <Box>
                              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                <Typography variant="subtitle1" fontWeight={700}>Cuota {cuota.numero}</Typography>
                                <Chip size="small" color="error" label={esParcial ? 'Parcial vencida' : 'Vencida'} />
                              </Stack>
                              <Typography variant="body2" color="text.secondary" mt={0.5}>
                                Vencimiento: {cuota.fecha_vencimiento ? new Date(cuota.fecha_vencimiento).toLocaleDateString('es-AR') : 'Sin fecha'}
                                {cuota.descripcion ? ` · ${cuota.descripcion}` : ''}
                              </Typography>
                              {esParcial && (
                                <Typography variant="caption" color="warning.main" display="block" mt={0.5}>
                                  Ya cobrado: {formatCurrency(cuota.monto_cobrado || 0, monedaDisplay)} · Restante: {formatCurrency(restante, monedaDisplay)}
                                </Typography>
                              )}
                            </Box>

                            <Stack alignItems={{ xs: 'flex-start', md: 'flex-end' }} spacing={1}>
                              <Typography variant="h6" fontWeight={700}>{formatCurrency(montoActual, monedaDisplay)}</Typography>
                              <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent={{ md: 'flex-end' }}>
                                <Button
                                  variant="contained"
                                  color="error"
                                  size="small"
                                  onClick={() => handleCobrarClick(cuota._id)}
                                  disabled={cobrandoId === cuota._id}
                                >
                                  {esParcial ? 'Cobrar resto' : 'Cobrar ahora'}
                                </Button>
                                {esParcial && (
                                  <Button
                                    variant="text"
                                    size="small"
                                    color="warning"
                                    onClick={() => handleRevertir(cuota._id)}
                                    disabled={reverting === cuota._id}
                                  >
                                    {reverting === cuota._id ? 'Revirtiendo...' : 'Revertir'}
                                  </Button>
                                )}
                                {!esParcial && (
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<EditIcon fontSize="small" />}
                                    onClick={() => handleEditClick(cuota)}
                                  >
                                    Editar
                                  </Button>
                                )}
                              </Stack>
                            </Stack>
                          </Stack>
                        </Paper>
                      );
                    })}
                  </Stack>
                </Stack>
              </Paper>
            )}

            {cuotaProximaVisible ? (
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, borderColor: '#C9D7FF', bgcolor: '#F8FAFF' }}>
                <Stack spacing={1.5}>
                  <Typography variant="overline" color="primary.main">Próxima cuota</Typography>
                  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography variant="h6" fontWeight={700}>Cuota {cuotaProximaVisible.numero}</Typography>
                        <Chip
                          size="small"
                          color={cuotaProximaVisible.estado === 'cobrada_parcial' ? 'warning' : 'info'}
                          label={cuotaProximaVisible.estado === 'cobrada_parcial' ? 'Pago parcial' : 'Pendiente'}
                        />
                      </Stack>
                      <Typography variant="body1" color="text.secondary" mt={0.5}>
                        {cuotaProximaVisible.fecha_vencimiento
                          ? `Vence el ${new Date(cuotaProximaVisible.fecha_vencimiento).toLocaleDateString('es-AR')}`
                          : 'Sin fecha definida'}
                        {cuotaProximaVisible.descripcion ? ` · ${cuotaProximaVisible.descripcion}` : ''}
                      </Typography>
                      {cuotaProximaVisible.estado === 'cobrada_parcial' && (
                        <Typography variant="caption" color="warning.main" display="block" mt={0.75}>
                          Ya cobrado: {formatCurrency(cuotaProximaVisible.monto_cobrado || 0, monedaDisplay)}
                        </Typography>
                      )}
                    </Box>

                    <Stack alignItems={{ xs: 'flex-start', md: 'flex-end' }} spacing={1}>
                      <Typography variant="h4" fontWeight={800}>
                        {formatCurrency(getMontoCuota(cuotaProximaVisible), monedaDisplay)}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent={{ md: 'flex-end' }}>
                        <Button
                          variant="contained"
                          color="success"
                          onClick={() => handleCobrarClick(cuotaProximaVisible._id)}
                          disabled={cobrandoId === cuotaProximaVisible._id}
                          startIcon={cobrandoId === cuotaProximaVisible._id ? <CircularProgress size={14} color="inherit" /> : <CheckCircleIcon fontSize="small" />}
                        >
                          {cuotaProximaVisible.estado === 'cobrada_parcial' ? 'Cobrar resto' : 'Cobrar cuota'}
                        </Button>
                        {cuotaProximaVisible.estado === 'cobrada_parcial' ? (
                          <Button
                            variant="text"
                            color="warning"
                            onClick={() => handleRevertir(cuotaProximaVisible._id)}
                            disabled={reverting === cuotaProximaVisible._id}
                          >
                            {reverting === cuotaProximaVisible._id ? 'Revirtiendo...' : 'Revertir'}
                          </Button>
                        ) : (
                          <Button
                            variant="outlined"
                            startIcon={<EditIcon fontSize="small" />}
                            onClick={() => handleEditClick(cuotaProximaVisible)}
                          >
                            Editar
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                  </Stack>
                </Stack>
              </Paper>
            ) : (
              cuotasVencidas.length === 0 && (
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: '#F6FFF8', borderColor: '#B7E1C0' }}>
                  <Typography variant="body1" fontWeight={700} color="success.main">
                    No hay cuotas pendientes para cobrar.
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    El plan no tiene vencimientos próximos en este momento.
                  </Typography>
                </Paper>
              )
            )}

            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5} mb={1.5}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={700}>Resto del cronograma</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Vista compacta del resto de cuotas del plan.
                  </Typography>
                </Box>
                {plan.estado === 'activo' && cuotasAdelantables.length > 0 && (
                  <Button variant="outlined" size="small" onClick={() => setShowAdelantarCuota(true)}>
                    Adelantar cuota
                  </Button>
                )}
              </Stack>

              <Stack spacing={1}>
                {cuotasResto.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No quedan más cuotas para mostrar.
                  </Typography>
                ) : cuotasResto.map((cuota) => {
                  const estadoUi = cuota.estado_ui || cuota.estado;
                  const esCobrada = cuota.estado === 'cobrada';
                  const esParcial = cuota.estado === 'cobrada_parcial';
                  const estadoLabel = estadoUi === 'cobrada'
                    ? 'Cobrada'
                    : estadoUi === 'cobrada_parcial'
                      ? 'Parcial'
                      : estadoUi === 'cobrada_parcial_vencida'
                        ? 'Parcial vencida'
                        : estadoUi === 'vencida'
                          ? 'Vencida'
                          : 'Pendiente';
                  const estadoColor = estadoUi === 'cobrada'
                    ? 'success'
                    : estadoUi === 'cobrada_parcial' || estadoUi === 'cobrada_parcial_vencida'
                      ? 'warning'
                      : estadoUi === 'vencida'
                        ? 'error'
                        : 'default';
                  return (
                    <Paper key={cuota._id} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'grey.50' }}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} alignItems={{ sm: 'center' }}>
                        <Box>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            <Typography variant="body2" fontWeight={700}>Cuota {cuota.numero}</Typography>
                            <Chip size="small" color={estadoColor} label={estadoLabel} />
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            {cuota.fecha_vencimiento ? new Date(cuota.fecha_vencimiento).toLocaleDateString('es-AR') : 'Sin fecha'}
                            {cuota.descripcion ? ` · ${cuota.descripcion}` : ''}
                          </Typography>
                        </Box>
                        <Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }} spacing={0.75}>
                          {(() => {
                            const actualizado = getValorActualizado(cuota);
                            const mostrarTooltip =
                              actualizado != null && Math.abs(actualizado - (cuota.monto_cobrado || 0)) > 1;
                            const montoTxt = (
                              <Typography variant="body2" fontWeight={700}>
                                {formatCurrency(getMontoDisplay(cuota), monedaDisplay)}
                              </Typography>
                            );
                            return mostrarTooltip ? (
                              <Tooltip title={`Valor actualizado a hoy: ${formatCurrency(actualizado, monedaDisplay)}`}>
                                {montoTxt}
                              </Tooltip>
                            ) : montoTxt;
                          })()}
                          {plan.estado === 'activo' && (
                            <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent={{ sm: 'flex-end' }}>
                              {esCobrada || esParcial ? (
                                <Button
                                  variant="text"
                                  size="small"
                                  color="warning"
                                  onClick={() => handleRevertir(cuota._id)}
                                  disabled={reverting === cuota._id}
                                >
                                  {reverting === cuota._id ? 'Revirtiendo...' : 'Revertir'}
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    variant="text"
                                    size="small"
                                    onClick={() => handleEditClick(cuota)}
                                  >
                                    Editar
                                  </Button>
                                  <Button
                                    variant="text"
                                    size="small"
                                    color="error"
                                    onClick={() => setDeleteCuota(cuota)}
                                  >
                                    Eliminar
                                  </Button>
                                </>
                              )}
                            </Stack>
                          )}
                        </Stack>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            </Paper>
          </Stack>
        </Container>
      </Box>

      {/* Diálogo confirmar cobrar (total o parcial) */}
      <Dialog open={!!confirmCobrar} onClose={() => setConfirmCobrar(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Registrar cobro</DialogTitle>
        <DialogContent>
          {(() => {
            const montoActual = getMontoCuota(confirmCobrar);
            const montoRestante = montoActual - (confirmCobrar?.monto_cobrado || 0);
            const yaParcial = confirmCobrar?.estado === 'cobrada_parcial';
            return (
              <>
                <DialogContentText sx={{ mb: 2 }}>
                  Cuota #{confirmCobrar?.numero} — Monto: <strong>{formatCurrency(montoActual, monedaDisplay)}</strong>
                  {confirmCobrar?.fecha_vencimiento && (
                    <> (Vto: {new Date(confirmCobrar.fecha_vencimiento).toLocaleDateString('es-AR')})</>
                  )}
                  {yaParcial && (
                    <>
                      <br />
                      Ya cobrado: <strong>{formatCurrency(confirmCobrar?.monto_cobrado || 0, monedaDisplay)}</strong>
                      {' '}— Restante: <strong>{formatCurrency(montoRestante, monedaDisplay)}</strong>
                    </>
                  )}
                </DialogContentText>

                <ToggleButtonGroup
                  value={tipoCobro}
                  exclusive
                  onChange={(_, val) => {
                    if (val) { setTipoCobro(val); setMontoParcial(''); }
                  }}
                  size="small"
                  sx={{ mb: 2 }}
                >
                  <ToggleButton value="total">{yaParcial ? 'Cobrar todo el resto' : 'Cobro total'}</ToggleButton>
                  <ToggleButton value="parcial">Pago parcial</ToggleButton>
                </ToggleButtonGroup>

                {tipoCobro === 'parcial' && (
                  <TextField
                    label="Monto a cobrar"
                    value={formatNumberInput(montoParcial)}
                    onChange={(e) => setMontoParcial(parseNumberInput(e.target.value))}
                    fullWidth
                    size="small"
                    sx={{ mt: 1 }}
                    inputProps={{ inputMode: 'decimal' }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                    helperText={
                      montoParcial && montoRestante
                        ? `Resto después de este pago: ${formatCurrency(Math.max(0, montoRestante - (Number(montoParcial) || 0)), monedaDisplay)}`
                        : ''
                    }
                  />
                )}

                {/* Modo: crear ingreso, vincular uno existente, o solo estado */}
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
                  ¿Cómo lo registramos?
                </Typography>
                <ToggleButtonGroup
                  value={modoCobro}
                  exclusive
                  onChange={(_, val) => { if (val) { setModoCobro(val); setMovSel(null); } }}
                  size="small"
                  sx={{ mt: 0.5, flexWrap: 'wrap' }}
                >
                  <ToggleButton value="nuevo">Nuevo ingreso</ToggleButton>
                  <ToggleButton value="vincular">Vincular pago existente</ToggleButton>
                  <ToggleButton value="solo_estado">Solo marcar</ToggleButton>
                </ToggleButtonGroup>

                {modoCobro === 'vincular' && (
                  <Box sx={{ mt: 1.5, maxHeight: 200, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    {movVinculables.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>
                        No hay ingresos sin vincular.
                      </Typography>
                    ) : movVinculables.map((m) => (
                      <Stack
                        key={m._id}
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        onClick={() => setMovSel(m)}
                        sx={{ px: 1.5, py: 1, cursor: 'pointer', bgcolor: movSel?._id === m._id ? 'primary.50' : 'transparent', borderBottom: '1px solid', borderColor: 'divider' }}
                      >
                        <Box>
                          <Typography variant="body2" fontWeight={movSel?._id === m._id ? 700 : 500}>
                            {m.codigo_operacion ? `#${m.codigo_operacion} · ` : ''}{formatCurrency(m.monto || 0, m.moneda || monedaDisplay)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {m.fecha ? new Date(m.fecha).toLocaleDateString('es-AR') : 's/f'}{m.detalle ? ` · ${m.detalle}` : ''}
                          </Typography>
                        </Box>
                        {movSel?._id === m._id && <CheckCircleIcon color="primary" fontSize="small" />}
                      </Stack>
                    ))}
                  </Box>
                )}

                <Typography variant="body2" color="text.secondary" mt={2}>
                  {modoCobro === 'nuevo'
                    ? 'Se registrará un movimiento de caja automáticamente.'
                    : modoCobro === 'vincular'
                      ? 'Se vinculará el pago ya cargado, sin duplicar el ingreso.'
                      : 'Se marcará como cobrada sin generar movimiento de caja.'}
                </Typography>
              </>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmCobrar(null)}>Cancelar</Button>
          <Button
            color="success"
            variant="contained"
            onClick={handleCobrarConfirm}
            disabled={
              (tipoCobro === 'parcial' && (!montoParcial || Number(montoParcial) <= 0)) ||
              (modoCobro === 'vincular' && !movSel)
            }
          >
            {modoCobro === 'solo_estado' ? 'Marcar cobrada' : tipoCobro === 'parcial' ? 'Cobrar parcial' : 'Confirmar cobro'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showAdelantarCuota} onClose={() => setShowAdelantarCuota(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adelantar cuota</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Elegí qué cuota futura querés cobrar ahora. Después vas a poder registrar el cobro total o parcial.
          </DialogContentText>
          <Stack spacing={1.25}>
            {cuotasAdelantables.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No hay cuotas disponibles para adelantar.
              </Typography>
            ) : cuotasAdelantables.map((cuota) => (
              <Paper key={cuota._id} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5} alignItems={{ sm: 'center' }}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700}>
                      Cuota {cuota.numero}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {cuota.fecha_vencimiento ? new Date(cuota.fecha_vencimiento).toLocaleDateString('es-AR') : 'Sin fecha'}
                      {cuota.descripcion ? ` · ${cuota.descripcion}` : ''}
                    </Typography>
                  </Box>
                  <Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }} spacing={0.75}>
                    <Typography variant="body2" fontWeight={700}>
                      {formatCurrency(getMontoCuota(cuota), monedaDisplay)}
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => {
                        setShowAdelantarCuota(false);
                        handleCobrarClick(cuota._id);
                      }}
                    >
                      Seleccionar
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAdelantarCuota(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo editar cuota */}
      <Dialog open={!!editCuota} onClose={() => setEditCuota(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Editar cuota</DialogTitle>
        <DialogContent>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ mb: 2, mt: 1, p: 1.5, bgcolor: '#FFF8E1', border: '1px solid #FFE082', borderRadius: 1 }}
          >
            <WarningAmberIcon sx={{ color: '#F9A825', fontSize: 20 }} />
            <Typography variant="body2">
              Modificar el monto de esta cuota cambia el total del plan de cobros.
            </Typography>
          </Stack>

          <Stack spacing={2}>
            {plan?.indexacion === 'CAC' && editCuota?.monto_cac ? (
              (() => {
                const refEfectivo = editCacRef || cacIndiceBase;
                return (
              <Stack spacing={1.5}>
                <TextField
                  label="Unidades CAC *"
                  value={editCacInput}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^\d.,]/g, '');
                    setEditCacInput(raw);
                    const num = parseFloat(raw.replace(',', '.'));
                    if (!isNaN(num) && refEfectivo) {
                      setEditForm((f) => ({ ...f, monto: String(Math.round(num * refEfectivo * 100) / 100) }));
                    }
                  }}
                  fullWidth
                  size="small"
                  inputProps={{ inputMode: 'decimal' }}
                  InputProps={{ endAdornment: <InputAdornment position="end">CAC</InputAdornment> }}
                />
                <TextField
                  label="Equivalente en ARS"
                  value={formatNumberInput(editForm.monto)}
                  onChange={(e) => {
                    const raw = parseNumberInput(e.target.value);
                    setEditForm((f) => ({ ...f, monto: raw }));
                    const num = parseFloat(raw);
                    if (!isNaN(num) && refEfectivo) {
                      setEditCacInput(String(Math.round((num / refEfectivo) * 100) / 100));
                    }
                  }}
                  fullWidth
                  size="small"
                  inputProps={{ inputMode: 'decimal' }}
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                  helperText={
                    refEfectivo
                      ? `Índice CAC de referencia: ${refEfectivo.toLocaleString('es-AR')}${editCacRef ? ' (personalizado)' : ' (base del plan)'}`
                      : 'Índice CAC base no disponible'
                  }
                />
                <TextField
                  label="Fijar índice por mes (opcional)"
                  type="month"
                  value={editCacRefMes}
                  onChange={(e) => handleEditCacRefMes(e.target.value)}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  helperText="Usa el valor de CAC publicado de ese mes como referencia de la cuota"
                />
                {editCacRef && (
                  <Button size="small" onClick={() => { setEditCacRef(null); setEditCacRefMes(''); const p = parseFloat(parseNumberInput(editForm.monto)); if (!isNaN(p) && cacIndiceBase) setEditCacInput(String(Math.round((p / cacIndiceBase) * 100) / 100)); }}>
                    Volver al índice base del plan
                  </Button>
                )}
              </Stack>
                );
              })()
            ) : (
              <TextField
                label="Monto *"
                value={formatNumberInput(editForm.monto)}
                onChange={(e) => setEditForm((f) => ({ ...f, monto: parseNumberInput(e.target.value) }))}
                fullWidth
                size="small"
                inputProps={{ inputMode: 'decimal' }}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              />
            )}
            <TextField
              label="Fecha de vencimiento"
              type="date"
              value={editForm.fecha_vencimiento}
              onChange={(e) => setEditForm((f) => ({ ...f, fecha_vencimiento: e.target.value }))}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Descripción"
              value={editForm.descripcion}
              onChange={(e) => setEditForm((f) => ({ ...f, descripcion: e.target.value }))}
              fullWidth
              size="small"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditCuota(null)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleEditConfirm}
            disabled={!editForm.monto || Number(parseNumberInput(editForm.monto)) <= 0}
          >
            Guardar cambios
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo eliminar cuota */}
      <Dialog open={!!deleteCuota} onClose={() => setDeleteCuota(null)}>
        <DialogTitle>Eliminar cuota</DialogTitle>
        <DialogContent>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ mb: 2, p: 1.5, bgcolor: '#FFF8E1', border: '1px solid #FFE082', borderRadius: 1 }}
          >
            <WarningAmberIcon sx={{ color: '#F9A825', fontSize: 20 }} />
            <Typography variant="body2">
              Al eliminar esta cuota se modifica el valor total del plan de cobros.
            </Typography>
          </Stack>
          <DialogContentText>
            ¿Eliminar la cuota #{deleteCuota?.numero} por{' '}
            <strong>{formatCurrency(deleteCuota?.monto || 0, monedaDisplay)}</strong>?
            Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteCuota(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleDeleteConfirm}>
            Eliminar cuota
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo agregar cuota */}
      <Dialog open={showAddCuota} onClose={() => setShowAddCuota(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Agregar cuota</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {addIndiceBase ? (
              <>
                <TextField
                  label={`Unidades ${addUnidadLabel}`}
                  value={addUnidades}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^\d.,]/g, '');
                    setAddUnidades(raw);
                    const num = parseFloat(raw.replace(',', '.'));
                    if (!isNaN(num)) setAddForm((f) => ({ ...f, monto: String(Math.round(num * addIndiceBase * 100) / 100) }));
                  }}
                  fullWidth
                  size="small"
                  inputProps={{ inputMode: 'decimal' }}
                  InputProps={{ endAdornment: <InputAdornment position="end">{addUnidadLabel}</InputAdornment> }}
                />
                <TextField
                  label="Equivalente en ARS (índice base)"
                  value={formatNumberInput(addForm.monto)}
                  onChange={(e) => {
                    const raw = parseNumberInput(e.target.value);
                    setAddForm((f) => ({ ...f, monto: raw }));
                    const num = parseFloat(raw);
                    if (!isNaN(num)) setAddUnidades(String(Math.round((num / addIndiceBase) * 100) / 100));
                  }}
                  fullWidth
                  size="small"
                  inputProps={{ inputMode: 'decimal' }}
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                  helperText={`Índice base del plan: ${addIndiceBase.toLocaleString('es-AR')}. En la lista se muestra el equivalente al índice de hoy.`}
                />
              </>
            ) : (
              <TextField
                label="Monto *"
                value={formatNumberInput(addForm.monto)}
                onChange={(e) => setAddForm((f) => ({ ...f, monto: parseNumberInput(e.target.value) }))}
                fullWidth
                size="small"
                inputProps={{ inputMode: 'decimal' }}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              />
            )}
            <TextField
              label="Fecha de vencimiento"
              type="date"
              value={addForm.fecha_vencimiento}
              onChange={(e) => setAddForm((f) => ({ ...f, fecha_vencimiento: e.target.value }))}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Descripción"
              value={addForm.descripcion}
              onChange={(e) => setAddForm((f) => ({ ...f, descripcion: e.target.value }))}
              fullWidth
              size="small"
              placeholder="Ej: Certificado adicional"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddCuota(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleAddConfirm}
            disabled={!addForm.monto || Number(parseNumberInput(addForm.monto)) <= 0}
          >
            Agregar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo confirmar eliminación */}
      <Dialog open={confirmEliminar} onClose={() => setConfirmEliminar(false)}>
        <DialogTitle>Eliminar plan</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que querés eliminar el plan &ldquo;{plan.nombre}&rdquo;? Esta acción no
            se puede deshacer.
          </DialogContentText>
          {(plan.estado === 'activo' || plan.estado === 'completado') &&
            (plan.cuotas || []).some((c) => c.estado === 'cobrada' || c.estado === 'cobrada_parcial') && (
            <DialogContentText sx={{ mt: 1.5, color: 'error.main', fontWeight: 500 }}>
              Este plan tiene cuotas cobradas. Se eliminarán también los movimientos de caja asociados.
            </DialogContentText>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmEliminar(false)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleEliminar}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Fase 4: editar total del plan activo */}
      <Dialog open={showEditTotal} onClose={() => setShowEditTotal(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Editar total del plan</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            La diferencia con lo ya distribuido en cuotas quedará como <strong>saldo sin asignar</strong>.
            Las cuotas ya cobradas no se modifican.
          </DialogContentText>
          <TextField
            label="Nuevo total"
            value={formatNumberInput(editTotalValue)}
            onChange={(e) => setEditTotalValue(parseNumberInput(e.target.value))}
            fullWidth
            size="small"
            autoFocus
            inputProps={{ inputMode: 'decimal' }}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEditTotal(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleEditTotalConfirm} disabled={savingSaldo || !editTotalValue}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Anexo: agregado con recálculo */}
      <Dialog open={showAnexo} onClose={() => setShowAnexo(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Agregar anexo</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Un anexo suma (o resta) al total del plan y queda en el historial. Elegí cómo distribuirlo.
          </DialogContentText>
          <Stack spacing={2}>
            <TextField
              label="Monto del anexo"
              value={formatNumberInput(anexoForm.monto)}
              onChange={(e) => setAnexoForm((f) => ({ ...f, monto: parseNumberInput(e.target.value) }))}
              fullWidth size="small" autoFocus
              inputProps={{ inputMode: 'decimal' }}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              helperText="Podés usar negativos para reducir el alcance."
            />
            <ToggleButtonGroup
              value={anexoForm.modo}
              exclusive
              size="small"
              onChange={(_, v) => { if (v) setAnexoForm((f) => ({ ...f, modo: v })); }}
            >
              <ToggleButton value="prorratear">Prorratear en pendientes</ToggleButton>
              <ToggleButton value="nueva_cuota">Crear cuota nueva</ToggleButton>
            </ToggleButtonGroup>
            <TextField
              label="Motivo"
              value={anexoForm.motivo}
              onChange={(e) => setAnexoForm((f) => ({ ...f, motivo: e.target.value }))}
              fullWidth size="small"
              placeholder="Ej: ampliación de obra"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAnexo(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleAnexoConfirm} disabled={savingSaldo || !anexoForm.monto}>
            Aplicar anexo
          </Button>
        </DialogActions>
      </Dialog>

      {/* Fase 5: aplicar ajuste manual a las cuotas pendientes */}
      <Dialog open={showAjuste} onClose={() => setShowAjuste(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Aplicar ajuste a cuotas pendientes</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Se reajustan solo las cuotas pendientes por el porcentaje indicado. Las cuotas cobradas no se tocan.
          </DialogContentText>
          <TextField
            label="Porcentaje de ajuste"
            value={ajustePct}
            onChange={(e) => setAjustePct(e.target.value.replace(/[^\d.,-]/g, ''))}
            fullWidth
            size="small"
            autoFocus
            inputProps={{ inputMode: 'decimal' }}
            InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
            helperText="Ej.: 10 para +10%. Podés usar negativos."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAjuste(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleAplicarAjuste} disabled={savingSaldo || ajustePct === ''}>
            Aplicar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Fase 4: asignar el saldo a una cuota pendiente */}
      <Dialog open={showAsignarSaldo} onClose={() => setShowAsignarSaldo(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Asignar saldo a una cuota</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Se sumará el saldo ({formatCurrency(resumen.saldo_sin_asignar || 0, monedaDisplay)}) al monto de la cuota elegida.
          </DialogContentText>
          <Stack spacing={1}>
            {(plan.cuotas || [])
              .filter((c) => c.estado !== 'cobrada' && c.estado !== 'cobrada_parcial')
              .map((c) => (
                <Button
                  key={c._id}
                  variant="outlined"
                  disabled={savingSaldo}
                  onClick={() => runSaldoAction(
                    () => planCobroService.asignarSaldoACuota(id, c._id, empresaId),
                    'Saldo asignado a la cuota',
                  )}
                  sx={{ justifyContent: 'space-between' }}
                >
                  <span>Cuota {c.numero}</span>
                  <span>{formatCurrency(getMontoCuota(c), monedaDisplay)}</span>
                </Button>
              ))}
            {(plan.cuotas || []).filter((c) => c.estado !== 'cobrada' && c.estado !== 'cobrada_parcial').length === 0 && (
              <Typography variant="body2" color="text.secondary">No hay cuotas pendientes para asignar.</Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAsignarSaldo(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert((a) => ({ ...a, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={alert.severity} onClose={() => setAlert((a) => ({ ...a, open: false }))}>
          {alert.message}
        </Alert>
      </Snackbar>
    </>
  );
};

DetallePlanPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default DetallePlanPage;
