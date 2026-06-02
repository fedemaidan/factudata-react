/**
 * CobroDetalleDrawer — detalle de un cobro de cliente en drawer: fecha, monto,
 * método, imputaciones (a qué deudas), saldo sin imputar, y anulación.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  MenuItem,
  TextField,
} from '@mui/material';
import { XMarkIcon } from '@heroicons/react/24/outline';
import cobroService from 'src/services/cobroService';
import { formatCurrencyWithCode, formatTimestamp } from 'src/utils/formatters';

const METODO_LABEL = { efectivo: 'Efectivo', transferencia: 'Transferencia', cheque: 'Cheque', otro: 'Otro' };

export default function CobroDetalleDrawer({ open, onClose, empresaId, cobroId, clienteNombre, onChanged }) {
  const [cobro, setCobro] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [anularOpen, setAnularOpen] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [accion, setAccion] = useState('revertir_a_pendiente');
  const [busy, setBusy] = useState(false);

  const cargar = useCallback(async () => {
    if (!open || !empresaId || !cobroId) return;
    setLoading(true); setError('');
    try { setCobro(await cobroService.obtener(empresaId, cobroId)); }
    catch (e) { setError(e?.response?.data?.error || 'Error al cargar el cobro'); }
    finally { setLoading(false); }
  }, [open, empresaId, cobroId]);

  useEffect(() => { cargar(); }, [cargar]);

  async function anular() {
    setBusy(true); setError('');
    try {
      await cobroService.anular(empresaId, cobroId, { motivo: motivo || null, accion_movimientos: accion });
      setAnularOpen(false);
      await cargar();
      onChanged?.();
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally { setBusy(false); }
  }

  const anulado = cobro?.estado === 'anulado';
  const imputaciones = cobro?.imputaciones || [];
  const sinImputar = Number(cobro?.monto_sin_imputar) || 0;

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 460 }, maxWidth: '100%' } }}>
      <div className="flex h-full min-h-0 flex-col bg-neutral-50">
        <header className="shrink-0 border-b border-divider bg-white px-4 py-3">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <h2 className="text-base font-bold tracking-tight text-neutral-900">Cobro</h2>
              {cobro && (
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-800">{clienteNombre || cobro.cliente_id}</span>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-800">{formatTimestamp(cobro.fecha_cobro)}</span>
                  {anulado && <span className="rounded-full bg-error-main/15 px-2 py-0.5 text-[11px] font-semibold text-error-dark">Anulado</span>}
                </div>
              )}
            </div>
            <IconButton onClick={onClose} size="small"><XMarkIcon className="h-5 w-5" /></IconButton>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {loading && !cobro ? (
            <div className="flex justify-center py-10"><CircularProgress size={24} /></div>
          ) : !cobro ? (
            <Alert severity="error">{error || 'Cobro no encontrado'}</Alert>
          ) : (
            <div className="flex flex-col gap-2">
              {error && <Alert severity="error">{error}</Alert>}

              <div className="rounded-xl border border-divider bg-white p-3 shadow-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-neutral-500">Monto cobrado</span>
                    <p className="text-lg font-bold text-neutral-900">{formatCurrencyWithCode(cobro.monto_bruto, cobro.moneda)}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-neutral-500">Método</span>
                    <p className="text-sm font-semibold text-neutral-900">{METODO_LABEL[cobro.metodo] || cobro.metodo || '—'}</p>
                  </div>
                </div>
                {(Number(cobro.total_retenciones) || 0) > 0 && (
                  <p className="mt-1 text-[11px] text-neutral-500">Retenciones: {formatCurrencyWithCode(cobro.total_retenciones)} · Neto: {formatCurrencyWithCode(cobro.monto_neto_recibido)}</p>
                )}
                {cobro.notas && <p className="mt-2 border-t border-divider pt-2 text-xs text-neutral-600">{cobro.notas}</p>}
              </div>

              <div className="rounded-xl border border-divider bg-white shadow-sm">
                <div className="border-b border-divider px-3 py-2">
                  <h3 className="text-sm font-semibold text-neutral-900">Imputaciones</h3>
                </div>
                {imputaciones.length === 0 ? (
                  <p className="px-3 py-3 text-xs text-neutral-400">Sin imputar a ninguna deuda.</p>
                ) : (
                  <div className="divide-y divide-divider">
                    {imputaciones.map((imp, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 px-3 py-2">
                        <span className="truncate text-sm text-neutral-700">
                          {imp.venta_id ? 'Venta' : 'Deuda'}{imp.cuota_numero ? ` · cuota ${imp.cuota_numero}` : ''}
                        </span>
                        <span className="shrink-0 text-sm font-medium text-neutral-900">{formatCurrencyWithCode(imp.monto_imputado)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {sinImputar > 0.005 && (
                  <div className="border-t border-divider px-3 py-2 text-right text-[11px] text-info-dark">
                    Saldo a favor (sin imputar): {formatCurrencyWithCode(sinImputar)}
                  </div>
                )}
              </div>

              {anulado && cobro.anulacion?.motivo && (
                <div className="rounded-lg border border-error-main/30 bg-error-main/5 px-3 py-2 text-xs text-error-dark">
                  Anulado: {cobro.anulacion.motivo}
                </div>
              )}
            </div>
          )}
        </div>

        {cobro && !anulado && (
          <footer className="shrink-0 border-t border-divider bg-white px-4 py-3">
            <div className="flex justify-end">
              <button type="button" onClick={() => { setMotivo(''); setAccion('revertir_a_pendiente'); setAnularOpen(true); }}
                className="rounded-lg border border-error-main/50 bg-white px-4 py-1.5 text-sm font-medium text-error-dark hover:bg-error-main/5">
                Anular cobro
              </button>
            </div>
          </footer>
        )}
      </div>

      <Dialog open={anularOpen} onClose={() => !busy && setAnularOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Anular cobro</DialogTitle>
        <DialogContent>
          <TextField select fullWidth size="small" label="Qué hacer con las deudas" sx={{ mt: 1, mb: 2 }}
            value={accion} onChange={(e) => setAccion(e.target.value)}>
            <MenuItem value="revertir_a_pendiente">Revertir: las deudas vuelven a pendiente</MenuItem>
            <MenuItem value="mantener_pagados">Mantener las deudas como pagadas</MenuItem>
          </TextField>
          <TextField fullWidth size="small" label="Motivo (opcional)" multiline minRows={2}
            value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnularOpen(false)} disabled={busy}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={anular} disabled={busy}>{busy ? 'Anulando…' : 'Anular'}</Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
}
