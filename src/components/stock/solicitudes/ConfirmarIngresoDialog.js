import { useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, Paper, Radio, Stack, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Typography,
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';

/**
 * Dialog wizard de 2 pasos para confirmar ingreso de toda una solicitud.
 *
 * Props:
 *  - open           : boolean
 *  - onClose        : () => void
 *  - solicitudData  : { solicitud, movimientos } (solo los pendientes)
 *  - onConfirmar    : (cantidades: { movId: number }) => Promise<void>
 *  - loading        : boolean
 */
export default function ConfirmarIngresoDialog({
  open,
  onClose,
  solicitudData,
  onConfirmar,
  loading = false,
}) {
  const [paso, setPaso] = useState('tipo');               // 'tipo' | 'lista'
  const [tipoConfirmacion, setTipoConfirmacion] = useState('total'); // 'total' | 'parcial'
  const [cantidades, setCantidades] = useState({});

  // Cuando se abre/cierra, reiniciar estado interno
  const handleClose = () => {
    if (loading) return;
    setPaso('tipo');
    setTipoConfirmacion('total');
    setCantidades({});
    onClose();
  };

  // Inicializar cantidades con el pendiente por defecto
  const initCantidades = () => {
    if (!solicitudData?.movimientos) return {};
    const c = {};
    solicitudData.movimientos.forEach((m) => {
      const orig = m.cantidad_original || Math.abs(m.cantidad || 0);
      const entr = m.cantidad_entregada || 0;
      c[m._id] = orig - entr;
    });
    return c;
  };

  // Calcular total pendiente
  const getTotalPendiente = () => {
    if (!solicitudData?.movimientos) return 0;
    return solicitudData.movimientos.reduce((acc, m) => {
      const orig = m.cantidad_original || Math.abs(m.cantidad || 0);
      const entr = m.cantidad_entregada || 0;
      return acc + (orig - entr);
    }, 0);
  };

  const getTotalAConfirmar = () =>
    Object.values(cantidades).reduce((acc, v) => acc + (v || 0), 0);

  const handleSiguiente = () => {
    if (paso === 'tipo') {
      if (tipoConfirmacion === 'total') {
        // Entrega total directa
        onConfirmar(initCantidades());
      } else {
        setCantidades(initCantidades());
        setPaso('lista');
      }
    }
  };

  const handleCantidadChange = (movId, value) => {
    const cant = Math.max(0, parseInt(value) || 0);
    setCantidades((prev) => ({ ...prev, [movId]: cant }));
  };

  if (!solicitudData) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <LocalShippingIcon color="success" />
          <span>Confirmar Ingreso</span>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* -------- Paso 1: elegir tipo -------- */}
          {paso === 'tipo' && (
            <>
              <Alert severity="info">
                Seleccioná el tipo de confirmación para este ticket de ingreso.
              </Alert>

              <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Ticket: <strong>{solicitudData.solicitud?.subtipo || 'Sin subtipo'}</strong>
                </Typography>
                <Typography variant="body2">
                  Materiales pendientes: <strong>{solicitudData.movimientos?.length || 0}</strong>
                </Typography>
                <Typography variant="body2">
                  Unidades totales pendientes: <strong>{getTotalPendiente()}</strong>
                </Typography>
              </Box>

              <FormControl component="fieldset">
                <Typography variant="subtitle2" gutterBottom>
                  ¿Cómo fue la entrega?
                </Typography>
                <Stack spacing={2}>
                  {/* Opción Total */}
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2, cursor: 'pointer',
                      border: tipoConfirmacion === 'total' ? '2px solid' : '1px solid',
                      borderColor: tipoConfirmacion === 'total' ? 'success.main' : 'divider',
                      bgcolor: tipoConfirmacion === 'total' ? 'success.50' : 'transparent',
                      '&:hover': { borderColor: 'success.main' },
                    }}
                    onClick={() => setTipoConfirmacion('total')}
                  >
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Radio checked={tipoConfirmacion === 'total'} color="success" onChange={() => setTipoConfirmacion('total')} />
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>✅ Entrega Total</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Se recibieron TODOS los materiales en las cantidades solicitadas
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>

                  {/* Opción Parcial */}
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2, cursor: 'pointer',
                      border: tipoConfirmacion === 'parcial' ? '2px solid' : '1px solid',
                      borderColor: tipoConfirmacion === 'parcial' ? 'warning.main' : 'divider',
                      bgcolor: tipoConfirmacion === 'parcial' ? 'warning.50' : 'transparent',
                      '&:hover': { borderColor: 'warning.main' },
                    }}
                    onClick={() => setTipoConfirmacion('parcial')}
                  >
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Radio checked={tipoConfirmacion === 'parcial'} color="warning" onChange={() => setTipoConfirmacion('parcial')} />
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>⚠️ Entrega Parcial</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Algunos materiales llegaron incompletos o no llegaron
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Stack>
              </FormControl>
            </>
          )}

          {/* -------- Paso 2: lista de cantidades -------- */}
          {paso === 'lista' && (
            <>
              <Alert severity="warning">
                Indicá la cantidad recibida para cada material. Los pendientes se mantendrán en el ticket.
              </Alert>

              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Material</TableCell>
                      <TableCell align="center">Pendiente</TableCell>
                      <TableCell align="center">Recibido</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {solicitudData.movimientos?.map((mov) => {
                      const orig = mov.cantidad_original || Math.abs(mov.cantidad || 0);
                      const entr = mov.cantidad_entregada || 0;
                      const pendiente = orig - entr;
                      return (
                        <TableRow key={mov._id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>{mov.nombre_item}</Typography>
                            {mov.observacion && (
                              <Typography variant="caption" color="text.secondary">{mov.observacion}</Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={pendiente} size="small" color="warning" variant="outlined" />
                          </TableCell>
                          <TableCell align="center" sx={{ width: 120 }}>
                            <TextField
                              type="number"
                              size="small"
                              value={cantidades[mov._id] || 0}
                              onChange={(e) => handleCantidadChange(mov._id, e.target.value)}
                              inputProps={{ min: 0, max: pendiente, step: 1 }}
                              sx={{ width: 80 }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>

              <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">
                    Total pendiente: <strong>{getTotalPendiente()}</strong>
                  </Typography>
                  <Typography variant="body2" color="success.main">
                    Total a confirmar: <strong>{getTotalAConfirmar()}</strong>
                  </Typography>
                </Stack>
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {paso === 'lista' && (
          <Button onClick={() => setPaso('tipo')} disabled={loading}>Volver</Button>
        )}
        <Button onClick={handleClose} disabled={loading}>Cancelar</Button>
        {paso === 'tipo' && (
          <Button
            variant="contained"
            color={tipoConfirmacion === 'total' ? 'success' : 'warning'}
            onClick={handleSiguiente}
            disabled={loading}
            startIcon={loading ? null : (tipoConfirmacion === 'total' ? <CheckCircleIcon /> : <PendingIcon />)}
          >
            {loading ? 'Procesando...' : (tipoConfirmacion === 'total' ? 'Confirmar Todo' : 'Siguiente')}
          </Button>
        )}
        {paso === 'lista' && (
          <Button
            variant="contained"
            color="success"
            onClick={() => onConfirmar(cantidades)}
            disabled={loading || getTotalAConfirmar() <= 0}
            startIcon={loading ? null : <CheckCircleIcon />}
          >
            {loading ? 'Procesando...' : 'Confirmar Ingreso'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
