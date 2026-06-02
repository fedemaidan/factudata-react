/**
 * ClienteDetalleDrawer — detalle de un cliente (obra/razón social) en drawer
 * lateral, alineado al lenguaje visual de ventas. Muestra saldo, datos, grupo
 * (titular) con transferencia de saldo entre obras, y movimientos de CC.
 *
 * No saca al usuario de /clientes. Editar delega al modal existente vía onEdit.
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
import clienteService from 'src/services/clienteService';
import grupoClienteService from 'src/services/grupoClienteService';
import { formatCurrencyWithCode, formatTimestamp } from 'src/utils/formatters';
import CobroFormDrawer from 'src/components/clientes/CobroFormDrawer';

export default function ClienteDetalleDrawer({ open, onClose, empresaId, clienteId, esCorralon, cajas = [], onEdit, onChanged }) {
  const [cobroOpen, setCobroOpen] = useState(false);
  const [data, setData] = useState(null);
  const [grupoInfo, setGrupoInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [transferOpen, setTransferOpen] = useState(false);
  const [transferDestino, setTransferDestino] = useState('');
  const [transferMonto, setTransferMonto] = useState('');
  const [transferMotivo, setTransferMotivo] = useState('');
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferError, setTransferError] = useState('');

  const cargar = useCallback(async () => {
    if (!open || !empresaId || !clienteId) return;
    setLoading(true); setError('');
    try {
      const cc = await clienteService.getCuentaCorriente(empresaId, clienteId);
      setData(cc);
      if (esCorralon && cc?.cliente?.grupo_id) {
        try { setGrupoInfo(await grupoClienteService.getCuentaCorrienteAgregada(empresaId, cc.cliente.grupo_id)); }
        catch { setGrupoInfo(null); }
      } else {
        setGrupoInfo(null);
      }
    } catch {
      setError('Error al cargar la cuenta corriente');
    } finally {
      setLoading(false);
    }
  }, [open, empresaId, clienteId, esCorralon]);

  useEffect(() => { cargar(); }, [cargar]);

  const cliente = data?.cliente || {};
  const movimientos = data?.movimientos || [];
  const cobros = data?.cobros || [];

  // Saldo neto: + debe / − a favor (mismo criterio que el backend).
  const saldo = useMemo(() => {
    let s = 0;
    for (const m of movimientos) s += (Number(m.total) || 0) - (Number(m.monto_pagado) || 0);
    for (const c of cobros) if (c.estado !== 'anulado') s -= Number(c.monto_sin_imputar) || 0;
    return Math.round(s * 100) / 100;
  }, [movimientos, cobros]);

  const itemsGrupo = grupoInfo?.items || [];
  const miAFavor = Math.max(0, -saldo);
  const destinosGrupo = itemsGrupo.filter((it) => String(it.cliente._id) !== String(clienteId));
  const puedeTransferir = miAFavor > 0.005 && destinosGrupo.length > 0;

  function abrirTransfer() {
    setTransferDestino('');
    setTransferMonto(String(Math.round(miAFavor * 100) / 100));
    setTransferMotivo('');
    setTransferError('');
    setTransferOpen(true);
  }

  async function handleTransferir() {
    const monto = Number(transferMonto);
    if (!transferDestino) { setTransferError('Elegí el cliente destino'); return; }
    if (!Number.isFinite(monto) || monto <= 0) { setTransferError('Monto inválido'); return; }
    setTransferBusy(true); setTransferError('');
    try {
      await clienteService.transferirSaldo(empresaId, clienteId, { destino_cliente_id: transferDestino, monto, motivo: transferMotivo || null });
      setTransferOpen(false);
      await cargar();
      onChanged?.();
    } catch (e) {
      setTransferError(e?.response?.data?.error || e.message);
    } finally {
      setTransferBusy(false);
    }
  }

  const saldoColor = saldo > 0.005 ? 'text-warning-dark' : saldo < -0.005 ? 'text-info-dark' : 'text-neutral-900';

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, maxWidth: '100%' } }}>
      <div className="flex h-full min-h-0 flex-col bg-neutral-50">
        {/* Header */}
        <header className="shrink-0 border-b border-divider bg-white px-4 py-3">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold tracking-tight text-neutral-900">{cliente.nombre || 'Cliente'}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                {cliente.ocasional && (
                  <span className="rounded-full bg-warning-main/15 px-2 py-0.5 text-[11px] font-medium text-warning-dark">Ocasional</span>
                )}
                {grupoInfo?.grupo && (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-800">{grupoInfo.grupo.nombre}</span>
                )}
                {cliente.cuit && (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-800">CUIT {cliente.cuit}</span>
                )}
              </div>
            </div>
            <IconButton onClick={onClose} size="small"><XMarkIcon className="h-5 w-5" /></IconButton>
          </div>
        </header>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {loading && !data ? (
            <div className="flex justify-center py-10"><CircularProgress size={24} /></div>
          ) : (
            <>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

              {/* Saldo */}
              <div className="rounded-xl border border-divider bg-white p-3 shadow-sm">
                <span className="text-[11px] text-neutral-500">Saldo (+ debe / − a favor)</span>
                <p className={`text-xl font-bold ${saldoColor}`}>{formatCurrencyWithCode(saldo)}</p>
                {(cliente.descuento_default != null || cliente.notas_pricing) && (
                  <p className="mt-1 text-[11px] text-primary-dark">
                    {cliente.descuento_default != null ? `Descuento ref.: ${cliente.descuento_default}%` : ''}
                    {cliente.descuento_default != null && cliente.notas_pricing ? ' · ' : ''}
                    {cliente.notas_pricing || ''}
                  </p>
                )}
              </div>

              {/* Grupo / titular */}
              {esCorralon && grupoInfo?.grupo && (
                <div className="mt-2 rounded-xl border border-divider bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[11px] text-neutral-500">Titular</span>
                      <p className="truncate text-sm font-semibold text-neutral-900">{grupoInfo.grupo.nombre}</p>
                      <span className="text-[11px] text-neutral-500">Consolidado: {formatCurrencyWithCode(grupoInfo.total || 0)}</span>
                    </div>
                    {puedeTransferir && (
                      <Button size="small" variant="outlined" onClick={abrirTransfer}>Transferir saldo</Button>
                    )}
                  </div>
                  {destinosGrupo.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {destinosGrupo.map((it) => (
                        <span key={it.cliente._id} className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-700">
                          {it.cliente.nombre} · {formatCurrencyWithCode(it.saldo || 0)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Movimientos */}
              <div className="mt-2 rounded-xl border border-divider bg-white shadow-sm">
                <div className="border-b border-divider px-3 py-2">
                  <h3 className="text-sm font-semibold text-neutral-900">Cuenta corriente</h3>
                </div>
                {movimientos.length === 0 ? (
                  <p className="px-3 py-3 text-xs text-neutral-400">Sin movimientos.</p>
                ) : (
                  <div className="divide-y divide-divider">
                    {[...movimientos].reverse().slice(0, 30).map((m) => {
                      const total = Number(m.total) || 0;
                      const pagado = Number(m.monto_pagado) || 0;
                      const pend = Math.max(0, total - pagado);
                      return (
                        <div key={m._id} className="flex items-center justify-between gap-2 px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm text-neutral-900">{m.descripcion || m.categoria || 'Movimiento'}</p>
                            <p className="text-[11px] text-neutral-500">{formatTimestamp(m.fecha_factura || m.createdAt)}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-medium text-neutral-900">{formatCurrencyWithCode(total)}</p>
                            {pend > 0.005 && <p className="text-[11px] text-warning-dark">Pend. {formatCurrencyWithCode(pend)}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer acciones */}
        <footer className="shrink-0 border-t border-divider bg-white px-4 py-3">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => onEdit?.(cliente)}
              className="mr-auto rounded-lg border border-neutral-300 bg-white px-4 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => setCobroOpen(true)}
              className="rounded-lg bg-primary-main px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark"
            >
              Registrar cobro
            </button>
          </div>
        </footer>
      </div>

      <CobroFormDrawer
        open={cobroOpen}
        empresaId={empresaId}
        cliente={{ _id: clienteId, nombre: cliente.nombre }}
        cajas={cajas}
        onClose={() => setCobroOpen(false)}
        onSaved={() => { cargar(); onChanged?.(); }}
      />

      {/* Dialog transferir saldo */}
      <Dialog open={transferOpen} onClose={() => !transferBusy && setTransferOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Transferir saldo a favor</DialogTitle>
        <DialogContent>
          <span className="text-xs text-neutral-500">Saldo a favor de {cliente.nombre}: <b>{formatCurrencyWithCode(miAFavor)}</b></span>
          {transferError && <Alert severity="error" sx={{ my: 1 }}>{transferError}</Alert>}
          <Autocomplete
            sx={{ mt: 2 }}
            options={destinosGrupo}
            getOptionLabel={(it) => `${it.cliente.nombre} · ${formatCurrencyWithCode(it.saldo || 0)}`}
            isOptionEqualToValue={(o, v) => String(o.cliente._id) === String(v.cliente._id)}
            value={destinosGrupo.find((it) => String(it.cliente._id) === String(transferDestino)) || null}
            onChange={(_, v) => setTransferDestino(v ? String(v.cliente._id) : '')}
            renderInput={(params) => <TextField {...params} label="Cliente destino *" size="small" />}
          />
          <TextField fullWidth size="small" type="number" label="Monto a transferir" sx={{ mt: 2 }}
            value={transferMonto} onChange={(e) => setTransferMonto(e.target.value)} inputProps={{ min: 0, max: miAFavor }} />
          <TextField fullWidth size="small" label="Motivo (opcional)" sx={{ mt: 2 }}
            value={transferMotivo} onChange={(e) => setTransferMotivo(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferOpen(false)} disabled={transferBusy}>Cancelar</Button>
          <Button variant="contained" onClick={handleTransferir} disabled={transferBusy}>
            {transferBusy ? 'Transfiriendo…' : 'Transferir'}
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
}
