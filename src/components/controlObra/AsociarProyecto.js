import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Autocomplete, Button, Chip, TextField } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import FormDrawer from 'src/components/controlObra/FormDrawer';
import ControlObraService from 'src/services/controlObra/controlObraService';
import { getProyectosByEmpresaId } from 'src/services/proyectosService';

// Chip en el header de la obra: muestra el proyecto asociado o permite asociarlo.
export default function AsociarProyecto({ obra, empresaId }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [proyecto, setProyecto] = useState(null);

  const proyectosQ = useQuery({
    queryKey: ['proyectos', empresaId],
    queryFn: () => getProyectosByEmpresaId(empresaId),
    enabled: !!empresaId, // siempre, para poder mostrar el nombre en el chip
  });
  const proyectos = proyectosQ.data || [];

  const guardar = useMutation({
    mutationFn: () => ControlObraService.actualizarObra(obra._id, empresaId, { proyecto_id: proyecto?.id || proyecto?._id || null }),
    onSuccess: () => { setOpen(false); qc.invalidateQueries({ queryKey: ['control-obra'] }); },
  });

  const nombreActual = proyectos.find((p) => (p.id || p._id) === obra.proyecto_id)?.nombre;

  return (
    <>
      <Chip
        size="small" variant="outlined" icon={<FolderIcon fontSize="small" />}
        label={obra.proyecto_id ? (nombreActual || 'Proyecto') : 'Asociar proyecto'}
        color={obra.proyecto_id ? 'default' : 'primary'}
        onClick={() => setOpen(true)}
      />
      <FormDrawer
        open={open} onClose={() => setOpen(false)} title="Asociar a un proyecto"
        actions={(
          <>
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="contained" disabled={guardar.isPending || !proyecto} onClick={() => guardar.mutate()}>Asociar</Button>
          </>
        )}
      >
        <Autocomplete
          options={proyectos}
          loading={proyectosQ.isLoading}
          getOptionLabel={(p) => p?.nombre || p?.name || ''}
          value={proyecto}
          onChange={(_, v) => setProyecto(v)}
          isOptionEqualToValue={(o, v) => (o.id || o._id) === (v.id || v._id)}
          renderInput={(params) => <TextField {...params} label="Proyecto" size="small" helperText="Filtra los egresos a imputar y vincula la caja" />}
        />
      </FormDrawer>
    </>
  );
}
