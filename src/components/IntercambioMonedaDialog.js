import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
  Typography,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import { useAuthContext } from '../contexts/auth-context';
import movimientosService from '../services/movimientosService';
import ConversorMonedaService from '../services/conversorMonedasService';

const IntercambioMonedaDialog = ({ open, onClose, onSuccess, proyectoId, empresa }) => {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [loadingTc, setLoadingTc] = useState(false);
  const [tipoOperacion, setTipoOperacion] = useState('COMPRA'); // COMPRA (Pesos -> Dólares) | VENTA (Dólares -> Pesos)
  const [montoOrigen, setMontoOrigen] = useState('');
  const [tc, setTc] = useState('');
  const [tipoCambioFuente, setTipoCambioFuente] = useState('MANUAL');
  const [montoDestino, setMontoDestino] = useState('');
  const [medioPago, setMedioPago] = useState('');
  
  // Medios de pago disponibles (puedes ajustar según tu configuración)
  const mediosPago = empresa?.medios_pago || ['Efectivo', 'Transferencia', 'Cheque', 'Tarjeta'];

  useEffect(() => {
    if (open) {
      // Resetear campos al abrir
      setTipoOperacion('COMPRA');
      setMontoOrigen('');
      setTc('');
      setTipoCambioFuente('MANUAL');
      setMontoDestino('');
      setMedioPago('');
      setLoading(false);
      setLoadingTc(false);
    }
  }, [open]);

  // Obtener TC automático
  useEffect(() => {
    const fetchTc = async () => {
      if (tipoCambioFuente === 'MANUAL') return;
      
      setLoadingTc(true);
      try {
        // Consultamos cuánto vale 1 USD en ARS según la fuente seleccionada
        const res = await ConversorMonedaService.convertirMoneda({
          monto: 1,
          moneda_origen: 'USD',
          moneda_destino: 'ARS',
          tipo_dolar: tipoCambioFuente
        });
        
        if (res && res.monto_convertido) {
          setTc(res.monto_convertido.toString());
        }
      } catch (error) {
        console.error("Error obteniendo cotización:", error);
        setTipoCambioFuente('MANUAL'); // Volver a manual si falla
      } finally {
        setLoadingTc(false);
      }
    };

    fetchTc();
  }, [tipoCambioFuente]);

  // Calcular automáticamente el monto destino si hay origen y TC
  useEffect(() => {
    const origen = parseFloat(montoOrigen);
    const tasa = parseFloat(tc);

    if (!isNaN(origen) && !isNaN(tasa) && tasa > 0) {
      if (tipoOperacion === 'COMPRA') {
        // Pesos -> Dólares: Dólares = Pesos / TC
        setMontoDestino((origen / tasa).toFixed(2));
      } else {
        // Dólares -> Pesos: Pesos = Dólares * TC
        setMontoDestino((origen * tasa).toFixed(2));
      }
    }
  }, [montoOrigen, tc, tipoOperacion]);

  const handleSubmit = async () => {
    if (!montoOrigen || !tc || !medioPago) return;

    setLoading(true);
    try {
      const pesos = tipoOperacion === 'COMPRA' ? parseFloat(montoOrigen) : parseFloat(montoDestino);
      const dolares = tipoOperacion === 'COMPRA' ? parseFloat(montoDestino) : parseFloat(montoOrigen);
      
      const data = {
        proyecto_id: proyectoId,
        pesos,
        dolares,
        tc: parseFloat(tc),
        medio_pago: medioPago
      };

      let res;
      if (tipoOperacion === 'COMPRA') {
        res = await movimientosService.comprarDolares(data);
      } else {
        res = await movimientosService.venderDolares(data);
      }

      if (res.error) {
        alert('Error: ' + res.error);
      } else {
        onSuccess(res);
        onClose();
      }
    } catch (error) {
      console.error(error);
      alert('Error al procesar la operación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {tipoOperacion === 'COMPRA' ? 'Comprar Dólares' : 'Vender Dólares'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              select
              label="Tipo de Operación"
              fullWidth
              value={tipoOperacion}
              onChange={(e) => {
                setTipoOperacion(e.target.value);
                setMontoOrigen('');
                setMontoDestino('');
              }}
            >
              <MenuItem value="COMPRA">Comprar Dólares (Salen Pesos, Entran Dólares)</MenuItem>
              <MenuItem value="VENTA">Vender Dólares (Salen Dólares, Entran Pesos)</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label={tipoOperacion === 'COMPRA' ? 'Monto en Pesos (Origen)' : 'Monto en Dólares (Origen)'}
              type="number"
              fullWidth
              value={montoOrigen}
              onChange={(e) => setMontoOrigen(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start">{tipoOperacion === 'COMPRA' ? '$' : 'USD'}</InputAdornment>,
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Fuente Tipo de Cambio"
              fullWidth
              value={tipoCambioFuente}
              onChange={(e) => setTipoCambioFuente(e.target.value)}
            >
              <MenuItem value="MANUAL">Manual</MenuItem>
              <MenuItem value="BLUE_VENTA">Dólar Blue Venta</MenuItem>
              <MenuItem value="BLUE_COMPRA">Dólar Blue Compra</MenuItem>
              <MenuItem value="OFICIAL_VENTA">Dólar Oficial Venta</MenuItem>
              <MenuItem value="OFICIAL_COMPRA">Dólar Oficial Compra</MenuItem>
              <MenuItem value="MEP_MEDIO">Dólar MEP Medio</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Tipo de Cambio"
              type="number"
              fullWidth
              value={tc}
              onChange={(e) => setTc(e.target.value)}
              disabled={tipoCambioFuente !== 'MANUAL' || loadingTc}
              helperText={loadingTc ? 'Cargando cotización...' : `1 USD = $ ${tc || '...'}`}
              InputProps={{
                endAdornment: loadingTc ? <CircularProgress size={20} /> : null
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label={tipoOperacion === 'COMPRA' ? 'Monto en Dólares (Destino)' : 'Monto en Pesos (Destino)'}
              type="number"
              fullWidth
              value={montoDestino}
              disabled // Calculado automáticamente
              InputProps={{
                startAdornment: <InputAdornment position="start">{tipoOperacion === 'COMPRA' ? 'USD' : '$'}</InputAdornment>,
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              select
              label="Medio de Pago"
              fullWidth
              value={medioPago}
              onChange={(e) => setMedioPago(e.target.value)}
            >
              {mediosPago.map((mp) => (
                <MenuItem key={mp} value={mp}>
                  {mp}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading || !montoOrigen || !tc || !medioPago}
        >
          {loading ? <CircularProgress size={24} /> : 'Confirmar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default IntercambioMonedaDialog;
