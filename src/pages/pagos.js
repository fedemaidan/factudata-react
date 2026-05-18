import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Select,
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
import AttachmentIcon from '@mui/icons-material/Attachment';
import BlockIcon from '@mui/icons-material/Block';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import pagoProveedorService from 'src/services/pagoProveedorService';
import proveedorService from 'src/services/proveedorService';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { formatCurrencyWithCode, formatTimestamp } from 'src/utils/formatters';
import AnularPagoDialog from 'src/components/pagos/AnularPagoDialog';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const renderEstadoPago = (estado) => {
  const color = estado === 'activo' ? 'success' : 'default';
  return (
    <Chip
      size="small"
      label={estado === 'activo' ? 'Activo' : 'Anulado'}
      color={color}
      variant={estado === 'activo' ? 'filled' : 'outlined'}
    />
  );
};

const renderMetodo = (metodo) => {
  const labels = {
    transferencia: 'Transferencia',
    cheque: 'Cheque',
    efectivo: 'Efectivo',
    otro: 'Otro',
  };
  return labels[metodo] || metodo || '—';
};

// ─── Fila expandible ─────────────────────────────────────────────────────────

function FilaPago({ pago, onAnular }) {
  const [expandido, setExpandido] = useState(false);

  const tieneImputaciones = (pago.imputaciones || []).length > 0;
  const tieneComprobantes = (pago.comprobantes || []).length > 0;

  return (
    <>
      <TableRow
        hover
        onClick={() => setExpandido((p) => !p)}
        sx={{ cursor: 'pointer', bgcolor: pago.estado === 'anulado' ? 'grey.50' : 'inherit' }}
      >
        <TableCell>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setExpandido((p) => !p); }}>
            {expandido ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </TableCell>
        <TableCell>{formatTimestamp(pago.fecha_pago)}</TableCell>
        <TableCell>{pago.proveedor_nombre || pago.proveedor_id}</TableCell>
        <TableCell align="right">{formatCurrencyWithCode(pago.monto_bruto)}</TableCell>
        <TableCell align="right">
          {pago.total_retenciones > 0 ? formatCurrencyWithCode(pago.total_retenciones) : '—'}
        </TableCell>
        <TableCell align="right">{formatCurrencyWithCode(pago.monto_neto_proveedor)}</TableCell>
        <TableCell>{renderMetodo(pago.metodo)}</TableCell>
        <TableCell align="right">
          {pago.monto_sin_imputar > 0.005
            ? <Typography variant="body2" color="warning.main">{formatCurrencyWithCode(pago.monto_sin_imputar)}</Typography>
            : <Typography variant="body2" color="success.main">{formatCurrencyWithCode(0)}</Typography>
          }
        </TableCell>
        <TableCell>{renderEstadoPago(pago.estado)}</TableCell>
        <TableCell align="center">
          {tieneComprobantes && (
            <Tooltip title={`${pago.comprobantes.length} comprobante(s)`}>
              <AttachmentIcon fontSize="small" color="action" />
            </Tooltip>
          )}
        </TableCell>
        <TableCell align="right">
          {pago.estado === 'activo' && (
            <Tooltip title="Anular pago">
              <IconButton
                size="small"
                color="error"
                onClick={(e) => { e.stopPropagation(); onAnular(pago); }}
              >
                <BlockIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </TableCell>
      </TableRow>

      {/* Fila expandida */}
      <TableRow>
        <TableCell colSpan={11} sx={{ py: 0, px: 0 }}>
          <Collapse in={expandido} timeout="auto" unmountOnExit>
            <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                {/* Imputaciones */}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                    IMPUTACIONES
                  </Typography>
                  {!tieneImputaciones ? (
                    <Typography variant="body2" color="text.secondary">Sin imputaciones</Typography>
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Movimiento</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>Imputado</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pago.imputaciones.map((imp, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{String(imp.movimiento_id)}</TableCell>
                            <TableCell align="right">{formatCurrencyWithCode(imp.monto_imputado)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Box>

                {/* Comprobantes */}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                    COMPROBANTES
                  </Typography>
                  {!tieneComprobantes ? (
                    <Typography variant="body2" color="text.secondary">Sin comprobantes adjuntos</Typography>
                  ) : (
                    <Stack spacing={0.5}>
                      {pago.comprobantes.map((c, idx) => (
                        <Typography
                          key={idx}
                          component="a"
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="body2"
                          sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                        >
                          {c.nombre}
                        </Typography>
                      ))}
                    </Stack>
                  )}
                </Box>

                {/* Notas */}
                {pago.notas && (
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                      NOTAS
                    </Typography>
                    <Typography variant="body2">{pago.notas}</Typography>
                  </Box>
                )}
              </Stack>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function PagosPage() {
  const { user } = useAuthContext();

  const acciones = user?.empresa?.acciones || user?.empresaData?.acciones || [];
  const tienePermiso = user?.admin
    || acciones.includes('GESTIONAR_PROVEEDORES')
    || acciones.includes('VER_CUENTA_CORRIENTE_PROVEEDORES');

  const [empresa, setEmpresa] = useState(null);
  const [proveedoresEmpresa, setProveedoresEmpresa] = useState([]);
  const [loadingScope, setLoadingScope] = useState(false);

  // Filtros
  const [filtroProveedor, setFiltroProveedor] = useState(null);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  // Datos
  const [pagos, setPagos] = useState([]);
  const [loadingPagos, setLoadingPagos] = useState(false);
  const [errorPagos, setErrorPagos] = useState(null);

  // Anular
  const [pagoAAnular, setPagoAAnular] = useState(null);
  const [anularOpen, setAnularOpen] = useState(false);

  // ── Scope ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const cargar = async () => {
      if (!user) return;
      setLoadingScope(true);
      try {
        const emp = await getEmpresaDetailsFromUser(user);
        if (cancelled || !emp?.id) return;
        setEmpresa(emp);
        const lista = await proveedorService.getByEmpresa(emp.id);
        if (!cancelled) setProveedoresEmpresa(lista || []);
      } catch (err) {
        console.error('[Pagos] Error cargando scope:', err);
      } finally {
        if (!cancelled) setLoadingScope(false);
      }
    };
    cargar();
    return () => { cancelled = true; };
  }, [user]);

  // ── Fetch pagos ───────────────────────────────────────────────────────────
  const fetchPagos = useCallback(async () => {
    if (!empresa?.id) return;
    setLoadingPagos(true);
    setErrorPagos(null);
    try {
      const params = {};
      if (filtroProveedor?._id) params.proveedor_id = filtroProveedor._id;
      if (fechaDesde) params.desde = fechaDesde;
      if (fechaHasta) params.hasta = fechaHasta;
      if (filtroEstado) params.estado = filtroEstado;
      const resultado = await pagoProveedorService.listar(empresa.id, params);
      setPagos(resultado || []);
    } catch (err) {
      console.error('[Pagos] Error cargando pagos:', err);
      setErrorPagos(err?.response?.data?.error || err.message || 'Error al cargar pagos');
      setPagos([]);
    } finally {
      setLoadingPagos(false);
    }
  }, [empresa?.id, filtroProveedor, fechaDesde, fechaHasta, filtroEstado]);

  useEffect(() => {
    fetchPagos();
  }, [fetchPagos]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAnular = useCallback((pago) => {
    setPagoAAnular(pago);
    setAnularOpen(true);
  }, []);

  const handleAnularSuccess = useCallback(() => {
    setAnularOpen(false);
    setPagoAAnular(null);
    fetchPagos();
  }, [fetchPagos]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (!tienePermiso) {
    return (
      <DashboardLayout>
        <Head><title>Pagos a proveedores | Sorby</title></Head>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="warning">No tenés permisos para ver esta sección.</Alert>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head><title>Pagos a proveedores | Sorby</title></Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="xl">
          {/* Header */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
            <Typography variant="h5">Pagos a proveedores</Typography>
            <IconButton onClick={fetchPagos} disabled={loadingPagos || loadingScope}>
              <RefreshIcon />
            </IconButton>
          </Stack>

          {/* Filtros */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="flex-start" sx={{ mb: 2.5, flexWrap: 'wrap' }}>
            <Autocomplete
              options={proveedoresEmpresa}
              getOptionLabel={(o) => o.nombre || ''}
              value={filtroProveedor}
              onChange={(_, val) => setFiltroProveedor(val)}
              size="small"
              sx={{ width: 240 }}
              renderInput={(params) => (
                <TextField {...params} label="Proveedor" placeholder="Todos" />
              )}
            />
            <TextField
              label="Fecha desde"
              type="date"
              size="small"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 160 }}
            />
            <TextField
              label="Fecha hasta"
              type="date"
              size="small"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 160 }}
            />
            <TextField
              label="Estado"
              select
              size="small"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              sx={{ width: 140 }}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="activo">Activo</MenuItem>
              <MenuItem value="anulado">Anulado</MenuItem>
            </TextField>
          </Stack>

          {/* Errores */}
          {errorPagos && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorPagos(null)}>
              {errorPagos}
            </Alert>
          )}

          {/* Tabla */}
          {loadingScope || loadingPagos ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ width: 40 }} />
                    <TableCell sx={{ fontWeight: 600 }}>Fecha</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Proveedor</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Bruto</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Retenciones</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Neto proveedor</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Método</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Sin imputar</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Estado</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Comp.</TableCell>
                    <TableCell sx={{ width: 60 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No hay pagos registrados para los filtros seleccionados.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagos.map((pago) => (
                      <FilaPago key={pago._id} pago={pago} onAnular={handleAnular} />
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Container>
      </Box>

      <AnularPagoDialog
        open={anularOpen}
        onClose={() => { setAnularOpen(false); setPagoAAnular(null); }}
        onSuccess={handleAnularSuccess}
        empresaId={empresa?.id}
        pago={pagoAAnular}
      />
    </DashboardLayout>
  );
}
