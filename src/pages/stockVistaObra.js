import { useEffect, useMemo, useState, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Alert, Box, Button, Chip, CircularProgress, Container, Divider,
  FormControl, InputLabel, MenuItem, Paper, Select, Stack,
  Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Tooltip, Typography, Autocomplete,
} from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import InventoryIcon from '@mui/icons-material/Inventory';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FilterListIcon from '@mui/icons-material/FilterList';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { getProyectosFromUser } from 'src/services/proyectosService';
import VistaObraService from 'src/services/stock/vistaObraService';

/* ═══════════════════════════════════════════════════════════
   Página: Vista unificada de materiales por obra
   Fase 1 — Stock V2
   ═══════════════════════════════════════════════════════════ */

const fmtMoney = (n) => {
  if (n == null) return '—';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
};

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch { return '—'; }
};

const ORIGEN_COLORS = {
  stock_v2: { bg: '#e3f2fd', color: '#1565c0', label: 'Stock V2' },
  acopio: { bg: '#fff3e0', color: '#e65100', label: 'Acopio' },
};

const ESTADO_COLORS = {
  ENTREGADO: { bg: '#e8f5e9', color: '#2e7d32' },
  PENDIENTE: { bg: '#fff8e1', color: '#f57f17' },
  PENDIENTE_CONFIRMACION: { bg: '#fce4ec', color: '#c62828' },
  PARCIALMENTE_ENTREGADO: { bg: '#e0f2f1', color: '#00695c' },
};

