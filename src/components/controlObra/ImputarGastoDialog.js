import { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import ControlObraService from 'src/services/controlObra/controlObraService';

const fmt = (n) => (Number(n) || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

// Imputa un egreso de la caja a los sub-rubros de la obra (reparto en %).
export default function ImputarGastoDialog({ open, onClose, obra, empresaId, onDone }) {
  const [movId, setMovId] = useState('');
  const [pcts, setPcts] = useState({});
  const [error, setError] = useState(null);

  const subrubros = useMemo(
    () => (obra?.rubros || []).flatMap((r) => (r.subrubros || []).map((s) => ({ ...s, rubro: r.nombre }))),
    [obra]
  );

  const candidatosQ = useQuery({
    queryKey: ['control-obra', 'candidatos', obra?._id, empresaId],
    queryFn: () => ControlObraService.egresosCandidatos(obra._id, empresaId),
    enabled: open && !!obra?._id && !!empresaId,
  });

  const sumaPct = Object.values(pcts).reduce((a, v) => a + (Number(v) || 0), 0);

  const imputar = useMutation({
    mutationFn: () => {
      const imputaciones = Object.entries(pcts)
        .filter(([, v]) => Number(v) > 0)
        .map(([subrubro_uid, v]) => ({ subrubro_uid, pct: Number(v) }));
      if (!movId) throw new Error('Elegí un egreso');
      if (Math.round(sumaPct) !== 100) throw new Error('Los % deben sumar 100');
      return ControlObraService.imputarGasto(obra._id, { empresa_id: empresaId, movimiento_id: movId, imputaciones });
    },
    onSuccess: onDone,
    onError: (e) => setError(e?.response?.data?.error?.message || e.message),
  });

  const candidatos = candidatosQ.data || [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Imputar gasto a la obra</DialogTitle>
      <DialogContent>
        <TextField
          select fullWidth size="small" label="Egreso a imputar" value={movId}
          onChange={(e) => setMovId(e.target.value)} sx={{ mt: 1 }}
          helperText={candidatos.length === 0 ? 'No hay egresos sin imputar en el proyecto' : ' '}
        >
          {candidatos.map((m) => (
            <MenuItem key={m._id} value={m._id}>
              {fmt(m.total)} · {m.nombre_proveedor || m.categoria || 'egreso'} · {m.fecha_factura ? new Date(m.fecha_factura).toLocaleDateString('es-AR') : ''}
            </MenuItem>
          ))}
        </TextField>

        <Divider sx={{ my: 2 }} />
        <Typography variant="caption" color="text.secondary">Reparto entre sub-rubros (debe sumar 100%)</Typography>
        <Stack spacing={1.5} mt={1}>
          {subrubros.map((s) => (
            <Stack key={s.uid} direction="row" spacing={2} alignItems="center">
              <Box flex={1}>
                <Typography variant="body2">{s.nombre}</Typography>
                <Typography variant="caption" color="text.secondary">{s.rubro}</Typography>
              </Box>
              <TextField
                size="small" type="number" label="%"
                value={pcts[s.uid] ?? ''}
                onChange={(e) => setPcts((p) => ({ ...p, [s.uid]: e.target.value }))}
                sx={{ width: 90 }} inputProps={{ min: 0, max: 100 }}
              />
            </Stack>
          ))}
        </Stack>
        <Typography variant="body2" mt={1} color={Math.round(sumaPct) === 100 ? 'success.main' : 'text.secondary'}>
          Suma: {sumaPct}%
        </Typography>
        {error && <Typography color="error" variant="body2" mt={1}>{error}</Typography>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" disabled={imputar.isPending || !movId || Math.round(sumaPct) !== 100} onClick={() => { setError(null); imputar.mutate(); }}>
          Imputar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
