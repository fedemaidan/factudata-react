import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Card, CardContent, Checkbox, Chip, FormControlLabel,
  MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import FormDrawer from 'src/components/controlObra/FormDrawer';
import ControlObraService from 'src/services/controlObra/controlObraService';

const GRAV = { baja: 'default', media: 'warning', alta: 'error' };

export default function ReportesTab({ obra, empresaId }) {
  const qc = useQueryClient();
  const [nuevo, setNuevo] = useState('');
  const [gravedad, setGravedad] = useState('media');
  const [conformeOpen, setConformeOpen] = useState(false);

  const incQ = useQuery({
    queryKey: ['control-obra', 'inconvenientes', obra._id, empresaId],
    queryFn: () => ControlObraService.listarInconvenientes(obra._id, empresaId),
    enabled: !!empresaId,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['control-obra'] });

  const crear = useMutation({
    mutationFn: () => ControlObraService.crearInconveniente(obra._id, { empresa_id: empresaId, titulo: nuevo, gravedad }),
    onSuccess: () => { setNuevo(''); setGravedad('media'); refresh(); },
  });
  const resolver = useMutation({ mutationFn: (id) => ControlObraService.resolverInconveniente(id, empresaId, 'Resuelto'), onSuccess: refresh });

  const conformeEmitido = obra.conforme?.emitido;

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600}>Conforme de obra</Typography>
          {conformeEmitido ? (
            <Alert severity="success" sx={{ mt: 1 }}>Conforme emitido. Obra finalizada{obra.retencion_liberada ? ' · fondo de reparo liberado' : ''}.</Alert>
          ) : (
            <Stack direction="row" alignItems="center" spacing={2} mt={1}>
              <Typography variant="body2" color="text.secondary">Disponible al 100% de avance con checklist completo.</Typography>
              <Button size="small" variant="contained" onClick={() => setConformeOpen(true)}>Emitir conforme</Button>
            </Stack>
          )}
          {obra.retencion_pct > 0 && (
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              Fondo de reparo retenido: {(obra.retencion_acumulada || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })} ({obra.retencion_pct}%)
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600}>Inconvenientes</Typography>
          <Stack direction="row" spacing={1} my={1}>
            <TextField size="small" fullWidth placeholder="Nuevo inconveniente…" value={nuevo} onChange={(e) => setNuevo(e.target.value)} />
            <TextField select size="small" label="Gravedad" value={gravedad} onChange={(e) => setGravedad(e.target.value)} sx={{ width: 120 }}>
              <MenuItem value="baja">Baja</MenuItem>
              <MenuItem value="media">Media</MenuItem>
              <MenuItem value="alta">Alta</MenuItem>
            </TextField>
            <Button variant="outlined" disabled={!nuevo || crear.isPending} onClick={() => crear.mutate()}>Agregar</Button>
          </Stack>
          <Stack spacing={1}>
            {(incQ.data || []).map((i) => (
              <Box key={i._id} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1, bgcolor: 'action.hover' }}>
                <Chip size="small" label={i.gravedad} color={GRAV[i.gravedad] || 'default'} />
                <Typography variant="body2" sx={{ flex: 1, textDecoration: i.estado === 'resuelto' ? 'line-through' : 'none' }}>{i.titulo}</Typography>
                {i.estado === 'abierto'
                  ? <Button size="small" onClick={() => resolver.mutate(i._id)}>Resolver</Button>
                  : <Chip size="small" label="resuelto" color="success" />}
              </Box>
            ))}
            {(incQ.data || []).length === 0 && <Typography variant="body2" color="text.secondary">Sin inconvenientes.</Typography>}
          </Stack>
        </CardContent>
      </Card>

      <ConformeDialog open={conformeOpen} onClose={() => setConformeOpen(false)} obra={obra} empresaId={empresaId} onDone={() => { setConformeOpen(false); refresh(); }} />
    </Stack>
  );
}

function ConformeDialog({ open, onClose, obra, empresaId, onDone }) {
  const [chk, setChk] = useState({ fotos: false, docs: false, firma: false });
  const [error, setError] = useState(null);
  const emitir = useMutation({
    mutationFn: () => ControlObraService.emitirConforme(obra._id, empresaId, chk),
    onSuccess: onDone,
    onError: (e) => setError(e?.response?.data?.error?.message || e.message),
  });
  return (
    <FormDrawer
      open={open} onClose={onClose} title="Emitir conforme"
      actions={(
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="contained" disabled={emitir.isPending} onClick={() => { setError(null); emitir.mutate(); }}>Emitir</Button>
        </>
      )}
    >
      <Typography variant="body2" color="text.secondary" mb={1}>Confirmá el checklist de cierre:</Typography>
      <Stack>
        {['fotos', 'docs', 'firma'].map((k) => (
          <FormControlLabel key={k} control={<Checkbox checked={chk[k]} onChange={(e) => setChk((c) => ({ ...c, [k]: e.target.checked }))} />} label={k === 'fotos' ? 'Fotos finales' : k === 'docs' ? 'Documentación' : 'Firma del cliente'} />
        ))}
      </Stack>
      {error && <Typography color="error" variant="body2" mt={1}>{error}</Typography>}
    </FormDrawer>
  );
}
