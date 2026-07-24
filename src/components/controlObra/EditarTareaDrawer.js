import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Autocomplete, Button, Chip, Stack, TextField, Typography } from '@mui/material';
import FormDrawer from 'src/components/controlObra/FormDrawer';
import ControlObraService from 'src/services/controlObra/controlObraService';

const toInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const fmtFecha = (d) => (d ? new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', timeZone: 'UTC' }) : '—');

// Todas las tareas de la obra (para el selector de dependencias), menos la actual.
function tareasDeObra(obra, exceptoUid) {
  return (obra?.rubros || []).flatMap((r) => (r.subrubros || []).map((s) => ({ uid: s.uid, nombre: s.nombre, rubro: r.nombre })))
    .filter((t) => t.uid !== exceptoUid);
}

// Drawer "Editar tarea": datos + cronograma (inicio/duración + dependencias FS).
// Reusado desde Ejecución y desde el Cronograma. Las dependencias se programan
// solas en el backend (el inicio lo calcula la predecesora).
export default function EditarTareaDrawer({ obra, subrubro, empresaId, onClose, onDone }) {
  const opciones = useMemo(() => tareasDeObra(obra, subrubro.uid), [obra, subrubro.uid]);
  // Opciones de categoría/subcategoría a partir de la estructura de la obra (que
  // viene del catálogo de la empresa cuando el origen es "categorías").
  const categoriaOpciones = useMemo(() => {
    const set = new Set();
    (obra?.rubros || []).forEach((r) => {
      if (r.categoria) set.add(r.categoria);
      (r.subrubros || []).forEach((s) => { if (s.categoria) set.add(s.categoria); });
    });
    return [...set];
  }, [obra]);
  const depUids = (subrubro.dependencias || []).map((d) => d.uid);
  // Inicio mostrado = el deseado (inicio_plan). Si la tarea está en modo automático
  // por dependencia, queda vacío (= arranca al terminar la anterior).
  const inicioInicial = subrubro.inicio_plan != null ? toInput(subrubro.inicio_plan) : (depUids.length ? '' : toInput(subrubro.fecha_inicio));
  const [form, setForm] = useState({
    nombre: subrubro.nombre || '',
    monto: String(subrubro.contrato ?? subrubro.monto ?? 0),
    costo_estimado: subrubro.costo_estimado ?? '',
    costo_directo: subrubro.costo_directo ?? '',
    unidad: subrubro.unidad || '',
    cantidad: subrubro.cantidad ?? '',
    fecha_inicio: inicioInicial,
    fecha_fin: toInput(subrubro.fecha_fin),
    duracion_dias: subrubro.duracion_dias ?? '',
    dependencias: opciones.filter((o) => depUids.includes(o.uid)),
    categoria: subrubro.categoria || '',
    subcategoria: subrubro.subcategoria || '',
  });
  const [error, setError] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Subcategorías sugeridas: las de la categoría elegida dentro de la obra.
  const subcategoriaOpciones = useMemo(() => {
    const set2 = new Set();
    (obra?.rubros || []).forEach((r) => (r.subrubros || []).forEach((s) => {
      if (s.subcategoria && (!form.categoria || s.categoria === form.categoria)) set2.add(s.subcategoria);
    }));
    return [...set2];
  }, [obra, form.categoria]);

  const tieneDeps = form.dependencias.length > 0;
  const tieneDuracion = form.duracion_dias !== '' && Number(form.duracion_dias) > 0;
  const fechasMal = !tieneDuracion && form.fecha_inicio && form.fecha_fin && form.fecha_fin < form.fecha_inicio;

  const guardar = useMutation({
    mutationFn: () => ControlObraService.editarSubrubro(obra._id, subrubro.uid, empresaId, {
      nombre: form.nombre,
      monto: Number(form.monto),
      costo_estimado: form.costo_estimado === '' ? null : Number(form.costo_estimado),
      costo_directo: form.costo_directo === '' ? null : Number(form.costo_directo),
      unidad: form.unidad || null,
      cantidad: form.cantidad === '' ? null : Number(form.cantidad),
      duracion_dias: tieneDuracion ? Number(form.duracion_dias) : null,
      dependencias: form.dependencias.map((d) => d.uid),
      // El inicio es el deseado; con dependencias funciona como "no antes de".
      // Vacío → arranca al terminar la predecesora. Fin sólo si no hay duración.
      fecha_inicio: form.fecha_inicio || null,
      fecha_fin: tieneDuracion ? undefined : (form.fecha_fin || null),
      categoria: form.categoria || null,
      subcategoria: form.subcategoria || null,
    }),
    onSuccess: onDone,
    onError: (e) => setError(e?.response?.data?.error?.message || e.message),
  });

  return (
    <FormDrawer
      open onClose={onClose} title="Editar tarea" width={460}
      actions={(
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="contained" disabled={guardar.isPending || !form.nombre || fechasMal} onClick={() => { setError(null); guardar.mutate(); }}>Guardar</Button>
        </>
      )}
    >
      <Stack spacing={2}>
        <TextField label="Nombre" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} size="small" fullWidth />
        <TextField label="Monto de contrato (cliente)" type="number" value={form.monto} onChange={(e) => set('monto', e.target.value)} size="small" fullWidth helperText="Lo que vas a cobrar por este sub-rubro" />
        <TextField label="Costo estimado (proveedor)" type="number" value={form.costo_estimado} onChange={(e) => set('costo_estimado', e.target.value)} size="small" fullWidth helperText="Parte del costo que es del proveedor; lo refina el contrato. Vacío = sin estimar" />
        <TextField label="Costo directo (materiales/otros)" type="number" value={form.costo_directo} onChange={(e) => set('costo_directo', e.target.value)} size="small" fullWidth helperText="Parte que NO es del proveedor: materiales/gastos que vas imputando sueltos. Se suma al costo esperado" />
        <Stack direction="row" spacing={1}>
          <TextField label="Unidad" value={form.unidad} onChange={(e) => set('unidad', e.target.value)} size="small" sx={{ flex: 1 }} />
          <TextField label="Cantidad" type="number" value={form.cantidad} onChange={(e) => set('cantidad', e.target.value)} size="small" sx={{ flex: 1 }} />
        </Stack>
        <Stack direction="row" spacing={1}>
          <Autocomplete
            freeSolo
            options={categoriaOpciones}
            value={form.categoria}
            onInputChange={(_, v) => set('categoria', v)}
            sx={{ flex: 1 }}
            renderInput={(params) => (
              <TextField {...params} label="Categoría" size="small" helperText="Para auto-imputar gastos del bot" />
            )}
          />
          <Autocomplete
            freeSolo
            options={subcategoriaOpciones}
            value={form.subcategoria}
            onInputChange={(_, v) => set('subcategoria', v)}
            sx={{ flex: 1 }}
            renderInput={(params) => (
              <TextField {...params} label="Subcategoría" size="small" />
            )}
          />
        </Stack>

        <Typography variant="caption" color="text.secondary" sx={{ pt: 0.5 }}>Cronograma</Typography>

        <Autocomplete
          multiple size="small" options={opciones} value={form.dependencias}
          getOptionLabel={(o) => o.nombre}
          isOptionEqualToValue={(o, v) => o.uid === v.uid}
          onChange={(_, v) => set('dependencias', v)}
          groupBy={(o) => o.rubro}
          renderTags={(value, getTagProps) => value.map((o, i) => <Chip size="small" label={o.nombre} {...getTagProps({ index: i })} key={o.uid} />)}
          renderInput={(params) => <TextField {...params} label="Depende de (empieza al terminar)" placeholder="Tareas previas…" />}
        />

        <Stack direction="row" spacing={1}>
          <TextField
            label="Inicio" type="date" value={form.fecha_inicio} onChange={(e) => set('fecha_inicio', e.target.value)}
            size="small" sx={{ flex: 1 }} InputLabelProps={{ shrink: true }}
            helperText={tieneDeps ? 'Vacío = al terminar la anterior' : ''}
          />
          <TextField
            label="Duración (días)" type="number" value={form.duracion_dias} onChange={(e) => set('duracion_dias', e.target.value)}
            size="small" sx={{ flex: 1 }} inputProps={{ min: 1 }}
          />
        </Stack>
        <TextField
          label="Fin" type="date" value={form.fecha_fin} onChange={(e) => set('fecha_fin', e.target.value)}
          size="small" fullWidth InputLabelProps={{ shrink: true }}
          disabled={tieneDuracion}
          error={!!fechasMal}
          helperText={fechasMal ? 'Anterior al inicio' : (tieneDuracion ? 'Automático (inicio + duración)' : '')}
        />

        {tieneDeps && (
          <Typography variant="caption" color="text.secondary">
            No arranca antes de que termine {form.dependencias.length > 1 ? 'la última de sus predecesoras' : `“${form.dependencias[0].nombre}”`}. Podés fijar un inicio más tardío.
            {subrubro.fecha_inicio ? ` Hoy: ${fmtFecha(subrubro.fecha_inicio)} → ${fmtFecha(subrubro.fecha_fin)}.` : ''}
          </Typography>
        )}
      </Stack>
      {error && <Typography color="error" variant="body2" mt={1}>{error}</Typography>}
    </FormDrawer>
  );
}
