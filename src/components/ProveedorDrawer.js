import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import AttachmentIcon from '@mui/icons-material/Attachment';
import BalanceIcon from '@mui/icons-material/Balance';
import BlockIcon from '@mui/icons-material/Block';
import CallMergeIcon from '@mui/icons-material/CallMerge';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionIcon from '@mui/icons-material/Description';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PaymentsIcon from '@mui/icons-material/Payments';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import { useRouter } from 'next/router';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import SaveIcon from '@mui/icons-material/Save';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarIcon from '@mui/icons-material/Star';
import proveedorService from 'src/services/proveedorService';
import { formatCurrencyWithCode, formatTimestamp } from 'src/utils/formatters';
import RegistrarPagoDialog from 'src/components/pagos/RegistrarPagoDialog';
import AnularPagoDialog from 'src/components/pagos/AnularPagoDialog';
import CombinarProveedorDialog from 'src/components/proveedores/CombinarProveedorDialog';
import RegistrarPresupuestoDialog from 'src/components/presupuestos/RegistrarPresupuestoDialog';
import { getProyectosByEmpresaId } from 'src/services/proyectosService';

// ─── Context ──────────────────────────────────────────────────────────────────

const ProveedorDrawerContext = createContext({
  openDrawer: () => {},
  closeDrawer: () => {},
});

export const useProveedorDrawer = () => useContext(ProveedorDrawerContext);

// ─── Constantes ───────────────────────────────────────────────────────────────

const TAB_DATOS = 0;
const TAB_CUENTA = 1;
const TAB_PRESUPUESTOS = 2;
const TAB_PRETENDIDOS = 3;

const estadoChipColor = (estado) => {
  if (estado === 'Pagado') return 'success';
  if (estado === 'Pendiente') return 'warning';
  if (estado === 'Parcialmente Pagado') return 'info';
  return 'default';
};

// ─── Tab: Datos ───────────────────────────────────────────────────────────────

