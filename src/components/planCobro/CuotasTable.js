import PropTypes from 'prop-types';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  IconButton,
  Tooltip,
  Typography,
  Box,
  Button,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import UndoIcon from '@mui/icons-material/Undo';
import { formatCurrency, formatNumberInput, parseNumberInput } from 'src/utils/formatters';

const estadoColor = {
  cobrada: 'success',
  vencida: 'error',
  pendiente: 'default',
};

const estadoLabel = {
  cobrada: 'Cobrada',
  vencida: 'Vencida',
  pendiente: 'Pendiente',
};

const tiempoRelativo = (fecha) => {
  if (!fecha) return '-';
  const diff = Date.now() - new Date(fecha).getTime();
  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  if (dias < 30) return `Hace ${dias} días`;
  const meses = Math.floor(dias / 30);
  return `Hace ${meses} mes${meses > 1 ? 'es' : ''}`;
};

// Modo edición (para crear/confirmar plan)
export const CuotasTableEdit = ({ cuotas, onChange, moneda = 'ARS', showCAC = false, cacPreview = null }) => {
  const add = () => {
    onChange([
      ...cuotas,
      { fecha_vencimiento: '', monto: '', descripcion: '' },
    ]);
  };

  const remove = (i) => onChange(cuotas.filter((_, idx) => idx !== i));

  const update = (i, field, value) => {
    const next = cuotas.map((c, idx) => (idx === i ? { ...c, [field]: value } : c));
    onChange(next);
  };

  return (
    <Box>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5, color: 'text.secondary' } }}>
              <TableCell>#</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Monto ({moneda})</TableCell>
              {showCAC && <TableCell>Equiv. CAC (solo lectura)</TableCell>}
              <TableCell>Descripción (opcional)</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {cuotas.map((c, i) => {
              const cacEquiv = showCAC && cacPreview?.valor && Number(c.monto)
                ? (Number(c.monto) / cacPreview.valor).toFixed(2)
                : null;

              return (
                <TableRow key={i}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>
                    <TextField
                      type="date"
                      size="small"
                      value={c.fecha_vencimiento}
                      onChange={(e) => update(i, 'fecha_vencimiento', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{ width: 160 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={formatNumberInput(c.monto)}
                      onChange={(e) => update(i, 'monto', parseNumberInput(e.target.value))}
                      sx={{ width: 140 }}
                      inputProps={{ inputMode: 'decimal' }}
                    />
                  </TableCell>
                  {showCAC && (
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {cacEquiv ? `${cacEquiv} CAC` : '-'}
                      </Typography>
                    </TableCell>
                  )}
                  <TableCell>
                    <TextField
                      size="small"
                      value={c.descripcion || ''}
                      onChange={(e) => update(i, 'descripcion', e.target.value)}
                      sx={{ width: 200 }}
                      placeholder="Opcional"
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Eliminar cuota">
                      <IconButton size="small" onClick={() => remove(i)} color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
            {cuotas.length === 0 && (
              <TableRow>
                <TableCell colSpan={showCAC ? 6 : 5}>
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    Agregá al menos una cuota
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Button startIcon={<AddIcon />} onClick={add} sx={{ mt: 1 }} size="small">
        Agregar cuota
      </Button>
    </Box>
  );
};

// Modo sólo lectura (para ver el detalle del plan)
export const CuotasTableReadonly = ({
  cuotas = [],
  moneda = 'ARS',
  onMarcarCobrada,
  onRevertirCobro,
  loadingId = null,
  revertingId = null,
  showCAC = false,
}) => {
  const monedaDisplay = moneda === 'CAC' ? 'ARS' : moneda;

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>#</TableCell>
            <TableCell>Vencimiento</TableCell>
            <TableCell>Monto</TableCell>
            {showCAC && <TableCell>CAC</TableCell>}
            <TableCell>Descripción</TableCell>
            <TableCell>Estado</TableCell>
            <TableCell>Cobrado</TableCell>
            {(onMarcarCobrada || onRevertirCobro) && <TableCell>Acciones</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {cuotas.map((c) => {
            const estadoUi = c.estado_ui || c.estado;
            const cacDisplay = c.cotizacion_snapshot?.valor
              ? (c.monto / c.cotizacion_snapshot.valor).toFixed(2)
              : null;

            return (
              <TableRow key={c._id}>
                <TableCell>{c.numero}</TableCell>
                <TableCell>
                  {c.fecha_vencimiento
                    ? new Date(c.fecha_vencimiento).toLocaleDateString('es-AR')
                    : '-'}
                </TableCell>
                <TableCell>{formatCurrency(c.monto, monedaDisplay)}</TableCell>
                {showCAC && (
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {cacDisplay ? `${cacDisplay} CAC` : '-'}
                    </Typography>
                  </TableCell>
                )}
                <TableCell>{c.descripcion || '-'}</TableCell>
                <TableCell>
                  <Chip
                    label={estadoLabel[estadoUi] || estadoUi}
                    color={estadoColor[estadoUi] || 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {c.fecha_cobrado ? tiempoRelativo(c.fecha_cobrado) : '-'}
                </TableCell>
                {(onMarcarCobrada || onRevertirCobro) && (
                  <TableCell>
                    {c.estado === 'pendiente' && onMarcarCobrada && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        onClick={() => onMarcarCobrada(c._id)}
                        disabled={loadingId === c._id}
                      >
                        {loadingId === c._id ? 'Guardando...' : 'Cobrar'}
                      </Button>
                    )}
                    {c.estado === 'cobrada' && onRevertirCobro && (
                      <Tooltip title="Revertir cobro">
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={() => onRevertirCobro(c._id)}
                          disabled={revertingId === c._id}
                        >
                          <UndoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

CuotasTableEdit.propTypes = {
  cuotas: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
  moneda: PropTypes.string,
  showCAC: PropTypes.bool,
  cacPreview: PropTypes.object,
};

CuotasTableReadonly.propTypes = {
  cuotas: PropTypes.array,
  moneda: PropTypes.string,
  onMarcarCobrada: PropTypes.func,
  onRevertirCobro: PropTypes.func,
  loadingId: PropTypes.string,
  revertingId: PropTypes.string,
  showCAC: PropTypes.bool,
};
