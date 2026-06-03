/**
 * DevolucionDrawer — registrar una devolución / reintegro de material de un cliente.
 *
 * Evento inverso a la salida de material. Para ventas de contado/CC repone stock real
 * y, si el destino es "cuenta corriente", genera un saldo a favor del cliente
 * (CobroCliente sin imputar). Ver docs/corralones/11-propuesta-funcionalidades.md §1.
 *
 * Dos modos:
 *  - simple (default): muestra los pedidos ya entregados al cliente y se elige qué
 *    devolver de lo efectivamente entregado.
 *  - avanzado: carga libre de líneas, para material no registrado como entregado.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Autocomplete, Checkbox, CircularProgress, Drawer, FormControl,
  FormControlLabel, IconButton, InputLabel, MenuItem, Select, Switch, TextField,
} from '@mui/material';
import { XMarkIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import devolucionService from 'src/services/devolucionService';
import { formatCurrencyWithCode } from 'src/utils/formatters';

const lineaVacia = () => ({ descripcion: '', cantidad: '', precio_unitario: '' });
const keyOf = (ventaId, idx) => `${ventaId}:${idx}`;

function fmtDate(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('es-AR'); } catch { return ''; }
}

const TIPO_LABEL = { contado: 'Contado', cc: 'Cuenta corriente', contra_entrega: 'Contra entrega', acopio: 'Acopio' };

export default function DevolucionDrawer({ open, onClose, empresaId, cliente, clientes = [], sucursalId = null, items: itemsIniciales = null, onSaved }) {
  const clienteFijo = Boolean(cliente?._id || cliente?.id);
  const [clienteSel, setClienteSel] = useState(null);
  const [destino, setDestino] = useState('cc'); // 'cc' (saldo a favor) | 'stock'
  const [avanzado, setAvanzado] = useState(false);
  const [materiales, setMateriales] = useState([lineaVacia()]); // modo avanzado
  const [elegibles, setElegibles] = useState([]); // modo simple: pedidos entregados
  const [loadingElegibles, setLoadingElegibles] = useState(false);
  const [seleccion, setSeleccion] = useState({}); // key -> { sel, cantidad, nombre, precio_unitario }
  const [observacion, setObservacion] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const clienteId = clienteSel?._id || clienteSel?.id || null;

  // Reset al abrir. Si llegan items precargados (p.ej. desde una venta), arranca
  // en modo avanzado con esas líneas; si no, modo simple.
  useEffect(() => {
    if (!open) return;
    setError(''); setObservacion(''); setDestino('cc'); setElegibles([]); setSeleccion({});
    const hayItems = Array.isArray(itemsIniciales) && itemsIniciales.length > 0;
    setAvanzado(hayItems);
    setMateriales(hayItems
      ? itemsIniciales.map((it) => ({
          descripcion: it.descripcion || it.nombre || '',
          cantidad: it.cantidad ?? '',
          precio_unitario: it.precio_unitario ?? it.valorUnitario ?? '',
        }))
      : [lineaVacia()]);
    setClienteSel(clienteFijo ? { _id: cliente._id || cliente.id, nombre: cliente.nombre } : null);
  }, [open, clienteFijo, cliente, itemsIniciales]);

  // Modo simple: traer pedidos entregados del cliente.
  useEffect(() => {
    if (!open || avanzado || !clienteId) { setElegibles([]); return; }
    let cancelado = false;
    setLoadingElegibles(true);
    devolucionService.elegibles(empresaId, clienteId)
      .then((data) => {
        if (cancelado) return;
        setElegibles(data);
        const sel = {};
        data.forEach((p) => {
          p.materiales.forEach((m, i) => {
            sel[keyOf(p.venta_id, i)] = {
              sel: false,
              cantidad: Number(m.cantidad_entregada) || 0,
              nombre: m.nombre,
              precio_unitario: Number(m.precio_unitario) || 0,
            };
          });
        });
        setSeleccion(sel);
      })
      .catch((e) => { if (!cancelado) setError(e?.response?.data?.error || e.message || 'Error al cargar entregas.'); })
      .finally(() => { if (!cancelado) setLoadingElegibles(false); });
    return () => { cancelado = true; };
  }, [open, avanzado, clienteId, empresaId]);

  function toggleSel(key, checked) {
    setSeleccion((s) => ({ ...s, [key]: { ...s[key], sel: checked } }));
  }
  function setSelCantidad(key, max, valor) {
    let q = Number(valor);
    if (!Number.isFinite(q) || q < 0) q = 0;
    if (q > max) q = max;
    setSeleccion((s) => ({ ...s, [key]: { ...s[key], cantidad: q } }));
  }

  function setLinea(idx, patch) { setMateriales((s) => s.map((l, i) => (i === idx ? { ...l, ...patch } : l))); }
  function addLinea() { setMateriales((s) => [...s, lineaVacia()]); }
  function delLinea(idx) { setMateriales((s) => (s.length > 1 ? s.filter((_, i) => i !== idx) : s)); }

  // Materiales finales según el modo activo.
  const matsFinales = useMemo(() => {
    if (avanzado) {
      return materiales
        .map((m) => ({
          descripcion: String(m.descripcion || '').trim(),
          cantidad: Math.abs(Number(m.cantidad) || 0),
          precio_unitario: Number(m.precio_unitario) || 0,
        }))
        .filter((m) => m.descripcion && m.cantidad > 0);
    }
    return Object.values(seleccion)
      .filter((s) => s.sel && Number(s.cantidad) > 0)
      .map((s) => ({
        descripcion: String(s.nombre || '').trim(),
        cantidad: Math.abs(Number(s.cantidad) || 0),
        precio_unitario: Number(s.precio_unitario) || 0,
      }))
      .filter((m) => m.descripcion && m.cantidad > 0);
  }, [avanzado, materiales, seleccion]);

  const totalCredito = useMemo(
    () => matsFinales.reduce((a, m) => a + m.cantidad * m.precio_unitario, 0),
    [matsFinales],
  );

  async function submit() {
    setError('');
    if (destino === 'cc' && !clienteId) { setError('Para reintegrar a cuenta corriente elegí un cliente.'); return; }
    if (!matsFinales.length) { setError('Elegí al menos un material con cantidad mayor a 0.'); return; }
    if (destino === 'cc' && totalCredito <= 0) {
      setError('Para generar saldo a favor los materiales necesitan precio.');
      return;
    }

    setSaving(true);
    try {
      await devolucionService.registrar(empresaId, {
        origen: {
          tipo: destino === 'cc' ? 'cc' : 'contado',
          cliente_id: clienteId || undefined,
          sucursal_id: sucursalId || undefined,
        },
        materiales: matsFinales,
        observacion: observacion || null,
        destino_reintegro: destino,
      });
      onSaved?.();
      onClose?.();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Error al registrar la devolución.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, maxWidth: '100%' } }}>
      <div className="flex h-full min-h-0 flex-col bg-neutral-50">
        <header className="shrink-0 border-b border-divider bg-white px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight text-neutral-900">Registrar devolución</h2>
            <IconButton onClick={onClose} size="small"><XMarkIcon className="h-5 w-5" /></IconButton>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <div className="flex flex-col gap-2">
            {error && <Alert severity="error">{error}</Alert>}

            <div className="rounded-xl border border-divider bg-white p-3 shadow-sm">
              {clienteFijo ? (
                <p className="text-sm font-medium text-neutral-900">{clienteSel?.nombre}</p>
              ) : (
                <Autocomplete
                  options={clientes}
                  getOptionLabel={(o) => o?.nombre || ''}
                  isOptionEqualToValue={(o, v) => String(o._id || o.id) === String(v._id || v.id)}
                  value={clienteSel}
                  onChange={(_, v) => setClienteSel(v)}
                  renderInput={(params) => <TextField {...params} label="Cliente" size="small" />}
                />
              )}
              <FormControl size="small" fullWidth sx={{ mt: 2 }}>
                <InputLabel>Reintegro</InputLabel>
                <Select label="Reintegro" value={destino} onChange={(e) => setDestino(e.target.value)}>
                  <MenuItem value="cc">Saldo a favor (cuenta corriente)</MenuItem>
                  <MenuItem value="stock">Solo reponer stock</MenuItem>
                </Select>
              </FormControl>
            </div>

            {/* Toggle simple / avanzado */}
            <div className="flex items-center justify-between rounded-xl border border-divider bg-white px-3 py-1.5 shadow-sm">
              <span className="text-xs text-neutral-600">
                {avanzado ? 'Carga manual de materiales' : 'Elegí de lo entregado al cliente'}
              </span>
              <FormControlLabel
                sx={{ m: 0 }}
                control={<Switch size="small" checked={avanzado} onChange={(e) => setAvanzado(e.target.checked)} />}
                label={<span className="text-xs text-neutral-700">Avanzado</span>}
                labelPlacement="start"
              />
            </div>

            {/* MODO SIMPLE: pedidos entregados */}
            {!avanzado && (
              <>
                {!clienteId ? (
                  <div className="rounded-xl border border-dashed border-divider bg-white px-3 py-4 text-center text-xs text-neutral-400">
                    Elegí un cliente para ver sus pedidos entregados.
                  </div>
                ) : loadingElegibles ? (
                  <div className="flex justify-center py-6"><CircularProgress size={22} /></div>
                ) : elegibles.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-divider bg-white px-3 py-4 text-center text-xs text-neutral-400">
                    Este cliente no tiene material entregado. Usá el modo avanzado para cargar a mano.
                  </div>
                ) : (
                  elegibles.map((p) => (
                    <div key={p.venta_id} className="rounded-xl border border-divider bg-white shadow-sm">
                      <div className="flex items-center justify-between border-b border-divider px-3 py-2">
                        <span className="text-sm font-semibold text-neutral-900">{TIPO_LABEL[p.tipo] || p.tipo}</span>
                        <span className="text-[11px] text-neutral-500">{fmtDate(p.fecha)}</span>
                      </div>
                      <div className="divide-y divide-divider">
                        {p.materiales.map((m, idx) => {
                          const key = keyOf(p.venta_id, idx);
                          const s = seleccion[key] || { sel: false, cantidad: 0 };
                          const max = Number(m.cantidad_entregada) || 0;
                          return (
                            <div key={key} className="flex items-center gap-2 px-3 py-2">
                              <Checkbox size="small" sx={{ p: 0.5 }} checked={!!s.sel} onChange={(e) => toggleSel(key, e.target.checked)} />
                              <div className="min-w-0 flex-1">
                                <span className="block truncate text-sm text-neutral-900">{m.nombre}</span>
                                <span className="block text-[11px] text-neutral-500">
                                  {formatCurrencyWithCode(m.precio_unitario || 0)} c/u · entregado {max}{m.unidad ? ` ${m.unidad}` : ''}
                                </span>
                              </div>
                              <TextField
                                size="small" type="number" disabled={!s.sel}
                                value={s.cantidad}
                                onChange={(e) => setSelCantidad(key, max, e.target.value)}
                                inputProps={{ min: 0, max }}
                                sx={{ width: 76 }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {/* MODO AVANZADO: carga libre */}
            {avanzado && (
              <div className="rounded-xl border border-divider bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-divider px-3 py-2">
                  <h3 className="text-sm font-semibold text-neutral-900">Materiales devueltos</h3>
                  <button type="button" onClick={addLinea}
                    className="flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50">
                    <PlusIcon className="h-3.5 w-3.5" /> Agregar
                  </button>
                </div>
                <div className="divide-y divide-divider">
                  {materiales.map((l, idx) => (
                    <div key={idx} className="flex items-end gap-2 px-3 py-2">
                      <TextField size="small" label="Material" value={l.descripcion}
                        onChange={(e) => setLinea(idx, { descripcion: e.target.value })} sx={{ flex: 1 }} />
                      <TextField size="small" type="number" label="Cant." value={l.cantidad}
                        onChange={(e) => setLinea(idx, { cantidad: e.target.value })} sx={{ width: 80 }} inputProps={{ min: 0 }} />
                      <TextField size="small" type="number" label="Precio" value={l.precio_unitario}
                        onChange={(e) => setLinea(idx, { precio_unitario: e.target.value })} sx={{ width: 100 }} inputProps={{ min: 0 }} />
                      <IconButton size="small" onClick={() => delLinea(idx)} disabled={materiales.length === 1}>
                        <TrashIcon className="h-4 w-4" />
                      </IconButton>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resumen saldo a favor */}
            {destino === 'cc' && (
              <div className="rounded-xl border border-divider bg-white px-3 py-2 text-right text-[11px] text-neutral-500 shadow-sm">
                Saldo a favor estimado: <b>{formatCurrencyWithCode(totalCredito)}</b>
              </div>
            )}

            <div className="rounded-xl border border-divider bg-white p-3 shadow-sm">
              <TextField size="small" fullWidth multiline minRows={2} label="Observación (opcional)"
                value={observacion} onChange={(e) => setObservacion(e.target.value)} />
            </div>
          </div>
        </div>

        <footer className="shrink-0 border-t border-divider bg-white px-4 py-3">
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={saving}
              className="rounded-lg border border-neutral-300 bg-white px-4 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">Cancelar</button>
            <button type="button" onClick={submit} disabled={saving || matsFinales.length === 0}
              className="rounded-lg bg-primary-main px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-50">
              {saving ? 'Registrando…' : 'Registrar devolución'}
            </button>
          </div>
        </footer>
      </div>
    </Drawer>
  );
}