function TabDatos({ proveedor, empresaId, categoriasEmpresa, estadoDefaultEmpresa = 'Pagado', onSaved, onArchived }) {
  const provId = proveedor?._id || proveedor?.id;

  const [form, setForm] = useState({
    nombre: '', razon_social: '', cuit: '', direccion: '',
    tipo: 'materiales', tiene_cuenta_corriente: true, alias: [], categorias: [],
    estado_inicial: null,
  });
  const [aliasInput, setAliasInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [confirmArchivar, setConfirmArchivar] = useState(false);
  const [combinarOpen, setCombinarOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!proveedor) return;
    setForm({
      nombre: proveedor.nombre || '',
      razon_social: proveedor.razon_social || '',
      cuit: proveedor.cuit || '',
      direccion: proveedor.direccion || '',
      tipo: proveedor.tipo || 'materiales',
      tiene_cuenta_corriente: proveedor.tiene_cuenta_corriente !== false,
      alias: proveedor.alias || [],
      categorias: proveedor.categorias || [],
      estado_inicial: proveedor.estado_inicial ?? null,
    });
  }, [proveedor]);

  const handleSave = async () => {
    if (!form.nombre.trim()) { setErrorMsg('El nombre es obligatorio'); return; }
    setSaving(true);
    setErrorMsg('');
    try {
      await proveedorService.actualizar(empresaId, provId, {
        nombre: form.nombre.trim(),
        razon_social: form.razon_social.trim(),
        cuit: form.cuit.trim(),
        direccion: form.direccion.trim(),
        tipo: form.tipo,
        tiene_cuenta_corriente: form.tiene_cuenta_corriente,
        alias: form.alias,
        categorias: form.categorias,
        estado_inicial: form.estado_inicial,
      });
      onSaved?.();
    } catch {
      setErrorMsg('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const estaArchivado = proveedor?.archivado === true;

  const handleToggleArchivado = async () => {
    setArchiving(true);
    try {
      await proveedorService.actualizar(empresaId, provId, { archivado: !estaArchivado });
      setConfirmArchivar(false);
      onArchived?.();
    } catch {
      setErrorMsg(estaArchivado ? 'Error al desarchivar' : 'Error al archivar');
    } finally {
      setArchiving(false);
    }
  };

  const removeAlias = (a) => setForm(f => ({ ...f, alias: f.alias.filter(x => x !== a) }));
  const addAlias = () => {
    const v = aliasInput.trim();
    if (!v) return;
    setForm(f => ({ ...f, alias: [...new Set([...f.alias, v])] }));
    setAliasInput('');
  };

  const categoriasOptions = (categoriasEmpresa || []).flatMap(cat => [
    cat.name,
    ...(cat.subcategorias || []).map(sub => `${cat.name} - ${sub}`),
  ]);

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2}>
        <TextField
          fullWidth label="Nombre" value={form.nombre}
          onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
        />
        <TextField
          fullWidth label="CUIT" value={form.cuit}
          onChange={e => setForm(f => ({ ...f, cuit: e.target.value }))}
        />
        <TextField
          fullWidth label="Razón Social" value={form.razon_social}
          onChange={e => setForm(f => ({ ...f, razon_social: e.target.value }))}
        />
        <TextField
          fullWidth label="Dirección" value={form.direccion}
          onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))}
        />

        <FormControl fullWidth>
          <InputLabel>Tipo</InputLabel>
          <Select
            value={form.tipo} label="Tipo"
            onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
          >
            <MenuItem value="materiales">Materiales</MenuItem>
            <MenuItem value="mano_de_obra">Mano de obra</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Estado por defecto de movimientos</InputLabel>
          <Select
            value={form.estado_inicial ?? ''}
            label="Estado por defecto de movimientos"
            onChange={e => setForm(f => ({ ...f, estado_inicial: e.target.value === '' ? null : e.target.value }))}
          >
            <MenuItem value="">Usar default de empresa ({estadoDefaultEmpresa})</MenuItem>
            <MenuItem value="Pendiente">Siempre Pendiente</MenuItem>
            <MenuItem value="Pagado">Siempre Pagado</MenuItem>
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Switch
              checked={form.tiene_cuenta_corriente}
              onChange={e => setForm(f => ({ ...f, tiene_cuenta_corriente: e.target.checked }))}
            />
          }
          label="Gestionar cuenta corriente"
        />

        {/* Alias */}
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
            Alias
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={0.5} mb={0.5}>
            {form.alias.map((a, i) => (
              <Chip key={i} label={a} size="small" onDelete={() => removeAlias(a)} />
            ))}
          </Stack>
          <TextField
            fullWidth size="small"
            placeholder="Escribí y presioná Enter"
            value={aliasInput}
            onChange={e => setAliasInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAlias(); } }}
          />
        </Box>

        {/* Categorías */}
        <Autocomplete
          multiple
          options={categoriasOptions}
          value={form.categorias}
          onChange={(_, v) => setForm(f => ({ ...f, categorias: v }))}
          renderTags={(value, getTagProps) =>
            value.map((opt, i) => (
              <Chip key={i} size="small" label={opt} {...getTagProps({ index: i })} />
            ))
          }
          renderInput={params => <TextField {...params} label="Categorías" />}
        />

        {errorMsg && <Alert severity="error">{errorMsg}</Alert>}

        <Stack direction="row" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Stack direction="row" spacing={1}>
            <Button
              variant={estaArchivado ? 'contained' : 'outlined'}
              color={estaArchivado ? 'success' : 'error'}
              size="small"
              onClick={() => setConfirmArchivar(true)}
            >
              {estaArchivado ? 'Desarchivar' : 'Archivar'}
            </Button>
            {!estaArchivado && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<CallMergeIcon fontSize="small" />}
                onClick={() => setCombinarOpen(true)}
              >
                Combinar
              </Button>
            )}
          </Stack>
          <Button
            variant="contained" startIcon={<SaveIcon />}
            onClick={handleSave} disabled={saving}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </Stack>
      </Stack>

      {/* Combinar con otro proveedor */}
      <CombinarProveedorDialog
        open={combinarOpen}
        onClose={() => setCombinarOpen(false)}
        onSuccess={() => {
          setCombinarOpen(false);
          onArchived?.(); // cierra el drawer y refresca lista (el proveedor actual fue eliminado)
        }}
        empresaId={empresaId}
        proveedorOrigen={proveedor}
      />

      {/* Confirm archivar / desarchivar */}
      <Dialog open={confirmArchivar} onClose={() => setConfirmArchivar(false)}>
        <DialogTitle>{estaArchivado ? 'Desarchivar proveedor' : 'Archivar proveedor'}</DialogTitle>
        <DialogContent>
          <Typography>
            {estaArchivado
              ? `¿Desarchivar "${proveedor?.nombre}"? Volverá a aparecer en las listas.`
              : `¿Archivar "${proveedor?.nombre}"? No aparecerá en las listas pero sus datos se conservan.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmArchivar(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color={estaArchivado ? 'success' : 'error'}
            onClick={handleToggleArchivado}
            disabled={archiving}
          >
            {archiving
              ? (estaArchivado ? 'Desarchivando…' : 'Archivando…')
              : (estaArchivado ? 'Desarchivar' : 'Archivar')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ─── Tab: Cuenta corriente (extracto unificado movimientos + pagos) ────────

const METODO_PAGO_LABEL = {
  transferencia: 'Transferencia',
  cheque: 'Cheque',
  efectivo: 'Efectivo',
  otro: 'Otro',
};

// Extrae el timestamp embebido en un ObjectId de Mongo (primeros 4 bytes = segundos).
// Sirve como fallback cuando el backend no devuelve createdAt explícitamente.
const objectIdToMs = (id) => {
  if (!id || typeof id !== 'string' || id.length < 8) return 0;
  const hex = id.slice(0, 8);
  if (!/^[0-9a-f]+$/i.test(hex)) return 0;
  const secs = parseInt(hex, 16);
  if (!Number.isFinite(secs)) return 0;
  return secs * 1000;
};

// Devuelve un timestamp (ms) "de carga". Prioridad:
//   1) createdAt / created_at  (timestamps automáticos de Mongoose)
//   2) fecha_creacion           (campo legacy de MovimientoCaja, default Date.now al crear)
//   3) ObjectId embedded timestamp (fallback para docs muy viejos)
const getCreadoMs = (doc) => {
  if (!doc) return 0;
  const candidates = [doc.createdAt, doc.created_at, doc.fecha_creacion];
  for (const c of candidates) {
    if (!c) continue;
    const t = new Date(c).getTime();
    if (Number.isFinite(t) && t > 0) return t;
  }
  return objectIdToMs(doc._id || doc.id);
};

// Formatea un createdAt como "DD/MM HH:mm" (corto, para columna).
const formatCreadoEn = (val) => {
  if (!val) return '—';
  const ms = typeof val === 'number' ? val : new Date(val).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return '—';
  const d = new Date(ms);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm} ${hh}:${mi}`;
};

