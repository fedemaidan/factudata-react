import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, Stack, TextField, Typography,
} from '@mui/material';
import ControlObraService from 'src/services/controlObra/controlObraService';

// Diálogo para cargar un certificado de avance sobre los sub-rubros de una obra.
export default function NuevoCertificadoDialog({ open, onClose, obra, empresaId, onCreated }) {
  const subrubros = useMemo(
    () => (obra?.rubros || []).flatMap((r) => (r.subrubros || []).map((s) => ({ ...s, rubro: r.nombre }))),
    [obra]
  );
  const [valores, setValores] = useState({});
  const [error, setError] = useState(null);

  const crear = useMutation({
    mutationFn: () => {
      const lineas = Object.entries(valores)
        .filter(([, v]) => v !== '' && v != null)
        .map(([subrubro_uid, v]) => ({ subrubro_uid, avance_pct_nuevo: Number(v) }));
      if (lineas.length === 0) throw new Error('Cargá al menos un avance');
      return ControlObraService.crearCertificado(obra._id, { empresa_id: empresaId, lineas });
    },
    onSuccess: onCreated,
    onError: (e) => setError(e?.response?.data?.error?.message || e.message),
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Nuevo certificado de avance</DialogTitle>
      <DialogContent>
        <Typography variant="caption" color="text.secondary">Indicá el nuevo % de avance acumulado por sub-rubro.</Typography>
        <Divider sx={{ my: 1 }} />
        <Stack spacing={1.5} mt={1}>
          {subrubros.map((s) => (
            <Stack key={s.uid} direction="row" spacing={2} alignItems="center">
              <Box flex={1}>
                <Typography variant="body2">{s.nombre}</Typography>
                <Typography variant="caption" color="text.secondary">{s.rubro} · actual {s.avance_pct}%</Typography>
              </Box>
              <TextField
                size="small" type="number" label="Nuevo %"
                value={valores[s.uid] ?? ''}
                onChange={(e) => setValores((v) => ({ ...v, [s.uid]: e.target.value }))}
                sx={{ width: 110 }}
                inputProps={{ min: s.avance_pct, max: 100 }}
              />
            </Stack>
          ))}
        </Stack>
        {error && <Typography color="error" variant="body2" mt={1}>{error}</Typography>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={() => { setError(null); crear.mutate(); }} disabled={crear.isPending}>Crear</Button>
      </DialogActions>
    </Dialog>
  );
}
