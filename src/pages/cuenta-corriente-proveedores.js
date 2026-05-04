import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  InputAdornment,
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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PaymentsIcon from '@mui/icons-material/Payments';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import movimientosService from 'src/services/movimientosService';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { getProyectosFromUser } from 'src/services/proyectosService';
import { dateToTimestamp, formatCurrencyWithCode, formatTimestamp } from 'src/utils/formatters';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeAmount = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const parsed = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const buildTodayTimestamp = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return dateToTimestamp(`${y}-${m}-${d}`);
};

const ESTADO_LABEL = {
  Pagado: 'Pagado',
  'Parcialmente Pagado': 'Parcial',
  Pendiente: 'Pendiente',
};

const renderEstadoChip = (estado) => {
  if (!estado) return <Chip size="small" label="—" variant="outlined" />;
  const color = estado === 'Pagado' ? 'success'
    : estado === 'Parcialmente Pagado' ? 'warning'
      : 'default';
  return (
    <Chip
      size="small"
      label={ESTADO_LABEL[estado] ?? estado}
      color={color}
      variant={color === 'default' ? 'outlined' : 'filled'}
    />
  );
};

const getNombreUsuario = (user) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.email || null;

// ─── Tarjeta de totales ───────────────────────────────────────────────────────

function TotalesBar({ items }) {
  return (
    <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
      {items.map((item) => (
        <Paper
          key={item.label}
          variant="outlined"
          sx={{ px: 2.5, py: 1.5, minWidth: 140, flex: '1 1 auto' }}
        >
          <Typography variant="caption" color="text.secondary" display="block">
            {item.label}
          </Typography>
          <Typography
            variant="subtitle1"
            fontWeight={700}
            color={item.color || 'text.primary'}
          >
            {item.value}
          </Typography>
        </Paper>
      ))}
    </Stack>
  );
}

// ─── Nivel 1 — Lista de proveedores ──────────────────────────────────────────

const COL_PROVEEDORES_BASE = [
  { key: 'proveedor', label: 'Proveedor' },
  { key: 'cantidad_remitos', label: 'Operaciones', align: 'right' },
  { key: 'total_pedido', label: 'Total pedido', align: 'right' },
  { key: 'total_aprobado', label: 'Aprobado', align: 'right', soloAprobado: true },
  { key: 'total_pagado', label: 'Pagado', align: 'right' },
  { key: 'deuda_restante', label: 'Deuda restante', align: 'right' },
];

