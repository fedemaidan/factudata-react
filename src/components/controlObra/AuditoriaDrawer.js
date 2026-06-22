import { useQuery } from '@tanstack/react-query';
import {
  Box, Chip, Divider, Drawer, IconButton, LinearProgress, Stack, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import ControlObraService from 'src/services/controlObra/controlObraService';

const ACCION = {
  rubro_alta: { label: 'Rubro creado', color: 'success' },
  rubro_edicion: { label: 'Rubro editado', color: 'info' },
  rubro_baja: { label: 'Rubro eliminado', color: 'error' },
  subrubro_alta: { label: 'Tarea creada', color: 'success' },
  subrubro_edicion: { label: 'Tarea editada', color: 'info' },
  subrubro_baja: { label: 'Tarea eliminada', color: 'error' },
  contrato_alta: { label: 'Contrato asignado', color: 'success' },
  contrato_edicion: { label: 'Contrato editado', color: 'info' },
  contrato_baja: { label: 'Contrato quitado', color: 'error' },
  responsable_alta: { label: 'Responsable asignado', color: 'success' },
  responsable_edicion: { label: 'Responsable cambiado', color: 'info' },
  responsable_baja: { label: 'Responsable quitado', color: 'error' },
};
const fechaHora = (d) => (d ? new Date(d).toLocaleString('es-AR') : '');

// Drawer con el registro de auditoría de la estructura de la obra.
export default function AuditoriaDrawer({ open, onClose, obra, empresaId }) {
  const q = useQuery({
    queryKey: ['control-obra', 'auditoria', obra?._id, empresaId],
    queryFn: () => ControlObraService.auditoria(obra._id, empresaId),
    enabled: open && !!obra?._id && !!empresaId,
  });
  const items = q.data || [];

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 420 } } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2, pb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center"><HistoryIcon color="action" /><Typography variant="h6">Historial de cambios</Typography></Stack>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ px: 2, pb: 1 }}>Altas, ediciones y bajas de rubros y tareas.</Typography>
      <Divider />
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {q.isLoading && <LinearProgress />}
        {!q.isLoading && items.length === 0 && <Typography variant="body2" color="text.secondary">Sin cambios registrados.</Typography>}
        <Stack divider={<Divider flexItem />} spacing={1.5}>
          {items.map((a, i) => {
            const meta = ACCION[a.accion] || { label: a.accion, color: 'default' };
            return (
              <Box key={i}>
                <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                  <Chip size="small" label={meta.label} color={meta.color} variant="outlined" />
                  <Typography variant="caption" color="text.secondary">{fechaHora(a.fecha)}</Typography>
                </Stack>
                {a.detalle && <Typography variant="body2">{a.detalle}</Typography>}
                {(a.antes || a.despues) && (
                  <Typography variant="caption" color="text.secondary">
                    {a.antes ? `antes: ${a.antes}` : ''}{a.antes && a.despues ? ' → ' : ''}{a.despues ? `después: ${a.despues}` : ''}
                  </Typography>
                )}
                {a.user_id && <Typography variant="caption" color="text.disabled" display="block">por {a.user_id}</Typography>}
              </Box>
            );
          })}
        </Stack>
      </Box>
    </Drawer>
  );
}
