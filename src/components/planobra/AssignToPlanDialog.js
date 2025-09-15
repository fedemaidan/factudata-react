import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Stack, TextField, Button, MenuItem, FormControl, InputLabel, Select, Typography
} from '@mui/material';
import AsignacionMaterialService from 'src/services/asignacionMaterialService';
import { getPlanObra } from 'src/services/planObraService';
import { getProyectosByEmpresa, getProyectoById } from 'src/services/proyectosService';

export default function AssignToPlanDialog({
  open,
  onClose,
  proyectos = [],  // lista de proyectos { id, nombre, empresa_id, ... }
  movimiento,          // movimiento de materiales (un item de /movimientos-materiales) { id, empresa_id, proyecto_id, descripcion, cantidad, ... }
  empresaId,
  presetProyectoId,    // opcional: si venís desde una pantalla que ya conoce el proyecto
  usuarioId,           // opcional
}) {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [form, setForm] = useState({
    proyecto_id: presetProyectoId || movimiento?.proyecto_id || '',
    etapa_id: '',
    material_id: '',
    cantidad_asignada: movimiento?.cantidad || '',
    monto_asignado: '',
  });

  const etapaOptions = useMemo(() => plan?.etapas || [], [plan]);
  const materialOptions = useMemo(() => {
    const e = etapaOptions.find(x => x.id === form.etapa_id);
    console.log(e?.materiales);
    return e?.materiales || [];
  }, [form.etapa_id, etapaOptions]);

  useEffect(() => {
    if (open) {
      setForm({
        proyecto_id: presetProyectoId || movimiento?.proyecto_id || '',
        etapa_id: '',
        material_id: '',
        cantidad_asignada: movimiento?.cantidad || '',
        monto_asignado: '',
      });
      setPlan(null);
    }
  }, [open]);

  // Si hay proyecto, cargar plan
  useEffect(() => {
    (async () => {
      if (!open) return;
      console.log(movimiento)
      if (!form.proyecto_id) { setPlan(null); return; }
      try {
        const planResp = await getPlanObra(form.proyecto_id);
        setPlan(planResp?.data || planResp || null); // según tu wrapper
      } catch {
        setPlan(null);
      }
    })();
  }, [open, form.proyecto_id]);

  const handleChange = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = async () => {
    if (!plan || !form.etapa_id || !form.material_id) return;
    setLoading(true);
    try {
      const response = await AsignacionMaterialService.create({
        plan_id: plan.id || plan._id,
        etapa_id: form.etapa_id,
        material_id: form.material_id,
        movimiento_material_id: movimiento.id, // clave de la conciliación
        cantidad_asignada: Number(form.cantidad_asignada) || 0,
        monto_asignado: form.monto_asignado === '' ? undefined : Number(form.monto_asignado),
        usuario_id: usuarioId
      });
      onClose?.({ ok: response?.ok, data: response?.data, error: response?.error });
    } catch (e) {
      onClose?.({ ok: false, error: e?.message || e });
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

          <FormControl fullWidth>
            <InputLabel>Proyecto</InputLabel>
            <Select
              label="Proyecto"
              value={form.proyecto_id}
              onChange={(e) => handleChange('proyecto_id', e.target.value)}
            >
              <MenuItem value=""><em>Seleccionar…</em></MenuItem>
              {proyectos.map(p => (
                <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth disabled={!plan}>
            <InputLabel>Etapa</InputLabel>
            <Select
              label="Etapa"
              value={form.etapa_id}
              onChange={(e) => handleChange('etapa_id', e.target.value)}
            >
              <MenuItem value=""><em>Seleccionar…</em></MenuItem>
              {etapaOptions.map(e => (
                <MenuItem key={e.id} value={e.id}>{e.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth disabled={!form.etapa_id}>
            <InputLabel>Material</InputLabel>
            <Select
              label="Material"
              value={form.material_id}
              onChange={(e) => handleChange('material_id', e.target.value)}
            >
              <MenuItem value=""><em>Seleccionar…</em></MenuItem>
              {materialOptions.map(m => (
                <MenuItem key={m.id} value={m.id}>
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
        <Button variant="contained" onClick={handleSubmit} disabled={loading || !form.proyecto_id || !form.etapa_id || !form.material_id}>
          {loading ? 'Guardando…' : 'Asignar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
