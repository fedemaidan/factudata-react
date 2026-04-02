import PropTypes from 'prop-types';
import {
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import UndoIcon from '@mui/icons-material/Undo';
import { formatCurrency, formatNumberInput, parseNumberInput } from 'src/utils/formatters';

const estadoColor = {
  cobrada: 'success',
  cobrada_parcial: 'warning',
  cobrada_parcial_vencida: 'warning',
  vencida: 'error',
  pendiente: 'info',
};

const estadoLabel = {
  cobrada: 'Cobrada',
  cobrada_parcial: 'Cobrada parcial',
  cobrada_parcial_vencida: 'Cobrada parcial vencida',
  vencida: 'Vencida',
  pendiente: 'Pendiente',
};

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

const parseDecimalInput = (value) => {
  const parsed = parseFloat(parseNumberInput(value));
  return Number.isFinite(parsed) ? parsed : null;
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

export const CuotasTableEdit = ({
  cuotas,
  onChange,
  moneda = 'ARS',
  showCAC = false,
  cacPreview = null,
  montoTotal = 0,
}) => {
  const cacIndice = Number(cacPreview?.cac_indice) || null;
  const showPct = montoTotal > 0;
  const totalPct = showPct
    ? round2(cuotas.reduce((acc, cuota) => acc + ((Number(cuota.monto) || 0) / montoTotal) * 100, 0))
    : 0;

  const add = () => {
    onChange([
      ...cuotas,
      { fecha_vencimiento: '', monto: '', descripcion: '' },
    ]);
  };

  const remove = (index) => onChange(cuotas.filter((_, idx) => idx !== index));

  const updateRow = (index, patch) => {
    const next = cuotas.map((cuota, idx) => (idx === index ? { ...cuota, ...patch } : cuota));
    onChange(next);
  };

  const updateMonto = (index, raw) => {
    updateRow(index, { monto: parseNumberInput(raw) });
  };

  const updateMontoDesdeCac = (index, raw) => {
    const cacValue = parseDecimalInput(raw);
    updateRow(index, { monto: cacValue == null || !cacIndice ? '' : String(round2(cacValue * cacIndice)) });
  };

  const updateMontoDesdePorcentaje = (index, raw) => {
    const pctValue = parseDecimalInput(raw);
    updateRow(index, {
      monto: pctValue == null ? '' : String(round2(montoTotal * pctValue / 100)),
    });
  };

  return (
    <Box>
      {showCAC && cacIndice && (
        <Paper
          variant="outlined"
          sx={{
            mb: 2,
            p: 1.5,
            borderRadius: 2,
            bgcolor: 'info.50',
            borderColor: 'info.light',
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            spacing={1}
          >
            <Typography variant="body2" color="text.secondary">
              Índice CAC aplicado para la edición
            </Typography>
            <Typography variant="body2" fontWeight={700} color="info.main">
              {cacPreview?.cac_fecha ? `${cacPreview.cac_fecha} · ` : ''}CAC = {cacIndice.toLocaleString('es-AR')}
            </Typography>
          </Stack>
        </Paper>
      )}

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5, color: 'text.secondary' } }}>
              <TableCell>#</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Monto ({moneda})</TableCell>
              {showCAC && <TableCell>CAC</TableCell>}
              {showPct && <TableCell align="right" sx={{ width: 110 }}>%</TableCell>}
              <TableCell>Descripción</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {cuotas.map((cuota, index) => {
              const cacEquiv = showCAC && cacIndice && Number(cuota.monto)
                ? round2(Number(cuota.monto) / cacIndice)
                : null;
              const pctEquiv = showPct && montoTotal > 0 && Number(cuota.monto)
                ? round2((Number(cuota.monto) / montoTotal) * 100)
                : null;

              return (
                <TableRow key={index} sx={{ '& td': { verticalAlign: 'top' } }}>
                  <TableCell sx={{ fontWeight: 700 }}>{index + 1}</TableCell>
                  <TableCell>
                    <TextField
                      type="date"
                      size="small"
                      value={cuota.fecha_vencimiento}
                      onChange={(e) => updateRow(index, { fecha_vencimiento: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                      sx={{ width: 165 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={formatNumberInput(cuota.monto)}
                      onChange={(e) => updateMonto(index, e.target.value)}
                      onFocus={(e) => e.target.select()}
                      sx={{ width: 150 }}
                      inputProps={{ inputMode: 'decimal' }}
                      InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                    />
                  </TableCell>
                  {showCAC && (
                    <TableCell>
                      {cacIndice ? (
                        <TextField
                          size="small"
                          value={cacEquiv == null ? '' : formatNumberInput(cacEquiv)}
                          onChange={(e) => updateMontoDesdeCac(index, e.target.value)}
                          onFocus={(e) => e.target.select()}
                          sx={{ width: 130 }}
                          inputProps={{ inputMode: 'decimal' }}
                          InputProps={{ endAdornment: <InputAdornment position="end">CAC</InputAdornment> }}
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                  )}
                  {showPct && (
                    <TableCell align="right">
                      <TextField
                        size="small"
                        value={pctEquiv == null ? '' : formatNumberInput(pctEquiv)}
                        onChange={(e) => updateMontoDesdePorcentaje(index, e.target.value)}
                        onFocus={(e) => e.target.select()}
                        sx={{ width: 100 }}
                        inputProps={{ inputMode: 'decimal' }}
                        InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <TextField
                      size="small"
                      value={cuota.descripcion || ''}
                      onChange={(e) => updateRow(index, { descripcion: e.target.value })}
                      sx={{ minWidth: 200 }}
                      placeholder="Opcional"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Eliminar cuota">
                      <IconButton size="small" onClick={() => remove(index)} color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
            {cuotas.length === 0 && (
              <TableRow>
                <TableCell colSpan={showCAC ? (showPct ? 7 : 6) : (showPct ? 6 : 5)}>
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    Agregá al menos una cuota
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1} sx={{ mt: 1.5 }}>
        <Button startIcon={<AddIcon />} onClick={add} size="small">
          Agregar cuota
        </Button>
        {showPct && (
          <Typography variant="caption" color={Math.abs(totalPct - 100) < 0.01 ? 'success.main' : 'text.secondary'}>
            Distribuido: {totalPct.toLocaleString('es-AR', { maximumFractionDigits: 2 })}%
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

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
          {cuotas.map((cuota) => {
            const estadoUi = cuota.estado_ui || cuota.estado;
            const cacDisplay = cuota.monto_cac != null ? round2(Number(cuota.monto_cac)) : null;
            const montoDisplay = estadoUi === 'cobrada' && typeof cuota.monto_cobrado === 'number'
              ? cuota.monto_cobrado
              : cuota.monto;
            const puedeCobrar = cuota.estado === 'pendiente' || cuota.estado === 'cobrada_parcial';
            const puedeRevertir = cuota.estado === 'cobrada' || cuota.estado === 'cobrada_parcial';

            return (
              <TableRow key={cuota._id}>
                <TableCell>{cuota.numero}</TableCell>
                <TableCell>
                  {cuota.fecha_vencimiento
                    ? new Date(cuota.fecha_vencimiento).toLocaleDateString('es-AR')
                    : '-'}
                </TableCell>
                <TableCell>{formatCurrency(montoDisplay, monedaDisplay)}</TableCell>
                {showCAC && (
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {cacDisplay != null ? `${formatNumberInput(cacDisplay)} CAC` : '-'}
                    </Typography>
                  </TableCell>
                )}
                <TableCell>{cuota.descripcion || '-'}</TableCell>
                <TableCell>
                  <Chip
                    label={estadoLabel[estadoUi] || estadoUi}
                    color={estadoColor[estadoUi] || 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {cuota.fecha_cobrado ? tiempoRelativo(cuota.fecha_cobrado) : '-'}
                </TableCell>
                {(onMarcarCobrada || onRevertirCobro) && (
                  <TableCell>
                    {puedeCobrar && onMarcarCobrada && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        onClick={() => onMarcarCobrada(cuota._id)}
                        disabled={loadingId === cuota._id}
                        sx={{ mr: 1 }}
                      >
                        {loadingId === cuota._id ? 'Guardando...' : cuota.estado === 'cobrada_parcial' ? 'Cobrar resto' : 'Cobrar'}
                      </Button>
                    )}
                    {puedeRevertir && onRevertirCobro && (
                      <Tooltip title="Revertir cobro">
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={() => onRevertirCobro(cuota._id)}
                          disabled={revertingId === cuota._id}
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
  montoTotal: PropTypes.number,
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
