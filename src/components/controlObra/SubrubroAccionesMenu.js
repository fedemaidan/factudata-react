import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Divider, ListItemIcon, Menu, MenuItem, Typography } from '@mui/material';
import TimelineIcon from '@mui/icons-material/Timeline';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import PaidIcon from '@mui/icons-material/Paid';
import EngineeringIcon from '@mui/icons-material/Engineering';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import NuevoCertificadoDialog from 'src/components/controlObra/NuevoCertificadoDialog';
import ImputarGastoDialog from 'src/components/controlObra/ImputarGastoDialog';
import EditarTareaDrawer from 'src/components/controlObra/EditarTareaDrawer';
import {
  RegistrarAvanceDialog, ResponsableDrawer, ContratoProveedorDrawer, EliminarSubrubroDialog,
} from 'src/components/controlObra/subrubroEditores';

// Menú de acciones sobre una tarea (sub-rubro) de Ejecución.
export default function SubrubroAccionesMenu({ obra, subrubro, empresaId, anchorEl, onClose }) {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(null); // 'avance' | 'editar' | 'certificar' | 'imputar'
  const refresh = () => qc.invalidateQueries({ queryKey: ['control-obra'] });
  const cerrarTodo = () => { setDialog(null); onClose(); };

  if (!subrubro) return null;

  return (
    <>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl) && !dialog} onClose={onClose}>
        <MenuItem disabled sx={{ opacity: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {subrubro.nombre} · físico {subrubro.avance_pct}% · cert {subrubro.cert_pct || 0}%
            {subrubro.responsable ? ` · 🙋 ${subrubro.responsable.nombre}` : ''}
          </Typography>
        </MenuItem>
        <MenuItem onClick={() => setDialog('avance')}>
          <ListItemIcon><TimelineIcon fontSize="small" /></ListItemIcon>Registrar avance físico
        </MenuItem>
        <MenuItem onClick={() => setDialog('certificar')}>
          <ListItemIcon><AssignmentTurnedInIcon fontSize="small" /></ListItemIcon>Certificar avance
        </MenuItem>
        <MenuItem onClick={() => setDialog('imputar')}>
          <ListItemIcon><PaidIcon fontSize="small" /></ListItemIcon>Imputar gasto
        </MenuItem>
        <MenuItem onClick={() => setDialog('responsable')}>
          <ListItemIcon><PersonOutlineIcon fontSize="small" /></ListItemIcon>
          {subrubro.responsable ? 'Editar responsable' : 'Asignar responsable'}
        </MenuItem>
        <MenuItem onClick={() => setDialog('contrato')}>
          <ListItemIcon><EngineeringIcon fontSize="small" /></ListItemIcon>
          {subrubro.contrato_proveedor ? 'Editar proveedor / contrato' : 'Asignar proveedor / contrato'}
        </MenuItem>
        <MenuItem onClick={() => setDialog('editar')}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>Editar tarea
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => setDialog('eliminar')} sx={{ color: 'error.main' }}>
          <ListItemIcon><DeleteOutlineIcon fontSize="small" color="error" /></ListItemIcon>Eliminar tarea
        </MenuItem>
      </Menu>

      {dialog === 'avance' && (
        <RegistrarAvanceDialog obra={obra} subrubro={subrubro} empresaId={empresaId} onClose={cerrarTodo} onDone={() => { refresh(); cerrarTodo(); }} />
      )}
      {dialog === 'editar' && (
        <EditarTareaDrawer obra={obra} subrubro={subrubro} empresaId={empresaId} onClose={cerrarTodo} onDone={() => { refresh(); cerrarTodo(); }} />
      )}
      {dialog === 'certificar' && (
        <NuevoCertificadoDialog open obra={obra} empresaId={empresaId} subrubroUid={subrubro.uid} onClose={cerrarTodo} onCreated={() => { refresh(); cerrarTodo(); }} />
      )}
      {dialog === 'imputar' && (
        <ImputarGastoDialog open obra={obra} empresaId={empresaId} subrubroUid={subrubro.uid} onClose={cerrarTodo} onDone={() => { refresh(); cerrarTodo(); }} />
      )}
      {dialog === 'responsable' && (
        <ResponsableDrawer obra={obra} subrubro={subrubro} empresaId={empresaId} onClose={cerrarTodo} onDone={() => { refresh(); cerrarTodo(); }} />
      )}
      {dialog === 'contrato' && (
        <ContratoProveedorDrawer obra={obra} subrubro={subrubro} empresaId={empresaId} onClose={cerrarTodo} onDone={() => { refresh(); cerrarTodo(); }} />
      )}
      {dialog === 'eliminar' && (
        <EliminarSubrubroDialog obra={obra} subrubro={subrubro} empresaId={empresaId} onClose={cerrarTodo} onDone={() => { refresh(); cerrarTodo(); }} />
      )}
    </>
  );
}

