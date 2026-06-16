/**
 * DesacopioClienteDrawer — registrar el RETIRO de material de un acopio de cliente
 * (vertical corralón).
 *
 * El cliente retira contra el saldo de su acopio: cada línea se valúa al precio
 * CONGELADO de la lista. Materiales fuera de la lista requieren precio explícito
 * (quedan agregados a la lista). El saldo puede quedar NEGATIVO (sobregiro permitido).
 * Sin impacto en stock. Ver docs/corralones/12-propuesta-acopios-corralon.md.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Checkbox, CircularProgress, Drawer, IconButton, TextField,
} from '@mui/material';
import { XMarkIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import ventaService from 'src/services/ventaService';
import { formatCurrencyWithCode } from 'src/utils/formatters';

const lineaLibre = () => ({ nombre: '', cantidad: '', precio_unitario: '' });

export default function DesacopioClienteDrawer({ open, onClose, empresaId, acopio, onSaved, modo = 'retiro' }) {
  const acopioId = acopio?.id || acopio?._id || acopio?.acopio_id;
  const esDev = modo === 'devolucion';
  const titulo = esDev ? 'Registrar devolución al acopio' : 'Registrar retiro de acopio';
  const verbo = esDev ? 'Devolución' : 'Retiro';

  const [info, setInfo] = useState(null); // { saldo, valor_acopio, valor_desacopio, lista_precios, cliente }
  const [loading, setLoading] = useState(false);
  const [seleccion, setSeleccion] = useState({}); // idx → { sel, cantidad }
  const [extras, setExtras] = useState([]); // fuera de lista: [{ nombre, cantidad, precio_unitario }]
  const [observacion, setObservacion] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !acopioId) return;
    setError(''); setObservacion(''); setSeleccion({}); setExtras([]); setInfo(null);
    setLoading(true);
    ventaService.listaPreciosAcopio(empresaId, acopioId)
      .then(setInfo)
      .catch((e) => setError(e?.response?.data?.error || e.message || 'Error al cargar el acopio.'))
      .finally(() => setLoading(false));
  }, [open, acopioId, empresaId]);

  const lista = info?.lista_precios || [];

  function toggleSel(idx, checked) {
    setSeleccion((s) => ({ ...s, [idx]: { sel: checked, cantidad: s[idx]?.cantidad ?? 1 } }));
  }
  function setCantidad(idx, valor) {
    let q = Number(valor);
    if (!Number.isFinite(q) || q < 0) q = 0;
    setSeleccion((s) => ({ ...s, [idx]: { ...s[idx], cantidad: q } }));
  }
  function setExtra(i, patch) { setExtras((s) => s.map((l, j) => (j === i ? { ...l, ...patch } : l))); }
  function addExtra() { setExtras((s) => [...s, lineaLibre()]); }
  function delExtra(i) { setExtras((s) => s.filter((_, j) => j !== i)); }

  // Materiales finales: de la lista (precio congelado) + fuera de lista (precio aclarado).
  const matsFinales = useMemo(() => {
    const deLista = lista
      .map((l, idx) => ({ l, s: seleccion[idx] }))
      .filter(({ s }) => s?.sel && Number(s.cantidad) > 0)
      .map(({ l, s }) => ({ codigo: l.codigo || null, nombre: l.nombre, cantidad: Number(s.cantidad), precio_unitario_ref: l.precio_unitario }));
    const fueraLista = extras
      .map((e) => ({ nombre: String(e.nombre || '').trim(), cantidad: Math.abs(Number(e.cantidad) || 0), precio_unitario: Number(e.precio_unitario) || 0 }))
      .filter((e) => e.nombre && e.cantidad > 0 && e.precio_unitario > 0);
    return { deLista, fueraLista };
  }, [lista, seleccion, extras]);

  const totalRetiro = useMemo(() => {
    const a = matsFinales.deLista.reduce((s, m) => s + m.cantidad * (m.precio_unitario_ref || 0), 0);
    const b = matsFinales.fueraLista.reduce((s, m) => s + m.cantidad * m.precio_unitario, 0);
    return Math.round((a + b) * 100) / 100;
  }, [matsFinales]);

  const saldoActual = Number(info?.saldo) || 0;
  // Retiro consume saldo; devolución lo re-acredita.
  const saldoNuevo = Math.round((saldoActual + (esDev ? totalRetiro : -totalRetiro)) * 100) / 100;
  const totalLineas = matsFinales.deLista.length + matsFinales.fueraLista.length;

  // Extras incompletos (con nombre y cantidad pero sin precio) — bloquean el submit.
  const extrasSinPrecio = extras.some((e) => String(e.nombre || '').trim() && Number(e.cantidad) > 0 && !(Number(e.precio_unitario) > 0));

  async function submit() {
    setError('');
    if (!totalLineas) { setError('Elegí al menos un material con cantidad mayor a 0.'); return; }
    if (extrasSinPrecio) { setError('Los materiales fuera de la lista necesitan precio (queda congelado en el acopio).'); return; }
    setSaving(true);
    try {
      const payload = {
        materiales: [
          ...matsFinales.deLista.map((m) => ({ codigo: m.codigo, nombre: m.nombre, cantidad: m.cantidad })),
          ...matsFinales.fueraLista,
        ],
        observacion: observacion || null,
      };
      if (esDev) await ventaService.devolucionAcopio(empresaId, acopioId, payload);
      else await ventaService.desacopioCliente(empresaId, acopioId, payload);
      onSaved?.();
      onClose?.();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || `Error al registrar la ${esDev ? 'devolución' : 'retiro'}.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, maxWidth: '100%' } }}>
      <div className="flex h-full min-h-0 flex-col bg-neutral-50">
        <header className="shrink-0 border-b border-divider bg-white px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold tracking-tight text-neutral-900">{titulo}</h2>
              {info && (
                <p className="mt-0.5 text-xs text-neutral-500">
                  {info.cliente || 'Cliente'} · saldo {formatCurrencyWithCode(saldoActual)}
                </p>
              )}
            </div>
            <IconButton onClick={onClose} size="small"><XMarkIcon className="h-5 w-5" /></IconButton>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <div className="flex flex-col gap-2">
            {error && <Alert severity="error">{error}</Alert>}

            {loading ? (
              <div className="flex justify-center py-8"><CircularProgress size={24} /></div>
            ) : (
              <>
                {/* Lista de precios congelada */}
                <div className="rounded-xl border border-divider bg-white shadow-sm">
                  <div className="border-b border-divider px-3 py-2">
                    <h3 className="text-sm font-semibold text-neutral-900">Lista de precios (congelados)</h3>
                  </div>
                  {lista.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-neutral-400">
                      Este acopio no tiene lista de precios cargada. Usá "Fuera de lista" para retirar igual (aclarando el precio).
                    </p>
                  ) : (
                    <div className="divide-y divide-divider">
                      {lista.map((l, idx) => {
                        const s = seleccion[idx] || { sel: false, cantidad: 1 };
                        return (
                          <div key={idx} className="flex items-center gap-2 px-3 py-2">
                            <Checkbox size="small" sx={{ p: 0.5 }} checked={!!s.sel} onChange={(e) => toggleSel(idx, e.target.checked)} />
                            <div className="min-w-0 flex-1">
                              <span className="block truncate text-sm text-neutral-900">{l.codigo ? `[${l.codigo}] ` : ''}{l.nombre}</span>
                              <span className="block text-[11px] text-neutral-500">
                                {formatCurrencyWithCode(l.precio_unitario || 0)} c/u{l.unidad ? ` · ${l.unidad}` : ''}
                              </span>
                            </div>
                            <TextField
                              size="small" type="number" disabled={!s.sel}
                              value={s.cantidad}
                              onChange={(e) => setCantidad(idx, e.target.value)}
                              inputProps={{ min: 0 }}
                              sx={{ width: 76 }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Fuera de lista */}
                <div className="rounded-xl border border-divider bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-divider px-3 py-2">
                    <h3 className="text-sm font-semibold text-neutral-900">Fuera de lista</h3>
                    <button type="button" onClick={addExtra}
                      className="flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50">
                      <PlusIcon className="h-3.5 w-3.5" /> Agregar
                    </button>
                  </div>
                  {extras.length === 0 ? (
                    <p className="px-3 py-3 text-[11px] text-neutral-400">
                      Material que no está en la lista: se retira aclarando el precio (queda congelado en el acopio).
                    </p>
                  ) : (
                    <div className="divide-y divide-divider">
                      {extras.map((l, i) => (
                        <div key={i} className="flex items-end gap-2 px-3 py-2">
                          <TextField size="small" label="Material" value={l.nombre}
                            onChange={(e) => setExtra(i, { nombre: e.target.value })} sx={{ flex: 1 }} />
                          <TextField size="small" type="number" label="Cant." value={l.cantidad}
                            onChange={(e) => setExtra(i, { cantidad: e.target.value })} sx={{ width: 76 }} inputProps={{ min: 0 }} />
                          <TextField size="small" type="number" label="Precio *" value={l.precio_unitario}
                            onChange={(e) => setExtra(i, { precio_unitario: e.target.value })} sx={{ width: 96 }} inputProps={{ min: 0 }} />
                          <IconButton size="small" onClick={() => delExtra(i)}>
                            <TrashIcon className="h-4 w-4" />
                          </IconButton>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Resumen de saldo */}
                <div className="rounded-xl border border-divider bg-white px-3 py-2 text-right text-[11px] text-neutral-500 shadow-sm">
                  {verbo}: <b>{formatCurrencyWithCode(totalRetiro)}</b> · Saldo: {formatCurrencyWithCode(saldoActual)} →{' '}
                  <b className={saldoNuevo < -0.005 ? 'text-error-dark' : 'text-neutral-900'}>
                    {formatCurrencyWithCode(saldoNuevo)}
                  </b>
                  {!esDev && saldoNuevo < -0.005 && (
                    <span className="block text-error-dark">⚠️ El acopio queda en negativo: el cliente pasa a deber la diferencia.</span>
                  )}
                </div>

                <div className="rounded-xl border border-divider bg-white p-3 shadow-sm">
                  <TextField size="small" fullWidth multiline minRows={2} label="Observación (opcional)"
                    value={observacion} onChange={(e) => setObservacion(e.target.value)} />
                </div>
              </>
            )}
          </div>
        </div>

        <footer className="shrink-0 border-t border-divider bg-white px-4 py-3">
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={saving}
              className="rounded-lg border border-neutral-300 bg-white px-4 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">Cancelar</button>
            <button type="button" onClick={submit} disabled={saving || loading || !totalLineas}
              className="rounded-lg bg-primary-main px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-50">
              {saving ? 'Registrando…' : `Registrar ${esDev ? 'devolución' : 'retiro'}`}
            </button>
          </div>
        </footer>
      </div>
    </Drawer>
  );
}
