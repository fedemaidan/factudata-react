/**
 * GrupoFormDrawer — alta y edición de un Grupo de cliente (titular) en drawer.
 * Reemplaza el modal previo. Ver docs/corralones/10-modulo-clientes.md.
 */
import { useEffect, useState } from 'react';
import { Alert, Box, Drawer, IconButton, Stack, TextField, Typography } from '@mui/material';
import { XMarkIcon } from '@heroicons/react/24/outline';
import grupoClienteService from 'src/services/grupoClienteService';

const COLOR_PRESETS = ['#1976d2', '#388e3c', '#f57c00', '#7b1fa2', '#c2185b', '#0097a7', '#5d4037', '#455a64'];
const EMPTY = { nombre: '', notas: '', color: null, telefono: '', email: '' };

export default function GrupoFormDrawer({ open, onClose, empresaId, grupo, onSaved }) {
  const esEdicion = Boolean(grupo?._id || grupo?.id);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(esEdicion ? {
      nombre: grupo.nombre || '',
      notas: grupo.notas || '',
      color: grupo.color || null,
      telefono: grupo.telefono || '',
      email: grupo.email || '',
    } : EMPTY);
  }, [open, esEdicion, grupo]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  async function submit() {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    setSaving(true); setError('');
    try {
      if (esEdicion) await grupoClienteService.actualizar(empresaId, grupo._id || grupo.id, form);
      else await grupoClienteService.crear(empresaId, form);
      onSaved?.();
      onClose?.();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 440 }, maxWidth: '100%' } }}>
      <div className="flex h-full min-h-0 flex-col bg-neutral-50">
        <header className="shrink-0 border-b border-divider bg-white px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight text-neutral-900">{esEdicion ? 'Editar titular' : 'Nuevo titular'}</h2>
            <IconButton onClick={onClose} size="small"><XMarkIcon className="h-5 w-5" /></IconButton>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="flex flex-col gap-3">
            {error && <Alert severity="error">{error}</Alert>}
            <TextField size="small" label="Nombre *" value={form.nombre} onChange={(e) => set({ nombre: e.target.value })} autoFocus />
            <div className="grid grid-cols-2 gap-3">
              <TextField size="small" label="Teléfono" value={form.telefono} onChange={(e) => set({ telefono: e.target.value })} />
              <TextField size="small" label="Email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
            </div>
            <Box>
              <Typography variant="caption" color="text.secondary">Color</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                {COLOR_PRESETS.map((c) => (
                  <Box key={c} onClick={() => set({ color: c })}
                    sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: c, cursor: 'pointer', border: form.color === c ? '3px solid #000' : '1px solid #ccc' }} />
                ))}
                <Box onClick={() => set({ color: null })}
                  sx={{ width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', border: form.color === null ? '3px solid #000' : '1px dashed #999', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>×</Box>
              </Stack>
            </Box>
            <TextField size="small" multiline minRows={2} label="Notas" value={form.notas} onChange={(e) => set({ notas: e.target.value })} />
          </div>
        </div>

        <footer className="shrink-0 border-t border-divider bg-white px-4 py-3">
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-neutral-300 bg-white px-4 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">Cancelar</button>
            <button type="button" onClick={submit} disabled={saving || !form.nombre.trim()} className="rounded-lg bg-primary-main px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-50">
              {saving ? 'Guardando…' : (esEdicion ? 'Guardar cambios' : 'Crear titular')}
            </button>
          </div>
        </footer>
      </div>
    </Drawer>
  );
}
