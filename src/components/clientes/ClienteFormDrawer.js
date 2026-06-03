/**
 * ClienteFormDrawer — alta y edición de cliente (obra/razón social) en drawer
 * lateral, alineado al lenguaje visual de ventas. Reemplaza los modales previos.
 *
 * Modo edición vía prop `cliente` (con _id). Soporta "Promover a cliente" para
 * ocasionales. Ver docs/corralones/10-modulo-clientes.md.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Drawer,
  IconButton,
  MenuItem,
  TextField,
} from '@mui/material';
import { XMarkIcon } from '@heroicons/react/24/outline';
import clienteService from 'src/services/clienteService';

const EMPTY = {
  nombre: '', razon_social: '', cuit: '', direccion: '', telefono: '', email: '',
  condicion_iva: '', descuento_default: '', tipo_fiscal: '', notas_pricing: '',
  grupo_id: '', notas: '', ocasional: false,
};

export default function ClienteFormDrawer({ open, onClose, empresaId, cliente, grupos = [], onSaved }) {
  const esEdicion = Boolean(cliente?._id || cliente?.id);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (esEdicion) {
      setForm({
        nombre: cliente.nombre || '',
        razon_social: cliente.razon_social || '',
        cuit: cliente.cuit || '',
        direccion: cliente.direccion || '',
        telefono: cliente.telefono || '',
        email: cliente.email || '',
        condicion_iva: cliente.condicion_iva || '',
        descuento_default: cliente.descuento_default ?? '',
        tipo_fiscal: cliente.tipo_fiscal || '',
        notas_pricing: cliente.notas_pricing || '',
        grupo_id: cliente.grupo_id || '',
        notas: cliente.notas || '',
        ocasional: !!cliente.ocasional,
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, esEdicion, cliente]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  async function submit() {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        descuento_default: form.descuento_default === '' ? null : Number(form.descuento_default),
        condicion_iva: form.condicion_iva || null,
        tipo_fiscal: form.tipo_fiscal || null,
        grupo_id: form.grupo_id || null,
      };
      if (esEdicion) {
        await clienteService.actualizar(empresaId, cliente._id || cliente.id, payload);
      } else {
        await clienteService.crear(empresaId, payload);
      }
      onSaved?.();
      onClose?.();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, maxWidth: '100%' } }}>
      <div className="flex h-full min-h-0 flex-col bg-neutral-50">
        <header className="shrink-0 border-b border-divider bg-white px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight text-neutral-900">{esEdicion ? 'Editar cliente' : 'Nuevo cliente'}</h2>
            <IconButton onClick={onClose} size="small"><XMarkIcon className="h-5 w-5" /></IconButton>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="flex flex-col gap-3">
            {error && <Alert severity="error">{error}</Alert>}

            <TextField size="small" label="Nombre *" value={form.nombre} onChange={(e) => set({ nombre: e.target.value })} autoFocus />
            <TextField size="small" label="Razón social" value={form.razon_social} onChange={(e) => set({ razon_social: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <TextField size="small" label="CUIT" value={form.cuit} onChange={(e) => set({ cuit: e.target.value })} />
              <TextField size="small" select label="Condición IVA" value={form.condicion_iva} onChange={(e) => set({ condicion_iva: e.target.value })}>
                <MenuItem value=""><em>—</em></MenuItem>
                <MenuItem value="consumidor_final">Consumidor final</MenuItem>
                <MenuItem value="monotributo">Monotributo</MenuItem>
                <MenuItem value="responsable_inscripto">Responsable inscripto</MenuItem>
                <MenuItem value="exento">Exento</MenuItem>
              </TextField>
            </div>
            <TextField size="small" label="Dirección" value={form.direccion} onChange={(e) => set({ direccion: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <TextField size="small" label="Teléfono" value={form.telefono} onChange={(e) => set({ telefono: e.target.value })} />
              <TextField size="small" label="Email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField size="small" label="Descuento default (%)" type="number" value={form.descuento_default} onChange={(e) => set({ descuento_default: e.target.value })} />
              <TextField size="small" select label="Tipo fiscal" value={form.tipo_fiscal} onChange={(e) => set({ tipo_fiscal: e.target.value })}>
                <MenuItem value=""><em>—</em></MenuItem>
                <MenuItem value="persona">Persona</MenuItem>
                <MenuItem value="srl">SRL</MenuItem>
                <MenuItem value="fideicomiso">Fideicomiso</MenuItem>
              </TextField>
            </div>
            <TextField
              size="small" label="Notas de precio (referencia)"
              placeholder='Ej: "medio IVA", "ojo no paga rápido"'
              value={form.notas_pricing} onChange={(e) => set({ notas_pricing: e.target.value })}
            />
            <TextField size="small" select label="Titular (grupo)" value={form.grupo_id} onChange={(e) => set({ grupo_id: e.target.value })}>
              <MenuItem value=""><em>Sin titular</em></MenuItem>
              {grupos.map((g) => <MenuItem key={g._id} value={g._id}>{g.nombre}</MenuItem>)}
            </TextField>
            <TextField size="small" multiline minRows={2} label="Notas" value={form.notas} onChange={(e) => set({ notas: e.target.value })} />

            {esEdicion && form.ocasional && (
              <Button color="warning" variant="outlined" onClick={() => set({ ocasional: false })}>
                Promover a cliente (quitar "ocasional")
              </Button>
            )}
          </div>
        </div>

        <footer className="shrink-0 border-t border-divider bg-white px-4 py-3">
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-neutral-300 bg-white px-4 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">
              Cancelar
            </button>
            <button type="button" onClick={submit} disabled={saving || !form.nombre.trim()} className="rounded-lg bg-primary-main px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-50">
              {saving ? 'Guardando…' : (esEdicion ? 'Guardar cambios' : 'Crear cliente')}
            </button>
          </div>
        </footer>
      </div>
    </Drawer>
  );
}
