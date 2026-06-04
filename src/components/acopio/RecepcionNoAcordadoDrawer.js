/**
 * RecepcionNoAcordadoDrawer — clasificar y resolver material no acordado de un remito.
 *
 * Dado un acopio y las líneas de un remito de proveedor, las clasifica en
 * matcheadas (esperadas) y no acordadas (llegaron sin estar pedidas). Por cada
 * línea no acordada el usuario decide aceptar (entra al acopio/stock) o rechazar
 * (se devuelve al proveedor). Ver docs/corralones/11-propuesta-funcionalidades.md §3.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Chip, Drawer, FormControl, FormControlLabel, IconButton, InputLabel,
  MenuItem, Radio, RadioGroup, Select, TextField,
} from '@mui/material';
import { XMarkIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import recepcionMaterialService from 'src/services/recepcionMaterialService';

const lineaVacia = () => ({ descripcion: '', cantidad: '', valorUnitario: '' });

export default function RecepcionNoAcordadoDrawer({ open, onClose, empresaId, empresaNombre, acopioId, sucursalId = null, items: itemsIniciales = null, onResolved }) {
  const [step, setStep] = useState('input'); // 'input' | 'clasificado'
  const [lineas, setLineas] = useState([lineaVacia()]);
  const [destino, setDestino] = useState('acopio'); // 'acopio' | 'stock'
  const [matcheados, setMatcheados] = useState([]);
  const [noAcordados, setNoAcordados] = useState([]); // [{ descripcion, cantidad, valorUnitario, decision }]
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError(''); setStep('input'); setDestino('acopio'); setMatcheados([]); setNoAcordados([]);
    if (Array.isArray(itemsIniciales) && itemsIniciales.length) {
      setLineas(itemsIniciales.map((it) => ({
        descripcion: it.descripcion || it.nombre || '',
        cantidad: it.cantidad ?? '',
        valorUnitario: it.valorUnitario ?? it.precio_unitario ?? '',
      })));
    } else {
      setLineas([lineaVacia()]);
    }
  }, [open, itemsIniciales]);

  function setLinea(idx, patch) { setLineas((s) => s.map((l, i) => (i === idx ? { ...l, ...patch } : l))); }
  function addLinea() { setLineas((s) => [...s, lineaVacia()]); }
  function delLinea(idx) { setLineas((s) => (s.length > 1 ? s.filter((_, i) => i !== idx) : s)); }

  async function clasificar() {
    setError('');
    const items = lineas
      .map((l) => ({
        descripcion: String(l.descripcion || '').trim(),
        cantidad: Math.abs(Number(l.cantidad) || 0),
        valorUnitario: Number(l.valorUnitario) || 0,
      }))
      .filter((l) => l.descripcion && l.cantidad > 0);
    if (!items.length) { setError('Cargá al menos una línea con cantidad mayor a 0.'); return; }
    setBusy(true);
    try {
      const res = await recepcionMaterialService.clasificar(acopioId, items);
      setMatcheados(res?.matcheados || []);
      setNoAcordados((res?.no_acordados || []).map((l) => ({ ...l, decision: 'rechazar' })));
      setStep('clasificado');
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Error al clasificar.');
    } finally {
      setBusy(false);
    }
  }

  const resumen = useMemo(() => {
    const acept = noAcordados.filter((l) => l.decision === 'aceptar').length;
    return { acept, rech: noAcordados.length - acept };
  }, [noAcordados]);

  async function resolver() {
    setError('');
    if (!noAcordados.length) { setError('No hay material no acordado para resolver.'); return; }
    setBusy(true);
    try {
      await recepcionMaterialService.resolver(acopioId, {
        empresa_id: empresaId,
        empresa_nombre: empresaNombre || null,
        sucursal_id: sucursalId || null,
        destino,
        items: noAcordados.map((l) => ({
          descripcion: l.descripcion,
          cantidad: l.cantidad,
          valorUnitario: l.valorUnitario,
          estado_recepcion: l.decision === 'aceptar' ? 'aceptado' : 'rechazado',
        })),
      });
      onResolved?.();
      onClose?.();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Error al resolver.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 540 }, maxWidth: '100%' } }}>
      <div className="flex h-full min-h-0 flex-col bg-neutral-50">
        <header className="shrink-0 border-b border-divider bg-white px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight text-neutral-900">Recepción de material no acordado</h2>
            <IconButton onClick={onClose} size="small"><XMarkIcon className="h-5 w-5" /></IconButton>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <div className="flex flex-col gap-2">
            {error && <Alert severity="error">{error}</Alert>}

            {step === 'input' && (
              <div className="rounded-xl border border-divider bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-divider px-3 py-2">
                  <h3 className="text-sm font-semibold text-neutral-900">Líneas del remito</h3>
                  <button type="button" onClick={addLinea}
                    className="flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50">
                    <PlusIcon className="h-3.5 w-3.5" /> Agregar
                  </button>
                </div>
                <div className="divide-y divide-divider">
                  {lineas.map((l, idx) => (
                    <div key={idx} className="flex items-end gap-2 px-3 py-2">
                      <TextField size="small" label="Material" value={l.descripcion}
                        onChange={(e) => setLinea(idx, { descripcion: e.target.value })} sx={{ flex: 1 }} />
                      <TextField size="small" type="number" label="Cant." value={l.cantidad}
                        onChange={(e) => setLinea(idx, { cantidad: e.target.value })} sx={{ width: 80 }} inputProps={{ min: 0 }} />
                      <TextField size="small" type="number" label="Precio" value={l.valorUnitario}
                        onChange={(e) => setLinea(idx, { valorUnitario: e.target.value })} sx={{ width: 100 }} inputProps={{ min: 0 }} />
                      <IconButton size="small" onClick={() => delLinea(idx)} disabled={lineas.length === 1}>
                        <TrashIcon className="h-4 w-4" />
                      </IconButton>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 'clasificado' && (
              <>
                {matcheados.length > 0 && (
                  <div className="rounded-xl border border-divider bg-white shadow-sm">
                    <div className="border-b border-divider px-3 py-2">
                      <h3 className="text-sm font-semibold text-neutral-900">Matcheados ({matcheados.length})</h3>
                      <p className="text-[11px] text-neutral-500">Estaban esperados en el acopio.</p>
                    </div>
                    <div className="divide-y divide-divider">
                      {matcheados.map((m, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2">
                          <span className="text-sm text-neutral-900">{m.descripcion}</span>
                          <Chip size="small" color="success" label={`x ${m.cantidad}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-divider bg-white shadow-sm">
                  <div className="border-b border-divider px-3 py-2">
                    <h3 className="text-sm font-semibold text-neutral-900">No acordados ({noAcordados.length})</h3>
                    <p className="text-[11px] text-neutral-500">Llegaron sin estar en el acopio. Decidí qué hacer con cada uno.</p>
                  </div>
                  {noAcordados.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-neutral-400">Todo el remito matcheó con el acopio. No hay nada para resolver.</p>
                  ) : (
                    <div className="divide-y divide-divider">
                      {noAcordados.map((l, idx) => (
                        <div key={idx} className="px-3 py-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-neutral-900">{l.descripcion}</span>
                            <Chip size="small" variant="outlined" label={`x ${l.cantidad}`} />
                          </div>
                          <RadioGroup row value={l.decision}
                            onChange={(e) => setNoAcordados((s) => s.map((x, i) => (i === idx ? { ...x, decision: e.target.value } : x)))}>
                            <FormControlLabel value="aceptar" control={<Radio size="small" />} label="Aceptar" />
                            <FormControlLabel value="rechazar" control={<Radio size="small" />} label="Rechazar" />
                          </RadioGroup>
                        </div>
                      ))}
                    </div>
                  )}
                  {resumen.acept > 0 && (
                    <div className="border-t border-divider px-3 py-2">
                      <FormControl size="small" fullWidth>
                        <InputLabel>Destino de los aceptados</InputLabel>
                        <Select label="Destino de los aceptados" value={destino} onChange={(e) => setDestino(e.target.value)}>
                          <MenuItem value="acopio">Sumar al acopio</MenuItem>
                          <MenuItem value="stock">Reponer stock</MenuItem>
                        </Select>
                      </FormControl>
                    </div>
                  )}
                  <div className="border-t border-divider px-3 py-2 text-right text-[11px] text-neutral-500">
                    Aceptar: {resumen.acept} · Rechazar: {resumen.rech}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <footer className="shrink-0 border-t border-divider bg-white px-4 py-3">
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={busy}
              className="rounded-lg border border-neutral-300 bg-white px-4 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">Cancelar</button>
            {step === 'input' ? (
              <button type="button" onClick={clasificar} disabled={busy}
                className="rounded-lg bg-primary-main px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-50">
                {busy ? 'Clasificando…' : 'Clasificar'}
              </button>
            ) : (
              <button type="button" onClick={resolver} disabled={busy || noAcordados.length === 0}
                className="rounded-lg bg-primary-main px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-50">
                {busy ? 'Resolviendo…' : 'Resolver'}
              </button>
            )}
          </div>
        </footer>
      </div>
    </Drawer>
  );
}
