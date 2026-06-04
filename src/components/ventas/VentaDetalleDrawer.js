/**
 * VentaDetalleDrawer — detalle de una venta en drawer lateral (vertical
 * corralón). Mismo lenguaje visual que NuevaVentaDrawer (header/footer sticky,
 * chips pill, bloques). Muestra las dos dimensiones (entrega/cobro), los
 * productos y permite registrar entrega / cancelar sin salir de /ventas.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  LinearProgress,
  TextField,
} from '@mui/material';
import { XMarkIcon } from '@heroicons/react/24/outline';
import ventaService from 'src/services/ventaService';
import { formatCurrencyWithCode } from 'src/utils/formatters';
import CobroFormDrawer from 'src/components/clientes/CobroFormDrawer';
import DevolucionDrawer from 'src/components/clientes/DevolucionDrawer';

const TIPO_LABEL = {
  acopio: 'Acopio',
  contado: 'Contado',
  cc: 'Cuenta corriente',
  contra_entrega: 'Contra entrega',
};
const ENTREGA_LABEL = { pendiente: 'Pendiente', parcial: 'Parcial', entregado: 'Entregado', na: 'N/A' };
const COBRO_LABEL = { pendiente: 'Pendiente', parcial: 'Parcial', pagado: 'Pagado' };
const PILL = {
  warning: 'bg-warning-main/15 text-warning-dark',
  info: 'bg-info-main/15 text-info-dark',
  success: 'bg-success-main/15 text-success-dark',
  default: 'bg-neutral-100 text-neutral-700',
};
const ENTREGA_TONE = { pendiente: 'warning', parcial: 'info', entregado: 'success', na: 'default' };
const COBRO_TONE = { pendiente: 'warning', parcial: 'info', pagado: 'success' };

function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('es-AR'); } catch { return '—'; }
}

function Dimension({ titulo, tone, label, monto, total, moneda }) {
  const pct = total > 0 ? Math.min(100, Math.round(((monto || 0) / total) * 100)) : 0;
  return (
    <div className="rounded-xl border border-divider bg-white p-3 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-500">{titulo}</span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PILL[tone] || PILL.default}`}>{label}</span>
      </div>
      <LinearProgress variant="determinate" value={pct} sx={{ height: 7, borderRadius: 1, mb: 0.5 }} />
      <span className="text-xs text-neutral-600">
        {formatCurrencyWithCode(monto || 0, moneda)} de {formatCurrencyWithCode(total || 0, moneda)} ({pct}%)
      </span>
    </div>
  );
}

export default function VentaDetalleDrawer({ open, onClose, empresaId, ventaId, cajas = [], onChanged, onEdit }) {
  const [venta, setVenta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [entregaOpen, setEntregaOpen] = useState(false);
  const [entregaSel, setEntregaSel] = useState({}); // movimiento_id -> { sel, cantidad }
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cobroOpen, setCobroOpen] = useState(false);
  const [devolucionOpen, setDevolucionOpen] = useState(false);

  const cargar = useCallback(async () => {
    if (!open || !ventaId) return;
    setLoading(true);
    setError('');
    try {
      setVenta(await ventaService.obtener(empresaId, ventaId));
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [open, ventaId, empresaId]);

  useEffect(() => { cargar(); }, [cargar]);

  // Líneas pendientes de entrega (cantidad_pendiente > 0).
  const lineasPendientes = (venta?.materiales || []).filter((m) => Number(m.cantidad_pendiente) > 0);

  function abrirEntrega() {
    const sel = {};
    lineasPendientes.forEach((m) => {
      sel[m.movimiento_id] = { sel: true, cantidad: Number(m.cantidad_pendiente) || 0 };
    });
    setEntregaSel(sel);
    setEntregaOpen(true);
  }

  function setLineaCantidad(m, valor) {
    const pend = Number(m.cantidad_pendiente) || 0;
    let q = Number(valor);
    if (!Number.isFinite(q) || q < 0) q = 0;
    if (q > pend) q = pend;
    setEntregaSel((s) => ({ ...s, [m.movimiento_id]: { ...s[m.movimiento_id], cantidad: q } }));
  }
  function setLineaSel(m, checked) {
    setEntregaSel((s) => ({ ...s, [m.movimiento_id]: { ...s[m.movimiento_id], sel: checked } }));
  }

  const entregaValor = lineasPendientes.reduce((acc, m) => {
    const e = entregaSel[m.movimiento_id];
    if (!e?.sel) return acc;
    return acc + (Number(e.cantidad) || 0) * (Number(m.precio_unitario) || 0);
  }, 0);

  const entregaPayload = lineasPendientes
    .map((m) => ({ m, e: entregaSel[m.movimiento_id] }))
    .filter(({ e }) => e?.sel && Number(e.cantidad) > 0)
    .map(({ m, e }) => ({ movimiento_id: m.movimiento_id, cantidad: Number(e.cantidad) }));

  async function registrarEntrega() {
    if (!entregaPayload.length) { setError('Indicá al menos una cantidad a entregar'); return; }
    setBusy(true); setError('');
    try {
      await ventaService.registrarEntrega(empresaId, ventaId, { entregas: entregaPayload });
      setEntregaOpen(false);
      await cargar();
      onChanged?.();
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally { setBusy(false); }
  }

  async function cancelar() {
    setBusy(true); setError('');
    try {
      await ventaService.cancelar(empresaId, ventaId, { motivo: cancelMotivo || null });
      setCancelOpen(false);
      await cargar();
      onChanged?.();
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally { setBusy(false); }
  }

  async function eliminar() {
    setBusy(true); setError('');
    try {
      await ventaService.eliminar(empresaId, ventaId);
      setDeleteOpen(false);
      onChanged?.();
      onClose?.();
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally { setBusy(false); }
  }

  const saldoCobro = venta ? Math.max(0, (Number(venta.total) || 0) - (Number(venta.cobro?.monto_cobrado) || 0)) : 0;

  // "Cobros reales" = CobroCliente imputados. Un contado marca pagado de forma
  // informativa (sin cobro_ids) y sigue siendo editable/eliminable.
  const sinCobrosReales = !(venta?.cobro_ids?.length);
  const entregaEditable = ['pendiente', 'na'].includes(venta?.entrega?.estado);
  const puedeEntregar = venta && ['pendiente', 'parcial'].includes(venta.entrega?.estado) && lineasPendientes.length > 0;

  // Motivo por el que NO se puede (null = habilitado). Sirve para el tooltip.
  const motivoEditar = !venta ? 'Cargando…'
    : venta.tipo === 'acopio' ? 'El acopio se gestiona aparte'
    : venta.cerrada ? 'La venta está cerrada'
    : !sinCobrosReales ? 'Tiene cobros registrados: anulá los cobros primero'
    : !entregaEditable ? 'Ya tiene entregas: cancelá y rehacé la venta'
    : null;
  const motivoEliminar = !venta ? 'Cargando…'
    : !sinCobrosReales ? 'Tiene cobros registrados: anulá los cobros primero'
    : null;
  const motivoCancelar = !venta ? 'Cargando…'
    : venta.cerrada ? 'La venta está cerrada'
    : !sinCobrosReales ? 'Tiene cobros registrados: anulá los cobros primero'
    : null;

  const puedeEditar = !motivoEditar;
  const puedeCancelar = !motivoCancelar;
  const puedeEliminar = !motivoEliminar;
  const puedeCobrar = venta && saldoCobro > 0;
  // Devolución: aplica a ventas no-acopio con material ya entregado.
  const puedeDevolver = venta && venta.tipo !== 'acopio' && Number(venta.entrega?.monto_entregado) > 0;
  const itemsDevolucion = (venta?.materiales || [])
    .filter((m) => Number(m.cantidad_entregada) > 0)
    .map((m) => ({ descripcion: m.nombre, cantidad: Number(m.cantidad_entregada) || 0, precio_unitario: Number(m.precio_unitario) || 0 }));

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, maxWidth: '100%' } }}
    >
      <div className="flex h-full min-h-0 flex-col bg-neutral-50">
        {/* Header */}
        <header className="shrink-0 border-b border-divider bg-white px-4 py-3">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <h2 className="text-base font-bold tracking-tight text-neutral-900">
                {venta ? `Venta — ${TIPO_LABEL[venta.tipo] || venta.tipo}` : 'Venta'}
              </h2>
              {venta && (
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-800">
                    {venta.cliente_nombre || venta.cliente_id || '—'}
                  </span>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-800">{fmtDate(venta.fecha)}</span>
                  {venta.cerrada && (
                    <span className="rounded-full bg-success-main/15 px-2 py-0.5 text-[11px] font-semibold text-success-dark">Cerrada</span>
                  )}
                </div>
              )}
            </div>
            <IconButton onClick={onClose} size="small"><XMarkIcon className="h-5 w-5" /></IconButton>
          </div>
        </header>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="flex justify-center py-10"><CircularProgress size={24} /></div>
          ) : !venta ? (
            <div className="rounded-lg border border-error-main/40 bg-error-main/10 px-3 py-2 text-sm text-error-dark">
              {error || 'Venta no encontrada'}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {error && (
                <div className="rounded-lg border border-error-main/40 bg-error-main/10 px-3 py-2 text-sm text-error-dark">{error}</div>
              )}

              {/* Resumen */}
              <div className="rounded-xl border border-divider bg-white p-3 shadow-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-neutral-500">Total</span>
                    <p className="text-sm font-semibold text-neutral-900">{formatCurrencyWithCode(venta.total || 0, venta.moneda)}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-neutral-500">Saldo a entregar</span>
                    <p className="text-sm font-semibold text-neutral-900">{formatCurrencyWithCode(venta.saldo_a_entregar || 0, venta.moneda)}</p>
                  </div>
                </div>
                {venta.notas && (
                  <p className="mt-2 border-t border-divider pt-2 text-xs text-neutral-600">{venta.notas}</p>
                )}
              </div>

              {/* Dimensiones */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Dimension
                  titulo="Entrega"
                  tone={ENTREGA_TONE[venta.entrega?.estado] || 'default'}
                  label={ENTREGA_LABEL[venta.entrega?.estado] || venta.entrega?.estado}
                  monto={venta.entrega?.monto_entregado}
                  total={venta.total}
                  moneda={venta.moneda}
                />
                <Dimension
                  titulo="Cobro"
                  tone={COBRO_TONE[venta.cobro?.estado] || 'default'}
                  label={COBRO_LABEL[venta.cobro?.estado] || venta.cobro?.estado}
                  monto={venta.cobro?.monto_cobrado}
                  total={venta.total}
                  moneda={venta.moneda}
                />
              </div>

              {/* Productos */}
              {Array.isArray(venta.materiales) && venta.materiales.length > 0 && (
                <div className="rounded-xl border border-divider bg-white shadow-sm">
                  <div className="border-b border-divider px-3 py-2">
                    <h3 className="text-sm font-semibold text-neutral-900">Productos</h3>
                  </div>
                  <div className="divide-y divide-divider">
                    {venta.materiales.map((m, i) => {
                      const cant = Number(m.cantidad) || 0;
                      const entreg = Number(m.cantidad_entregada) || 0;
                      const pct = cant > 0 ? Math.min(100, Math.round((entreg / cant) * 100)) : 0;
                      const completo = entreg >= cant - 1e-9 && cant > 0;
                      return (
                        <div key={i} className="px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="min-w-0 truncate text-sm text-neutral-900">{m.nombre}</p>
                            <span className="shrink-0 text-sm font-medium text-neutral-900">
                              {formatCurrencyWithCode(cant * (Number(m.precio_unitario) || 0), venta.moneda)}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-500">
                            {cant} × {formatCurrencyWithCode(m.precio_unitario || 0, venta.moneda)}
                          </p>
                          {entreg > 0 ? (
                            <div className="mt-1 flex items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
                                <div
                                  className={`h-full rounded-full ${completo ? 'bg-success-main' : 'bg-primary-main'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className={`text-[11px] ${completo ? 'text-success-dark' : 'text-primary-dark'}`}>
                                {completo ? 'Entregado' : `Entregado ${entreg} de ${cant}`}
                              </span>
                            </div>
                          ) : (
                            <p className="mt-0.5 text-[11px] text-neutral-400">Sin entregar</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer acciones — siempre visibles; deshabilitadas con el motivo (tooltip) */}
        {venta && (
          <footer className="shrink-0 border-t border-divider bg-white px-4 py-3">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                title={motivoEliminar || 'Eliminar venta'}
                onClick={() => setDeleteOpen(true)}
                disabled={busy || !puedeEliminar}
                className="mr-auto rounded-lg border border-error-main/50 bg-white px-3 py-1.5 text-sm font-medium text-error-dark hover:bg-error-main/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Eliminar
              </button>
              <button
                type="button"
                title={motivoEditar || 'Editar venta'}
                onClick={() => onEdit?.(venta)}
                disabled={busy || !puedeEditar}
                className="rounded-lg border border-neutral-300 bg-white px-4 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Editar
              </button>
              <button
                type="button"
                title={motivoCancelar || 'Cancelar venta'}
                onClick={() => setCancelOpen(true)}
                disabled={busy || !puedeCancelar}
                className="rounded-lg border border-warning-main/50 bg-white px-4 py-1.5 text-sm font-medium text-warning-dark hover:bg-warning-main/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Cancelar venta
              </button>
              <button
                type="button"
                title={puedeDevolver ? 'Registrar devolución' : 'No hay material entregado para devolver'}
                onClick={() => setDevolucionOpen(true)}
                disabled={busy || !puedeDevolver}
                className="rounded-lg border border-warning-main/50 bg-white px-4 py-1.5 text-sm font-medium text-warning-dark hover:bg-warning-main/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Devolución
              </button>
              <button
                type="button"
                title={puedeEntregar ? 'Registrar entrega' : 'No hay nada pendiente de entregar'}
                onClick={abrirEntrega}
                disabled={busy || !puedeEntregar}
                className="rounded-lg border border-primary-main bg-white px-4 py-1.5 text-sm font-semibold text-primary-dark hover:bg-primary-main/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Registrar entrega
              </button>
              <button
                type="button"
                title={puedeCobrar ? 'Registrar cobro' : 'No hay saldo pendiente de cobro'}
                onClick={() => setCobroOpen(true)}
                disabled={busy || !puedeCobrar}
                className="rounded-lg bg-primary-main px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40"
              >
                Registrar cobro
              </button>
            </div>
            {(motivoEditar || motivoEliminar) && (
              <p className="mt-2 text-right text-[11px] text-neutral-400">
                {motivoEliminar || motivoEditar}
              </p>
            )}
          </footer>
        )}
      </div>

      {/* Dialog entrega — marcar materiales; el valor se calcula solo */}
      <Dialog open={entregaOpen} onClose={() => setEntregaOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Registrar entrega</DialogTitle>
        <DialogContent dividers>
          <p className="mb-1 text-xs text-neutral-500">Indicá qué cantidad entregás de cada material. Lo no entregado queda pendiente.</p>
          {lineasPendientes.map((m) => {
            const e = entregaSel[m.movimiento_id] || { sel: false, cantidad: 0 };
            const pend = Number(m.cantidad_pendiente) || 0;
            const sub = (Number(e.cantidad) || 0) * (Number(m.precio_unitario) || 0);
            return (
              <div key={m.movimiento_id} className="flex items-center gap-2 border-b border-divider py-2 last:border-0">
                <Checkbox
                  size="small"
                  sx={{ p: 0.5 }}
                  checked={!!e.sel}
                  onChange={(ev) => setLineaSel(m, ev.target.checked)}
                />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-neutral-900">{m.nombre}</span>
                  <span className="block text-[11px] text-neutral-500">
                    {formatCurrencyWithCode(m.precio_unitario || 0, venta?.moneda)} c/u · pendiente {pend}
                  </span>
                </div>
                <TextField
                  size="small" type="number" disabled={!e.sel}
                  value={e.cantidad}
                  onChange={(ev) => setLineaCantidad(m, ev.target.value)}
                  inputProps={{ min: 0, max: pend, 'aria-label': 'cantidad a entregar' }}
                  sx={{ width: 72 }}
                />
                <span className="w-24 shrink-0 text-right text-sm font-medium text-neutral-900">
                  {formatCurrencyWithCode(sub, venta?.moneda)}
                </span>
              </div>
            );
          })}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-neutral-500">Valor a entregar</span>
            <span className="text-base font-bold text-neutral-900">{formatCurrencyWithCode(entregaValor, venta?.moneda)}</span>
          </div>
        </DialogContent>
        <DialogActions>
          <button type="button" onClick={() => setEntregaOpen(false)} disabled={busy} className="px-3 py-1.5 text-sm text-neutral-600">Cancelar</button>
          <button type="button" onClick={registrarEntrega} disabled={busy || entregaPayload.length === 0} className="rounded-lg bg-primary-main px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
            Confirmar entrega
          </button>
        </DialogActions>
      </Dialog>

      {/* Dialog eliminar */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Eliminar venta</DialogTitle>
        <DialogContent>
          <p className="text-sm text-neutral-700">
            Se eliminará la venta y su detalle (productos). Esta acción no se puede deshacer.
          </p>
        </DialogContent>
        <DialogActions>
          <button type="button" onClick={() => setDeleteOpen(false)} disabled={busy} className="px-3 py-1.5 text-sm text-neutral-600">Volver</button>
          <button type="button" onClick={eliminar} disabled={busy} className="rounded-lg bg-error-main px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50">Eliminar</button>
        </DialogActions>
      </Dialog>

      {/* Drawer de cobro (mismo que clientes): imputa a las deudas del cliente */}
      <CobroFormDrawer
        open={cobroOpen}
        empresaId={empresaId}
        cliente={venta ? { _id: venta.cliente_id, nombre: venta.cliente_nombre } : null}
        cajas={cajas}
        onClose={() => setCobroOpen(false)}
        onSaved={() => { cargar(); onChanged?.(); }}
      />

      {/* Drawer de devolución: repone stock y/o genera saldo a favor del cliente */}
      <DevolucionDrawer
        open={devolucionOpen}
        empresaId={empresaId}
        cliente={venta ? { _id: venta.cliente_id, nombre: venta.cliente_nombre } : null}
        sucursalId={venta?.sucursal_id || null}
        items={itemsDevolucion}
        onClose={() => setDevolucionOpen(false)}
        onSaved={() => { cargar(); onChanged?.(); }}
      />

      {/* Dialog cancelar */}
      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Cancelar venta</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth size="small" label="Motivo" multiline minRows={2}
            value={cancelMotivo} onChange={(e) => setCancelMotivo(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <button type="button" onClick={() => setCancelOpen(false)} disabled={busy} className="px-3 py-1.5 text-sm text-neutral-600">Volver</button>
          <button type="button" onClick={cancelar} disabled={busy} className="rounded-lg bg-error-main px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50">Cancelar venta</button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
}
