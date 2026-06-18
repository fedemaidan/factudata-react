import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import ControlObraService from 'src/services/controlObra/controlObraService';

const fmt = (n) => (Number(n) || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const COLOR = { borrador: 'default', aprobada: 'info', pagada: 'success', anulada: 'error' };

export default function ManoObraTab({ obra, empresaId }) {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);

  const ordenesQ = useQuery({
    queryKey: ['control-obra', 'ordenes', obra._id, empresaId],
    queryFn: () => ControlObraService.listarOrdenes(obra._id, empresaId),
    enabled: !!empresaId,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['control-obra'] });
  const accion = useMutation({ mutationFn: ({ fn }) => fn(), onSuccess: refresh });

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="overline">Mano de obra · órdenes de pago</Typography>
          <Button size="small" variant="outlined" onClick={() => setDialog(true)}>Nueva orden</Button>
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Contratista</TableCell>
              <TableCell align="right">Neto</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(ordenesQ.data || []).map((o) => (
              <TableRow key={o._id}>
                <TableCell>{o.numero}</TableCell>
                <TableCell>{o.contratista_nombre}</TableCell>
                <TableCell align="right">{fmt(o.monto_neto)}</TableCell>
                <TableCell><Chip size="small" label={o.estado} color={COLOR[o.estado] || 'default'} /></TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    {o.estado === 'borrador' && <Button size="small" onClick={() => accion.mutate({ fn: () => ControlObraService.aprobarOrden(o._id, empresaId) })}>Aprobar</Button>}
                    {o.estado === 'aprobada' && <Button size="small" variant="contained" onClick={() => accion.mutate({ fn: () => ControlObraService.pagarOrden(o._id, empresaId) })}>Pagar</Button>}
                    {o.estado === 'pagada' && <Button size="small" color="error" onClick={() => accion.mutate({ fn: () => ControlObraService.anularOrden(o._id, empresaId) })}>Anular</Button>}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {(ordenesQ.data || []).length === 0 && (
              <TableRow><TableCell colSpan={5}><Typography variant="body2" color="text.secondary">Sin órdenes de pago.</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
      <NuevaOrdenDialog open={dialog} onClose={() => setDialog(false)} obra={obra} empresaId={empresaId} onDone={() => { setDialog(false); refresh(); }} />
    </Card>
  );
}

function NuevaOrdenDialog({ open, onClose, obra, empresaId, onDone }) {
  const subrubros = useMemo(() => (obra.rubros || []).flatMap((r) => (r.subrubros || []).map((s) => ({ ...s, rubro: r.nombre }))), [obra]);
  const [nombre, setNombre] = useState('');
  const [montos, setMontos] = useState({});
  const [error, setError] = useState(null);

  const crear = useMutation({
    mutationFn: () => {
      const lineas = Object.entries(montos).filter(([, v]) => Number(v) > 0).map(([subrubro_uid, v]) => ({ subrubro_uid, monto: Number(v) }));
      if (!nombre) throw new Error('Indicá el contratista');
      if (lineas.length === 0) throw new Error('Cargá al menos un monto');
      return ControlObraService.crearOrden(obra._id, { empresa_id: empresaId, contratista_nombre: nombre, lineas });
    },
    onSuccess: onDone,
    onError: (e) => setError(e?.response?.data?.error?.message || e.message),
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Nueva orden de pago</DialogTitle>
      <DialogContent>
        <TextField label="Contratista" fullWidth size="small" value={nombre} onChange={(e) => setNombre(e.target.value)} sx={{ mt: 1, mb: 2 }} />
        <Typography variant="caption" color="text.secondary">Monto por sub-rubro</Typography>
        <Stack spacing={1.5} mt={1}>
          {subrubros.map((s) => (
            <Stack key={s.uid} direction="row" spacing={2} alignItems="center">
              <Box flex={1}><Typography variant="body2">{s.nombre}</Typography><Typography variant="caption" color="text.secondary">{s.rubro}</Typography></Box>
              <TextField size="small" type="number" label="$" value={montos[s.uid] ?? ''} onChange={(e) => setMontos((m) => ({ ...m, [s.uid]: e.target.value }))} sx={{ width: 120 }} />
            </Stack>
          ))}
        </Stack>
        {error && <Typography color="error" variant="body2" mt={1}>{error}</Typography>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" disabled={crear.isPending} onClick={() => { setError(null); crear.mutate(); }}>Crear</Button>
      </DialogActions>
    </Dialog>
  );
}
