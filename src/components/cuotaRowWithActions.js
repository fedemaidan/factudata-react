import React, { useState } from 'react';
import {
  TableRow, TableCell, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, TextField, Chip, Typography, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { formatCurrency, formatTimestamp } from 'src/utils/formatters';
import CuentasPendientesService from 'src/services/cuentasPendientesService';

export const CuotaRowWithActions = ({ cuota, cuentaId, onActualizar }) => {
  const [open, setOpen] = useState(false);
  const [montoEditado, setMontoEditado] = useState(cuota.monto_nominal);
  const [fechaEditada, setFechaEditada] = useState(formatTimestamp(cuota.fecha_vencimiento));
  const [openPago, setOpenPago] = useState(false);
  const [pago, setPago] = useState({
    monto: cuota.monto_nominal,
    fecha_pago: new Date().toISOString().substring(0, 10),
    moneda: 'ARS' 
  });


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
        {!cuota.pagado && (
          <Button size="small" onClick={() => setOpenPago(true)}>
            Registrar Pago
          </Button>
        )}

      </TableCell>
      <Dialog open={openPago} onClose={() => setOpenPago(false)}>
  <DialogTitle>Registrar Pago</DialogTitle>
  <DialogContent>
    <TextField
      margin="dense"
      label="Monto"
      type="number"
      fullWidth
      value={pago.monto}
      onChange={(e) => setPago({ ...pago, monto: parseFloat(e.target.value) })}
    />
    <TextField
      margin="dense"
      label="Fecha"
      type="date"
      fullWidth
      value={pago.fecha_pago}
      onChange={(e) => setPago({ ...pago, fecha_pago: e.target.value })}
      InputLabelProps={{ shrink: true }}
    />
    <FormControl fullWidth margin="dense">
  <InputLabel>Moneda de pago</InputLabel>
  <Select
    value={pago.moneda_pago}
    label="Moneda de pago"
    onChange={(e) => setPago({ ...pago, moneda_pago: e.target.value })}
  >
    <MenuItem value="ARS">ARS</MenuItem>
    <MenuItem value="USD">USD</MenuItem>
  </Select>
</FormControl>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setOpenPago(false)}>Cancelar</Button>
    <Button
      variant="contained"
      onClick={async () => {
        try {
          await CuentasPendientesService.registrarPago(
            cuentaId,
            cuota.id,
            {
                monto: pago.monto,
                fecha_pago: pago.fecha_pago,
                moneda: pago.moneda
              }
          );
          setOpenPago(false);
          onActualizar?.();
        } catch (err) {
          console.error('Error al registrar el pago:', err);
        }
      }}
    >
      Confirmar
    </Button>
  </DialogActions>
</Dialog>

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