function FilaPago({ row, onAnular, movimientosPorId = {} }) {
  const [expandido, setExpandido] = useState(false);
  const pago = row.pago;
  const anulado = pago.estado === 'anulado';
  const tieneImputaciones = (pago.imputaciones || []).length > 0;
  const tieneComprobantes = (pago.comprobantes || []).length > 0;
  const expandible = tieneImputaciones || tieneComprobantes;

  const obrasImputadas = useMemo(() => {
    const set = new Set();
    (pago.imputaciones || []).forEach((imp) => {
      const mov = movimientosPorId[String(imp.movimiento_id)];
      const obra = mov?.proyecto_nombre || mov?.proyectoNombre;
      if (obra) set.add(obra);
    });
    return [...set];
  }, [pago.imputaciones, movimientosPorId]);

  return (
    <>
      <TableRow
        hover={!anulado}
        sx={{
          bgcolor: anulado ? 'action.disabledBackground' : 'success.lighter',
          '&:hover': { bgcolor: anulado ? 'action.disabledBackground' : 'success.light' },
          opacity: anulado ? 0.6 : 1,
        }}
      >
        <TableCell sx={{ width: 28, p: 0.5 }}>
          {expandible && (
            <IconButton size="small" onClick={() => setExpandido((p) => !p)}>
              {expandido ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          )}
        </TableCell>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {pago.fecha_pago ? formatTimestamp(pago.fecha_pago, 'DIA/MES/ANO') : '—'}
        </TableCell>
        <TableCell />
        <TableCell>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <PaymentsIcon fontSize="small" sx={{ color: anulado ? 'text.disabled' : 'success.main' }} />
            <Typography
              variant="body2"
              sx={{ textDecoration: anulado ? 'line-through' : 'none', fontWeight: 500 }}
            >
              Pago — {METODO_PAGO_LABEL[pago.metodo] || pago.metodo || 'Otro'}
            </Typography>
            {anulado && <Chip size="small" label="Anulado" color="default" />}
            {tieneComprobantes && (
              <Tooltip title={`${pago.comprobantes.length} comprobante(s)`}>
                <AttachmentIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              </Tooltip>
            )}
          </Stack>
        </TableCell>
        <TableCell sx={{ maxWidth: 140 }}>
          {obrasImputadas.length === 0 ? (
            <Typography variant="body2" color="text.disabled">—</Typography>
          ) : (
            <Tooltip title={obrasImputadas.join(', ')}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {obrasImputadas.length === 1 ? obrasImputadas[0] : `${obrasImputadas[0]} +${obrasImputadas.length - 1}`}
              </Typography>
            </Tooltip>
          )}
        </TableCell>
        <TableCell align="right" />
        <TableCell align="right" sx={{ color: anulado ? 'text.disabled' : 'success.main', fontWeight: 600 }}>
          {formatCurrencyWithCode(pago.monto_bruto)}
        </TableCell>
        <TableCell
          align="right"
          sx={{
            fontWeight: 700,
            color: row._saldo < -0.005 ? 'info.main'
              : row._saldo > 0.005 ? 'error.main'
              : 'text.primary',
          }}
        >
          {formatCurrencyWithCode(Math.abs(row._saldo))}
          {row._saldo < -0.005 && (
            <Typography variant="caption" sx={{ display: 'block', fontWeight: 500, color: 'info.main' }}>
              a favor
            </Typography>
          )}
        </TableCell>
        <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.disabled', fontSize: '0.75rem' }}>
          {formatCreadoEn(getCreadoMs(pago))}
        </TableCell>
        <TableCell sx={{ width: 32, p: 0.5 }}>
          {!anulado && onAnular && (
            <Tooltip title="Anular pago">
              <IconButton size="small" color="error" onClick={() => onAnular(pago)}>
                <BlockIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </TableCell>
      </TableRow>

      {expandible && (
        <TableRow>
          <TableCell colSpan={10} sx={{ py: 0, px: 0, borderBottom: expandido ? undefined : 'none' }}>
            <Collapse in={expandido} timeout="auto" unmountOnExit>
              <Box sx={{ px: 2, py: 1.5, bgcolor: 'grey.50' }}>
                {tieneImputaciones && (
                  <Box sx={{ mb: tieneComprobantes ? 1.5 : 0 }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                      IMPUTACIONES
                    </Typography>
                    <Table size="small" sx={{ '& td, & th': { borderBottom: 'none', py: 0.25, px: 1 } }}>
                      <TableBody>
                        {pago.imputaciones.map((imp, idx) => {
                          const mov = movimientosPorId[String(imp.movimiento_id)];
                          const fecha = mov?.fecha_factura ? formatTimestamp(mov.fecha_factura, 'DIA/MES/ANO') : '—';
                          const detalle = mov?.detalle || mov?.observacion || mov?.categoria || (mov?.codigo_operacion ? `Op. ${mov.codigo_operacion}` : 'Factura');
                          const totalFactura = mov?.total;
                          return (
                            <TableRow key={idx}>
                              <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary', width: 90 }}>
                                <Typography variant="body2">{fecha}</Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>
                                  {detalle}
                                </Typography>
                                {totalFactura != null && (
                                  <Typography variant="caption" color="text.secondary">
                                    Factura: {formatCurrencyWithCode(totalFactura)}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                                {formatCurrencyWithCode(imp.monto_imputado)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {(pago.monto_sin_imputar || 0) > 0.005 && (
                          <TableRow>
                            <TableCell colSpan={2}>
                              <Typography variant="body2" color="warning.main">
                                Sin imputar
                              </Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ color: 'warning.main', fontWeight: 600 }}>
                              {formatCurrencyWithCode(pago.monto_sin_imputar)}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Box>
                )}
                {(pago.retenciones || []).length > 0 && (
                  <Box sx={{ mb: tieneComprobantes ? 1.5 : 0 }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                      RETENCIONES
                    </Typography>
                    {pago.retenciones.map((r, idx) => (
                      <Typography key={idx} variant="body2">
                        · {r.descripcion || 'Retención'}{r.porcentaje ? ` (${r.porcentaje}%)` : ''}: {formatCurrencyWithCode(r.monto)}
                      </Typography>
                    ))}
                  </Box>
                )}
                {tieneComprobantes && (
                  <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                      COMPROBANTES
                    </Typography>
                    <Stack spacing={0.25}>
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
                  </Box>
                )}
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function FilaMovimiento({ row }) {
  const m = row.movimiento;
  return (
    <TableRow hover>
      <TableCell sx={{ width: 28 }} />
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        {m.fecha_factura ? formatTimestamp(m.fecha_factura, 'DIA/MES/ANO') : '—'}
      </TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        <Typography
          component="a"
          href={`/movementForm?movimientoId=${m._id || m.id}&lastPageName=Proveedor&lastPageUrl=${typeof window !== 'undefined' ? window.location.pathname + window.location.search : ''}`}
          target="_blank"
          rel="noopener"
          variant="body2"
          sx={{
            color: m.codigo_operacion ? 'primary.main' : 'text.disabled',
            textDecoration: 'none',
            '&:hover': { color: 'primary.main', textDecoration: 'underline' },
          }}
        >
          {m.codigo_operacion || 'ver'}
        </Typography>
      </TableCell>
      <TableCell sx={{ maxWidth: 180 }}>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <DescriptionIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          <Tooltip title={m.detalle || m.observacion || m.categoria || ''}>
            <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {m.detalle || m.observacion || m.categoria || 'Factura'}
            </Typography>
          </Tooltip>
        </Stack>
      </TableCell>
      <TableCell sx={{ maxWidth: 140 }}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {m.proyecto_nombre || m.proyectoNombre || '—'}
        </Typography>
      </TableCell>
      <TableCell align="right" sx={{ color: 'error.main', fontWeight: 500 }}>
        {formatCurrencyWithCode(m.total, m.moneda)}
      </TableCell>
      <TableCell align="right">
        {(() => {
          const haber = Number(m.monto_pagado) || 0;
          const total = Number(m.total) || 0;
          if (haber < 0.005) return <Typography variant="body2" color="text.disabled">—</Typography>;
          const totalmente = haber >= total - 0.005;
          return (
            <Tooltip
              title={
                totalmente
                  ? `Imputado: ${formatCurrencyWithCode(haber)}`
                  : `Parcial: ${formatCurrencyWithCode(haber)} de ${formatCurrencyWithCode(total)}`
              }
            >
              <Stack direction="row" spacing={0.25} justifyContent="flex-end" alignItems="center">
                <CheckIcon fontSize="small" color={totalmente ? 'success' : 'warning'} />
                {!totalmente && (
                  <Typography variant="caption" color="warning.main" fontWeight={700}>*</Typography>
                )}
              </Stack>
            </Tooltip>
          );
        })()}
      </TableCell>
      <TableCell
        align="right"
        sx={{
          fontWeight: 700,
          color: row._saldo < -0.005 ? 'info.main'
            : row._saldo > 0.005 ? 'error.main'
            : 'text.primary',
        }}
      >
        {formatCurrencyWithCode(Math.abs(row._saldo))}
        {row._saldo < -0.005 && (
          <Typography variant="caption" sx={{ display: 'block', fontWeight: 500, color: 'info.main' }}>
            a favor
          </Typography>
        )}
      </TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.disabled', fontSize: '0.75rem' }}>
        {formatCreadoEn(getCreadoMs(m))}
      </TableCell>
      <TableCell sx={{ width: 32 }} />
    </TableRow>
  );
}

function TabCuentaCorriente({
  movimientos = [],
  pagos = [],
  presupuesto,
  loading,
  onRegistrarPago,
  onAnularPago,
  onCargarMovimiento,
  onImputarSaldoFavor,
  imputarSaldoFavorLoading = false,
}) {
  // Orden seleccionado por el usuario.
  //  - 'fecha'    → ordena por día calendario (fecha_factura/fecha_pago), desempate por createdAt
  //  - 'creadoEn' → ordena puramente por timestamp de carga (createdAt)
  // Siempre descendente: lo más reciente arriba.
  const [sortBy, setSortBy] = useState('fecha');
  // ── Lookup de movimientos por id (para mostrar fecha+detalle en imputaciones) ──
  const movimientosPorId = useMemo(() => {
    const map = {};
    (movimientos || []).forEach((m) => {
      const id = String(m._id || m.id);
      if (id) map[id] = m;
    });
    return map;
  }, [movimientos]);

  // ── Construir extracto unificado ──────────────────────────────────────────
  const filas = useMemo(() => {
    // Normaliza una fecha a su "día" (timestamp de medianoche local) para que
    // movimientos y pagos del mismo día calendario se desempaten por orden
    // de carga (createdAt) y no por horarios artificiales.
    const toDay = (val) => {
      if (!val) return 0;
      const d = new Date(val);
      if (Number.isNaN(d.getTime())) return 0;
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    };
    const toMs = (val) => {
      if (!val) return 0;
      const t = new Date(val).getTime();
      return Number.isFinite(t) ? t : 0;
    };

    const items = [];

    (movimientos || []).forEach((m) => {
      const fechaRef = m.fecha_factura || m.createdAt || m.created_at;
      items.push({
        tipo: 'movimiento',
        dia: toDay(fechaRef),
        creadoEn: getCreadoMs(m) || toMs(fechaRef),
        debe: m.total || 0,
        haber: 0,
        movimiento: m,
        key: `mov-${m._id || m.id}`,
      });
    });

    (pagos || []).forEach((p) => {
      // Solo pagos activos afectan el saldo; los anulados se muestran pero con haber=0
      const haber = p.estado === 'activo' ? (p.monto_bruto || 0) : 0;
      const fechaRef = p.fecha_pago || p.createdAt || p.created_at;
      items.push({
        tipo: 'pago',
        dia: toDay(fechaRef),
        creadoEn: getCreadoMs(p) || toMs(fechaRef),
        debe: 0,
        haber,
        pago: p,
        key: `pago-${p._id}`,
      });
    });

    // Orden cronológico ascendente, según el criterio elegido por el usuario.
    //  - 'fecha':    día calendario primero, createdAt como desempate
    //  - 'creadoEn': directamente por createdAt
    items.sort((a, b) => {
      if (sortBy === 'creadoEn') {
        if (a.creadoEn !== b.creadoEn) return a.creadoEn - b.creadoEn;
        return a.dia - b.dia;
      }
      if (a.dia !== b.dia) return a.dia - b.dia;
      return a.creadoEn - b.creadoEn;
    });

    let saldo = 0;
    const withSaldo = items.map((it) => {
      saldo += it.debe - it.haber;
      return { ...it, _saldo: saldo };
    });

    // Mostrar lo más nuevo arriba (el saldo de cada fila sigue siendo el acumulado hasta esa fecha)
    return withSaldo.reverse();
  }, [movimientos, pagos, sortBy]);

  const totales = useMemo(() => {
    const totalFacturado = (movimientos || []).reduce((s, m) => s + (m.total || 0), 0);
    const totalPagadoActivos = (pagos || [])
      .filter((p) => p.estado === 'activo')
      .reduce((s, p) => s + (p.monto_bruto || 0), 0);
    return {
      facturado: totalFacturado,
      pagado: totalPagadoActivos,
      saldo: totalFacturado - totalPagadoActivos,
    };
  }, [movimientos, pagos]);

  // Pendiente de imputar: total de saldo a favor en pagos activos + pendiente
  // real en facturas. Si los dos son > 0, el botón "Imputar saldo a favor"
  // tiene sentido (puede cerrar facturas sin necesidad de un pago nuevo).
  const imputableInfo = useMemo(() => {
    const sinImputar = (pagos || [])
      .filter((p) => p.estado === 'activo')
      .reduce((s, p) => s + (Number(p.monto_sin_imputar) || 0), 0);
    let pendienteTotal = 0;
    let facturasPendientes = 0;
    (movimientos || []).forEach((m) => {
      const total = Number(m.total) || 0;
      const pagado = Number(m.monto_pagado) || 0;
      const pend = Math.max(0, total - pagado);
      if (pend > 0.005) {
        pendienteTotal += pend;
        facturasPendientes += 1;
      }
    });
    const aImputar = Math.min(sinImputar, pendienteTotal);
    return {
      sinImputar,
      pendienteTotal,
      facturasPendientes,
      aImputar,
      mostrar: sinImputar > 0.005 && pendienteTotal > 0.005,
    };
  }, [movimientos, pagos]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box>
      {/* ── Resumen + acciones ── */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, pt: 2, pb: 1, flexWrap: 'wrap', gap: 1 }}>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5} sx={{ flex: 1 }}>
          <Chip size="small" label={`Facturado: ${formatCurrencyWithCode(totales.facturado)}`} />
          <Chip size="small" color="success" label={`Pagado: ${formatCurrencyWithCode(totales.pagado)}`} />
          {totales.saldo > 0.005 && (
            <Chip size="small" color="error" label={`Saldo: ${formatCurrencyWithCode(totales.saldo)}`} />
          )}
          {totales.saldo < -0.005 && (
            <Chip size="small" color="info" label={`Saldo a favor: ${formatCurrencyWithCode(Math.abs(totales.saldo))}`} />
          )}
          {Math.abs(totales.saldo) <= 0.005 && (
            <Chip size="small" color="success" variant="outlined" label="Al día" />
          )}
        </Stack>
        {imputableInfo.mostrar && onImputarSaldoFavor && (
          <Tooltip title={`Reparte ${formatCurrencyWithCode(imputableInfo.aImputar)} de saldo a favor sobre ${imputableInfo.facturasPendientes} factura(s) pendiente(s) (FIFO por fecha).`}>
            <span>
              <Button
                variant="contained"
                color="secondary"
                size="small"
                startIcon={<BalanceIcon fontSize="small" />}
                onClick={onImputarSaldoFavor}
                disabled={imputarSaldoFavorLoading}
              >
                {imputarSaldoFavorLoading ? 'Imputando…' : 'Imputar saldo a favor'}
              </Button>
            </span>
          </Tooltip>
        )}
        {onCargarMovimiento && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<PointOfSaleIcon fontSize="small" />}
            onClick={onCargarMovimiento}
          >
            Cargar movimiento
          </Button>
        )}
        <Button
          variant="contained"
          size="small"
          startIcon={<PaymentsIcon fontSize="small" />}
          onClick={onRegistrarPago}
        >
          Registrar pago
        </Button>
      </Stack>

      {presupuesto && (
        <>
          <Divider />
          <Stack direction="row" spacing={1} sx={{ px: 2, py: 1, flexWrap: 'wrap' }}>
            <Chip
              label={`Presup: ${formatCurrencyWithCode(presupuesto.monto, presupuesto.moneda)}`}
              size="small" variant="outlined"
            />
            {presupuesto.ejecutado != null && (
              <Chip
                label={`Ejec: ${formatCurrencyWithCode(presupuesto.ejecutado, presupuesto.moneda)}`}
                size="small" variant="outlined"
                color={presupuesto.ejecutado > presupuesto.monto ? 'error' : 'default'}
              />
            )}
          </Stack>
        </>
      )}

      <Divider />

      {filas.length === 0 ? (
        <Box sx={{ p: 3 }}>
          <Typography color="text.secondary" variant="body2">
            Sin movimientos ni pagos registrados.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.neutral' }}>
                <TableCell sx={{ width: 28 }} />
                <TableCell sortDirection={sortBy === 'fecha' ? 'desc' : false}>
                  <TableSortLabel
                    active={sortBy === 'fecha'}
                    direction="desc"
                    onClick={() => setSortBy('fecha')}
                    hideSortIcon={sortBy !== 'fecha'}
                  >
                    Fecha
                  </TableSortLabel>
                </TableCell>
                <TableCell>Código</TableCell>
                <TableCell>Detalle</TableCell>
                <TableCell>Obra</TableCell>
                <TableCell align="right">Debe</TableCell>
                <TableCell align="right">Haber</TableCell>
                <TableCell align="right">Saldo</TableCell>
                <TableCell sortDirection={sortBy === 'creadoEn' ? 'desc' : false}>
                  <Tooltip title="Cuándo se cargó en el sistema">
                    <TableSortLabel
                      active={sortBy === 'creadoEn'}
                      direction="desc"
                      onClick={() => setSortBy('creadoEn')}
                      hideSortIcon={sortBy !== 'creadoEn'}
                    >
                      Creado
                    </TableSortLabel>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ width: 32 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {filas.map((row) => (
                row.tipo === 'pago'
                  ? <FilaPago key={row.key} row={row} onAnular={onAnularPago} movimientosPorId={movimientosPorId} />
                  : <FilaMovimiento key={row.key} row={row} />
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Box>
  );
}

// ─── Tab: Pretendidos ─────────────────────────────────────────────────────────

function TabPretendidos({ pretendidos, loading }) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!pretendidos?.length) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary" variant="body2">Sin pretendidos registrados</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Fecha</TableCell>
            <TableCell>Descripción</TableCell>
            <TableCell align="right">Pretendido</TableCell>
            <TableCell align="right">Aprobado</TableCell>
            <TableCell>Estado</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {[...pretendidos].reverse().map((p) => (
            <TableRow key={p._id || p.id} hover>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                {p.semana
                  ? new Date(p.semana).toLocaleDateString('es-AR', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                    })
                  : '—'}
              </TableCell>
              <TableCell
                sx={{
                  maxWidth: 160,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {p.descripcion || '—'}
              </TableCell>
              <TableCell align="right">
                {formatCurrencyWithCode(p.monto_pretendido)}
              </TableCell>
              <TableCell align="right">
                {p.monto_aprobado != null ? formatCurrencyWithCode(p.monto_aprobado) : '—'}
              </TableCell>
              <TableCell>
                {(() => {
                  const esRechazado = p.estado === 'cerrado'
                    && p.monto_aprobado != null
                    && Number(p.monto_aprobado) === 0;
                  return (
                    <Chip
                      label={esRechazado ? 'Rechazado' : p.estado}
                      size="small"
                      color={esRechazado ? 'error' : (p.estado === 'cerrado' ? 'success' : 'warning')}
                    />
                  );
                })()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

// ─── Tab: Presupuestos ────────────────────────────────────────────────────────

function TabPresupuestos({ presupuestos = [], loading, onRegistrarPresupuesto, proyectos = [] }) {
  // Helper para resolver el nombre del proyecto a partir de proyecto_id
  const proyectoNombreById = useMemo(() => {
    const map = new Map();
    (proyectos || []).forEach((pr) => {
      const id = pr.id || pr._id;
      if (id) map.set(String(id), pr.nombre || pr.name || '');
    });
    return map;
  }, [proyectos]);

  // Helper para mostrar la categoría (formato nuevo `clasificaciones[]` o legacy `categoria`)
  const renderCategoria = (p) => {
    if (Array.isArray(p.clasificaciones) && p.clasificaciones.length > 0) {
      const c = p.clasificaciones[0];
      const subs = Array.isArray(c.subcategorias) && c.subcategorias.length > 0 ? ` - ${c.subcategorias[0]}` : '';
      const label = `${c.categoria}${subs}${p.clasificaciones.length > 1 ? ` +${p.clasificaciones.length - 1}` : ''}`;
      return label;
    }
    if (p.categoria) {
      return p.subcategoria ? `${p.categoria} - ${p.subcategoria}` : p.categoria;
    }
    return null;
  };
  const totales = useMemo(() => {
    const porMoneda = {};
    presupuestos.forEach((p) => {
      const m = p.moneda || 'ARS';
      porMoneda[m] = (porMoneda[m] || 0) + (Number(p.monto) || 0);
    });
    return porMoneda;
  }, [presupuestos]);

  return (
    <Box>
      {/* Header + acción */}
      <Stack direction="row" alignItems="center" sx={{ px: 2, pt: 2, pb: 1, flexWrap: 'wrap', gap: 1 }}>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5} sx={{ flex: 1 }}>
          <Chip size="small" label={`${presupuestos.length} presupuesto${presupuestos.length !== 1 ? 's' : ''}`} />
          {Object.entries(totales).map(([moneda, total]) => (
            <Chip
              key={moneda}
              size="small"
              variant="outlined"
              label={`Total ${moneda}: ${formatCurrencyWithCode(total, moneda)}`}
            />
          ))}
        </Stack>
        <Button
          variant="contained"
          size="small"
          startIcon={<RequestQuoteIcon fontSize="small" />}
          onClick={onRegistrarPresupuesto}
        >
          Nuevo presupuesto
        </Button>
      </Stack>

      <Divider />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : presupuestos.length === 0 ? (
        <Box sx={{ p: 3 }}>
          <Typography color="text.secondary" variant="body2">
            Este proveedor no tiene presupuestos registrados.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.neutral' }}>
                <TableCell>Fecha</TableCell>
                <TableCell>Proyecto / Etapa</TableCell>
                <TableCell>Categoría</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell align="right">Monto</TableCell>
                <TableCell align="right">Ejecutado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {presupuestos.map((p) => {
                const ejecutado = Number(p.ejecutado) || 0;
                const monto = Number(p.monto) || 0;
                const ratio = monto > 0 ? ejecutado / monto : 0;
                return (
                  <TableRow key={p._id || p.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {p.fecha_presupuesto || (p.createdAt ? formatTimestamp(p.createdAt, 'DIA/MES/ANO') : '—')}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {(p.proyecto_id && proyectoNombreById.get(String(p.proyecto_id))) || p.proyecto_nombre || '—'}
                      </Typography>
                      {p.etapa && (
                        <Typography variant="caption" color="text.secondary">{p.etapa}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {renderCategoria(p) || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={p.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                        color={p.tipo === 'ingreso' ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {formatCurrencyWithCode(monto, p.moneda)}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {ejecutado > 0 ? (
                        <Typography
                          variant="body2"
                          color={ratio > 1 ? 'error.main' : ratio > 0.8 ? 'warning.main' : 'text.secondary'}
                        >
                          {formatCurrencyWithCode(ejecutado, p.moneda)}
                          <Typography variant="caption" component="span" sx={{ ml: 0.5, color: 'text.secondary' }}>
                            ({Math.round(ratio * 100)}%)
                          </Typography>
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.disabled">—</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      )}
    </Box>
  );
}

// ─── ProveedorDrawer ──────────────────────────────────────────────────────────

function ProveedorDrawer({ open, onClose, proveedorId, proveedorNombreHint, empresaId, categoriasEmpresa, estadoDefaultEmpresa, onUpdate }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();

  const [tab, setTab] = useState(TAB_DATOS);
  const [data, setData] = useState(null); // { proveedor, movimientos, pagos, presupuesto, pretendidos }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [togglingFav, setTogglingFav] = useState(false);

  // Dialogs de pago
  const [registrarPagoOpen, setRegistrarPagoOpen] = useState(false);
  const [anularPagoOpen, setAnularPagoOpen] = useState(false);
  const [pagoAAnular, setPagoAAnular] = useState(null);

  // Dialog presupuesto
  const [registrarPresupuestoOpen, setRegistrarPresupuestoOpen] = useState(false);

  // Imputar saldo a favor (reparte monto_sin_imputar entre facturas pendientes)
  const [imputarSaldoFavorLoading, setImputarSaldoFavorLoading] = useState(false);
  const [imputarSaldoFavorMsg, setImputarSaldoFavorMsg] = useState(null);

  // Proyectos de la empresa (para resolver nombre desde proyecto_id en la tab Presupuestos)
  const [proyectos, setProyectos] = useState([]);

  const fetchData = useCallback(async () => {
    if (!proveedorId || !empresaId) return;
    setLoading(true);
    setError('');
    try {
      const result = await proveedorService.getCuentaCorriente(empresaId, proveedorId, null, proveedorNombreHint);
      setData(result);
    } catch (err) {
      const body = err?.response?.data;
      if (body?.code === 'PROVEEDOR_NO_VINCULADO') {
        const nombre = body.nombre_en_movimientos;
        const cant = body.movimientos_afectados || 0;
        setError(
          nombre
            ? `Este movimiento referencia "${nombre}" pero el id_proveedor (${body.id_recibido}) está roto. ${cant > 0 ? `Afecta ${cant} movimiento(s). ` : ''}Editá el movimiento y reasignalo al proveedor correcto, o creá "${nombre}" como proveedor nuevo si no existe.`
            : `El id_proveedor (${body.id_recibido}) está roto. No hay proveedor con ese id ni nombre en los movimientos.`,
        );
      } else {
        setError('Error al cargar el proveedor');
      }
    } finally {
      setLoading(false);
    }
  }, [proveedorId, empresaId, proveedorNombreHint]);

  const handleImputarSaldoFavor = useCallback(async () => {
    if (!proveedorId || !empresaId) return;
    setImputarSaldoFavorLoading(true);
    setImputarSaldoFavorMsg(null);
    try {
      const result = await proveedorService.imputarSaldoAFavor(empresaId, proveedorId);
      if (result?.sin_saldo_a_favor) {
        setImputarSaldoFavorMsg({ severity: 'info', text: 'No hay saldo a favor para imputar.' });
      } else if (result?.sin_facturas_pendientes) {
        setImputarSaldoFavorMsg({ severity: 'info', text: 'No hay facturas pendientes para imputar.' });
      } else {
        setImputarSaldoFavorMsg({
          severity: 'success',
          text: `Se imputó ${result.monto_imputado != null ? `$${Number(result.monto_imputado).toLocaleString('es-AR')}` : ''} sobre ${result.movimientos_modificados} factura(s).`,
        });
      }
      await fetchData();
      onUpdate?.();
    } catch (err) {
      console.error('Error imputando saldo a favor:', err);
      setImputarSaldoFavorMsg({ severity: 'error', text: 'No se pudo imputar el saldo a favor.' });
    } finally {
      setImputarSaldoFavorLoading(false);
    }
  }, [proveedorId, empresaId, fetchData, onUpdate]);

  useEffect(() => {
    if (open) {
      setTab(TAB_DATOS);
      fetchData();
    } else {
      // Limpiar al cerrar (con delay para evitar flash)
      const t = setTimeout(() => setData(null), 300);
      return () => clearTimeout(t);
    }
  }, [open, fetchData]);

  // Cargar proyectos de la empresa cuando se abre el drawer (cache simple)
  useEffect(() => {
    if (!open || !empresaId) return;
    if (proyectos.length > 0) return;
    getProyectosByEmpresaId(empresaId).then(setProyectos).catch(() => setProyectos([]));
  }, [open, empresaId, proyectos.length]);

  const handleToggleFavorito = async () => {
    if (!data?.proveedor || togglingFav) return;
    const newVal = !data.proveedor.favorito;
    setTogglingFav(true);
    try {
      const id = data.proveedor._id || data.proveedor.id;
      await proveedorService.actualizar(empresaId, id, { favorito: newVal });
      setData(d => ({ ...d, proveedor: { ...d.proveedor, favorito: newVal } }));
      onUpdate?.();
    } finally {
      setTogglingFav(false);
    }
  };

  const proveedor = data?.proveedor;
  const hasPretendidos = proveedor?.tipo === 'mano_de_obra';

  const drawerSx = isMobile
    ? {
        '& .MuiDrawer-paper': {
          width: '100%',
          height: '90vh',
          borderRadius: '16px 16px 0 0',
          display: 'flex',
          flexDirection: 'column',
        },
      }
    : {
        '& .MuiDrawer-paper': {
          width: 'min(880px, 95vw)',
          maxWidth: '95vw',
          display: 'flex',
          flexDirection: 'column',
        },
      };

  return (
    <Drawer
      anchor={isMobile ? 'bottom' : 'right'}
      open={open}
      onClose={onClose}
      sx={drawerSx}
    >
      {/* ── Header ── */}
      <Box sx={{ px: 2, pt: isMobile ? 2 : 1.5, pb: 0, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        {/* Handle para mobile */}
        {isMobile && (
          <Box sx={{ width: 40, height: 4, bgcolor: 'action.disabled', borderRadius: 2, mx: 'auto', mb: 1.5 }} />
        )}

        <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ mb: 0.5 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {!proveedor ? (
              <Box sx={{ height: 28, bgcolor: 'action.hover', borderRadius: 1, width: '55%' }} />
            ) : (
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" gap={0.5}>
                <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                  {proveedor.nombre}
                </Typography>
                <Chip
                  label={proveedor.tipo === 'mano_de_obra' ? 'Mano de obra' : 'Materiales'}
                  size="small"
                  variant="outlined"
                />
                {proveedor.archivado && (
                  <Chip label="Archivado" size="small" color="default" />
                )}
              </Stack>
            )}
          </Box>

          <Stack direction="row" spacing={0}>
            <Tooltip title={proveedor?.favorito ? 'Quitar favorito' : 'Marcar como favorito'}>
              <span>
                <IconButton size="small" onClick={handleToggleFavorito} disabled={togglingFav || !proveedor}>
                  {proveedor?.favorito
                    ? <StarIcon fontSize="small" sx={{ color: 'warning.main' }} />
                    : <StarBorderIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
            <IconButton size="small" onClick={onClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ minHeight: 36 }}
        >
          <Tab label="Datos" value={TAB_DATOS} sx={{ minHeight: 36, py: 0, px: 1.5 }} />
          <Tab label="Cuenta corriente" value={TAB_CUENTA} sx={{ minHeight: 36, py: 0, px: 1.5 }} />
          <Tab label="Presupuestos" value={TAB_PRESUPUESTOS} sx={{ minHeight: 36, py: 0, px: 1.5 }} />
          {hasPretendidos && (
            <Tab label="Pretendidos" value={TAB_PRETENDIDOS} sx={{ minHeight: 36, py: 0, px: 1.5 }} />
          )}
        </Tabs>
      </Box>

      {/* ── Loading bar ── */}
      {loading && <LinearProgress sx={{ flexShrink: 0 }} />}

      {/* ── Error ── */}
      {error && (
        <Alert severity="error" sx={{ m: 2, flexShrink: 0 }}>
          {error}
        </Alert>
      )}

      {/* ── Contenido ── */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {tab === TAB_DATOS && proveedor && (
          <TabDatos
            proveedor={proveedor}
            empresaId={empresaId}
            categoriasEmpresa={categoriasEmpresa}
            estadoDefaultEmpresa={estadoDefaultEmpresa}
            onSaved={() => { fetchData(); onUpdate?.(); }}
            onArchived={() => { onClose(); onUpdate?.(); }}
          />
        )}
        {tab === TAB_CUENTA && (
          <>
            {imputarSaldoFavorMsg && (
              <Alert
                severity={imputarSaldoFavorMsg.severity}
                onClose={() => setImputarSaldoFavorMsg(null)}
                sx={{ mx: 2, mt: 1.5 }}
              >
                {imputarSaldoFavorMsg.text}
              </Alert>
            )}
            <TabCuentaCorriente
              movimientos={data?.movimientos}
              pagos={data?.pagos}
              presupuesto={data?.presupuesto}
              loading={loading && !data}
              onRegistrarPago={() => setRegistrarPagoOpen(true)}
              onAnularPago={(pago) => { setPagoAAnular(pago); setAnularPagoOpen(true); }}
              onCargarMovimiento={proveedor ? () => {
                router.push({
                  pathname: '/movementForm',
                  query: { proveedorNombre: proveedor.nombre },
                });
              } : undefined}
              onImputarSaldoFavor={handleImputarSaldoFavor}
              imputarSaldoFavorLoading={imputarSaldoFavorLoading}
            />
          </>
        )}
        {tab === TAB_PRESUPUESTOS && (
          <TabPresupuestos
            presupuestos={data?.presupuestos || []}
            loading={loading && !data}
            onRegistrarPresupuesto={() => setRegistrarPresupuestoOpen(true)}
            proyectos={proyectos}
          />
        )}
        {tab === TAB_PRETENDIDOS && (
          <TabPretendidos
            pretendidos={data?.pretendidos}
            loading={loading && !data}
          />
        )}
      </Box>

      {/* ── Dialogs de pago (renderizados dentro del drawer para mantener contexto) ── */}
      {registrarPagoOpen && proveedor && (
        <RegistrarPagoDialog
          open={registrarPagoOpen}
          onClose={() => setRegistrarPagoOpen(false)}
          onSuccess={() => {
            setRegistrarPagoOpen(false);
            fetchData();
            onUpdate?.();
          }}
          empresaId={empresaId}
          proveedor={proveedor.nombre}
          proveedorId={proveedor._id || proveedor.id}
          remitos={(data?.movimientos || []).filter((m) => m.estado !== 'Pagado')}
        />
      )}

      <AnularPagoDialog
        open={anularPagoOpen}
        onClose={() => { setAnularPagoOpen(false); setPagoAAnular(null); }}
        onSuccess={() => {
          setAnularPagoOpen(false);
          setPagoAAnular(null);
          fetchData();
          onUpdate?.();
        }}
        empresaId={empresaId}
        pago={pagoAAnular}
        proveedorNombre={proveedor?.nombre}
      />

      {registrarPresupuestoOpen && proveedor && (
        <RegistrarPresupuestoDialog
          open={registrarPresupuestoOpen}
          onClose={() => setRegistrarPresupuestoOpen(false)}
          onSuccess={() => {
            setRegistrarPresupuestoOpen(false);
            fetchData();
            onUpdate?.();
          }}
          empresaId={empresaId}
          proveedor={proveedor}
          categoriasEmpresa={categoriasEmpresa}
        />
      )}
    </Drawer>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ProveedorDrawerProvider({ children, empresaId, categoriasEmpresa, estadoDefaultEmpresa, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [proveedorId, setProveedorId] = useState(null);

  const openDrawer = useCallback((id) => {
    setProveedorId(id);
    setOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <ProveedorDrawerContext.Provider value={{ openDrawer, closeDrawer }}>
      {children}
      <ProveedorDrawer
        open={open}
        onClose={closeDrawer}
        proveedorId={proveedorId}
        empresaId={empresaId}
        categoriasEmpresa={categoriasEmpresa}
        estadoDefaultEmpresa={estadoDefaultEmpresa}
        onUpdate={onUpdate}
      />
    </ProveedorDrawerContext.Provider>
  );
}

export default ProveedorDrawer;
