/**
 * GrupoDetalleDrawer — detalle de un titular (GrupoCliente) en drawer: saldo
 * consolidado + cuenta de cada obra (cliente), agregar/quitar obras y acciones
 * (editar, archivar). No saca al usuario de /grupos-cliente.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  TextField,
} from '@mui/material';
import { XMarkIcon } from '@heroicons/react/24/outline';
import grupoClienteService from 'src/services/grupoClienteService';
import clienteService from 'src/services/clienteService';
import { formatCurrencyWithCode, formatTimestamp } from 'src/utils/formatters';
import ClienteDetalleDrawer from 'src/components/clientes/ClienteDetalleDrawer';
import ClienteFormDrawer from 'src/components/clientes/ClienteFormDrawer';

export default function GrupoDetalleDrawer({ open, onClose, empresaId, grupoId, onEdit, onChanged }) {
  const [data, setData] = useState(null);
  const [todosClientes, setTodosClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [addSel, setAddSel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [vista, setVista] = useState('obras'); // 'obras' | 'movimientos'
  const [movsConsol, setMovsConsol] = useState(null); // movimientos de todas las obras, con cliente
  const [loadingMovs, setLoadingMovs] = useState(false);
  // Drawers de cliente apilados sobre el del titular.
  const [clienteDetalleId, setClienteDetalleId] = useState(null);
  const [clienteForm, setClienteForm] = useState({ open: false, cliente: null });
  // Cobro consolidado al titular.
  const [cobroOpen, setCobroOpen] = useState(false);
  const [cobroMonto, setCobroMonto] = useState('');
  const [cobroMetodo, setCobroMetodo] = useState('efectivo');
  const [cobroPend, setCobroPend] = useState([]); // deudas pendientes del grupo (FIFO) para el preview de reparto
  const [cobroLoadingPend, setCobroLoadingPend] = useState(false);
  const [linkMsg, setLinkMsg] = useState('');

  const cargar = useCallback(async () => {
    if (!open || !empresaId || !grupoId) return;
    setLoading(true); setError('');
    try {
      const [cc, all] = await Promise.all([
        grupoClienteService.getCuentaCorrienteAgregada(empresaId, grupoId),
        clienteService.getByEmpresaFull(empresaId).catch(() => []),
      ]);
      setData(cc);
      setTodosClientes(all || []);
    } catch {
      setError('Error al cargar el titular');
    } finally {
      setLoading(false);
    }
  }, [open, empresaId, grupoId]);

  useEffect(() => { cargar(); }, [cargar]);

  // Carga consolidada de movimientos de todas las obras (con su cliente).
  useEffect(() => {
    let cancel = false;
    async function load() {
      if (vista !== 'movimientos' || !open || !data) return;
      const its = data.items || [];
      if (!its.length) { setMovsConsol([]); return; }
      setLoadingMovs(true);
      try {
        const results = await Promise.all(its.map((it) =>
          clienteService.getCuentaCorriente(empresaId, it.cliente._id)
            .then((cc) => ({ cc, cliente: it.cliente }))
            .catch(() => null)
        ));
        if (cancel) return;
        const merged = [];
        for (const r of results) {
          if (!r) continue;
          for (const m of (r.cc?.movimientos || [])) {
            merged.push({ ...m, _cliente: r.cliente.nombre });
          }
        }
        merged.sort((a, b) => new Date(b.fecha_factura || b.createdAt || 0) - new Date(a.fecha_factura || a.createdAt || 0));
        setMovsConsol(merged);
      } finally {
        if (!cancel) setLoadingMovs(false);
      }
    }
    load();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, open, data, empresaId]);

  const grupo = data?.grupo || {};
  const items = data?.items || [];
  const total = data?.total || 0;
  const pendienteGrupo = items.reduce((a, it) => a + Math.max(0, Number(it.saldo) || 0), 0);
  const clientesSinGrupo = useMemo(
    () => (todosClientes || []).filter((c) => !c.grupo_id && !c.archivado),
    [todosClientes]
  );

  async function abrirCobro() {
    setCobroMonto(String(Math.round(pendienteGrupo * 100) / 100 || ''));
    setCobroMetodo('efectivo');
    setCobroOpen(true);
    // Traemos las deudas pendientes de cada cliente para mostrar, en vivo, cómo
    // se reparte el cobro (mismo orden FIFO que aplica el backend).
    setCobroLoadingPend(true);
    setCobroPend([]);
    try {
      const results = await Promise.all((items || []).map((it) =>
        clienteService.getCuentaCorriente(empresaId, it.cliente._id)
          .then((cc) => ({ cc, cliente: it.cliente }))
          .catch(() => null)
      ));
      const pend = [];
      for (const r of results) {
        if (!r) continue;
        for (const m of (r.cc?.movimientos || [])) {
          const total = Number(m.total) || 0;
          const p = Math.round(Math.max(0, total - (Number(m.monto_pagado) || 0)) * 100) / 100;
          if (p > 0.005) {
            pend.push({
              mov_id: m._id,
              cliente: r.cliente.nombre,
              descripcion: m.descripcion || m.categoria || 'Deuda',
              fecha: m.fecha_factura || m.createdAt,
              pendiente: p,
            });
          }
        }
      }
      pend.sort((a, b) => new Date(a.fecha || 0) - new Date(b.fecha || 0));
      setCobroPend(pend);
    } finally {
      setCobroLoadingPend(false);
    }
  }

  // Reparto FIFO en vivo del monto a cobrar sobre las deudas pendientes.
  const cobroDist = useMemo(() => {
    let resto = Math.max(0, Number(cobroMonto) || 0);
    return cobroPend.map((p) => {
      const aplicar = Math.min(resto, p.pendiente);
      resto = Math.round((resto - aplicar) * 100) / 100;
      return { ...p, imputar: Math.round(aplicar * 100) / 100 };
    });
  }, [cobroPend, cobroMonto]);
  const cobroImputado = Math.round(cobroDist.reduce((a, d) => a + d.imputar, 0) * 100) / 100;
  const cobroSinImputar = Math.max(0, Math.round(((Number(cobroMonto) || 0) - cobroImputado) * 100) / 100);

  async function generarLink() {
    setBusy(true); setError('');
    try {
      const res = await grupoClienteService.generarTokenPublico(empresaId, grupoId);
      const url = res.url || `${window.location.origin}/consulta-saldo-grupo/${res.token}`;
      try { await navigator.clipboard?.writeText(url); } catch (_) { /* noop */ }
      setLinkMsg('Link de saldo copiado al portapapeles');
      setTimeout(() => setLinkMsg(''), 4000);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally { setBusy(false); }
  }

  async function cobrarTitular() {
    const m = Number(cobroMonto);
    if (!Number.isFinite(m) || m <= 0) { setError('Ingresá un monto válido'); return; }
    setBusy(true); setError('');
    try {
      await grupoClienteService.cobrarTitular(empresaId, grupoId, { monto: m, metodo: cobroMetodo, caja_id: null });
      setCobroOpen(false);
      await cargar();
      onChanged?.();
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally { setBusy(false); }
  }

  async function handleAdd() {
    if (!addSel) return;
    setBusy(true);
    try {
      await clienteService.actualizar(empresaId, addSel._id, { grupo_id: grupoId });
      setAddOpen(false); setAddSel(null);
      await cargar(); onChanged?.();
    } finally { setBusy(false); }
  }

  async function handleQuitar(cliente) {
    if (!window.confirm(`¿Quitar "${cliente.nombre}" de este titular?`)) return;
    setBusy(true);
    try {
      await clienteService.actualizar(empresaId, cliente._id, { grupo_id: null });
      await cargar(); onChanged?.();
    } finally { setBusy(false); }
  }

  async function handleArchivar() {
    if (!window.confirm(`¿Archivar el titular "${grupo.nombre}"? Los clientes se desvinculan pero no se eliminan.`)) return;
    setBusy(true);
    try {
      await grupoClienteService.archivar(empresaId, grupoId);
      onChanged?.(); onClose?.();
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally { setBusy(false); }
  }

  const totalColor = total > 0.005 ? 'text-warning-dark' : total < -0.005 ? 'text-info-dark' : 'text-neutral-900';

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, maxWidth: '100%' } }}>
      <div className="flex h-full min-h-0 flex-col bg-neutral-50">
        <header className="shrink-0 border-b border-divider bg-white px-4 py-3">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {grupo.color && <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: grupo.color }} />}
                <h2 className="truncate text-base font-bold tracking-tight text-neutral-900">{grupo.nombre || 'Titular'}</h2>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                {grupo.telefono && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-800">{grupo.telefono}</span>}
                {grupo.email && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-800">{grupo.email}</span>}
              </div>
            </div>
            <IconButton onClick={onClose} size="small"><XMarkIcon className="h-5 w-5" /></IconButton>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {loading && !data ? (
            <div className="flex justify-center py-10"><CircularProgress size={24} /></div>
          ) : (
            <>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

              <div className="rounded-xl border border-divider bg-white p-3 shadow-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-neutral-500">Clientes</span>
                    <p className="text-lg font-bold text-neutral-900">{items.length}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-neutral-500">Saldo consolidado</span>
                    <p className={`text-lg font-bold ${totalColor}`}>{formatCurrencyWithCode(total)}</p>
                  </div>
                </div>
                {grupo.notas && <p className="mt-2 border-t border-divider pt-2 text-xs text-neutral-600">{grupo.notas}</p>}
              </div>

              <div className="mt-2 rounded-xl border border-divider bg-white shadow-sm">
                <div className="flex items-center justify-between gap-2 border-b border-divider px-3 py-2">
                  <div className="inline-flex rounded-lg bg-neutral-100 p-1">
                    {[['obras', 'Por cliente'], ['movimientos', 'Movimientos']].map(([k, label]) => (
                      <button key={k} type="button" onClick={() => setVista(k)}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${vista === k ? 'bg-white text-primary-dark shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {vista === 'obras' && (
                    <button type="button" onClick={() => { setAddSel(null); setAddOpen(true); }}
                      className="rounded-md border border-neutral-300 px-2 py-1 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50">
                      + Agregar
                    </button>
                  )}
                </div>

                {/* Vista por obra (resumen de saldos) */}
                {vista === 'obras' && (
                  items.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-neutral-400">Sin clientes en este titular.</p>
                  ) : (
                    <div className="divide-y divide-divider">
                      {items.map((it) => {
                        const c = it.cliente;
                        const saldoColor = it.saldo > 0.005 ? 'text-warning-dark' : it.saldo < -0.005 ? 'text-info-dark' : 'text-neutral-900';
                        return (
                          <div key={c._id} className="flex items-center justify-between gap-2 px-3 py-2">
                            <button type="button" onClick={() => setClienteDetalleId(c._id)} className="min-w-0 text-left">
                              <span className="block truncate text-sm font-medium text-primary-dark hover:underline">{c.nombre}</span>
                              <span className="block text-[11px] text-neutral-500">
                                {it.ultima_actividad ? formatTimestamp(it.ultima_actividad) : 'sin actividad'}
                                {it.tiene_vencidas ? ' · vencida' : ''}
                              </span>
                            </button>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className={`text-sm font-medium ${saldoColor}`}>{formatCurrencyWithCode(it.saldo || 0)}</span>
                              <button type="button" onClick={() => handleQuitar(c)} disabled={busy}
                                className="text-[11px] text-error-dark hover:underline disabled:opacity-50">Quitar</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}

                {/* Vista consolidada: todos los movimientos juntos con columna de obra */}
                {vista === 'movimientos' && (
                  loadingMovs && movsConsol === null ? (
                    <div className="flex justify-center py-6"><CircularProgress size={20} /></div>
                  ) : !movsConsol || movsConsol.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-neutral-400">Sin movimientos.</p>
                  ) : (
                    <div className="divide-y divide-divider">
                      {movsConsol.map((m) => {
                        const totalM = Number(m.total) || 0;
                        const pend = Math.max(0, totalM - (Number(m.monto_pagado) || 0));
                        return (
                          <div key={m._id} className="flex items-center justify-between gap-2 px-3 py-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm text-neutral-900">{m.descripcion || m.categoria || 'Movimiento'}</p>
                              <p className="text-[11px] text-neutral-500">
                                <span className="font-medium text-neutral-700">{m._cliente}</span>
                                {' · '}{formatTimestamp(m.fecha_factura || m.createdAt)}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-medium text-neutral-900">{formatCurrencyWithCode(totalM)}</p>
                              {pend > 0.005 && <p className="text-[11px] text-warning-dark">Pend. {formatCurrencyWithCode(pend)}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </div>

        <footer className="shrink-0 border-t border-divider bg-white px-4 py-3">
          {linkMsg && <p className="mb-2 text-[11px] text-success-dark">{linkMsg}</p>}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button type="button" onClick={handleArchivar} disabled={busy}
              className="mr-auto rounded-lg border border-error-main/50 bg-white px-3 py-1.5 text-sm font-medium text-error-dark hover:bg-error-main/5 disabled:opacity-50">
              Archivar
            </button>
            <button type="button" onClick={generarLink} disabled={busy}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">
              Link saldo
            </button>
            <button type="button" onClick={() => onEdit?.(grupo)}
              className="rounded-lg border border-neutral-300 bg-white px-4 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
              Editar
            </button>
            <button type="button" onClick={abrirCobro} disabled={busy || pendienteGrupo <= 0.005}
              title={pendienteGrupo > 0.005 ? 'Cobrar al titular' : 'El titular no tiene saldo pendiente'}
              className="rounded-lg bg-primary-main px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40">
              Registrar cobro
            </button>
          </div>
        </footer>
      </div>

      {/* Cobro consolidado al titular (drawer, consistente con el resto) */}
      <Drawer anchor="right" open={cobroOpen} onClose={() => !busy && setCobroOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 460 }, maxWidth: '100%' } }}>
        <div className="flex h-full min-h-0 flex-col bg-neutral-50">
          <header className="shrink-0 border-b border-divider bg-white px-4 py-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold tracking-tight text-neutral-900">Cobrar al titular</h2>
              <IconButton onClick={() => setCobroOpen(false)} size="small"><XMarkIcon className="h-5 w-5" /></IconButton>
            </div>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="flex flex-col gap-3">
              {error && <Alert severity="error">{error}</Alert>}
              <div className="rounded-xl border border-divider bg-white p-3 shadow-sm">
                <p className="text-xs text-neutral-500">
                  Pendiente del titular: <b>{formatCurrencyWithCode(pendienteGrupo)}</b>. El monto se reparte
                  entre las deudas de los clientes (más viejas primero).
                </p>
                <TextField fullWidth size="small" type="number" label="Monto a cobrar" sx={{ mt: 2, mb: 2 }}
                  value={cobroMonto} onChange={(e) => setCobroMonto(e.target.value)} inputProps={{ min: 0, max: pendienteGrupo }} />
                <TextField fullWidth size="small" select label="Método" SelectProps={{ native: true }}
                  value={cobroMetodo} onChange={(e) => setCobroMetodo(e.target.value)}>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="cheque">Cheque</option>
                  <option value="otro">Otro</option>
                </TextField>
              </div>

              {/* Reparto en vivo: a qué deuda de qué cliente se imputa el cobro */}
              <div className="rounded-xl border border-divider bg-white p-3 shadow-sm">
                <p className="mb-2 text-xs font-semibold text-neutral-700">Cómo se reparte este cobro</p>
                {cobroLoadingPend ? (
                  <div className="flex justify-center py-3"><CircularProgress size={18} /></div>
                ) : cobroDist.length === 0 ? (
                  <p className="text-xs text-neutral-400">El titular no tiene deudas pendientes para imputar.</p>
                ) : (
                  <>
                    <div className="divide-y divide-divider">
                      {cobroDist.map((d) => (
                        <div key={d.mov_id} className={`flex items-center justify-between gap-2 py-1.5 ${d.imputar > 0.005 ? '' : 'opacity-50'}`}>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-neutral-800">{d.cliente}</p>
                            <p className="truncate text-[11px] text-neutral-500">
                              {d.descripcion}{d.fecha ? ` · ${formatTimestamp(d.fecha)}` : ''} · pend. {formatCurrencyWithCode(d.pendiente)}
                            </p>
                          </div>
                          <span className={`shrink-0 text-xs font-semibold ${d.imputar > 0.005 ? 'text-success-dark' : 'text-neutral-300'}`}>
                            {d.imputar > 0.005 ? formatCurrencyWithCode(d.imputar) : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-divider pt-2 text-[11px]">
                      <span className="text-neutral-500">Imputado: <b className="text-neutral-800">{formatCurrencyWithCode(cobroImputado)}</b></span>
                      {cobroSinImputar > 0.005 && (
                        <span className="text-warning-dark">Sin imputar: {formatCurrencyWithCode(cobroSinImputar)}</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <footer className="shrink-0 border-t border-divider bg-white px-4 py-3">
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCobroOpen(false)} disabled={busy}
                className="rounded-lg border border-neutral-300 bg-white px-4 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">Cancelar</button>
              <button type="button" onClick={cobrarTitular} disabled={busy}
                className="rounded-lg bg-primary-main px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-50">
                {busy ? 'Cobrando…' : 'Confirmar cobro'}
              </button>
            </div>
          </footer>
        </div>
      </Drawer>

      {/* Agregar cliente al titular */}
      <Dialog open={addOpen} onClose={() => !busy && setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Agregar cliente al titular</DialogTitle>
        <DialogContent>
          <Autocomplete
            sx={{ mt: 1 }}
            options={clientesSinGrupo}
            getOptionLabel={(o) => o.nombre || ''}
            value={addSel}
            onChange={(_, v) => setAddSel(v)}
            renderInput={(params) => <TextField {...params} label="Cliente" autoFocus />}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)} disabled={busy}>Cancelar</Button>
          <Button variant="contained" onClick={handleAdd} disabled={!addSel || busy}>Agregar</Button>
        </DialogActions>
      </Dialog>

      {/* Drawer de cliente apilado: se abre desde la lista, sin salir del titular */}
      <ClienteDetalleDrawer
        open={Boolean(clienteDetalleId)}
        clienteId={clienteDetalleId}
        empresaId={empresaId}
        esCorralon
        onClose={() => setClienteDetalleId(null)}
        onChanged={() => cargar()}
        onEdit={(c) => { setClienteDetalleId(null); setClienteForm({ open: true, cliente: c }); }}
      />

      <ClienteFormDrawer
        open={clienteForm.open}
        cliente={clienteForm.cliente}
        empresaId={empresaId}
        grupos={grupo?._id ? [grupo] : []}
        onClose={() => setClienteForm({ open: false, cliente: null })}
        onSaved={() => cargar()}
      />
    </Drawer>
  );
}
