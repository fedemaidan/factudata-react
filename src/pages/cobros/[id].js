import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Skeleton,
  Snackbar,
  Alert,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { usePlanCobro } from 'src/hooks/usePlanCobro';
import { CuotasTableReadonly } from 'src/components/planCobro/CuotasTable';
import { formatCurrency } from 'src/utils/formatters';
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

  useEffect(() => {
    if (!user) return;
    getEmpresaDetailsFromUser(user).then((empresa) => {
      if (empresa?.id) setEmpresaId(empresa.id);
    });
  }, [user]);

  const { plan, loading, error, refresh, confirmarPlan, marcarCobrada, revertirCobro } = usePlanCobro(
    id || null,
    empresaId
  );

  useEffect(() => {
    if (error) setAlert({ open: true, message: 'Error al cargar el plan', severity: 'error' });
  }, [error]);

  const handleCobrarClick = (cuotaId) => {
    const cuota = (plan.cuotas || []).find((c) => c._id === cuotaId);
    setConfirmCobrar(cuota || { _id: cuotaId });
  };

  const handleCobrarConfirm = async () => {
    if (!confirmCobrar) return;
    const cuotaId = confirmCobrar._id;
    setConfirmCobrar(null);
    setCobrandoId(cuotaId);
    try {
      const updated = await marcarCobrada(cuotaId, { fecha_cobrado: new Date().toISOString().split('T')[0] });
      const msg = updated?.movimiento_caja_id
        ? 'Cuota cobrada. Movimiento de caja registrado.'
        : 'Cuota marcada como cobrada.';
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
      setAlert({ open: true, message: 'Cobro revertido correctamente', severity: 'success' });
    } catch (err) {
      setAlert({ open: true, message: err.message || 'Error al revertir', severity: 'error' });
    } finally {
      setReverting(null);
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
  const pct =
    resumen.total > 0 ? Math.round(((resumen.cobrado || 0) / resumen.total) * 100) : 0;

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
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="h5" fontWeight={700}>
                  {plan.nombre}
                </Typography>
                {plan.codigo && (
                  <Typography variant="body2" color="text.secondary">
                    #{plan.codigo}
                  </Typography>
                )}
                <Chip
                  label={ESTADO_LABEL[plan.estado] || plan.estado}
                  color={ESTADO_COLOR[plan.estado] || 'default'}
                  size="small"
                />
              </Stack>
              {/* Subtitle with project & index info */}
              <Stack direction="row" spacing={2} mt={0.5} flexWrap="wrap" useFlexGap>
                {plan.proyecto_nombre && (
                  <Typography variant="body2" color="text.secondary">
                    Proyecto: {plan.proyecto_nombre}
                  </Typography>
                )}
                {plan.indexacion && (
                  <Tooltip title={plan.cac_tipo ? `Tipo: ${plan.cac_tipo}` : ''}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <InfoOutlinedIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        Indexación: {plan.indexacion}
                        {plan.cac_tipo && plan.indexacion === 'CAC' ? ` (${plan.cac_tipo})` : ''}
                      </Typography>
                    </Stack>
                  </Tooltip>
                )}
                {plan.moneda && (
                  <Typography variant="body2" color="text.secondary">
                    Moneda: {plan.moneda}
                  </Typography>
                )}
              </Stack>
              {plan.notas && (
                <Typography variant="body2" color="text.secondary" mt={0.5}>
                  {plan.notas}
                </Typography>
              )}
            </Box>

            <Stack direction="row" spacing={1}>
              {plan.estado !== 'completado' && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PictureAsPdfIcon />}
                  onClick={handleExportarPDF}
                >
                  PDF
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
              {plan.estado === 'activo' && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PictureAsPdfIcon />}
                  onClick={handleExportarPDF}
                >
                  PDF
                </Button>
              )}
              {plan.estado === 'borrador' && (
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<DeleteIcon />}
                  onClick={() => setConfirmEliminar(true)}
                >
                  Eliminar
                </Button>
              )}
            </Stack>
          </Stack>

          {/* Métricas */}
          <Grid container spacing={2} mb={3}>
            {[
              { label: 'Total', value: formatCurrency(resumen.total || 0, monedaDisplay) },
              { label: 'Cobrado', value: formatCurrency(resumen.cobrado || 0, monedaDisplay), color: 'success.main' },
              { label: 'Pendiente', value: formatCurrency(resumen.pendiente || 0, monedaDisplay), color: resumen.hay_vencidas ? 'error.main' : undefined },
            ].map((m) => (
              <Grid item xs={12} sm={4} key={m.label}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {m.label}
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color={m.color}>
                    {m.value}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Barra de progreso */}
          <Box mb={3}>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2" color="text.secondary">
                Progreso de cobro
              </Typography>
              <Typography variant="body2">{pct}%</Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={pct}
              color={plan.estado === 'completado' ? 'success' : resumen.hay_vencidas ? 'error' : 'primary'}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Cuotas */}
          <Typography variant="subtitle1" fontWeight={600} mb={2}>
            Cuotas
          </Typography>

          <CuotasTableReadonly
            cuotas={plan.cuotas || []}
            moneda={plan.moneda}
            onMarcarCobrada={plan.estado === 'activo' ? handleCobrarClick : undefined}
            onRevertirCobro={plan.estado === 'activo' ? handleRevertir : undefined}
            loadingId={cobrandoId}
            revertingId={reverting}
            showCAC={!!plan.indexacion}
          />
        </Container>
      </Box>

      {/* Diálogo confirmar cobrar */}
      <Dialog open={!!confirmCobrar} onClose={() => setConfirmCobrar(null)}>
        <DialogTitle>Confirmar cobro</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Marcar como cobrada la cuota #{confirmCobrar?.numero} por{' '}
            <strong>{formatCurrency(confirmCobrar?.monto || 0, monedaDisplay)}</strong>?
            {confirmCobrar?.fecha_vencimiento && (
              <> (Vto: {new Date(confirmCobrar.fecha_vencimiento).toLocaleDateString('es-AR')})</>
            )}
            <br />
            Se registrará un movimiento de caja automáticamente.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmCobrar(null)}>Cancelar</Button>
          <Button color="success" variant="contained" onClick={handleCobrarConfirm}>
            Confirmar cobro
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmEliminar(false)}>Cancelar</Button>
          <Button color="error" onClick={handleEliminar}>
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
