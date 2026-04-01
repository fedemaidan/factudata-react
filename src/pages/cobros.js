import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
  Skeleton,
  Stack,
  TextField,
  Typography,
  Snackbar,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import InboxIcon from '@mui/icons-material/Inbox';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { getProyectosFromUser } from 'src/services/proyectosService';
import { usePlanesCobroList } from 'src/hooks/usePlanCobro';
import PlanCobroCard from 'src/components/planCobro/PlanCobroCard';
import planCobroService from 'src/services/planCobroService';

const SORT_OPTIONS = [
  { value: 'reciente', label: 'Más recientes' },
  { value: 'proxima_cuota', label: 'Próxima cuota' },
  { value: 'monto', label: 'Mayor monto' },
];

const sortPlanes = (planes, sortBy) => {
  const sorted = [...planes];
  switch (sortBy) {
    case 'proxima_cuota':
      return sorted.sort((a, b) => {
        const fa = a.resumen?.proxima_cuota?.fecha_vencimiento || '9999';
        const fb = b.resumen?.proxima_cuota?.fecha_vencimiento || '9999';
        return fa.localeCompare(fb);
      });
    case 'monto':
      return sorted.sort((a, b) => (b.resumen?.total || 0) - (a.resumen?.total || 0));
    case 'reciente':
    default:
      return sorted.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }
};

const CobrosList = () => {
  const { user } = useAuthContext();
  const router = useRouter();
  const [empresaId, setEmpresaId] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroProyecto, setFiltroProyecto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [sortBy, setSortBy] = useState('reciente');
  const [proyectos, setProyectos] = useState([]);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [confirmEliminar, setConfirmEliminar] = useState(null); // plan object or null

  useEffect(() => {
    if (!user) return;
    getEmpresaDetailsFromUser(user).then((empresa) => {
      if (empresa?.id) setEmpresaId(empresa.id);
    });
    getProyectosFromUser(user).then((list) => setProyectos(list || []));
  }, [user]);

  const filterParams = filtroEstado ? { estado: filtroEstado } : {};
  const { planes, loading, error, refresh } = usePlanesCobroList(empresaId, filterParams);

  const handleEliminar = async () => {
    if (!confirmEliminar) return;
    const planId = confirmEliminar._id;
    setConfirmEliminar(null);
    try {
      const res = await planCobroService.eliminarPlan(planId, empresaId);
      const d = res?.data;
      if (!d?.ok) throw new Error(d?.error || 'Error al eliminar');
      setAlert({ open: true, message: 'Plan eliminado correctamente', severity: 'success' });
      refresh();
    } catch (err) {
      setAlert({ open: true, message: err.message || 'Error al eliminar el plan', severity: 'error' });
    }
  };

  useEffect(() => {
    if (error) setAlert({ open: true, message: 'Error al cargar planes de cobro', severity: 'error' });
  }, [error]);

  const planesFiltrados = useMemo(() => {
    let result = planes;
    if (filtroProyecto) {
      result = result.filter((p) => p.proyecto_id === filtroProyecto);
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      result = result.filter(
        (p) => (p.nombre || '').toLowerCase().includes(q) || (p.codigo || '').toLowerCase().includes(q)
      );
    }
    return sortPlanes(result, sortBy);
  }, [planes, filtroProyecto, busqueda, sortBy]);

  return (
    <>
      <Head>
        <title>Planes de Cobro | Sorby</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="xl">
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" fontWeight={700}>
              Planes de Cobro
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => router.push('/cobros/nuevo')}
            >
              Nuevo plan
            </Button>
          </Stack>

          <Stack direction="row" spacing={2} mb={3} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              size="small"
              placeholder="Buscar plan..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              sx={{ minWidth: 200 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Estado</InputLabel>
              <Select
                value={filtroEstado}
                label="Estado"
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="borrador">Borrador</MenuItem>
                <MenuItem value="activo">Activo</MenuItem>
                <MenuItem value="completado">Completado</MenuItem>
              </Select>
            </FormControl>
            {proyectos.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Proyecto</InputLabel>
                <Select
                  value={filtroProyecto}
                  label="Proyecto"
                  onChange={(e) => setFiltroProyecto(e.target.value)}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {proyectos.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.nombre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Ordenar</InputLabel>
              <Select
                value={sortBy}
                label="Ordenar"
                onChange={(e) => setSortBy(e.target.value)}
              >
                {SORT_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {/* Skeleton loading */}
          {loading && (
            <Grid container spacing={2}>
              {[1, 2, 3, 4].map((k) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={k}>
                  <Skeleton variant="rounded" height={180} />
                </Grid>
              ))}
            </Grid>
          )}

          {/* Empty state */}
          {!loading && planesFiltrados.length === 0 && (
            <Box textAlign="center" py={8}>
              <InboxIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" mb={1}>
                {planes.length === 0
                  ? 'No hay planes de cobro todavía'
                  : 'No se encontraron planes con esos filtros'}
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                {planes.length === 0
                  ? 'Creá tu primer plan de cobro para empezar a hacer seguimiento de pagos.'
                  : 'Probá ajustando los filtros o la búsqueda.'}
              </Typography>
              {planes.length === 0 && (
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => router.push('/cobros/nuevo')}
                >
                  Crear el primero
                </Button>
              )}
            </Box>
          )}

          {!loading && planesFiltrados.length > 0 && (
            <Grid container spacing={2}>
              {planesFiltrados.map((plan) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={plan._id}>
                  <PlanCobroCard
                    plan={plan}
                    onClick={() => router.push(`/cobros/${plan._id}`)}
                    onDelete={(p) => setConfirmEliminar(p)}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Container>
      </Box>

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

      {/* Diálogo confirmar eliminación */}
      <Dialog open={!!confirmEliminar} onClose={() => setConfirmEliminar(null)}>
        <DialogTitle>Eliminar plan</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que querés eliminar el plan &ldquo;{confirmEliminar?.nombre}&rdquo;?
            Esta acción no se puede deshacer.
          </DialogContentText>
          {(confirmEliminar?.estado === 'activo' || confirmEliminar?.estado === 'completado') &&
            (confirmEliminar?.cuotas || []).some((c) => c.estado === 'cobrada' || c.estado === 'cobrada_parcial') && (
            <DialogContentText sx={{ mt: 1.5, color: 'error.main', fontWeight: 500 }}>
              Este plan tiene cuotas cobradas. Se eliminarán también los movimientos de caja asociados.
            </DialogContentText>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmEliminar(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleEliminar}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

CobrosList.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default CobrosList;
