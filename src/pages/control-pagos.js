import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Paper,
  Popover,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PaymentsIcon from '@mui/icons-material/Payments';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import movimientosService from 'src/services/movimientosService';
import profileService from 'src/services/profileService';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { getProyectosFromUser } from 'src/services/proyectosService';
import { formatCurrencyWithCode, formatTimestamp, dateToTimestamp } from 'src/utils/formatters';
import { puedeCompletarPagoEgreso } from 'src/utils/movimientoPagoCompleto';
import pretendidosService from 'src/services/pretendidosService';
import ConfirmarPagoDialog from 'src/components/pagos/ConfirmarPagoDialog';
import proveedorService from 'src/services/proveedorService';
import PresupuestoService from 'src/services/presupuestoService';
import ProveedorDrawer from 'src/components/ProveedorDrawer';

const PAGE_SIZE_OPTIONS = [25, 50, 100];

// ─── Panel de Pretendidos ─────────────────────────────────────────────────────

const ESTADO_PRETENDIDO_COLOR = { pendiente: 'warning', cerrado: 'default' };

function getLunesDeEstaSemana() {
  const hoy = new Date();
  const dia = hoy.getDay();
  const diffLunes = dia === 0 ? -6 : 1 - dia;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + diffLunes);
  return lunes.toISOString().split('T')[0];
}

/**
 * Muestra los presupuestos de un proveedor: primero la obra actual, luego las demás.
 * `presupuestos` es la lista ya filtrada por proveedor_nombre (puede ser null mientras carga).
 */