export default function StockVistaObra() {
  const { user } = useAuthContext();
  const router = useRouter();

  // ===== State
  const [empresaId, setEmpresaId] = useState(null);
  const [proyectos, setProyectos] = useState([]);
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ===== Filtros
  const [filtroOrigen, setFiltroOrigen] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  // ───── Cargar empresa y proyectos ─────
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const empresa = await getEmpresaDetailsFromUser(user);
        setEmpresaId(empresa.id);
        let projsRaw = [];
        try { projsRaw = await getProyectosFromUser(user); } catch { /* */ }
        const projs = (projsRaw ?? [])
          .map((p) => ({ id: p?.id || p?._id || p?.proyecto_id || p?.codigo, nombre: p?.nombre || p?.name || '(sin nombre)' }))
          .filter((p) => p.id);
        setProyectos(projs);

        // Si viene proyectoId en query, seleccionar
        const qProyecto = router.query.proyectoId;
        if (qProyecto) {
          const match = projs.find((p) => p.id === qProyecto);
          if (match) setProyectoSeleccionado(match);
        }
      } catch (err) {
        console.error('[StockVistaObra] Error cargando datos iniciales:', err);
      }
    })();
  }, [user, router.query.proyectoId]);

  // ───── Cargar vista obra cuando cambia el proyecto ─────
  const cargarVistaObra = useCallback(async () => {
    if (!proyectoSeleccionado?.id || !empresaId) return;
    setLoading(true);
    setError(null);
    try {
      const resultado = await VistaObraService.obtenerVistaObra(proyectoSeleccionado.id, empresaId);
      setData(resultado);
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err.message || 'Error cargando materiales de obra';
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [proyectoSeleccionado, empresaId]);

  useEffect(() => {
    cargarVistaObra();
  }, [cargarVistaObra]);

  // ───── Filtrar items ─────
  const itemsFiltrados = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((item) => {
      if (filtroOrigen !== 'todos' && item.origen !== filtroOrigen) return false;
      if (filtroEstado !== 'todos' && item.estado !== filtroEstado) return false;
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        if (
          !(item.nombre || '').toLowerCase().includes(q) &&
          !(item.origen_detalle || '').toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [data, filtroOrigen, filtroEstado, busqueda]);

  // ───── Totales filtrados ─────
  const totalesFiltrados = useMemo(() => {
    let total = 0;
    let sinPrecio = 0;
    let pendientes = 0;
    itemsFiltrados.forEach((item) => {
      if (item.subtotal != null) total += item.subtotal;
      else sinPrecio++;
      if (item.estado === 'PENDIENTE' || item.estado === 'PENDIENTE_CONFIRMACION') pendientes += Math.abs(item.cantidad);
    });
    return { total, sinPrecio, pendientes, count: itemsFiltrados.length };
  }, [itemsFiltrados]);

  // ───── Render ─────
  return (
    <>
      <Head>
        <title>Materiales por Obra | Sorby</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 3 }}>
        <Container maxWidth="xl">
          {/* ===== Header ===== */}
          <Stack direction="row" alignItems="center" spacing={2} mb={3}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => router.back()}
              size="small"
              color="inherit"
            >
              Volver
            </Button>
            <ConstructionIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h4" sx={{ flexGrow: 1 }}>
              Materiales por Obra
            </Typography>
          </Stack>

          {/* ===== Selector de proyecto ===== */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <Autocomplete
                value={proyectoSeleccionado}
                onChange={(_, v) => {
                  setProyectoSeleccionado(v);
                  setData(null);
                  setError(null);
                }}
                options={proyectos}
                getOptionLabel={(o) => o.nombre || ''}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                renderInput={(params) => (
                  <TextField {...params} label="Seleccionar obra / proyecto" size="small" />
                )}
                sx={{ minWidth: 350 }}
                noOptionsText="No hay proyectos"
              />
              {proyectoSeleccionado && (
                <Typography variant="body2" color="text.secondary">
                  ID: {proyectoSeleccionado.id}
                </Typography>
              )}
            </Stack>
          </Paper>

          {/* ===== Sin proyecto seleccionado ===== */}
          {!proyectoSeleccionado && (
            <Alert severity="info" variant="outlined">
              Seleccioná un proyecto/obra para ver sus materiales.
            </Alert>
          )}

          {/* ===== Loading ===== */}
          {loading && (
            <Box display="flex" justifyContent="center" py={6}>
              <CircularProgress />
            </Box>
          )}

          {/* ===== Error ===== */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* ===== Datos cargados ===== */}
          {data && !loading && proyectoSeleccionado && (
            <>
              {/* ── Tarjetas resumen ── */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
                <Paper sx={{ p: 2, flex: 1, textAlign: 'center' }}>
                  <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                    <AttachMoneyIcon color="success" />
                    <Typography variant="h6">{fmtMoney(data.total_valorizado)}</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">Total valorizado</Typography>
                </Paper>
                <Paper sx={{ p: 2, flex: 1, textAlign: 'center' }}>
                  <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                    <InventoryIcon color="primary" />
                    <Typography variant="h6">{data.items?.length || 0}</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">Items totales</Typography>
                </Paper>
                {data.items_sin_precio > 0 && (
                  <Paper sx={{ p: 2, flex: 1, textAlign: 'center', border: '1px solid', borderColor: 'warning.main' }}>
                    <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                      <WarningAmberIcon color="warning" />
                      <Typography variant="h6">{data.items_sin_precio}</Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">Sin precio</Typography>
                  </Paper>
                )}
                {data.cantidad_pendiente_total > 0 && (
                  <Paper sx={{ p: 2, flex: 1, textAlign: 'center', border: '1px solid', borderColor: 'info.main' }}>
                    <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                      <HourglassEmptyIcon color="info" />
                      <Typography variant="h6">{data.cantidad_pendiente_total}</Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">Cantidad pendiente</Typography>
                  </Paper>
                )}
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                    <WarehouseIcon sx={{ color: ORIGEN_COLORS.stock_v2.color }} />
                    <Typography variant="body1">{data.fuentes?.stock_v2 || 0}</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">Stock V2</Typography>
                </Paper>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                    <InventoryIcon sx={{ color: ORIGEN_COLORS.acopio.color }} />
                    <Typography variant="body1">{data.fuentes?.acopio || 0}</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">Acopio</Typography>
                </Paper>
              </Stack>

              {/* ── Filtros ── */}
              <Paper sx={{ p: 2, mb: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                  <FilterListIcon color="action" />
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Origen</InputLabel>
                    <Select value={filtroOrigen} label="Origen" onChange={(e) => setFiltroOrigen(e.target.value)}>
                      <MenuItem value="todos">Todos</MenuItem>
                      <MenuItem value="stock_v2">Stock V2</MenuItem>
                      <MenuItem value="acopio">Acopio</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Estado</InputLabel>
                    <Select value={filtroEstado} label="Estado" onChange={(e) => setFiltroEstado(e.target.value)}>
                      <MenuItem value="todos">Todos</MenuItem>
                      <MenuItem value="ENTREGADO">Entregado</MenuItem>
                      <MenuItem value="PENDIENTE">Pendiente</MenuItem>
                      <MenuItem value="PENDIENTE_CONFIRMACION">Pend. confirmación</MenuItem>
                      <MenuItem value="PARCIALMENTE_ENTREGADO">Parcial</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    size="small"
                    label="Buscar material..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    sx={{ minWidth: 200 }}
                  />
                  {(filtroOrigen !== 'todos' || filtroEstado !== 'todos' || busqueda) && (
                    <Button
                      size="small"
                      onClick={() => { setFiltroOrigen('todos'); setFiltroEstado('todos'); setBusqueda(''); }}
                    >
                      Limpiar filtros
                    </Button>
                  )}
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                    {totalesFiltrados.count} items — {fmtMoney(totalesFiltrados.total)}
                  </Typography>
                </Stack>
              </Paper>

              {/* ── Tabla ── */}
              <Paper sx={{ overflowX: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Material</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Cantidad</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Tipo</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Origen</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Detalle</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Precio unit.</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Subtotal</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Fecha</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {itemsFiltrados.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">
                            {data.items?.length === 0
                              ? 'No hay materiales registrados para esta obra.'
                              : 'Ningún item coincide con los filtros.'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {itemsFiltrados.map((item) => {
                      const origenStyle = ORIGEN_COLORS[item.origen] || { bg: '#f5f5f5', color: '#616161', label: item.origen };
                      const estadoStyle = ESTADO_COLORS[item.estado] || { bg: '#f5f5f5', color: '#616161' };
                      return (
                        <TableRow key={item._id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{item.nombre}</Typography>
                            {item.precio_source === 'acopio_fallback' && (
                              <Tooltip title="Precio tomado del acopio (no está en catálogo)">
                                <Typography variant="caption" color="warning.main">⚠️ precio acopio</Typography>
                              </Tooltip>
                            )}
                            {item.precio_source === null && (
                              <Typography variant="caption" color="error">⚠️ sin precio</Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={500}>
                              {Math.abs(item.cantidad)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">{item.tipo}/{item.subtipo}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={origenStyle.label}
                              size="small"
                              sx={{ bgcolor: origenStyle.bg, color: origenStyle.color, fontWeight: 600, fontSize: '0.7rem' }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {item.origen_detalle || '—'}
                            </Typography>
                            {item.solicitud_id && (
                              <Tooltip title="Ver solicitud">
                                <OpenInNewIcon
                                  fontSize="inherit"
                                  sx={{ ml: 0.5, cursor: 'pointer', color: 'primary.main', fontSize: 14 }}
                                  onClick={() => router.push(`/stockSolicitudes?empresaId=${empresaId}`)}
                                />
                              </Tooltip>
                            )}
                            {item.acopio_id && (
                              <Tooltip title="Ver acopio">
                                <OpenInNewIcon
                                  fontSize="inherit"
                                  sx={{ ml: 0.5, cursor: 'pointer', color: 'warning.main', fontSize: 14 }}
                                  onClick={() => router.push(`/movimientosAcopio?empresaId=${empresaId}&acopioId=${item.acopio_id}`)}
                                />
                              </Tooltip>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {item.precio_unitario_actual != null ? fmtMoney(item.precio_unitario_actual) : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600}>
                              {item.subtotal != null ? fmtMoney(item.subtotal) : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={item.estado?.replace(/_/g, ' ') || '—'}
                              size="small"
                              sx={{
                                bgcolor: estadoStyle.bg,
                                color: estadoStyle.color,
                                fontWeight: 500,
                                fontSize: '0.65rem',
                                textTransform: 'capitalize',
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">{fmtDate(item.fecha)}</Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Paper>
            </>
          )}
        </Container>
      </Box>
    </>
  );
}

StockVistaObra.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
