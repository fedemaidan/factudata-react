/**
 * GrupoDetalleDrawer — detalle de un titular (GrupoCliente) en drawer: saldo
 * consolidado + cuenta de cada obra (cliente), agregar/quitar obras y acciones
 * (editar, archivar). No saca al usuario de /grupos-cliente.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
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

export default function GrupoDetalleDrawer({ open, onClose, empresaId, grupoId, onEdit, onChanged }) {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [todosClientes, setTodosClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [addSel, setAddSel] = useState(null);
  const [busy, setBusy] = useState(false);

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

  const grupo = data?.grupo || {};
  const items = data?.items || [];
  const total = data?.total || 0;
  const clientesSinGrupo = useMemo(
    () => (todosClientes || []).filter((c) => !c.grupo_id && !c.archivado),
    [todosClientes]
  );

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
    if (!window.confirm(`¿Archivar el titular "${grupo.nombre}"? Las obras se desvinculan pero no se eliminan.`)) return;
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
                    <span className="text-[11px] text-neutral-500">Obras</span>
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
                <div className="flex items-center justify-between border-b border-divider px-3 py-2">
                  <h3 className="text-sm font-semibold text-neutral-900">Obras / razones sociales</h3>
                  <button type="button" onClick={() => { setAddSel(null); setAddOpen(true); }}
                    className="rounded-md border border-neutral-300 px-2 py-1 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50">
                    + Agregar
                  </button>
                </div>
                {items.length === 0 ? (
                  <p className="px-3 py-3 text-xs text-neutral-400">Sin obras en este titular.</p>
                ) : (
                  <div className="divide-y divide-divider">
                    {items.map((it) => {
                      const c = it.cliente;
                      const saldoColor = it.saldo > 0.005 ? 'text-warning-dark' : it.saldo < -0.005 ? 'text-info-dark' : 'text-neutral-900';
                      return (
                        <div key={c._id} className="flex items-center justify-between gap-2 px-3 py-2">
                          <button type="button" onClick={() => router.push(`/clientes?cliente=${c._id}`)} className="min-w-0 text-left">
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
                )}
              </div>
            </>
          )}
        </div>

        <footer className="shrink-0 border-t border-divider bg-white px-4 py-3">
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={handleArchivar} disabled={busy}
              className="mr-auto rounded-lg border border-error-main/50 bg-white px-3 py-1.5 text-sm font-medium text-error-dark hover:bg-error-main/5 disabled:opacity-50">
              Archivar
            </button>
            <button type="button" onClick={() => onEdit?.(grupo)}
              className="rounded-lg border border-neutral-300 bg-white px-4 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
              Editar
            </button>
          </div>
        </footer>
      </div>

      {/* Agregar obra al titular */}
      <Dialog open={addOpen} onClose={() => !busy && setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Agregar obra al titular</DialogTitle>
        <DialogContent>
          <Autocomplete
            sx={{ mt: 1 }}
            options={clientesSinGrupo}
            getOptionLabel={(o) => o.nombre || ''}
            value={addSel}
            onChange={(_, v) => setAddSel(v)}
            renderInput={(params) => <TextField {...params} label="Obra / cliente" autoFocus />}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)} disabled={busy}>Cancelar</Button>
          <Button variant="contained" onClick={handleAdd} disabled={!addSel || busy}>Agregar</Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
}
