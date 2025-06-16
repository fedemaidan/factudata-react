import React, { useState } from 'react';
import {
  TableRow, TableCell, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, TextField, Chip, Typography
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { formatCurrency, formatTimestamp } from 'src/utils/formatters';
import CuentasPendientesService from 'src/services/cuentasPendientesService';

export const CuotaRowWithActions = ({ cuota, cuentaId, onActualizar }) => {
  const [open, setOpen] = useState(false);
  const [montoEditado, setMontoEditado] = useState(cuota.monto_nominal);
  const [fechaEditada, setFechaEditada] = useState(formatTimestamp(cuota.fecha_vencimiento));

  const handleGuardar = async () => {
    try {
      await CuentasPendientesService.editarCuota(cuentaId, cuota.id, {
        monto_nominal: parseFloat(montoEditado),
        fecha_vencimiento: new Date(fechaEditada)
      });
      setOpen(false);
      onActualizar?.();
    } catch (err) {
      console.error('Error actualizando cuota:', err);
    }
  };

  const handleEliminar = async () => {
    const confirmar = confirm('¿Estás seguro de que querés eliminar esta cuota?');
    if (!confirmar) return;
    try {
      await CuentasPendientesService.eliminarCuota(cuentaId, cuota.id);
      onActualizar?.();
    } catch (err) {
      console.error('Error eliminando cuota:', err);
    }
  };

  return (
    <TableRow>
      <TableCell>{cuota.numero ?? '-'}</TableCell>
      <TableCell>{formatCurrency(cuota.monto_nominal)}</TableCell>
      <TableCell>{formatTimestamp(cuota.fecha_vencimiento)}</TableCell>
      <TableCell>
        <Chip
          label={cuota.tipo === 'a_cobrar' ? 'A cobrar' : 'A pagar'}
          color={cuota.tipo === 'a_cobrar' ? 'success' : 'error'}
          size="small"
        />
      </TableCell>
      <TableCell>{cuota.pagado ? 'Sí' : 'No'}</TableCell>
        <TableCell>
            {(cuota.pagos || []).map((p, i) => (
                <Typography variant="body2" key={i}>
                {formatTimestamp(p.fecha)} - {formatCurrency(p.monto)}
                </Typography>
            ))}
        </TableCell>
        <TableCell>
        <IconButton size="small" onClick={() => setOpen(true)}><EditIcon fontSize="small" /></IconButton>
        <IconButton size="small" color="error" onClick={handleEliminar}><DeleteIcon fontSize="small" /></IconButton>
      </TableCell>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Editar Cuota</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Monto"
            type="number"
            fullWidth
            value={montoEditado}
            onChange={(e) => setMontoEditado(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Fecha de vencimiento"
            type="date"
            fullWidth
            value={fechaEditada}
            onChange={(e) => setFechaEditada(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleGuardar}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </TableRow>
  );
};