function PresupuestoInfoProveedor({ presupuestos, proyectoId, proyectosMap, loading }) {
  if (loading || presupuestos === null) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
        <CircularProgress size={14} />
        <Typography variant="caption" color="text.secondary">Buscando presupuesto...</Typography>
      </Box>
    );
  }

  if (presupuestos.length === 0) {
    return (
      <Alert severity="warning" sx={{ py: 0.5 }}>
        <Typography variant="caption">No hay presupuesto asignado para este proveedor.</Typography>
      </Alert>
    );
  }

  const mismaObra = presupuestos.filter((p) => p.proyecto_id === proyectoId);
  const otrasObras = presupuestos.filter((p) => p.proyecto_id !== proyectoId);

  const renderFila = (p) => {
    const disponible = (p.monto || 0) - (p.ejecutado || 0);
    const pct = p.monto > 0 ? Math.round(((p.ejecutado || 0) / p.monto) * 100) : 0;
    const color = pct >= 100 ? 'error.main' : pct >= 80 ? 'warning.main' : 'success.main';
    return (
      <Stack key={p.id || p._id} direction="row" spacing={2} alignItems="center" flexWrap="wrap">
        {p.categoria && <Typography variant="caption" color="text.secondary">{p.categoria}{p.subcategoria ? ` / ${p.subcategoria}` : ''}</Typography>}
        <Typography variant="caption">Presupuesto: <strong>{formatCurrencyWithCode(p.monto, p.moneda)}</strong></Typography>
        <Typography variant="caption">Ejecutado: <strong style={{ color: 'inherit' }}>{formatCurrencyWithCode(p.ejecutado || 0, p.moneda)}</strong></Typography>
        <Typography variant="caption" sx={{ color }}>Disponible: <strong>{formatCurrencyWithCode(disponible, p.moneda)}</strong> ({pct}%)</Typography>
      </Stack>
    );
  };

  return (
    <Box sx={{ bgcolor: 'grey.50', borderRadius: 1, px: 1.5, py: 1, border: '1px solid', borderColor: 'divider' }}>
      {mismaObra.length > 0 && (
        <Box sx={{ mb: otrasObras.length > 0 ? 1 : 0 }}>
          <Typography variant="caption" fontWeight={700} color="primary.main" display="block" sx={{ mb: 0.5 }}>
            Esta obra
          </Typography>
          <Stack spacing={0.5}>{mismaObra.map(renderFila)}</Stack>
        </Box>
      )}
      {mismaObra.length === 0 && proyectoId && (
        <Typography variant="caption" color="warning.main" display="block" sx={{ mb: otrasObras.length > 0 ? 1 : 0 }}>
          Sin presupuesto en esta obra.
        </Typography>
      )}
      {otrasObras.length > 0 && (
        <Box>
          <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" sx={{ mb: 0.5 }}>
            Otras obras
          </Typography>
          <Stack spacing={0.5}>
            {otrasObras.map((p) => (
              <Box key={p.id || p._id}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  {proyectosMap?.[p.proyecto_id]?.nombre || p.proyecto_id || 'Sin obra'}:
                </Typography>
                {renderFila(p)}
              </Box>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
}

function NuevoPretendidoDialog({ open, onClose, proyectos, proveedores, onCrear, creating, editando, onEditar, saving, onEliminar, deleting }) {
  const [form, setForm] = useState({
    proveedorId: '', proyectoId: '', semana: getLunesDeEstaSemana(), monto: '', descripcion: '',
  });

  useEffect(() => {
    if (!open) return;
    if (editando) {
      const semanaIso = editando.semana ? new Date(editando.semana).toISOString().split('T')[0] : getLunesDeEstaSemana();
      setForm({
        proveedorId: editando.proveedor_id || '',
        proyectoId: editando.proyecto_id || '',
        semana: semanaIso,
        monto: String(editando.monto_pretendido ?? ''),
        descripcion: editando.descripcion || '',
      });
    } else {
      setForm({ proveedorId: '', proyectoId: '', semana: getLunesDeEstaSemana(), monto: '', descripcion: '' });
    }
  }, [open, editando]);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const isLoading = editando ? saving : creating;
  const canSubmit = !isLoading && form.proveedorId && form.proyectoId && form.semana && form.monto;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const payload = { ...form, descripcion: form.descripcion.trim() };
    if (editando) onEditar(editando._id || editando.id, payload);
    else onCrear(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editando ? 'Editar pretendido' : 'Nuevo pretendido'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <Autocomplete
            options={proveedores}
            value={proveedores.find((p) => p._id === form.proveedorId) || null}
            onChange={(_, v) => set('proveedorId', v?._id || '')}
            getOptionLabel={(o) => o.nombre || ''}
            isOptionEqualToValue={(o, v) => o._id === v._id}
            renderOption={(props, o) => (
              <li {...props}>
                <Box>
                  <Typography variant="body2">{o.nombre}</Typography>
                  {o.tipo === 'mano_de_obra' && (
                    <Typography variant="caption" color="text.secondary">Mano de obra</Typography>
                  )}
                </Box>
              </li>
            )}
            renderInput={(params) => <TextField {...params} label="Proveedor" />}
          />
          <Autocomplete
            options={proyectos}
            value={proyectos.find((p) => p.id === form.proyectoId) || null}
            onChange={(_, v) => set('proyectoId', v?.id || '')}
            getOptionLabel={(o) => o.nombre || ''}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            renderInput={(params) => <TextField {...params} label="Obra" />}
          />
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              label="Semana (lunes)"
              type="date"
              value={form.semana}
              onChange={(e) => set('semana', e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <Tooltip title="Semana actual">
              <Button variant="outlined" sx={{ whiteSpace: 'nowrap', px: 1.5, minWidth: 'auto' }}
                onClick={() => set('semana', getLunesDeEstaSemana())}>
                Hoy
              </Button>
            </Tooltip>
          </Stack>
          <TextField
            label="Monto pretendido"
            type="number"
            value={form.monto}
            onChange={(e) => set('monto', e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            fullWidth
          />
          <TextField
            label="Descripción (opcional)"
            value={form.descripcion}
            onChange={(e) => set('descripcion', e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            placeholder="Detalle del trabajo, materiales, etc."
            multiline
            minRows={2}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between' }}>
        <Box>
          {editando && (
            <Button color="error" onClick={() => onEliminar(editando._id || editando.id)} disabled={isLoading || deleting}>
              {deleting ? <CircularProgress size={16} color="inherit" /> : 'Eliminar'}
            </Button>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit}>
            {isLoading ? <CircularProgress size={18} color="inherit" /> : editando ? 'Guardar' : 'Cargar'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}

function PretendidosPanel({ pretendidos, loading, proyectos, proveedoresManoObra, onCrear, creating, onCerrar, savingId, onEditar, savingEditId, onEliminar, deletingId, empresaId, onOpenDrawer }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [montosCierre, setMontosCierre] = useState({});
  const [presupuestosByProveedor, setPresupuestosByProveedor] = useState({});

  const pendientes = pretendidos.filter((p) => p.estado === 'pendiente');
  const cerrados = pretendidos.filter((p) => p.estado === 'cerrado');

  const proyectosMap = useMemo(() => Object.fromEntries(proyectos.map((p) => [p.id, p])), [proyectos]);

  // Fetch presupuestos for all unique proveedores in pending pretendidos
  useEffect(() => {
    if (!empresaId || pendientes.length === 0) return;
    const uniqueNames = [...new Set(pendientes.map((p) => p.proveedor_nombre).filter(Boolean))];
    uniqueNames.forEach(async (nombre) => {
      if (presupuestosByProveedor[nombre] !== undefined) return;
      try {
        const items = await PresupuestoService.listarPorProveedor(empresaId, nombre);
        setPresupuestosByProveedor((prev) => ({ ...prev, [nombre]: items }));
      } catch {
        setPresupuestosByProveedor((prev) => ({ ...prev, [nombre]: [] }));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, pendientes.length]);

  // Cerrar el dialog cuando termina de crear o editar sin error
  const prevCreating = useState(false);
  useEffect(() => {
    if (prevCreating[0] && !creating) setDialogOpen(false);
    prevCreating[0] = creating;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creating]);

  const prevSaving = useState(null);
  useEffect(() => {
    if (prevSaving[0] != null && savingEditId == null) { setDialogOpen(false); setEditando(null); }
    prevSaving[0] = savingEditId;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savingEditId]);

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Nuevo pretendido
        </Button>
      </Box>

      <NuevoPretendidoDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditando(null); }}
        proyectos={proyectos}
        proveedores={proveedoresManoObra}
        onCrear={onCrear}
        creating={creating}
        editando={editando}
        onEditar={onEditar}
        saving={savingEditId != null}
        onEliminar={(id) => { onEliminar(id); setDialogOpen(false); setEditando(null); }}
        deleting={deletingId != null}
      />

      {/* Lista pendientes */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
          <Typography variant="subtitle2" fontWeight={700}>Pendientes ({pendientes.length})</Typography>
        </Box>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Proveedor</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Obra</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Fecha</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Descripción</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Pretendido</TableCell>
                  <TableCell sx={{ fontWeight: 700, minWidth: 180 }}>Presupuesto (esta obra)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, minWidth: 160 }}>Monto a aprobar</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendientes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">No hay pretendidos pendientes.</Typography>
                    </TableCell>
                  </TableRow>
                )}
                {pendientes.map((p) => {
                  const isSaving = savingId === (p._id || p.id);
                  const montoInput = montosCierre[p._id || p.id] ?? String(p.monto_pretendido);
                  const presupuestosRow = presupuestosByProveedor[p.proveedor_nombre];
                  const mismaObra = presupuestosRow?.filter((b) => b.proyecto_id === p.proyecto_id) ?? null;
                  const otrasObras = presupuestosRow?.filter((b) => b.proyecto_id !== p.proyecto_id) ?? [];
                  return (
                    <TableRow
                      key={p._id || p.id}
                      hover
                      onClick={() => { setEditando(p); setDialogOpen(true); }}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <span>{p.proveedor_nombre}</span>
                          {onOpenDrawer && p.proveedor_id && (
                            <Tooltip title="Ver ficha del proveedor">
                              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onOpenDrawer(p.proveedor_id); }} sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}>
                                <InfoOutlinedIcon fontSize="inherit" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>{p.proyecto_nombre}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatTimestamp(p.semana, 'DIA/MES/ANO') || '-'}</TableCell>
                      <TableCell sx={{ maxWidth: 240, color: 'text.secondary' }}>{p.descripcion || '—'}</TableCell>
                      <TableCell align="right">{formatCurrencyWithCode(p.monto_pretendido)}</TableCell>
                      <TableCell>
                        {presupuestosRow === undefined && <CircularProgress size={12} />}
                        {presupuestosRow !== undefined && mismaObra.length === 0 && (
                          <Typography variant="caption" color="warning.main">Sin presupuesto</Typography>
                        )}
                        {mismaObra !== null && mismaObra.map((b) => {
                          const aprobando = Number(montoInput) || 0;
                          const disponible = (b.monto || 0) - (b.ejecutado || 0);
                          const pct = b.monto > 0 ? Math.round(((b.ejecutado || 0) / b.monto) * 100) : 0;
                          const colorActual = pct >= 100 ? 'error.main' : pct >= 80 ? 'warning.main' : 'success.main';
                          const disponibleTras = disponible - aprobando;
                          const pctTras = b.monto > 0 ? Math.round(((b.ejecutado || 0) + aprobando) / b.monto * 100) : 0;
                          const colorTras = pctTras >= 100 ? 'error.main' : pctTras >= 80 ? 'warning.main' : 'success.main';
                          return (
                            <Stack key={b.id || b._id} spacing={0.25}>
                              <Typography variant="caption" color="text.secondary">
                                Presup: {formatCurrencyWithCode(b.monto, b.moneda)}
                              </Typography>
                              <Typography variant="caption" sx={{ color: colorActual }}>
                                Disp. ahora: <strong>{formatCurrencyWithCode(disponible, b.moneda)}</strong> ({pct}%)
                              </Typography>
                              {aprobando > 0 && (
                                <Typography variant="caption" sx={{ color: colorTras }}>
                                  Disp. tras aprobar: <strong>{formatCurrencyWithCode(disponibleTras, b.moneda)}</strong> ({pctTras}%)
                                </Typography>
                              )}
                            </Stack>
                          );
                        })}
                        {otrasObras.length > 0 && (
                          <Tooltip title={otrasObras.map((b) => {
                            const disp = (b.monto || 0) - (b.ejecutado || 0);
                            return `${proyectosMap[b.proyecto_id]?.nombre || 'Otra obra'}: ${formatCurrencyWithCode(disp, b.moneda)} disp.`;
                          }).join(' | ')}>
                            <Typography variant="caption" color="text.secondary" sx={{ cursor: 'default', textDecoration: 'underline dotted' }}>
                              +{otrasObras.length} obra{otrasObras.length > 1 ? 's' : ''}
                            </Typography>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <TextField
                          size="small"
                          type="number"
                          value={montoInput}
                          onChange={(e) => setMontosCierre((prev) => ({ ...prev, [p._id || p.id]: e.target.value }))}
                          disabled={isSaving}
                          inputProps={{ min: 0 }}
                          sx={{ width: 130 }}
                        />
                      </TableCell>
                      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => onCerrar(p._id || p.id, Number(montoInput))}
                            disabled={isSaving}
                          >
                            {isSaving ? <CircularProgress size={14} /> : 'Aprobar'}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => onCerrar(p._id || p.id, 0)}
                            disabled={isSaving}
                          >
                            Rechazar
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Historial cerrados */}
      {cerrados.length > 0 && (
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary">Historial cerrados ({cerrados.length})</Typography>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Proveedor</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Obra</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Fecha</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Descripción</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Pretendido</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Aprobado</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cerrados.map((p) => (
                  <TableRow key={p._id || p.id} sx={{ opacity: 0.7 }}>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <span>{p.proveedor_nombre}</span>
                        {onOpenDrawer && p.proveedor_id && (
                          <Tooltip title="Ver ficha del proveedor">
                            <IconButton size="small" onClick={() => onOpenDrawer(p.proveedor_id)} sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}>
                              <InfoOutlinedIcon fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>{p.proyecto_nombre}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatTimestamp(p.semana, 'DIA/MES/ANO') || '-'}</TableCell>
                    <TableCell sx={{ maxWidth: 240, color: 'text.secondary' }}>{p.descripcion || '—'}</TableCell>
                    <TableCell align="right">{formatCurrencyWithCode(p.monto_pretendido)}</TableCell>
                    <TableCell align="right">{p.monto_aprobado != null ? formatCurrencyWithCode(p.monto_aprobado) : '—'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={p.monto_aprobado > 0 ? 'Aprobado' : p.monto_aprobado === 0 ? 'Rechazado' : 'Cerrado'}
                        color={p.monto_aprobado > 0 ? 'success' : ESTADO_PRETENDIDO_COLOR[p.estado]}
                        variant={p.monto_aprobado > 0 ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Stack>
  );
}
const MIN_FREE_TEXT_LENGTH = 3;

const ALL_TAB_OPTIONS = [
  {
    value: 'pretendidos',
    label: 'Pretendidos',
    tooltip: 'Solicitudes de pago de mano de obra pendientes de aprobación.',
  },
  {
    value: 'porPagar',
    label: 'Por pagar',
    tooltip: 'Egresos pendientes de pago.',
  },
  {
    value: 'pagados',
    label: 'Pagados',
    tooltip: 'Egresos pagados.',
  },
];

const COLUMNS_STORAGE_KEY = 'control-pagos:hidden-columns';

const TABLE_COLUMNS = [
  { key: 'nombre_proveedor', label: 'Proveedor', minWidth: 130, sortField: 'proveedor' },
  { key: 'proyecto', label: 'Obra', minWidth: 100, sortField: 'proyecto_nombre' },
  { key: 'fecha_factura', label: 'Fecha', minWidth: 82, sortField: 'fecha_factura' },
  { key: 'categoria', label: 'Categoría', minWidth: 100, sortField: 'categoria' },
  { key: 'estado', label: 'Estado', minWidth: 80, sortField: 'estado' },
  { key: 'total', label: 'Saldo', minWidth: 110, align: 'right', sortField: 'total' },
  { key: 'monto_pagado', label: 'Pagado', minWidth: 170, align: 'right', sortField: 'monto_pagado' },
  { key: 'observacion', label: 'Observación', minWidth: 160, sortField: 'observacion' },
];


const flattenDashboardItems = (items = []) => items.flatMap((item) => {
  if (item?.tipo === 'grupo_prorrateo') return item.movimientos || [];
  return item?.data ? [item.data] : [];
});

const validateBuscar = (buscar) => {
  if (!buscar || !buscar.trim()) return null;
  if (buscar.trim().length < MIN_FREE_TEXT_LENGTH) {
    return `La búsqueda requiere al menos ${MIN_FREE_TEXT_LENGTH} caracteres.`;
  }
  return null;
};

const buildDashboardParams = ({ filterState, tabPreset, page, limit, empresaId, proyectoIds = [] }) => {
  const params = {
    page: page + 1,
    limit,
    includeOptions: 'false',
    includeTotals: 'false',
    groupProrrateos: 'false',
    sort: filterState.ordenarPor || 'fecha_factura',
    order: filterState.ordenarDir === 'asc' ? 'asc' : 'desc',
    tipo: 'egreso',
  };

  if (empresaId) params.empresaId = empresaId;
  if (proyectoIds.length > 0) params.proyectoIds = proyectoIds.join(',');
  if (filterState.buscar?.trim()) params.palabras = filterState.buscar.trim();
  if (filterState.proveedores?.length > 0) params.proveedores = filterState.proveedores.join(',');
  if (filterState.categorias?.length > 0) params.categorias = filterState.categorias.join(',');
  if (filterState.fechaDesde) params.fechaDesde = filterState.fechaDesde;
  if (filterState.fechaHasta) params.fechaHasta = filterState.fechaHasta;
  if (tabPreset.estados?.length > 0) params.estados = tabPreset.estados.join(',');
  return params;
};

const buildTabPreset = (tab) => {
  if (tab === 'porPagar') return { estados: ['Pendiente', 'Parcialmente Pagado'] };
  if (tab === 'pagados') return { estados: ['Pagado'] };
  return { estados: [] };
};

const getMovimientoDisplayProyecto = (movimiento, proyectosMap) => (
  movimiento.proyecto_nombre
  || movimiento.proyectoNombre
  || proyectosMap[movimiento.proyecto_id]?.nombre
  || '-'
);

const getNombreUsuario = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.email || null;

const normalizeAmountInput = (value) => {
  if (value == null) return null;
  const normalized = String(value).replace(',', '.').trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildTodayTimestamp = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return dateToTimestamp(`${year}-${month}-${day}`);
};

const buildInlinePagoPatch = (movimiento, nextMontoPagado) => {
  const total = Number(movimiento?.total) || 0;
  const montoPagado = nextMontoPagado == null ? null : Math.max(0, Math.min(nextMontoPagado, total));

  if (!montoPagado || montoPagado <= 0) {
    return {
      monto_pagado: null,
      estado: 'Pendiente',
      fecha_pago: null,
    };
  }

  if (montoPagado >= total - 0.005) {
    return {
      monto_pagado: total,
      estado: 'Pagado',
      fecha_pago: movimiento?.fecha_pago || buildTodayTimestamp(),
    };
  }

  return {
    monto_pagado: montoPagado,
    estado: 'Parcialmente Pagado',
    fecha_pago: movimiento?.fecha_pago || buildTodayTimestamp(),
  };
};

const buildDraftPatch = (movimiento, draft = {}) => {
  const nextMontoPagado = normalizeAmountInput(draft.monto_pagado ?? movimiento.monto_pagado);
  const currentMontoPagado = normalizeAmountInput(movimiento.monto_pagado);

  if (nextMontoPagado === currentMontoPagado) return null;

  return buildInlinePagoPatch(movimiento, nextMontoPagado);
};

const ESTADO_LABEL = {
  Pagado: 'Pagado',
  'Parcialmente Pagado': 'Parcial',
  Pendiente: 'Pendiente',
};

const renderEstadoChip = (estado) => {
  if (!estado) return <Chip size="small" label="—" variant="outlined" />;

  const color = estado === 'Pagado'
    ? 'success'
    : estado === 'Parcialmente Pagado'
      ? 'warning'
      : 'default';

  return <Chip size="small" label={ESTADO_LABEL[estado] ?? estado} color={color} variant={color === 'default' ? 'outlined' : 'filled'} />;
};

const PagosAprobacionesPage = () => {
  const router = useRouter();
  const { user } = useAuthContext();

  const tienePermiso = user?.admin || (user?.empresa?.acciones || user?.empresaData?.acciones || []).includes('VER_CONTROL_PAGOS');

  const [activeTab, setActiveTab] = useState('pretendidos');
  const [empresa, setEmpresa] = useState(null);

  const tabOptions = ALL_TAB_OPTIONS;
  const [proyectos, setProyectos] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [options, setOptions] = useState({});
  const [movimientos, setMovimientos] = useState([]);
  const [loadingScope, setLoadingScope] = useState(false);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [globalMetrics, setGlobalMetrics] = useState(null);
  const [loadingGlobalMetrics, setLoadingGlobalMetrics] = useState(false);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [filterState, setFilterState] = useState({
    buscar: '',
    proveedores: [],
    categorias: [],
    fechaDesde: '',
    fechaHasta: '',
    ordenarPor: 'fecha_factura',
    ordenarDir: 'asc',
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
  const [draftsById, setDraftsById] = useState({});
  const [savingById, setSavingById] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkSaveLoading, setBulkSaveLoading] = useState(false);
  const [imputarOpen, setImputarOpen] = useState(false);
  const [confirmarPagoOpen, setConfirmarPagoOpen] = useState(false);
  const [movimientosParaConfirmar, setMovimientosParaConfirmar] = useState([]);

  // ProveedorDrawer
  const [provDrawerOpen, setProvDrawerOpen] = useState(false);
  const [provDrawerId, setProvDrawerId] = useState(null);
  const openProveedorDrawer = useCallback((id) => {
    if (!id) return;
    setProvDrawerId(id);
    setProvDrawerOpen(true);
  }, []);

  // ── Pretendidos ──────────────────────────────────────────────────────────────
  const [pretendidos, setPretendidos] = useState([]);
  const [loadingPretendidos, setLoadingPretendidos] = useState(false);
  const [proveedoresManoObra, setProveedoresManoObra] = useState([]);
  const [savingPretendidoId, setSavingPretendidoId] = useState(null);
  const [creatingPretendido, setCreatingPretendido] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState(() => {
    try {
      const stored = localStorage.getItem(COLUMNS_STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const [columnsAnchor, setColumnsAnchor] = useState(null);

  const selectedProjectIds = useMemo(
    () => selectedProjects.map((project) => project.id).filter(Boolean),
    [selectedProjects]
  );

  const selectedProjectIdsKey = useMemo(() => selectedProjectIds.join(','), [selectedProjectIds]);

  const visibleColumns = useMemo(
    () => TABLE_COLUMNS.filter((col) => !hiddenColumns.has(col.key)),
    [hiddenColumns]
  );

  const handleToggleColumn = useCallback((key) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try { localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify([...next])); } catch { /* noop */ }
      return next;
    });
  }, []);

  const proyectosMap = useMemo(
    () => Object.fromEntries(proyectos.map((proyecto) => [proyecto.id, proyecto])),
    [proyectos]
  );

  const summary = useMemo(() => {
    const totalVisible = movimientos.reduce((acc, movimiento) => acc + (Number(movimiento.total) || 0), 0);
    const pendientesPago = movimientos.filter((movimiento) => movimiento.estado !== 'Pagado').length;

    return {
      totalVisible,
      pendientesPago,
    };
  }, [movimientos]);

  const allSelectedOnPage = useMemo(() => {
    if (movimientos.length === 0) return false;
    return movimientos.every((movimiento) => selectedIds.has(movimiento.id));
  }, [movimientos, selectedIds]);

  const selectedMovimientos = useMemo(
    () => movimientos.filter((movimiento) => selectedIds.has(movimiento.id)),
    [movimientos, selectedIds]
  );

  const selectedPayableMovimientos = useMemo(
    () => selectedMovimientos.filter((movimiento) => puedeCompletarPagoEgreso(movimiento)),
    [selectedMovimientos]
  );

  const dirtyMovimientos = useMemo(
    () => movimientos.flatMap((movimiento) => {
      const patch = buildDraftPatch(movimiento, draftsById[movimiento.id] || {});
      return patch ? [{ movimiento, patch }] : [];
    }),
    [draftsById, movimientos]
  );

  const dirtyMovimientoIds = useMemo(
    () => new Set(dirtyMovimientos.map(({ movimiento }) => movimiento.id)),
    [dirtyMovimientos]
  );

  const activeSortField = filterState.ordenarPor || 'fecha_factura';
  const activeSortDirection = filterState.ordenarDir === 'asc' ? 'asc' : 'desc';

  const syncUserNames = useCallback(async (rows) => {
    const userIds = [...new Set(
      rows
        .filter((movimiento) => movimiento.id_user && !movimiento.nombre_user)
        .map((movimiento) => movimiento.id_user)
    )];

    if (userIds.length === 0) return rows;

    try {
      const profiles = await Promise.all(userIds.map(async (id) => {
        const profile = await profileService.getProfileById(id) || await profileService.getProfileByUserId(id);
        const name = profile
          ? ([profile.firstName, profile.lastName].filter(Boolean).join(' ').trim() || profile.email || null)
          : null;
        return { id, name };
      }));

      const usersMap = profiles.reduce((acc, entry) => {
        if (entry?.name) acc[entry.id] = entry.name;
        return acc;
      }, {});

      return rows.map((movimiento) => (
        movimiento.id_user && !movimiento.nombre_user && usersMap[movimiento.id_user]
          ? { ...movimiento, nombre_user: usersMap[movimiento.id_user] }
          : movimiento
      ));
    } catch (syncError) {
      console.error('Error sincronizando nombres de usuario:', syncError);
      return rows;
    }
  }, []);

  const fetchScopeData = useCallback(async () => {
    if (!user) return;

    setLoadingScope(true);
    setError(null);

    try {
      const empresaUsuario = await getEmpresaDetailsFromUser(user);
      const proyectosUsuario = await getProyectosFromUser(user);

      if (!empresaUsuario?.id) {
        throw new Error('No se pudo resolver la empresa del usuario.');
      }

      const proyectosNormalizados = (proyectosUsuario || []).map((proyecto) => ({
        ...proyecto,
        empresa_id: proyecto.empresa_id || empresaUsuario.id,
      }));

      setEmpresa(empresaUsuario);
      setProyectos(proyectosNormalizados);
      setSelectedProjects(proyectosNormalizados);
    } catch (scopeError) {
      console.error('Error cargando scope de pagos y aprobaciones:', scopeError);
      setError(scopeError.message || 'No se pudo cargar la empresa del usuario.');
    } finally {
      setLoadingScope(false);
    }
  }, [user]);

  const fetchOptions = useCallback(async () => {
    if (!empresa?.id) return;

    setLoadingOptions(true);
    try {
      const params = { empresaId: empresa.id };
      if (selectedProjectIds.length > 0) params.proyectoIds = selectedProjectIds.join(',');
      const response = await movimientosService.getCajasOptions(params);
      setOptions(response?.options || {});
    } catch (optionsError) {
      console.error('Error cargando opciones de filtros:', optionsError);
      setOptions({});
    } finally {
      setLoadingOptions(false);
    }
  }, [empresa?.id, selectedProjectIds]);

  const fetchGlobalMetrics = useCallback(async () => {
    if (!empresa?.id) return;

    setLoadingGlobalMetrics(true);
    try {
      const params = { tipo: 'egreso', empresaId: empresa.id };
      if (selectedProjectIds.length > 0) params.proyectoIds = selectedProjectIds.join(',');
      const result = await movimientosService.getCajasTotales(params);
      setGlobalMetrics(result?.totals || null);
    } catch (metricsError) {
      console.error('Error cargando métricas globales:', metricsError);
    } finally {
      setLoadingGlobalMetrics(false);
    }
  }, [empresa?.id, selectedProjectIds]);

  const fetchMovimientos = useCallback(async () => {
    if (!empresa?.id) return;

    setLoadingMovimientos(true);
    setError(null);

    try {
      const validationError = validateBuscar(filterState.buscar);
      if (validationError) {
        setMovimientos([]);
        setPagination({ page: page + 1, limit: rowsPerPage, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
        setError(validationError);
        return;
      }

      const tabPreset = buildTabPreset(activeTab);
      const response = await movimientosService.getCajasDashboard(
        buildDashboardParams({
          filterState,
          tabPreset,
          page,
          limit: rowsPerPage,
          empresaId: empresa.id,
          proyectoIds: selectedProjectIds,
        })
      );

      const flatRows = flattenDashboardItems(response?.items || []);
      const hydratedRows = await syncUserNames(flatRows);
      setMovimientos(hydratedRows);
      setPagination(response?.pagination || { page: page + 1, limit: rowsPerPage, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
      setSelectedIds((prev) => new Set([...prev].filter((id) => hydratedRows.some((movimiento) => movimiento.id === id))));
    } catch (fetchError) {
      console.error('Error cargando movimientos de pagos y aprobaciones:', fetchError);
      setMovimientos([]);
      setPagination({ page: page + 1, limit: rowsPerPage, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
      setError(fetchError?.response?.data?.error || fetchError.message || 'No se pudieron cargar los movimientos.');
    } finally {
      setLoadingMovimientos(false);
    }
  }, [empresa?.id, filterState, activeTab, page, rowsPerPage, selectedProjectIds, syncUserNames]);

  const handleRefresh = useCallback(() => {
    fetchMovimientos();
  }, [fetchMovimientos]);

  const handleSort = useCallback((sortField) => {
    if (!sortField) return;
    setFilterState((prev) => ({
      ...prev,
      ordenarPor: sortField,
      ordenarDir: prev.ordenarPor === sortField && prev.ordenarDir === 'asc' ? 'desc' : 'asc',
    }));
    setPage(0);
  }, []);

  const handleTabChange = useCallback((_event, nextTab) => {
    setActiveTab(nextTab);
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelectedOnPage) {
        movimientos.forEach((movimiento) => next.delete(movimiento.id));
        return next;
      }

      movimientos.forEach((movimiento) => next.add(movimiento.id));
      return next;
    });
  }, [allSelectedOnPage, movimientos]);

  const handleToggleSelectOne = useCallback((movimientoId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(movimientoId)) next.delete(movimientoId);
      else next.add(movimientoId);
      return next;
    });
  }, []);

  const handleOpenMovimiento = useCallback((movimiento) => {
    const proyectoNombre = getMovimientoDisplayProyecto(movimiento, proyectosMap);
    router.push({
      pathname: '/movementForm',
      query: {
        movimientoId: movimiento.id,
        proyectoId: movimiento.proyecto_id,
        proyectoName: proyectoNombre,
        lastPageName: 'Pagos y aprobaciones',
        lastPageUrl: router.asPath,
      },
    });
  }, [proyectosMap, router]);

  const handleDraftChange = useCallback((movimientoId, fieldName, value) => {
    setDraftsById((prev) => ({
      ...prev,
      [movimientoId]: {
        ...(prev[movimientoId] || {}),
        [fieldName]: value,
      },
    }));
  }, []);

  const getDraftValue = useCallback((movimiento, fieldName) => {
    const draft = draftsById[movimiento.id];
    if (draft && Object.prototype.hasOwnProperty.call(draft, fieldName)) {
      return draft[fieldName];
    }
    const value = movimiento[fieldName];
    return value == null ? '' : String(value);
  }, [draftsById]);

  const handleSaveChanges = useCallback(async () => {
    if (dirtyMovimientos.length === 0) return;

    const dirtyIds = dirtyMovimientos.map(({ movimiento }) => movimiento.id);
    setBulkSaveLoading(true);
    setFeedback(null);
    setSavingById((prev) => {
      const next = { ...prev };
      dirtyIds.forEach((id) => {
        next[id] = true;
      });
      return next;
    });

    try {
      const nombreUsuario = getNombreUsuario(user);
      const results = await Promise.all(dirtyMovimientos.map(async ({ movimiento, patch }) => {
        const response = await movimientosService.updateMovimiento(
          movimiento.id,
          { ...movimiento, ...patch },
          nombreUsuario
        );

        return {
          id: movimiento.id,
          ok: !response?.error,
          patch,
        };
      }));

      const successResults = results.filter((result) => result.ok);
      const successIds = successResults.map((result) => result.id);
      const patchMap = Object.fromEntries(successResults.map((result) => [result.id, result.patch]));

      setMovimientos((prev) => prev.map((current) => (
        patchMap[current.id] ? { ...current, ...patchMap[current.id] } : current
      )));
      setDraftsById((prev) => {
        const next = { ...prev };
        successIds.forEach((id) => {
          delete next[id];
        });
        return next;
      });

      if (successIds.length === 0) {
        setFeedback({ severity: 'error', message: 'No se pudieron guardar los cambios.' });
      } else if (successIds.length === results.length) {
        setFeedback({ severity: 'success', message: `Se guardaron ${successIds.length} movimiento(s).` });
        fetchMovimientos();
      } else {
        setFeedback({ severity: 'warning', message: `Se guardaron ${successIds.length} de ${results.length} movimiento(s).` });
        fetchMovimientos();
      }
    } catch (saveError) {
      console.error('Error guardando cambios inline:', saveError);
      setFeedback({ severity: 'error', message: 'Error al guardar los cambios.' });
    } finally {
      setSavingById((prev) => {
        const next = { ...prev };
        dirtyIds.forEach((id) => {
          next[id] = false;
        });
        return next;
      });
      setBulkSaveLoading(false);
    }
  }, [dirtyMovimientos, fetchMovimientos, user]);

  const handlePagarSeleccionados = useCallback(() => {
    if (selectedPayableMovimientos.length === 0) return;
    setImputarOpen(true);
  }, [selectedPayableMovimientos]);

  const handleImputarSuccess = useCallback(() => {
    setFeedback({ severity: 'success', message: 'Pago registrado correctamente.' });
    setSelectedIds(new Set());
    fetchMovimientos();
  }, [fetchMovimientos]);

  const handleImputarClose = useCallback(() => {
    setImputarOpen(false);
  }, []);

  // Abrir ConfirmarPagoDialog: si hay cambios inline (dirty) priorizar esos,
  // sino usar los seleccionados con su deuda total como monto a pagar.
  const handleAbrirConfirmarPago = useCallback(() => {
    let movs = [];
    if (dirtyMovimientos.length > 0) {
      movs = dirtyMovimientos.map(({ movimiento, patch }) => {
        const total = Number(movimiento.total) || 0;
        const pagadoAnterior = Number(movimiento.monto_pagado) || 0;
        const pagadoNuevo = Number(patch.monto_pagado);
        const target = Number.isFinite(pagadoNuevo) ? pagadoNuevo : total;
        const delta = Math.max(0, target - pagadoAnterior);
        return { ...movimiento, _montoAPagar: delta };
      }).filter((m) => m._montoAPagar > 0.005);
    } else {
      movs = selectedPayableMovimientos.map((m) => ({
        ...m,
        _montoAPagar: Math.max(0, (Number(m.total) || 0) - (Number(m.monto_pagado) || 0)),
      })).filter((m) => m._montoAPagar > 0.005);
    }
    if (movs.length === 0) return;
    setMovimientosParaConfirmar(movs);
    setConfirmarPagoOpen(true);
  }, [dirtyMovimientos, selectedPayableMovimientos]);

  const handleConfirmarPagoSuccess = useCallback(() => {
    setFeedback({ severity: 'success', message: 'Pago registrado correctamente.' });
    setSelectedIds(new Set());
    setDraftsById({});
    setConfirmarPagoOpen(false);
    setMovimientosParaConfirmar([]);
    fetchMovimientos();
  }, [fetchMovimientos]);

  const fetchPretendidos = useCallback(async () => {
    if (!empresa?.id || activeTab !== 'pretendidos') return;
    setLoadingPretendidos(true);
    try {
      const proyectoIds = selectedProjectIds.length > 0 ? selectedProjectIds : null;
      const items = await Promise.all(
        (proyectoIds || [null]).map((pid) =>
          pretendidosService.listar({ empresaId: empresa.id, proyectoId: pid || undefined })
        )
      );
      setPretendidos(items.flat());
    } catch (err) {
      console.error('Error cargando pretendidos:', err);
    } finally {
      setLoadingPretendidos(false);
    }
  }, [empresa?.id, activeTab, selectedProjectIds]);

  const fetchProveedoresManoObra = useCallback(async () => {
    if (!empresa?.id) return;
    try {
      const todos = await proveedorService.getByEmpresa(empresa.id);
      setProveedoresManoObra(todos || []);
    } catch (err) {
      console.error('Error cargando proveedores:', err);
    }
  }, [empresa?.id]);

  const handleCrearPretendido = useCallback(async ({ proveedorId, proyectoId, semana, monto, descripcion }) => {
    const proyecto = proyectos.find((p) => p.id === proyectoId);
    setCreatingPretendido(true);
    try {
      await pretendidosService.crear({
        empresaId: empresa.id,
        proyectoId,
        proyectoNombre: proyecto?.nombre || '',
        proveedorId,
        semana,
        montoPretendido: Number(monto),
        descripcion,
      });
      setFeedback({ severity: 'success', message: 'Pretendido cargado.' });
      fetchPretendidos();
    } catch (err) {
      setFeedback({ severity: 'error', message: err?.response?.data?.error || 'Error al crear pretendido.' });
    } finally {
      setCreatingPretendido(false);
    }
  }, [empresa?.id, proyectos, fetchPretendidos]);

  const handleCerrarPretendido = useCallback(async (pretendidoId, montoAprobado) => {
    setSavingPretendidoId(pretendidoId);
    try {
      await pretendidosService.cerrar(pretendidoId, montoAprobado);
      setFeedback({ severity: 'success', message: montoAprobado > 0 ? 'Pretendido aprobado y egreso generado.' : 'Pretendido cerrado sin pago.' });
      fetchPretendidos();
    } catch (err) {
      setFeedback({ severity: 'error', message: err?.response?.data?.error || 'Error al cerrar pretendido.' });
    } finally {
      setSavingPretendidoId(null);
    }
  }, [fetchPretendidos]);

  const [savingEditPretendidoId, setSavingEditPretendidoId] = useState(null);
  const [deletingPretendidoId, setDeletingPretendidoId] = useState(null);

  const handleEditarPretendido = useCallback(async (pretendidoId, { proveedorId, proyectoId, semana, monto, descripcion }) => {
    const proyecto = proyectos.find((p) => p.id === proyectoId);
    setSavingEditPretendidoId(pretendidoId);
    try {
      await pretendidosService.actualizar(pretendidoId, {
        proveedorId,
        proyectoId,
        proyectoNombre: proyecto?.nombre || '',
        semana,
        montoPretendido: Number(monto),
        descripcion,
      });
      setFeedback({ severity: 'success', message: 'Pretendido actualizado.' });
      fetchPretendidos();
    } catch (err) {
      setFeedback({ severity: 'error', message: err?.response?.data?.error || 'Error al editar pretendido.' });
    } finally {
      setSavingEditPretendidoId(null);
    }
  }, [proyectos, fetchPretendidos]);

  const handleEliminarPretendido = useCallback(async (pretendidoId) => {
    setDeletingPretendidoId(pretendidoId);
    try {
      await pretendidosService.eliminar(pretendidoId);
      setFeedback({ severity: 'success', message: 'Pretendido eliminado.' });
      fetchPretendidos();
    } catch (err) {
      setFeedback({ severity: 'error', message: err?.response?.data?.error || 'Error al eliminar pretendido.' });
    } finally {
      setDeletingPretendidoId(null);
    }
  }, [fetchPretendidos]);

  useEffect(() => {
    fetchScopeData();
  }, [fetchScopeData]);

  useEffect(() => {
    fetchGlobalMetrics();
  }, [fetchGlobalMetrics]);

  useEffect(() => {
    if (page !== 0) setPage(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterState, activeTab, selectedProjectIdsKey]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  useEffect(() => {
    fetchMovimientos();
  }, [fetchMovimientos]);

  useEffect(() => {
    fetchPretendidos();
  }, [fetchPretendidos]);

  useEffect(() => {
    fetchProveedoresManoObra();
  }, [fetchProveedoresManoObra]);

  if (!user) {
    return (
      <DashboardLayout title="Control de pagos">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  if (!tienePermiso) {
    return (
      <DashboardLayout title="Control de pagos">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
          <Alert severity="warning">No tenés permiso para acceder a esta sección. Pedile a un administrador que habilite la acción <strong>VER_CONTROL_PAGOS</strong> en la configuración de la empresa.</Alert>
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Control de pagos">
      <Head>
        <title>Control de pagos</title>
      </Head>

      <Box component="main" sx={{ flexGrow: 1, py: 1.5 }}>
        <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 } }}>
          <Stack spacing={2}>
            {/* Tabs + filtros en un solo Paper */}
            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ px: 2, pt: 1, borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
                  {tabOptions.map((tab) => (
                    <Tab key={tab.value} value={tab.value} label={tab.label} />
                  ))}
                </Tabs>
              </Box>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} flexWrap="wrap" alignItems="flex-start" sx={{ p: 1.5 }}>
                <Autocomplete
                  multiple
                  limitTags={2}
                  options={proyectos}
                  value={selectedProjects}
                  onChange={(_event, values) => { setSelectedProjects(values); setPage(0); }}
                  getOptionLabel={(option) => option?.nombre || 'Obra'}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  loading={loadingScope}
                  filterSelectedOptions
                  renderInput={(params) => (
                    <TextField {...params} label="Obra" placeholder="Todas las obras" size="small" />
                  )}
                  sx={{ minWidth: 200, flex: 1 }}
                />
                {activeTab !== 'pretendidos' && (
                  <TextField
                    label="Buscar"
                    size="small"
                    value={filterState.buscar}
                    onChange={(e) => setFilterState((prev) => ({ ...prev, buscar: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') { setPage(0); fetchMovimientos(); } }}
                    placeholder="Razón social, descripción..."
                    sx={{ minWidth: 200, flex: 1 }}
                  />
                )}
                {activeTab !== 'pretendidos' && (
                  <Autocomplete
                    multiple
                    limitTags={1}
                    options={options?.proveedores || []}
                    value={filterState.proveedores}
                    onChange={(_e, values) => { setFilterState((prev) => ({ ...prev, proveedores: values })); setPage(0); }}
                    filterSelectedOptions
                    renderInput={(params) => <TextField {...params} label="Proveedor" size="small" />}
                    sx={{ minWidth: 180, flex: 1 }}
                  />
                )}
                {activeTab !== 'pretendidos' && (
                  <Autocomplete
                    multiple
                    limitTags={1}
                    options={options?.categorias || []}
                    value={filterState.categorias}
                    onChange={(_e, values) => { setFilterState((prev) => ({ ...prev, categorias: values })); setPage(0); }}
                    filterSelectedOptions
                    renderInput={(params) => <TextField {...params} label="Categoría" size="small" />}
                    sx={{ minWidth: 160, flex: 1 }}
                  />
                )}
                {activeTab !== 'pretendidos' && (
                  <TextField
                    label="Desde"
                    type="date"
                    size="small"
                    value={filterState.fechaDesde}
                    onChange={(e) => { setFilterState((prev) => ({ ...prev, fechaDesde: e.target.value })); setPage(0); }}
                    InputLabelProps={{ shrink: true }}
                    sx={{ width: 148 }}
                  />
                )}
                {activeTab !== 'pretendidos' && (
                  <TextField
                    label="Hasta"
                    type="date"
                    size="small"
                    value={filterState.fechaHasta}
                    onChange={(e) => { setFilterState((prev) => ({ ...prev, fechaHasta: e.target.value })); setPage(0); }}
                    InputLabelProps={{ shrink: true }}
                    sx={{ width: 148 }}
                  />
                )}
                <Button type="button" variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={handleRefresh} disabled={loadingMovimientos} sx={{ alignSelf: 'center', whiteSpace: 'nowrap' }}>
                  Actualizar
                </Button>
              </Stack>
            </Paper>

            {error && <Alert severity="error">{error}</Alert>}
            {feedback && <Alert severity={feedback.severity}>{feedback.message}</Alert>}

            {activeTab === 'pretendidos' && (
              <PretendidosPanel
                pretendidos={pretendidos}
                loading={loadingPretendidos}
                proyectos={proyectos}
                proveedoresManoObra={proveedoresManoObra}
                onCrear={handleCrearPretendido}
                creating={creatingPretendido}
                onCerrar={handleCerrarPretendido}
                savingId={savingPretendidoId}
                onEditar={handleEditarPretendido}
                savingEditId={savingEditPretendidoId}
                onEliminar={handleEliminarPretendido}
                deletingId={deletingPretendidoId}
                empresaId={empresa?.id}
                onOpenDrawer={openProveedorDrawer}
              />
            )}

            {activeTab !== 'pretendidos' && <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
              {/* Métricas globales */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} flexWrap="wrap" alignItems="center" sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
                <Typography variant="body2" color="text.secondary">
                  Saldo a pagar: <strong>{globalMetrics ? formatCurrencyWithCode(globalMetrics.currencies?.ARS?.egreso || 0, 'ARS') : '—'}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pagado: <strong>{globalMetrics ? formatCurrencyWithCode(globalMetrics.egresosAprobacion?.totalMontoPagado || 0, 'ARS') : '—'}</strong>
                </Typography>
              </Stack>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} sx={{ p: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                  <Chip label={`${selectedIds.size} seleccionado(s)`} size="small" variant="outlined" />
                  <Chip label={`${selectedPayableMovimientos.length} pagables`} size="small" variant="outlined" color="success" />
                  <Chip label={`${dirtyMovimientos.length} con cambios`} size="small" variant="outlined" color="warning" />
                  <Typography variant="caption" color="text.secondary">
                    {pagination.total || 0} resultados — Saldo: <strong>{formatCurrencyWithCode(summary.totalVisible, 'ARS')}</strong>
                    {summary.pendientesPago > 0 && <span style={{ marginLeft: 8, color: '#d32f2f', fontWeight: 600 }}>{summary.pendientesPago} sin pagar</span>}
                  </Typography>
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button
                    type="button"
                    variant="outlined"
                    startIcon={<ViewColumnIcon fontSize="small" />}
                    onClick={(e) => setColumnsAnchor(e.currentTarget)}
                    size="small"
                  >
                    Columnas
                  </Button>
                  <Popover
                    open={Boolean(columnsAnchor)}
                    anchorEl={columnsAnchor}
                    onClose={() => setColumnsAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  >
                    <Box sx={{ p: 1.5, minWidth: 180 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Columnas visibles
                      </Typography>
                      {TABLE_COLUMNS.map((col) => (
                        <FormControlLabel
                          key={col.key}
                          control={
                            <Checkbox
                              size="small"
                              checked={!hiddenColumns.has(col.key)}
                              onChange={() => handleToggleColumn(col.key)}
                            />
                          }
                          label={<Typography variant="body2">{col.label}</Typography>}
                          sx={{ display: 'flex', m: 0 }}
                        />
                      ))}
                    </Box>
                  </Popover>
                  <Button
                    type="button"
                    variant="contained"
                    color="success"
                    startIcon={<PaymentsIcon fontSize="small" />}
                    onClick={handleAbrirConfirmarPago}
                    disabled={selectedPayableMovimientos.length === 0 && dirtyMovimientos.length === 0}
                  >
                    {(() => {
                      const c = dirtyMovimientos.length > 0
                        ? dirtyMovimientos.length
                        : selectedPayableMovimientos.length;
                      return `Pagar (${c})`;
                    })()}
                  </Button>
                </Stack>
              </Stack>

              {(loadingMovimientos || loadingOptions) && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={28} />
                </Box>
              )}

              <TableContainer sx={{ maxHeight: 'calc(100vh - 320px)' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={allSelectedOnPage}
                          indeterminate={!allSelectedOnPage && selectedIds.size > 0}
                          onChange={handleToggleSelectAll}
                        />
                      </TableCell>
                      {visibleColumns.map((column) => (
                        <TableCell
                          key={column.key}
                          align={column.align || 'left'}
                          sx={{ minWidth: column.minWidth, fontWeight: 700, whiteSpace: 'nowrap' }}
                          sortDirection={activeSortField === column.sortField ? activeSortDirection : false}
                        >
                          <TableSortLabel
                            active={activeSortField === column.sortField}
                            direction={activeSortField === column.sortField ? activeSortDirection : 'asc'}
                            onClick={() => handleSort(column.sortField)}
                          >
                            {column.label}
                          </TableSortLabel>
                        </TableCell>
                      ))}
                      <TableCell align="center" sx={{ minWidth: 160, fontWeight: 700 }}>Acciones</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {movimientos.map((movimiento) => {
                      const savingRow = !!savingById[movimiento.id];
                      const draftMontoPagado = getDraftValue(movimiento, 'monto_pagado');
                      const rowDirty = dirtyMovimientoIds.has(movimiento.id);

                      return (
                        <TableRow
                          hover
                          key={movimiento.id}
                          selected={selectedIds.has(movimiento.id)}
                          sx={{
                            '& .MuiTableCell-root': { py: 0.5 },
                            ...(rowDirty ? { backgroundColor: 'rgba(255, 244, 229, 0.6)' } : {}),
                          }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={selectedIds.has(movimiento.id)}
                              onChange={() => handleToggleSelectOne(movimiento.id)}
                            />
                          </TableCell>

                          {visibleColumns.map((column) => {
                            if (column.key === 'nombre_proveedor') {
                              return (
                                <TableCell key={`${movimiento.id}-${column.key}`} sx={{ whiteSpace: 'nowrap' }}>
                                  <Stack direction="row" alignItems="center" spacing={0.5}>
                                    <span>{movimiento.nombre_proveedor || '-'}</span>
                                    {openProveedorDrawer && movimiento.id_proveedor && (
                                      <Tooltip title="Ver ficha del proveedor">
                                        <IconButton
                                          size="small"
                                          onClick={(e) => { e.stopPropagation(); openProveedorDrawer(movimiento.id_proveedor); }}
                                          sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                                        >
                                          <InfoOutlinedIcon fontSize="inherit" />
                                        </IconButton>
                                      </Tooltip>
                                    )}
                                  </Stack>
                                </TableCell>
                              );
                            }

                            if (column.key === 'proyecto') {
                              return (
                                <TableCell key={`${movimiento.id}-${column.key}`} sx={{ whiteSpace: 'nowrap' }}>
                                  {getMovimientoDisplayProyecto(movimiento, proyectosMap)}
                                </TableCell>
                              );
                            }

                            if (column.key === 'estado') {
                              return (
                                <TableCell key={`${movimiento.id}-${column.key}`}>
                                  {renderEstadoChip(movimiento.estado)}
                                </TableCell>
                              );
                            }

                            if (column.key === 'total') {
                              return (
                                <TableCell key={`${movimiento.id}-${column.key}`} align="right" sx={{ whiteSpace: 'nowrap' }}>
                                  {formatCurrencyWithCode(movimiento.total || 0, movimiento.moneda || 'ARS')}
                                </TableCell>
                              );
                            }

                            if (column.key === 'monto_pagado') {
                              const pctPagado = (() => {
                                const v = normalizeAmountInput(draftMontoPagado);
                                const t = movimiento.total;
                                if (!v || !t || t <= 0) return null;
                                return Math.round((v / t) * 100);
                              })();
                              return (
                                <TableCell key={`${movimiento.id}-${column.key}`} align="right" sx={{ whiteSpace: 'nowrap' }}>
                                  <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={pctPagado ?? ''}
                                      onChange={(event) => {
                                        const pct = parseFloat(event.target.value);
                                        const t = Number(movimiento.total) || 0;
                                        if (Number.isFinite(pct) && t > 0) {
                                          handleDraftChange(movimiento.id, 'monto_pagado', String(Math.round((pct / 100) * t)));
                                        } else if (event.target.value === '') {
                                          handleDraftChange(movimiento.id, 'monto_pagado', '');
                                        }
                                      }}
                                      onKeyDown={(event) => { if (event.key === 'Enter') event.preventDefault(); }}
                                      disabled={savingRow || bulkSaveLoading}
                                      inputProps={{ style: { padding: '3px 4px', fontSize: '0.7rem', textAlign: 'right' }, min: 0, max: 100 }}
                                      sx={{ width: 52 }}
                                    />
                                    <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>%</Typography>
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={draftMontoPagado}
                                      onChange={(event) => handleDraftChange(movimiento.id, 'monto_pagado', event.target.value)}
                                      onKeyDown={(event) => { if (event.key === 'Enter') event.preventDefault(); }}
                                      disabled={savingRow || bulkSaveLoading}
                                      inputProps={{ style: { padding: '3px 8px', fontSize: '0.8125rem' } }}
                                      sx={{ width: 110 }}
                                    />
                                    <Button
                                      type="button"
                                      size="small"
                                      variant="text"
                                      title="Marcar como pagado"
                                      onClick={() => {
                                        handleDraftChange(movimiento.id, 'monto_pagado', String(movimiento.total || ''));
                                      }}
                                      disabled={savingRow || bulkSaveLoading}
                                      sx={{ minWidth: 0, px: 0.75, py: 0.25, fontSize: '0.7rem', color: 'success.main', textTransform: 'none', fontWeight: 600 }}
                                    >
                                      OK
                                    </Button>
                                  </Stack>
                                </TableCell>
                              );
                            }

                            if (column.key === 'fecha_factura') {
                              return (
                                <TableCell key={`${movimiento.id}-${column.key}`} sx={{ whiteSpace: 'nowrap' }}>
                                  {formatTimestamp(movimiento[column.key], 'DIA/MES/ANO') || '-'}
                                </TableCell>
                              );
                            }

                            return (
                              <TableCell
                                key={`${movimiento.id}-${column.key}`}
                                align={column.align || 'left'}
                                sx={{ whiteSpace: 'nowrap', verticalAlign: 'middle' }}
                              >
                                {movimiento[column.key] || '-'}
                              </TableCell>
                            );
                          })}

                          <TableCell align="center" sx={{ whiteSpace: 'nowrap', py: 0.5 }}>
                            <Button
                              type="button"
                              size="small"
                              variant="outlined"
                              endIcon={<OpenInNewIcon sx={{ fontSize: '0.875rem !important' }} />}
                              onClick={() => handleOpenMovimiento(movimiento)}
                              disabled={savingRow || bulkSaveLoading}
                              sx={{ py: 0.25, px: 1, fontSize: '0.75rem', minWidth: 0 }}
                            >
                              Abrir
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {!loadingMovimientos && movimientos.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={visibleColumns.length + 2} align="center" sx={{ py: 5 }}>
                          <Typography variant="body2" color="text.secondary">
                            No hay movimientos para la vista activa con el scope seleccionado.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={pagination.total || 0}
                page={page}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={PAGE_SIZE_OPTIONS}
                onPageChange={(_event, newPage) => setPage(newPage)}
                onRowsPerPageChange={(event) => {
                  setRowsPerPage(parseInt(event.target.value, 10));
                  setPage(0);
                }}
              />
            </Paper>}
          </Stack>
        </Container>
      </Box>

      {imputarOpen && (
        <ImputarPagoDialogLazy
          open={imputarOpen}
          onClose={handleImputarClose}
          onSuccess={handleImputarSuccess}
          proveedor={selectedPayableMovimientos[0]?.nombre_proveedor || 'Seleccionados'}
          remitos={selectedPayableMovimientos}
          selectedIdsInicial={[...selectedIds]}
        />
      )}

      <ConfirmarPagoDialog
        open={confirmarPagoOpen}
        onClose={() => { setConfirmarPagoOpen(false); setMovimientosParaConfirmar([]); }}
        onSuccess={handleConfirmarPagoSuccess}
        empresaId={empresa?.id}
        movimientos={movimientosParaConfirmar}
      />

      <ProveedorDrawer
        open={provDrawerOpen}
        onClose={() => setProvDrawerOpen(false)}
        proveedorId={provDrawerId}
        empresaId={empresa?.id}
        categoriasEmpresa={empresa?.categorias || []}
        onUpdate={() => {}}
      />
    </DashboardLayout>
  );
};

function ImputarPagoDialogLazy(props) {
  // eslint-disable-next-line global-require
  const ImputarPagoDialog = require('src/components/pagos/ImputarPagoDialog').default;
  return <ImputarPagoDialog {...props} />;
}

export default PagosAprobacionesPage;