function ListaProveedores({ resumen, loading, onSelect, filtroProveedor, onFiltroProveedorChange, tieneMontoAprobado }) {
  const COL_PROVEEDORES = tieneMontoAprobado
    ? COL_PROVEEDORES_BASE
    : COL_PROVEEDORES_BASE.filter((c) => !c.soloAprobado);

  const filtrado = useMemo(() => {
    if (!filtroProveedor.trim()) return resumen;
    const q = filtroProveedor.trim().toLowerCase();
    return resumen.filter((r) => r.proveedor?.toLowerCase().includes(q));
  }, [resumen, filtroProveedor]);

  const totales = useMemo(() => ({
    cantidad_remitos: filtrado.reduce((a, r) => a + (r.cantidad_remitos || 0), 0),
    total_pedido: filtrado.reduce((a, r) => a + (r.total_pedido || 0), 0),
    total_aprobado: filtrado.reduce((a, r) => a + (r.total_aprobado || 0), 0),
    total_pagado: filtrado.reduce((a, r) => a + (r.total_pagado || 0), 0),
  }), [filtrado]);

  const deudaRestanteTotales = tieneMontoAprobado
    ? totales.total_aprobado - totales.total_pagado
    : totales.total_pedido - totales.total_pagado;

  return (
    <Box>
      <TotalesBar items={[
        { label: 'Proveedores', value: filtrado.length },
        { label: 'Operaciones', value: totales.cantidad_remitos },
        { label: 'Total pedido', value: formatCurrencyWithCode(totales.total_pedido) },
        ...(tieneMontoAprobado ? [{ label: 'Aprobado', value: formatCurrencyWithCode(totales.total_aprobado) }] : []),
        { label: 'Pagado', value: formatCurrencyWithCode(totales.total_pagado) },
        { label: 'Deuda restante', value: formatCurrencyWithCode(deudaRestanteTotales), color: 'error.main' },
      ]} />

      <TextField
        size="small"
        placeholder="Buscar proveedor…"
        value={filtroProveedor}
        onChange={(e) => onFiltroProveedorChange(e.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        sx={{ mb: 1.5, width: 280 }}
      />

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              {COL_PROVEEDORES.map((col) => (
                <TableCell key={col.key} align={col.align || 'left'} sx={{ fontWeight: 600 }}>
                  {col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={COL_PROVEEDORES.length} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            )}
            {!loading && filtrado.length === 0 && (
              <TableRow>
                <TableCell colSpan={COL_PROVEEDORES.length} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No hay proveedores con deuda pendiente.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {!loading && filtrado.map((row) => {
              const deudaRow = tieneMontoAprobado
                ? (row.total_aprobado || 0) - (row.total_pagado || 0)
                : (row.total_pedido || 0) - (row.total_pagado || 0);
              return (
                <TableRow
                  key={row.proveedor}
                  hover
                  onClick={() => onSelect(row.proveedor)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{row.proveedor}</TableCell>
                  <TableCell align="right">{row.cantidad_remitos}</TableCell>
                  <TableCell align="right">{formatCurrencyWithCode(row.total_pedido)}</TableCell>
                  {tieneMontoAprobado && <TableCell align="right">{formatCurrencyWithCode(row.total_aprobado)}</TableCell>}
                  <TableCell align="right">{formatCurrencyWithCode(row.total_pagado)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: 'error.main' }}>
                    {formatCurrencyWithCode(deudaRow)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

// ─── Nivel 2 — Operaciones del proveedor ────────────────────────────────────

function DetalleProveedor({ proveedor, remitos, loading, savingById, draftsById, onChangeDraft, onSaveDraft, tieneMontoAprobado, onPagarUno, selectedForPago, onToggleForPago, onToggleAllForPago }) {
  // Orden cronológico ascendente para el log
  const sorted = useMemo(() => [
    ...remitos].sort((a, b) => {
    const da = a.fecha_factura ? new Date(a.fecha_factura) : new Date(0);
    const db = b.fecha_factura ? new Date(b.fecha_factura) : new Date(0);
    return da - db;
  }), [remitos]);

  // Saldo acumulado (running balance)
  const withSaldo = useMemo(() => {
    let saldo = 0;
    return sorted.map((r) => {
      const debe = normalizeAmount(r.total) || 0;
      const haber = normalizeAmount(r.monto_pagado) || 0;
      saldo += debe - haber;
      return { ...r, _debe: debe, _haber: haber, _saldo: saldo };
    });
  }, [sorted]);

  const totales = useMemo(() => ({
    total: remitos.reduce((a, r) => a + (normalizeAmount(r.total) || 0), 0),
    monto_aprobado: remitos.reduce((a, r) => a + (normalizeAmount(r.monto_aprobado) || 0), 0),
    monto_pagado: remitos.reduce((a, r) => a + (normalizeAmount(r.monto_pagado) || 0), 0),
  }), [remitos]);

  const noPagados = useMemo(() => remitos.filter((r) => r.estado !== 'Pagado'), [remitos]);
  const noPagadosIds = useMemo(() => noPagados.map((r) => r.id || r._id), [noPagados]);

  const saldoFinal = tieneMontoAprobado
    ? totales.monto_aprobado - totales.monto_pagado
    : totales.total - totales.monto_pagado;
  const diferenciaTotalAprobado = totales.total - totales.monto_aprobado;
  const colSpan = 9 + (tieneMontoAprobado ? 1 : 0);

  return (
    <Box>
      <TotalesBar items={[
        { label: 'Operaciones', value: remitos.length },
        { label: 'Total facturas', value: formatCurrencyWithCode(totales.total) },
        ...(tieneMontoAprobado ? [
          { label: 'Aprobado', value: formatCurrencyWithCode(totales.monto_aprobado) },
          { label: 'Dif. pedido vs aprobado', value: formatCurrencyWithCode(diferenciaTotalAprobado), color: diferenciaTotalAprobado > 0.005 ? 'warning.main' : 'text.primary' },
        ] : []),
        { label: 'Total pagado', value: formatCurrencyWithCode(totales.monto_pagado) },
        { label: 'Saldo', value: formatCurrencyWithCode(saldoFinal), color: saldoFinal > 0.005 ? 'error.main' : 'success.main' },
      ]} />

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell padding="checkbox">
                <Tooltip title={selectedForPago?.size === noPagadosIds.length ? 'Deseleccionar todo' : 'Seleccionar todas las pendientes'}>
                  <span>
                    <Checkbox
                      size="small"
                      checked={noPagadosIds.length > 0 && selectedForPago?.size === noPagadosIds.length}
                      indeterminate={(selectedForPago?.size ?? 0) > 0 && selectedForPago.size < noPagadosIds.length}
                      onChange={(e) => onToggleAllForPago?.(noPagadosIds, e.target.checked)}
                      disabled={noPagadosIds.length === 0}
                    />
                  </span>
                </Tooltip>
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Fecha</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Vencimiento</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Código</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Obra</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Categoría</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Estado</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Debe</TableCell>
              {tieneMontoAprobado && <TableCell align="right" sx={{ fontWeight: 600 }}>Aprobado</TableCell>}
              <TableCell align="right" sx={{ fontWeight: 600 }}>Haber</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, color: 'primary.main' }}>Saldo</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={colSpan} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            )}
            {!loading && withSaldo.length === 0 && (
              <TableRow>
                <TableCell colSpan={colSpan} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No hay operaciones para este proveedor.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {!loading && withSaldo.map((rem) => {
              const id = rem.id || rem._id;
              const draftAprobado = draftsById[id]?.monto_aprobado;
              const aprobadoActual = normalizeAmount(rem.monto_aprobado) || 0;
              const aprobadoDisplay = draftAprobado !== undefined ? draftAprobado : String(aprobadoActual || '');
              const isDirty = draftAprobado !== undefined && normalizeAmount(draftAprobado) !== aprobadoActual;
              const isSaving = !!savingById[id];
              const isPagado = rem.estado === 'Pagado';
              const vencida = rem.fecha_vencimiento && !isPagado && new Date(rem.fecha_vencimiento) < new Date();
              const isSelectedForPago = selectedForPago?.has(id);

              return (
                <TableRow key={id} sx={{ opacity: isPagado ? 0.65 : 1 }}>
                  <TableCell padding="checkbox">
                    {!isPagado && (
                      <Checkbox
                        size="small"
                        checked={!!isSelectedForPago}
                        onChange={() => onToggleForPago?.(id)}
                      />
                    )}
                  </TableCell>
                  <TableCell>{formatTimestamp(rem.fecha_factura)}</TableCell>
                  <TableCell sx={{ color: vencida ? 'error.main' : 'inherit' }}>
                    {rem.fecha_vencimiento ? formatTimestamp(rem.fecha_vencimiento) : '—'}
                  </TableCell>
                  <TableCell>
                    {rem.codigo_operacion ? (
                      <Typography
                        component="a"
                        href={`/movementForm?movimientoId=${id}&lastPageName=CuentaCorriente&lastPageUrl=/cuenta-corriente-proveedores`}
                        target="_blank"
                        rel="noopener"
                        variant="body2"
                        sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                      >
                        {rem.codigo_operacion}
                      </Typography>
                    ) : (
                      <Typography
                        component="a"
                        href={`/movementForm?movimientoId=${id}&lastPageName=CuentaCorriente&lastPageUrl=/cuenta-corriente-proveedores`}
                        target="_blank"
                        rel="noopener"
                        variant="body2"
                        sx={{ color: 'text.disabled', textDecoration: 'none', '&:hover': { color: 'primary.main', textDecoration: 'underline' } }}
                      >
                        ver
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{rem.proyecto_nombre || rem.proyectoNombre || '—'}</TableCell>
                  <TableCell>{rem.categoria || '—'}</TableCell>
                  <TableCell>{renderEstadoChip(rem.estado)}</TableCell>
                  <TableCell align="right">{formatCurrencyWithCode(rem._debe)}</TableCell>
                  {tieneMontoAprobado && (
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        value={aprobadoDisplay}
                        onChange={(e) => onChangeDraft(id, e.target.value)}
                        InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                        sx={{ width: 130 }}
                      />
                    </TableCell>
                  )}
                  <TableCell align="right">{formatCurrencyWithCode(rem._haber)}</TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: 700, color: rem._saldo > 0.005 ? 'error.main' : 'success.main' }}
                  >
                    {formatCurrencyWithCode(rem._saldo)}
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                      {isDirty && (
                        <Tooltip title="Guardar aprobado">
                          <IconButton size="small" onClick={() => onSaveDraft(id, rem)} disabled={isSaving}>
                            {isSaving ? <CircularProgress size={14} /> : <SaveOutlinedIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      )}
                      {!isDirty && !isPagado && (
                        <Tooltip title="Registrar pago para esta factura">
                          <IconButton size="small" onClick={() => onPagarUno?.(rem)} color="primary">
                            <PaymentsIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function CuentaCorrienteProveedoresPage() {
  const { user } = useAuthContext();

  const acciones = user?.empresa?.acciones || user?.empresaData?.acciones || [];
  const tienePermiso = user?.admin ||
    acciones.includes('VER_CONTROL_PAGOS') ||
    acciones.includes('VER_CUENTA_CORRIENTE_PROVEEDORES');

  const [empresa, setEmpresa] = useState(null);

  const tieneMontoAprobado = empresa?.comprobante_info?.monto_aprobado === true;
  const [proyectos, setProyectos] = useState([]);
  const [loadingScope, setLoadingScope] = useState(false);
  const [scopeError, setScopeError] = useState(null);

  // Filtros compartidos
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroProveedor, setFiltroProveedor] = useState('');

  // Nivel 1
  const [resumen, setResumen] = useState([]);
  const [loadingResumen, setLoadingResumen] = useState(false);

  // Nivel 2
  const [selectedProveedor, setSelectedProveedor] = useState(null);
  const [remitos, setRemitos] = useState([]);
  const [loadingRemitos, setLoadingRemitos] = useState(false);
  const [draftsById, setDraftsById] = useState({});
  const [savingById, setSavingById] = useState({});
  const [feedback, setFeedback] = useState(null);

  // ImputarPagoDialog
  const [imputarOpen, setImputarOpen] = useState(false);
  const [remitoInicial, setRemitoInicial] = useState(null);

  // Selección de filas para pago
  const [selectedForPago, setSelectedForPago] = useState(() => new Set());

  // ── scope ──────────────────────────────────────────────────────────────────
  const fetchScopeData = useCallback(async () => {
    if (!user) return;
    setLoadingScope(true);
    setScopeError(null);
    try {
      const [emp, proys] = await Promise.all([
        getEmpresaDetailsFromUser(user),
        getProyectosFromUser(user),
      ]);
      if (!emp?.id) throw new Error('No se pudo resolver la empresa del usuario.');
      setEmpresa(emp);
      setProyectos(proys || []);
    } catch (err) {
      console.error('Error cargando scope:', err);
      setScopeError(err.message || 'No se pudo cargar la empresa del usuario.');
    } finally {
      setLoadingScope(false);
    }
  }, [user]);

  const proyectoIds = useMemo(() => proyectos.map((p) => p.id).filter(Boolean), [proyectos]);

  // ── Nivel 1: resumen proveedores ───────────────────────────────────────────
  const fetchResumen = useCallback(async () => {
    if (!empresa?.id) return;
    setLoadingResumen(true);
    try {
      const params = { empresaId: empresa.id };
      if (proyectoIds.length > 0) params.proyectoIds = proyectoIds.join(',');
      if (fechaDesde) params.fechaDesde = fechaDesde;
      if (fechaHasta) params.fechaHasta = fechaHasta;
      const result = await movimientosService.getResumenProveedores(params);
      setResumen(result?.resumen || []);
    } catch (err) {
      console.error('Error cargando resumen proveedores:', err);
      setResumen([]);
    } finally {
      setLoadingResumen(false);
    }
  }, [empresa?.id, proyectoIds, fechaDesde, fechaHasta]);

  // ── Nivel 2: remitos del proveedor ─────────────────────────────────────────
  const fetchRemitos = useCallback(async (proveedor) => {
    if (!empresa?.id || !proveedor) return;
    setLoadingRemitos(true);
    setRemitos([]);
    setDraftsById({});
    try {
      const params = {
        empresaId: empresa.id,
        tipo: 'egreso',
        proveedores: proveedor,
        limit: 500,
        page: 1,
        includeOptions: 'false',
        includeTotals: 'false',
        groupProrrateos: 'false',
      };
      if (proyectoIds.length > 0) params.proyectoIds = proyectoIds.join(',');
      if (fechaDesde) params.fechaDesde = fechaDesde;
      if (fechaHasta) params.fechaHasta = fechaHasta;
      const response = await movimientosService.getCajasDashboard(params);
      // Misma lógica que flattenDashboardItems en control-pagos.js
      const items = (response?.items || []).flatMap((item) => {
        if (item?.tipo === 'grupo_prorrateo') return item.movimientos || [];
        return item?.data ? [item.data] : [];
      });
      setRemitos(items);
    } catch (err) {
      console.error('Error cargando remitos del proveedor:', err);
      setRemitos([]);
    } finally {
      setLoadingRemitos(false);
    }
  }, [empresa?.id, proyectoIds, fechaDesde, fechaHasta]);

  // ── Efectos ────────────────────────────────────────────────────────────────
  useEffect(() => { fetchScopeData(); }, [fetchScopeData]);
  useEffect(() => { fetchResumen(); }, [fetchResumen]);
  useEffect(() => {
    if (selectedProveedor) fetchRemitos(selectedProveedor);
  }, [selectedProveedor, fetchRemitos]);

  // Reset selección al cambiar proveedor
  useEffect(() => {
    setSelectedForPago(new Set());
  }, [selectedProveedor]);

  // ── Handlers inline monto_aprobado ────────────────────────────────────────
  const handleChangeDraft = useCallback((id, value) => {
    setDraftsById((prev) => ({ ...prev, [id]: { ...prev[id], monto_aprobado: value } }));
  }, []);

  const handleSaveDraft = useCallback(async (id, remito) => {
    const raw = draftsById[id]?.monto_aprobado;
    const nextAprobado = normalizeAmount(raw);
    if (nextAprobado === null) return;

    setSavingById((prev) => ({ ...prev, [id]: true }));
    setFeedback(null);
    try {
      const nombreUsuario = getNombreUsuario(user);
      await movimientosService.updateMovimiento(
        id,
        { ...remito, monto_aprobado: nextAprobado },
        nombreUsuario
      );
      setRemitos((prev) =>
        prev.map((r) => (r.id === id ? { ...r, monto_aprobado: nextAprobado } : r))
      );
      setDraftsById((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setFeedback({ severity: 'success', message: 'Monto aprobado actualizado.' });
      // Refresca resumen de nivel 1
      fetchResumen();
    } catch (err) {
      console.error('Error guardando monto aprobado:', err);
      setFeedback({ severity: 'error', message: 'No se pudo guardar el monto aprobado.' });
    } finally {
      setSavingById((prev) => ({ ...prev, [id]: false }));
    }
  }, [draftsById, user, fetchResumen]);

  // ── Handle pago exitoso ───────────────────────────────────────────────────
  const handlePagoSuccess = useCallback(() => {
    setFeedback({ severity: 'success', message: 'Pago registrado correctamente.' });
    fetchRemitos(selectedProveedor);
    fetchResumen();
  }, [selectedProveedor, fetchRemitos, fetchResumen]);

  const handlePagarUno = useCallback((rem) => {
    setRemitoInicial(rem);
    setImputarOpen(true);
  }, []);

  const handleCloseImputar = useCallback(() => {
    setImputarOpen(false);
    setRemitoInicial(null);
  }, []);

  const handleToggleForPago = useCallback((id) => {
    setSelectedForPago((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleAllForPago = useCallback((ids, checked) => {
    setSelectedForPago(checked ? new Set(ids) : new Set());
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  if (!tienePermiso) {
    return (
      <DashboardLayout>
        <Head><title>Cuenta corriente proveedores</title></Head>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="warning">No tenés permisos para ver esta sección.</Alert>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head><title>Cuenta corriente proveedores</title></Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="xl">
          {/* Header */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              {selectedProveedor && (
                <IconButton onClick={() => { setSelectedProveedor(null); setFeedback(null); }}>
                  <ArrowBackIcon />
                </IconButton>
              )}
              <Typography variant="h5">
                {selectedProveedor ? `Operaciones — ${selectedProveedor}` : 'Cuenta corriente por proveedor'}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1}>
              {selectedProveedor && (
                <Button
                  variant="contained"
                  startIcon={<PaymentsIcon />}
                  onClick={() => setImputarOpen(true)}
                  disabled={remitos.length === 0 || loadingRemitos}
                >
                  {selectedForPago.size > 0 ? `Pagar seleccionadas (${selectedForPago.size})` : 'Registrar pago'}
                </Button>
              )}
              <IconButton
                onClick={selectedProveedor ? () => fetchRemitos(selectedProveedor) : fetchResumen}
                disabled={loadingScope || loadingResumen || loadingRemitos}
              >
                <RefreshIcon />
              </IconButton>
            </Stack>
          </Stack>

          {/* Filtros de fecha */}
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5, flexWrap: 'wrap' }}>
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
            {(fechaDesde || fechaHasta) && (
              <Button
                size="small"
                variant="text"
                onClick={() => { setFechaDesde(''); setFechaHasta(''); }}
              >
                Limpiar fechas
              </Button>
            )}
          </Stack>

          {/* Alertas */}
          {(scopeError) && (
            <Alert severity="error" sx={{ mb: 2 }}>{scopeError}</Alert>
          )}
          {feedback && (
            <Alert severity={feedback.severity} onClose={() => setFeedback(null)} sx={{ mb: 2 }}>
              {feedback.message}
            </Alert>
          )}

          {/* Contenido */}
          {loadingScope ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : !selectedProveedor ? (
            <ListaProveedores
              resumen={resumen}
              loading={loadingResumen}
              onSelect={setSelectedProveedor}
              filtroProveedor={filtroProveedor}
              onFiltroProveedorChange={setFiltroProveedor}
              tieneMontoAprobado={tieneMontoAprobado}
            />
          ) : (
            <DetalleProveedor
              proveedor={selectedProveedor}
              remitos={remitos}
              loading={loadingRemitos}
              savingById={savingById}
              draftsById={draftsById}
              onChangeDraft={handleChangeDraft}
              onSaveDraft={handleSaveDraft}
              tieneMontoAprobado={tieneMontoAprobado}
              onPagarUno={handlePagarUno}
              selectedForPago={selectedForPago}
              onToggleForPago={handleToggleForPago}
              onToggleAllForPago={handleToggleAllForPago}
            />
          )}
        </Container>
      </Box>

      {/* ImputarPagoDialog — carga diferida para evitar importar innecesariamente */}
      {imputarOpen && (
        <ImputarPagoDialogLazy
          open={imputarOpen}
          onClose={handleCloseImputar}
          onSuccess={handlePagoSuccess}
          proveedor={selectedProveedor}
          remitos={remitos.filter((r) => r.estado !== 'Pagado')}
          remitoInicial={remitoInicial}
          selectedIdsInicial={selectedForPago.size > 0 && !remitoInicial ? [...selectedForPago] : null}
        />
      )}
    </DashboardLayout>
  );
}

// Lazy wrapper para no bloquear el render inicial
function ImputarPagoDialogLazy(props) {
  // eslint-disable-next-line global-require
  const ImputarPagoDialog = require('src/components/pagos/ImputarPagoDialog').default;
  return <ImputarPagoDialog {...props} />;
}
