import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Stack, TextField, Button, FormControl, InputLabel, Select, MenuItem, Typography
} from '@mui/material';
import AsignacionMaterialService from 'src/services/asignacionMaterialService';
import { getPlanObra } from 'src/services/planObraService';

const S = (v) => (v == null ? '' : String(v).trim());
const norm = (s) => S(s).toLowerCase().replace(/\s+/g, ' ').trim();
const fuzzyIncludes = (hay, needle) => {
  const H = norm(hay), N = norm(needle);
  if (!H || !N) return false;
  if (H.includes(N)) return true;
  const toks = N.split(' ').filter(t => t.length >= 3);
  const hits = toks.filter(t => H.includes(t)).length;
  return hits >= Math.max(1, Math.ceil(toks.length * 0.6));
};

export default function AssignToPlanDialog({
  open,
  onClose,
  proyectos = [],        // [{ id, nombre }]
  movimiento,            // { id, proyecto_id, descripcion, cantidad, ... }
  empresaId,
  presetProyectoId = '', // << importante
  presetCantidad,
  usuarioId,
}) {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);

  const [form, setForm] = useState({
    proyecto_id: S(presetProyectoId || movimiento?.proyecto_id || ''),
    etapa_id: '',
    material_id: '',
    cantidad_asignada:
      presetCantidad != null ? Number(presetCantidad) : (Number(movimiento?.cantidad) || ''),
    monto_asignado: '',
  });

  const etapaOptions = useMemo(
    () => (Array.isArray(plan?.etapas) ? plan.etapas : []),
    [plan]
  );

  const materialOptions = useMemo(() => {
    const e = etapaOptions.find(x => S(x?.id) === S(form.etapa_id));
    return Array.isArray(e?.materiales) ? e.materiales : [];
  }, [form.etapa_id, etapaOptions]);

  // Reset cuando abre
  useEffect(() => {
    if (!open) return;
    setPlan(null);
    setForm({
      proyecto_id: S(presetProyectoId || movimiento?.proyecto_id || ''),
      etapa_id: '',
      material_id: '',
      cantidad_asignada:
        presetCantidad != null ? Number(presetCantidad) : (Number(movimiento?.cantidad) || ''),
      monto_asignado: '',
    });
  }, [open, presetProyectoId, movimiento?.proyecto_id, movimiento?.cantidad, presetCantidad]);

  // Cargar plan del proyecto
  useEffect(() => {
    (async () => {
      if (!open) return;
      if (!S(form.proyecto_id)) { setPlan(null); return; }
      try {
        const resp = await getPlanObra(S(form.proyecto_id));
        setPlan(resp?.data || resp || null);
      } catch {
        setPlan(null);
      }
    })();
  }, [open, form.proyecto_id]);

  // Autopick etapa/material por descripción del movimiento
  useEffect(() => {
    if (!open || !plan || !movimiento?.descripcion) return;
    if (S(form.etapa_id) && S(form.material_id)) return; // ya elegido

    const desc = movimiento.descripcion;
    let found = null;

    for (const e of etapaOptions) {
      for (const m of (e.materiales || [])) {
        const nombreMat = m.nombre || m.descripcion || '';
        if (fuzzyIncludes(nombreMat, desc)) {
          found = { etapa_id: S(e.id), material_id: S(m.id) };
          break;
        }
      }
      if (found) break;
    }

    if (found) {
      setForm(f => ({
        ...f,
        etapa_id: f.etapa_id || found.etapa_id,
        material_id: f.material_id || found.material_id,
      }));
    }
  }, [open, plan, etapaOptions, movimiento?.descripcion, form.etapa_id, form.material_id]);

  const handleChange = (k, v) => setForm(s => ({ ...s, [k]: v }));

  const handleSubmit = async () => {
    if (!plan || !S(form.proyecto_id) || !S(form.etapa_id) || !S(form.material_id)) return;
    setLoading(true);
    try {
      const res = await AsignacionMaterialService.create({
        plan_id: plan.id || plan._id,
        etapa_id: S(form.etapa_id),
        material_id: S(form.material_id),
        movimiento_material_id: movimiento.id,
        cantidad_asignada: Number(form.cantidad_asignada) || 0,
        monto_asignado: form.monto_asignado === '' ? undefined : Number(form.monto_asignado),
        usuario_id: usuarioId
      });
      onClose?.({ ok: res?.ok ?? true, data: res });
    } catch (e) {
      onClose?.({ ok: false, error: e?.message || 'No se pudo crear la asignación' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose?.(null)} maxWidth="sm" fullWidth>
      <DialogTitle>Asignar a Plan de Obra</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Movimiento: <b>{movimiento?.descripcion}</b> — Cant.: <b>{movimiento?.cantidad}</b> — Tipo: <b>{movimiento?.tipo}</b>
          </Typography>

          {/* Proyecto */}
          <FormControl fullWidth>
            <InputLabel>Proyecto</InputLabel>
            <Select
              label="Proyecto"
              value={S(form.proyecto_id)}
              onChange={(e) => handleChange('proyecto_id', S(e.target.value))}
            >
              <MenuItem value=""><em>Seleccionar…</em></MenuItem>
              {proyectos.map(p => (
                <MenuItem key={S(p.id)} value={S(p.id)}>{p.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Etapa */}
          <FormControl fullWidth disabled={!plan}>
            <InputLabel>Etapa</InputLabel>
            <Select
              label="Etapa"
              value={S(form.etapa_id)}
              onChange={(e) => handleChange('etapa_id', S(e.target.value))}
            >
              <MenuItem value=""><em>Seleccionar…</em></MenuItem>
              {etapaOptions.map(e => (
                <MenuItem key={S(e.id)} value={S(e.id)}>{e.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Material */}
          <FormControl fullWidth disabled={!S(form.etapa_id)}>
            <InputLabel>Material</InputLabel>
            <Select
              label="Material"
              value={S(form.material_id)}
              onChange={(e) => handleChange('material_id', S(e.target.value))}
            >
              <MenuItem value=""><em>Seleccionar…</em></MenuItem>
              {materialOptions.map(m => (
                <MenuItem key={S(m.id)} value={S(m.id)}>
                  {m.nombre || m.descripcion || '(sin nombre)'}{m.unidad ? ` — ${m.unidad}` : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Cantidad a asignar"
            type="number"
            value={form.cantidad_asignada}
            onChange={(e) => handleChange('cantidad_asignada', e.target.value)}
            fullWidth
          />

          <TextField
            label="Monto a asignar (opcional)"
            type="number"
            value={form.monto_asignado}
            onChange={(e) => handleChange('monto_asignado', e.target.value)}
            fullWidth
            helperText="Si lo dejás vacío, el back puede calcularlo o guardar sólo cantidad."
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose?.(null)}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!S(form.proyecto_id) || !S(form.etapa_id) || !S(form.material_id) || loading}
        >
          {loading ? 'Guardando…' : 'Asignar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
