import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Container,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import BlockIcon from '@mui/icons-material/Block';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import pagoProveedorService from 'src/services/pagoProveedorService';
import proveedorService from 'src/services/proveedorService';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { formatCurrencyWithCode, formatTimestamp } from 'src/utils/formatters';
import AnularPagoDialog from 'src/components/pagos/AnularPagoDialog';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const METODO_LABEL = {
  transferencia: 'Transferencia',
  cheque: 'Cheque',
  efectivo: 'Efectivo',
  otro: 'Otro',
};

const renderEstadoChip = (estado) => {
  if (estado === 'anulado') {
    return <Chip size="small" label="Anulado" color="default" />;
  }
  return <Chip size="small" label="Activo" color="success" />;
};

// ─── Fila expandible ──────────────────────────────────────────────────────────

function PagoRow({ pago, proveedoresPorId, onAnular }) {
  const [open, setOpen] = useState(false);
  const nombreProveedor = proveedoresPorId[pago.proveedor_id]?.nombre || pago.proveedor_id;
  const tieneComprobantes = (pago.comprobantes?.length || 0) > 0;
  const tieneSinImputar = (pago.monto_sin_imputar || 0) > 0.005;
  const estaActivo = pago.estado === 'activo';

  return (
    <>
      <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell padding="checkbox">
          <IconButton size="small" onClick={() => setOpen((p) => !p)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>{formatTimestamp(pago.fecha_pago)}</TableCell>
        <TableCell>{nombreProveedor}</TableCell>
        <TableCell align="right">{formatCurrencyWithCode(pago.monto_bruto)} {pago.moneda}</TableCell>
        <TableCell align="right">
          {pago.total_retenciones > 0
            ? `− ${formatCurrencyWithCode(pago.total_retenciones)}`
            : '—'}
        </TableCell>
        <TableCell align="right" sx={{ fontWeight: 600 }}>
          {formatCurrencyWithCode(pago.monto_neto_proveedor)}
        </TableCell>
        <TableCell>{METODO_LABEL[pago.metodo] || pago.metodo || '—'}</TableCell>
        <TableCell align="right">
          {tieneSinImputar ? (
            <Tooltip title="Hay monto sin imputar">
              <Chip size="small" label={formatCurrencyWithCode(pago.monto_sin_imputar)} color="warning" variant="outlined" />
            </Tooltip>
          ) : '—'}
        </TableCell>
        <TableCell>{renderEstadoChip(pago.estado)}</TableCell>
        <TableCell align="center">
          {tieneComprobantes && (
            <Tooltip title={`${pago.comprobantes.length} comprobante(s)`}>
              <AttachFileIcon fontSize="small" color="action" />
            </Tooltip>
          )}
        </TableCell>
        <TableCell align="right">
          {estaActivo && (
            <Tooltip title="Anular pago">
              <IconButton size="small" color="error" onClick={() => onAnular(pago)}>
                <BlockIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={11} sx={{ p: 0, borderBottom: open ? undefined : 'none' }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                {/* Imputaciones */}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    Imputaciones ({pago.imputaciones?.length || 0})
                  </Typography>
                  {(pago.imputaciones?.length || 0) === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Sin imputaciones.
                    </Typography>
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Movimiento ID</TableCell>
                          <TableCell align="right">Monto imputado</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pago.imputaciones.map((imp, idx) => (
                          <TableRow key={idx}>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                              {String(imp.movimiento_id).slice(-8)}
                            </TableCell>
                            <TableCell align="right">{formatCurrencyWithCode(imp.monto_imputado)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Box>

                {/* Retenciones */}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    Retenciones ({pago.retenciones?.length || 0})
                  </Typography>
                  {(pago.retenciones?.length || 0) === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Sin retenciones.
                    </Typography>
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Descripción</TableCell>
                          <TableCell align="right">%</TableCell>
                          <TableCell align="right">Monto</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pago.retenciones.map((r, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{r.descripcion || '—'}</TableCell>
                            <TableCell align="right">{r.porcentaje != null ? `${r.porcentaje}%` : '—'}</TableCell>
                            <TableCell align="right">{formatCurrencyWithCode(r.monto)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Box>

                {/* Comprobantes */}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    Comprobantes ({pago.comprobantes?.length || 0})
                  </Typography>
                  {(pago.comprobantes?.length || 0) === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Sin comprobantes adjuntos.
                    </Typography>
                  ) : (
                    <Stack spacing={0.5}>
                      {pago.comprobantes.map((c, idx) => (
                        <Box key={idx}>
                          <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.875rem' }}>
                            {c.nombre}
                          </a>
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            ({c.tipo})
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Box>
              </Stack>

              {/* Anulación */}
              {pago.estado === 'anulado' && pago.anulacion && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2" fontWeight={600}>
                    Anulado el {formatTimestamp(pago.anulacion.fecha)} · Acción: {pago.anulacion.accion_movimientos === 'revertir_a_pendiente' ? 'Movimientos revertidos' : 'Movimientos mantenidos'}
                  </Typography>
                  {pago.anulacion.motivo && (
                    <Typography variant="body2">Motivo: {pago.anulacion.motivo}</Typography>
                  )}
                </Alert>
              )}

              {pago.notas && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>NOTAS</Typography>
                  <Typography variant="body2">{pago.notas}</Typography>
                </Box>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function PagosPage() {
  const { user } = useAuthContext();

  const acciones = user?.empresa?.acciones || user?.empresaData?.acciones || [];
  const tienePermiso = user?.admin
    || acciones.includes('GESTIONAR_PROVEEDORES')
    || acciones.includes('VER_CUENTA_CORRIENTE_PROVEEDORES');

  const [empresa, setEmpresa] = useState(null);
  const [proveedoresEmpresa, setProveedoresEmpresa] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filtros
  const [proveedorFiltro, setProveedorFiltro] = useState(null);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');

  // Anular
  const [anularOpen, setAnularOpen] = useState(false);
  const [pagoAAnular, setPagoAAnular] = useState(null);

  // ── Mapas de proveedores ───────────────────────────────────────────────────
  const proveedoresPorId = useMemo(() => {
    const map = {};
    proveedoresEmpresa.forEach((p) => { map[p._id] = p; });
    return map;
  }, [proveedoresEmpresa]);

  // ── Fetch inicial ──────────────────────────────────────────────────────────
  const fetchEmpresa = useCallback(async () => {
    if (!user) return;
    try {
      const empresaData = await getEmpresaDetailsFromUser(user);
      setEmpresa(empresaData);
    } catch (err) {
      console.error('Error cargando empresa:', err);
      setError('No se pudo cargar la empresa.');
    }
  }, [user]);

  const fetchProveedores = useCallback(async () => {
    if (!empresa?.id) return;
    try {
      const data = await proveedorService.getByEmpresa(empresa.id);
      setProveedoresEmpresa(data || []);
    } catch (err) {
      console.error('Error cargando proveedores:', err);
    }
  }, [empresa?.id]);

  const fetchPagos = useCallback(async () => {
    if (!empresa?.id) return;
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (proveedorFiltro?._id) params.proveedor_id = proveedorFiltro._id;
      if (fechaDesde) params.desde = fechaDesde;
      if (fechaHasta) params.hasta = fechaHasta;
      if (estadoFiltro) params.estado = estadoFiltro;
      const data = await pagoProveedorService.listar(empresa.id, params);
      setPagos(data || []);
    } catch (err) {
      console.error('Error cargando pagos:', err);
      setError('No se pudieron cargar los pagos.');
      setPagos([]);
    } finally {
      setLoading(false);
    }
  }, [empresa?.id, proveedorFiltro, fechaDesde, fechaHasta, estadoFiltro]);

  useEffect(() => { fetchEmpresa(); }, [fetchEmpresa]);
  useEffect(() => { fetchProveedores(); }, [fetchProveedores]);
  useEffect(() => { fetchPagos(); }, [fetchPagos]);

  // ── Anular ─────────────────────────────────────────────────────────────────
  const handleAbrirAnular = useCallback((pago) => {
    setPagoAAnular(pago);
    setAnularOpen(true);
  }, []);
  const handleCerrarAnular = useCallback(() => {
    setAnularOpen(false);
    setPagoAAnular(null);
  }, []);
  const handleAnulado = useCallback(() => {
    fetchPagos();
  }, [fetchPagos]);

  // ── Totales ────────────────────────────────────────────────────────────────
  const totales = useMemo(() => {
    const activos = pagos.filter((p) => p.estado === 'activo');
    return {
      cantidad: activos.length,
      bruto: activos.reduce((acc, p) => acc + (p.monto_bruto || 0), 0),
      retenciones: activos.reduce((acc, p) => acc + (p.total_retenciones || 0), 0),
      neto: activos.reduce((acc, p) => acc + (p.monto_neto_proveedor || 0), 0),
    };
  }, [pagos]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (!user) return null;
  if (!tienePermiso) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning">
          No tenés permisos para acceder a esta sección.
        </Alert>
      </Container>
    );
  }

  return (
    <>
      <Head>
        <title>Pagos a proveedores | Sorby</title>
      </Head>

      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="xl">
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
            <Typography variant="h4">Pagos a proveedores</Typography>
            <Button startIcon={<RefreshIcon />} onClick={fetchPagos} disabled={loading}>
              Refrescar
            </Button>
          </Stack>

          {/* Filtros */}
          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Autocomplete
                size="small"
                options={proveedoresEmpresa}
                value={proveedorFiltro}
                onChange={(_, v) => setProveedorFiltro(v)}
                getOptionLabel={(p) => p.nombre || ''}
                isOptionEqualToValue={(opt, val) => opt._id === val._id}
                renderInput={(params) => <TextField {...params} label="Proveedor" />}
                sx={{ minWidth: 240, flex: 2 }}
              />
              <TextField
                size="small"
                label="Desde"
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 150 }}
              />
              <TextField
                size="small"
                label="Hasta"
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 150 }}
              />
              <TextField
                size="small"
                select
                label="Estado"
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value)}
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="activo">Activos</MenuItem>
                <MenuItem value="anulado">Anulados</MenuItem>
              </TextField>
            </Stack>
          </Paper>

          {/* Totales */}
          <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
            <Paper variant="outlined" sx={{ px: 2.5, py: 1.5, minWidth: 140, flex: '1 1 auto' }}>
              <Typography variant="caption" color="text.secondary" display="block">Pagos activos</Typography>
              <Typography variant="subtitle1" fontWeight={700}>{totales.cantidad}</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ px: 2.5, py: 1.5, minWidth: 140, flex: '1 1 auto' }}>
              <Typography variant="caption" color="text.secondary" display="block">Total bruto</Typography>
              <Typography variant="subtitle1" fontWeight={700}>{formatCurrencyWithCode(totales.bruto)}</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ px: 2.5, py: 1.5, minWidth: 140, flex: '1 1 auto' }}>
              <Typography variant="caption" color="text.secondary" display="block">Retenciones</Typography>
              <Typography variant="subtitle1" fontWeight={700}>{formatCurrencyWithCode(totales.retenciones)}</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ px: 2.5, py: 1.5, minWidth: 140, flex: '1 1 auto' }}>
              <Typography variant="caption" color="text.secondary" display="block">Neto a proveedores</Typography>
              <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                {formatCurrencyWithCode(totales.neto)}
              </Typography>
            </Paper>
          </Stack>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {/* Tabla */}
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  <TableCell sx={{ fontWeight: 600 }}>Fecha</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Proveedor</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Bruto</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Retenciones</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Neto</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Método</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Sin imputar</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Estado</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Adj.</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                )}
                {!loading && pagos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No hay pagos para los filtros actuales.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {!loading && pagos.map((pago) => (
                  <PagoRow
                    key={pago._id}
                    pago={pago}
                    proveedoresPorId={proveedoresPorId}
                    onAnular={handleAbrirAnular}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Container>
      </Box>

      <AnularPagoDialog
        open={anularOpen}
        onClose={handleCerrarAnular}
        onSuccess={handleAnulado}
        empresaId={empresa?.id}
        pago={pagoAAnular}
        proveedorNombre={pagoAAnular ? proveedoresPorId[pagoAAnular.proveedor_id]?.nombre : null}
      />
    </>
  );
}

PagosPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
