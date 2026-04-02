import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
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

  // Edit cuota dialog
  const [editCuota, setEditCuota] = useState(null); // cuota object or null
  const [editForm, setEditForm] = useState({ monto: '', fecha_vencimiento: '', descripcion: '' });
  const [editCacInput, setEditCacInput] = useState(''); // CAC units input para planes indexados

  // Delete cuota dialog
  const [deleteCuota, setDeleteCuota] = useState(null);
  const [showAdelantarCuota, setShowAdelantarCuota] = useState(false);

  // Add cuota dialog
  const [showAddCuota, setShowAddCuota] = useState(false);
  const [addForm, setAddForm] = useState({ monto: '', fecha_vencimiento: '', descripcion: '' });
  // CAC actual para planes indexados — se usa para calcular el valor en pesos ajustado
  const [cacActual, setCacActual] = useState(null);
  const [usdActual, setUsdActual] = useState(null);

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

  const handleCobrarClick = (cuotaId) => {
    const cuota = (plan.cuotas || []).find((c) => c._id === cuotaId);
    setConfirmCobrar(cuota || { _id: cuotaId });
    const restante = cuota ? cuota.monto - (cuota.monto_cobrado || 0) : 0;
    // If cuota is partially paid, default to paying the rest in full
    if (cuota && cuota.estado === 'cobrada_parcial') {
      setTipoCobro('total');
    } else {
      setTipoCobro('total');
    }
    setMontoParcial('');
  };

  const handleCobrarConfirm = async () => {
    if (!confirmCobrar) return;
    const cuotaId = confirmCobrar._id;
    const parcial = tipoCobro === 'parcial' ? parseNumberInput(montoParcial) : null;
    if (tipoCobro === 'parcial' && (!parcial || Number(parcial) <= 0)) return;
    setConfirmCobrar(null);
    setCobrandoId(cuotaId);
    try {
      await marcarCobrada(cuotaId, {
        fecha_cobrado: new Date().toISOString().split('T')[0],
        monto_parcial: parcial ? Number(parcial) : undefined,
      });
      await refresh();
      const msg = tipoCobro === 'parcial'
        ? 'Pago parcial registrado.'
        : 'Cuota cobrada. Movimiento de caja registrado.';
      setAlert({ open: true, message: msg, severity: 'success' });
    } catch (err) {
      setAlert({ open: true, message: err.message || 'Error al marcar cuota', severity: 'error' });
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
    // Para planes CAC usamos el monto ajustado al índice actual; si no cargó aún, usamos nominal
    const esCac = plan?.indexacion === 'CAC' && cuota.monto_cac;
    const montoArs = esCac ? getMontoCuota(cuota) : (cuota.monto || 0);
    setEditForm({
      monto: String(montoArs),
      fecha_vencimiento: cuota.fecha_vencimiento
        ? new Date(cuota.fecha_vencimiento).toISOString().split('T')[0]
        : '',
      descripcion: cuota.descripcion || '',
    });
    setEditCacInput(esCac ? String(Math.round(cuota.monto_cac * 100) / 100) : '');
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
        fecha_vencimiento: editForm.fecha_vencimiento || undefined,
        descripcion: editForm.descripcion || undefined,
      });
      setEditCuota(null);
      setAlert({ open: true, message: 'Cuota actualizada', severity: 'success' });
    } catch (err) {
      setAlert({ open: true, message: err.message || 'Error al editar cuota', severity: 'error' });
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
    try {
      await agregarCuota({
        monto: Number(montoNum),
        fecha_vencimiento: addForm.fecha_vencimiento || undefined,
        descripcion: addForm.descripcion || undefined,
      });
      setShowAddCuota(false);
      setAddForm({ monto: '', fecha_vencimiento: '', descripcion: '' });
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

  // Totales ajustados por CAC actual (cuando el plan es indexado y cacActual está disponible)
  const totalAjustado = (showCAC && cacActual)
    ? allCuotas.reduce((acc, c) => acc + getMontoCuota(c), 0)
    : null;
  const pendienteAjustado = (showCAC && cacActual)
    ? allCuotas.filter((c) => c.estado !== 'cobrada').reduce((acc, c) => acc + getMontoCuota(c), 0)
    : null;

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
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    borderTop: `3px solid ${m.borderColor}`,
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
                </Paper>
              </Grid>
            ))}
          </Grid>

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
                          <Typography variant="body2" fontWeight={700}>
                            {formatCurrency(getMontoCuota(cuota), monedaDisplay)}
                          </Typography>
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

                <Typography variant="body2" color="text.secondary" mt={2}>
                  Se registrará un movimiento de caja automáticamente.
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
            disabled={tipoCobro === 'parcial' && (!montoParcial || Number(montoParcial) <= 0)}
          >
            {tipoCobro === 'parcial' ? 'Cobrar parcial' : 'Confirmar cobro'}
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
              <Stack spacing={1.5}>
                <TextField
                  label="Unidades CAC *"
                  value={editCacInput}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^\d.,]/g, '');
                    setEditCacInput(raw);
                    const num = parseFloat(raw.replace(',', '.'));
                    if (!isNaN(num) && cacActual) {
                      setEditForm((f) => ({ ...f, monto: String(Math.round(num * cacActual * 100) / 100) }));
                    }
                  }}
                  fullWidth
                  size="small"
                  inputProps={{ inputMode: 'decimal' }}
                  InputProps={{ endAdornment: <InputAdornment position="end">CAC</InputAdornment> }}
                />
                <TextField
                  label={cacActual ? 'Equivalente en ARS (índice actual)' : 'Equivalente en ARS (nominal)'}
                  value={formatNumberInput(editForm.monto)}
                  onChange={(e) => {
                    const raw = parseNumberInput(e.target.value);
                    setEditForm((f) => ({ ...f, monto: raw }));
                    const num = parseFloat(raw);
                    if (!isNaN(num) && cacActual) {
                      setEditCacInput(String(Math.round((num / cacActual) * 100) / 100));
                    }
                  }}
                  fullWidth
                  size="small"
                  inputProps={{ inputMode: 'decimal' }}
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                  helperText={cacActual ? `Índice CAC actual: ${cacActual.toLocaleString('es-AR')}` : 'Índice CAC no cargado'}
                />
              </Stack>
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
            <TextField
              label="Monto *"
              value={formatNumberInput(addForm.monto)}
              onChange={(e) => setAddForm((f) => ({ ...f, monto: parseNumberInput(e.target.value) }))}
              fullWidth
              size="small"
              inputProps={{ inputMode: 'decimal' }}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            />
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
