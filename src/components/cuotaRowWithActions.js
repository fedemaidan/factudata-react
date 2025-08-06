import React, { useState, useEffect } from 'react';
import {
  TableRow, TableCell, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, TextField, Chip, Typography, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { dateToTimestamp, formatCurrency, formatTimestamp } from 'src/utils/formatters';
import CuentasPendientesService from 'src/services/cuentasPendientesService';
import ConversorMonedaService from 'src/services/conversorMonedasService';
import debounce from 'lodash/debounce';


export const CuotaRowWithActions = ({ cuota, cuentaId, onActualizar }) => {
  const [open, setOpen] = useState(false);
  const [montoEditado, setMontoEditado] = useState(cuota.monto_nominal);
  const [fechaEditada, setFechaEditada] = useState(formatTimestamp(cuota.fecha_vencimiento));
  const [openPago, setOpenPago] = useState(false);
  const [montoConvertido, setMontoConvertido] = useState(null);
    const [loadingConversion, setLoadingConversion] = useState(false);
    const [guardando, setGuardando] = useState(false);

  const [pago, setPago] = useState({
    monto: cuota.moneda_nominal == 'CAC' ? 0 : cuota.monto_nominal,
    fecha_pago: new Date().toISOString().substring(0, 10),
    moneda_pago: cuota.moneda_nominal || cuota.moneda 
  });

  useEffect(() => {
    const handler = debounce(async () => {
      if (!pago.monto || isNaN(pago.monto)) return setMontoConvertido(null);
  
      try {
        setLoadingConversion(true);
        const res = await ConversorMonedaService.convertirMoneda({
          monto: pago.monto,
          moneda_origen: pago.moneda_pago,
          moneda_destino: cuota.moneda_nominal,
          fecha: pago.fecha_pago,
          tipo_dolar: cuota.tipo_dolar || 'BLUE_VENTA'
        });
        setMontoConvertido(res.monto_convertido);
      } catch (err) {
        console.error('Error en conversión previa al pago:', err);
        setMontoConvertido(null);
      } finally {
        setLoadingConversion(false);
      }
    }, 400); // Espera 400ms sin cambios
  
    handler();
  
    return () => {
      handler.cancel();
    };
  }, [pago.monto, pago.moneda_pago, pago.fecha_pago]);
  


  const handleGuardar = async () => {
    try {
      setGuardando(true);
      const fechaConHora = dateToTimestamp(fechaEditada)
      cuota.fecha_vencimiento = "actualizando";
      cuota.monto_nominal = parseFloat(montoEditado);
      await CuentasPendientesService.editarCuota(cuentaId, cuota.id, {
        monto_nominal: parseFloat(montoEditado),
        fecha_vencimiento: fechaConHora,
      });

      setGuardando(false);
      
      setOpen(false);
      // Luego refrescás si querés asegurar consistencia completa
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
      <TableCell>{cuota.fecha_vencimiento == 'actualizando' ? "Actualizando.." : formatTimestamp(cuota.fecha_vencimiento)}</TableCell>
      <TableCell>
        <Chip
          label={cuota.tipo === 'a_cobrar' ? 'A cobrar' : 'A pagar'}
          color={cuota.tipo === 'a_cobrar' ? 'success' : 'error'}
          size="small"
        />
      </TableCell>
      <TableCell>
  <Chip
    label={cuota.pagado ? 'Pagado' : 'Impago'}
    color={cuota.pagado ? 'success' : 'error'}
    variant="outlined"
    size="small"
    sx={{ fontWeight: 'bold' }}
  />
</TableCell>

        <TableCell>
          {(cuota.pagos || []).map((p, i) => (
            <Typography variant="body2" key={i}>
              {formatTimestamp(p.fecha)} – {formatCurrency(p.monto)}
              {p.monto_real_informativo != null && p.moneda_real_informativo ? (
                <Typography variant="caption" color="text.secondary" component="div">
                  (~{formatCurrency(p.monto_real_informativo)} {p.moneda_real_informativo})
                </Typography>
              ) : null}
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
  onChange={async (e) => {
    const nuevaMoneda = e.target.value;

    // Calcular cuánto queda pendiente
    const pagado = (cuota.pagos || []).reduce(
      (sum, p) => sum + (p.monto_convertido ?? p.monto),
      0
    );
    const saldoPendiente = Math.max(0, cuota.monto_nominal - pagado);

    try {
      const res = await ConversorMonedaService.convertirMoneda({
        monto: saldoPendiente,
        moneda_origen: cuota.moneda_nominal,
        moneda_destino: nuevaMoneda,
        fecha: pago.fecha_pago,
        tipo_dolar: cuota.tipo_dolar || 'BLUE_VENTA'
      });

      setPago((prev) => ({
        ...prev,
        moneda_pago: nuevaMoneda,
        monto: parseFloat(res.monto_convertido.toFixed(2))
      }));
    } catch (err) {
      console.error('❌ Error al recalcular monto al cambiar moneda:', err);
      setPago((prev) => ({
        ...prev,
        moneda_pago: nuevaMoneda
      }));
    }
  }}
>
    <MenuItem value="ARS">ARS</MenuItem>
    <MenuItem value="USD">USD</MenuItem>
  </Select>

  {montoConvertido != null && (
  <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">
    Equivale a: <strong>{formatCurrency(montoConvertido)}</strong> en {cuota.moneda_nominal}
  </Typography>
)}
{loadingConversion && (
  <Typography variant="caption" color="text.disabled">
    Calculando conversión...
  </Typography>
)}

</FormControl>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setOpenPago(false)}>Cancelar</Button>
    <Button
      variant="contained"
      onClick={async () => {
        try {
          console.log('Registrando pago:', {
            cuentaId,
            cuotaId: cuota.id,
            pago
          });
          await CuentasPendientesService.registrarPago(
            cuentaId,
            cuota.id,
            {
              monto: pago.monto,
              fecha_pago: pago.fecha_pago,
              moneda: pago.moneda_pago
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
          <Button
              variant="contained"
              disabled={guardando}
              onClick={handleGuardar}
            >
              {guardando ? 'Guardando...' : 'Guardar'}
            </Button>

        </DialogActions>
      </Dialog>
    </TableRow>
  );
};
