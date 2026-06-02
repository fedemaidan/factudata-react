/**
 * CobroFormDrawer — registrar un cobro de cliente en drawer lateral.
 *
 * Lista los movimientos pendientes del cliente (la deuda: ventas + otros),
 * permite auto-imputar (FIFO, más viejos primero) o manual, y registra el cobro
 * vía cobroService. El sobrante queda como saldo a favor del cliente.
 *
 * Reemplaza /cobros-cliente/nuevo en los flujos de drawer (cliente/titular).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  CircularProgress,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import { XMarkIcon } from '@heroicons/react/24/outline';
import clienteService from 'src/services/clienteService';
import cobroService from 'src/services/cobroService';
import { formatCurrencyWithCode } from 'src/utils/formatters';

const METODOS = [
  { v: 'efectivo', l: 'Efectivo' },
  { v: 'transferencia', l: 'Transferencia' },
  { v: 'cheque', l: 'Cheque' },
  { v: 'otro', l: 'Otro' },
];

export default function CobroFormDrawer({ open, onClose, empresaId, cliente, clientes = [], cajas = [], onSaved }) {
  const clienteFijo = Boolean(cliente?._id || cliente?.id);
  const [clienteSel, setClienteSel] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [imput, setImput] = useState({}); // movId -> { checked, monto, pendiente }
  const [montoBruto, setMontoBruto] = useState('');
  const [moneda, setMoneda] = useState('ARS');
  const [metodo, setMetodo] = useState('efectivo');
  const [cajaId, setCajaId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const clienteId = clienteSel?._id || clienteSel?.id || null;

  // Init al abrir.
  useEffect(() => {
    if (!open) return;
    setError(''); setMontoBruto(''); setMoneda('ARS'); setMetodo('efectivo'); setCajaId('');
    setClienteSel(clienteFijo ? { _id: cliente._id || cliente.id, nombre: cliente.nombre } : null);
  }, [open, clienteFijo, cliente]);

  // Cargar movimientos pendientes del cliente.
  const cargarMovs = useCallback(async () => {
    if (!open || !empresaId || !clienteId) { setMovimientos([]); setImput({}); return; }
    setLoading(true);
    try {
      const cc = await clienteService.getCuentaCorriente(empresaId, clienteId);
      const pend = (cc?.movimientos || []).filter((m) => {
        const p = (Number(m.total) || 0) - (Number(m.monto_pagado) || 0);
        return m.type === 'ingreso' && p > 0.005;
      });
      setMovimientos(pend);
      const init = {};
      pend.forEach((m) => {
        const p = (Number(m.total) || 0) - (Number(m.monto_pagado) || 0);
        init[m._id] = { checked: false, monto: p, pendiente: p };
      });
      setImput(init);
    } finally {
      setLoading(false);
    }
  }, [open, empresaId, clienteId]);

  useEffect(() => { cargarMovs(); }, [cargarMovs]);

  const totalImputado = useMemo(
    () => Object.values(imput).filter((i) => i.checked).reduce((a, i) => a + (Number(i.monto) || 0), 0),
    [imput]
  );
  const totalPendiente = useMemo(
    () => movimientos.reduce((a, m) => a + Math.max(0, (Number(m.total) || 0) - (Number(m.monto_pagado) || 0)), 0),
    [movimientos]
  );

  function autoImputar() {
    const bruto = Number(montoBruto) || 0;
    if (bruto <= 0) return;
    let resto = bruto;
    const next = {};
    for (const m of movimientos) {
      const p = (Number(m.total) || 0) - (Number(m.monto_pagado) || 0);
      if (resto > 0.005 && p > 0.005) {
        const aplicar = Math.min(resto, p);
        next[m._id] = { checked: true, monto: Math.round(aplicar * 100) / 100, pendiente: p };
        resto -= aplicar;
      } else {
        next[m._id] = { checked: false, monto: p, pendiente: p };
      }
    }
    setImput(next);
  }

  const sinImputar = Math.max(0, (Number(montoBruto) || 0) - totalImputado);

  async function submit() {
    setError('');
    if (!clienteId) { setError('Elegí un cliente'); return; }
    const bruto = Number(montoBruto);
    if (!Number.isFinite(bruto) || bruto <= 0) { setError('Ingresá el monto cobrado'); return; }
    if (totalImputado > bruto + 0.005) { setError('La suma imputada supera el monto cobrado'); return; }
    for (const [id, i] of Object.entries(imput)) {
      if (i.checked && Number(i.monto) > (i.pendiente || 0) + 0.005) {
        setError('Una imputación supera el pendiente de su movimiento'); return;
      }
    }
    setSaving(true);
    try {
      await cobroService.crear(empresaId, {
        cliente_id: clienteId,
        fecha_cobro: new Date().toISOString().slice(0, 10),
        monto_bruto: bruto,
        moneda,
        metodo,
        caja_id: cajaId || null,
        imputaciones: Object.entries(imput)
          .filter(([, i]) => i.checked && Number(i.monto) > 0)
          .map(([movimiento_id, i]) => ({ movimiento_id, monto_imputado: Number(i.monto) })),
      });
      onSaved?.();
      onClose?.();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Error al registrar el cobro');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, maxWidth: '100%' } }}>
      <div className="flex h-full min-h-0 flex-col bg-neutral-50">
        <header className="shrink-0 border-b border-divider bg-white px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight text-neutral-900">Registrar cobro</h2>
            <IconButton onClick={onClose} size="small"><XMarkIcon className="h-5 w-5" /></IconButton>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <div className="flex flex-col gap-2">
            {error && <Alert severity="error">{error}</Alert>}

            {/* Cliente */}
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
                  renderInput={(params) => <TextField {...params} label="Cliente *" size="small" />}
                />
              )}
              <div className="mt-2 grid grid-cols-3 gap-2">
                <TextField size="small" type="number" label="Monto cobrado *" value={montoBruto}
                  onChange={(e) => setMontoBruto(e.target.value)} />
                <FormControl size="small">
                  <InputLabel>Moneda</InputLabel>
                  <Select label="Moneda" value={moneda} onChange={(e) => setMoneda(e.target.value)}>
                    <MenuItem value="ARS">ARS</MenuItem>
                    <MenuItem value="USD">USD</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small">
                  <InputLabel>Método</InputLabel>
                  <Select label="Método" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                    {METODOS.map((m) => <MenuItem key={m.v} value={m.v}>{m.l}</MenuItem>)}
                  </Select>
                </FormControl>
              </div>
              {cajas.length > 0 && (
                <FormControl size="small" fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Caja</InputLabel>
                  <Select label="Caja" value={cajaId} onChange={(e) => setCajaId(e.target.value)}>
                    <MenuItem value="">(sin caja)</MenuItem>
                    {cajas.map((c) => <MenuItem key={c.id || c._id || c.nombre} value={c.id || c._id || c.nombre}>{c.nombre}</MenuItem>)}
                  </Select>
                </FormControl>
              )}
            </div>

            {/* Imputaciones */}
            <div className="rounded-xl border border-divider bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-divider px-3 py-2">
                <h3 className="text-sm font-semibold text-neutral-900">Imputar a deudas</h3>
                <button type="button" onClick={autoImputar}
                  className="rounded-md border border-neutral-300 px-2 py-1 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50">
                  Auto-imputar
                </button>
              </div>
              {loading ? (
                <div className="flex justify-center py-6"><CircularProgress size={20} /></div>
              ) : movimientos.length === 0 ? (
                <p className="px-3 py-3 text-xs text-neutral-400">
                  {clienteId ? 'El cliente no tiene deudas pendientes — el cobro quedará como saldo a favor.' : 'Elegí un cliente.'}
                </p>
              ) : (
                <div className="divide-y divide-divider">
                  {movimientos.map((m) => {
                    const e = imput[m._id] || { checked: false, monto: 0, pendiente: 0 };
                    return (
                      <div key={m._id} className="flex items-center gap-2 px-3 py-2">
                        <input type="checkbox" checked={!!e.checked}
                          onChange={(ev) => setImput((s) => ({ ...s, [m._id]: { ...s[m._id], checked: ev.target.checked } }))} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-neutral-900">{m.descripcion || m.categoria || 'Movimiento'}</p>
                          <p className="text-[11px] text-neutral-500">Pendiente {formatCurrencyWithCode(e.pendiente)}</p>
                        </div>
                        <TextField size="small" type="number" disabled={!e.checked} value={e.monto}
                          onChange={(ev) => setImput((s) => ({ ...s, [m._id]: { ...s[m._id], monto: ev.target.value } }))}
                          sx={{ width: 110 }} inputProps={{ min: 0, max: e.pendiente }} />
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="border-t border-divider px-3 py-2 text-right text-[11px] text-neutral-500">
                Pendiente total: {formatCurrencyWithCode(totalPendiente)} · Imputado: {formatCurrencyWithCode(totalImputado)}
                {sinImputar > 0.005 && <span className="text-info-dark"> · A favor: {formatCurrencyWithCode(sinImputar)}</span>}
              </div>
            </div>
          </div>
        </div>

        <footer className="shrink-0 border-t border-divider bg-white px-4 py-3">
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-neutral-300 bg-white px-4 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">Cancelar</button>
            <button type="button" onClick={submit} disabled={saving} className="rounded-lg bg-primary-main px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-50">
              {saving ? 'Registrando…' : 'Registrar cobro'}
            </button>
          </div>
        </footer>
      </div>
    </Drawer>
  );
}
