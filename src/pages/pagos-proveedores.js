import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Alert,
  Box,
  Chip,
  Container,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import InboxIcon from '@mui/icons-material/Inbox';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import ControlObraService from 'src/services/controlObra/controlObraService';

const SORT_OPTIONS = [
  { value: 'proxima_cuota', label: 'Próxima cuota' },
  { value: 'monto', label: 'Mayor monto' },
  { value: 'proveedor', label: 'Proveedor (A-Z)' },
];

// Devuelve true si el usuario puede ver la hoja de planes de pago.
// Espejo de puedeVerControlObra: acción explícita VER_PLANES_PAGO (admin global pasa).
const puedeVerPlanesPago = (user, empresa) => {
  if (!user) return false;
  if (user.admin) return true;
  const acciones = empresa?.acciones || user?.empresaData?.acciones || [];
  const ocultos = user?.permisosOcultos || [];
  return acciones.includes('VER_PLANES_PAGO') && !ocultos.includes('VER_PLANES_PAGO');
};

const money = (n) => (n || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

// Normaliza un plan de pago (endpoint por-plan) a la forma que muestra la tabla.
const normalizarPlan = (p) => {
  const r = p.resumen || {};
  const proxima = (p.cuotas || [])
    .filter((c) => (c.saldo || 0) > 0 || (c.estado && c.estado !== 'pagada'))
    .map((c) => c.fecha_vencimiento)
    .filter(Boolean)
    .sort()[0] || null;
  return {
    plan_id: p._id,
    obra_id: p.control_obra_id,
    obra_titulo: p.obra_titulo,
    proveedor_nombre: p.proveedor_nombre,
    total: r.total || 0,
    pagado: r.pagado || 0,
    pendiente: r.pendiente || 0,
    cuotas: r.cuotas_total != null ? r.cuotas_total : (p.cuotas || []).length,
    proxima_vencimiento: proxima,
  };
};

const PagosProveedoresList = () => {
  const { user } = useAuthContext();
  const router = useRouter();
  const [empresa, setEmpresa] = useState(null);
  const [empresaResuelta, setEmpresaResuelta] = useState(false);
  const [empresaId, setEmpresaId] = useState(null);
  const [planesRaw, setPlanesRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [sortBy, setSortBy] = useState('proxima_cuota');
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    if (!user) return;
    getEmpresaDetailsFromUser(user).then((emp) => {
      setEmpresa(emp || null);
      if (emp?.id) setEmpresaId(emp.id);
      setEmpresaResuelta(true);
    });
  }, [user]);

  const tienePermiso = useMemo(() => puedeVerPlanesPago(user, empresa), [user, empresa]);

  useEffect(() => {
    if (!empresaId || !tienePermiso) {
      if (empresaResuelta) setLoading(false);
      return;
    }
    setLoading(true);
    ControlObraService.listarPlanesPagoEmpresa(empresaId)
      .then((items) => setPlanesRaw(items || []))
      .catch(() => setAlert({ open: true, message: 'Error al cargar los planes de pago', severity: 'error' }))
      .finally(() => setLoading(false));
  }, [empresaId, tienePermiso, empresaResuelta]);

  const planes = useMemo(() => {
    let result = planesRaw.map(normalizarPlan);
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      result = result.filter(
        (p) =>
          (p.proveedor_nombre || '').toLowerCase().includes(q) ||
          (p.obra_titulo || '').toLowerCase().includes(q)
      );
    }
    switch (sortBy) {
      case 'monto':
        return result.sort((a, b) => b.total - a.total);
      case 'proveedor':
        return result.sort((a, b) => (a.proveedor_nombre || '').localeCompare(b.proveedor_nombre || ''));
      case 'proxima_cuota':
      default:
        return result.sort((a, b) => (a.proxima_vencimiento || '9999').localeCompare(b.proxima_vencimiento || '9999'));
    }
  }, [planesRaw, busqueda, sortBy]);

  // Gating: sin permiso, pantalla consistente con el resto del producto.
  if (empresaResuelta && !tienePermiso) {
    return (
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="xl">
          <Alert severity="warning">
            No tenés permiso para acceder a los planes de pago a proveedores. Pedile a un administrador que habilite la
            acción <strong>VER_PLANES_PAGO</strong> en la configuración de la empresa.
          </Alert>
        </Container>
      </Box>
    );
  }

  return (
    <>
      <Head>
        <title>Planes de Pago | Sorby</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="xl">
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" fontWeight={700}>
              Planes de Pago
            </Typography>
          </Stack>

          <Stack direction="row" spacing={2} mb={3} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              size="small"
              placeholder="Buscar por proveedor u obra..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              sx={{ minWidth: 220 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Ordenar</InputLabel>
              <Select value={sortBy} label="Ordenar" onChange={(e) => setSortBy(e.target.value)}>
                {SORT_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {loading && (
            <Stack spacing={1}>
              {[1, 2, 3, 4].map((k) => (
                <Skeleton key={k} variant="rounded" height={48} />
              ))}
            </Stack>
          )}

          {!loading && planes.length === 0 && (
            <Box textAlign="center" py={8}>
              <InboxIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" mb={1}>
                No hay planes de pago
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Los planes de pago a proveedores se crean dentro de cada obra, en la pestaña de pagos.
              </Typography>
            </Box>
          )}

          {!loading && planes.length > 0 && (
            <Box sx={{ overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Proveedor</TableCell>
                    <TableCell>Obra</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="right">Pagado</TableCell>
                    <TableCell align="right">Pendiente</TableCell>
                    <TableCell align="center">Cuotas</TableCell>
                    <TableCell>Próxima</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {planes.map((p) => (
                    <TableRow
                      key={p.plan_id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/pagos-proveedores/${p.plan_id}`)}
                    >
                      <TableCell>{p.proveedor_nombre || '—'}</TableCell>
                      <TableCell>
                        {p.obra_titulo || '—'}
                        {p.obra_id && (
                          <Chip
                            size="small"
                            label="Ver obra"
                            component="a"
                            clickable
                            href={`/control-obra/${p.obra_id}`}
                            onClick={(e) => e.stopPropagation()}
                            sx={{ ml: 1 }}
                          />
                        )}
                      </TableCell>
                      <TableCell align="right">{money(p.total)}</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main' }}>{money(p.pagado)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{money(p.pendiente)}</TableCell>
                      <TableCell align="center">{p.cuotas}</TableCell>
                      <TableCell>
                        {p.proxima_vencimiento
                          ? new Date(p.proxima_vencimiento).toLocaleDateString('es-AR')
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
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
    </>
  );
};

PagosProveedoresList.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default PagosProveedoresList;
