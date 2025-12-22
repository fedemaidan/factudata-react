import React, { useMemo } from 'react';
import { Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography, Paper } from '@mui/material';

const HorariosConfigTable = ({
  dias,
  config,
  errors,
  onTimeChange,
  onFraccionChange,
}) => {
  const buildTimeErrorKey = useMemo(() => (turno, field) => `${turno}.${field}`, []);

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small" aria-label="tabla de horarios por día">
        <TableHead>
          <TableRow>
            <TableCell rowSpan={2} sx={{ fontWeight: 600, width: 140 }}>Día</TableCell>
            <TableCell align="center" colSpan={2} sx={{ fontWeight: 600 }}>Turno día</TableCell>
            <TableCell align="center" colSpan={2} sx={{ fontWeight: 600 }}>Turno noche</TableCell>
            <TableCell rowSpan={2} align="right" sx={{ fontWeight: 600, width: 190 }}>
              Fracción (min)
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Entrada</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Salida</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Entrada</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Salida</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {dias.map(({ key, label }) => {
            const dayCfg = config?.[key] || {};
            const noct = dayCfg?.nocturno || {};
            const minutes = Number(dayCfg?.fraccion?.minutos ?? 20);
            const dec = (Math.ceil((minutes / 60) * 100) / 100).toFixed(2);

            const dayIngresoError = errors?.[key]?.[buildTimeErrorKey('diurno', 'ingreso')] || '';
            const daySalidaError = errors?.[key]?.[buildTimeErrorKey('diurno', 'salida')] || '';
            const noctIngresoError = errors?.[key]?.[buildTimeErrorKey('nocturno', 'ingreso')] || '';
            const noctSalidaError = errors?.[key]?.[buildTimeErrorKey('nocturno', 'salida')] || '';

            return (
              <TableRow key={key} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell component="th" scope="row">
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {label}
                  </Typography>
                </TableCell>

                <TableCell>
                  <TextField
                    value={dayCfg.ingreso || ''}
                    onChange={(e) => onTimeChange(key, 'diurno', 'ingreso', e.target.value)}
                    size="small"
                    placeholder="HH:mm"
                    inputProps={{ inputMode: 'numeric', pattern: '([01]\\d|2[0-3]):[0-5]\\d' }}
                    error={Boolean(dayIngresoError)}
                    sx={{ width: 120 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={dayCfg.salida || ''}
                    onChange={(e) => onTimeChange(key, 'diurno', 'salida', e.target.value)}
                    size="small"
                    placeholder="HH:mm"
                    inputProps={{ inputMode: 'numeric', pattern: '([01]\\d|2[0-3]):[0-5]\\d' }}
                    error={Boolean(daySalidaError)}
                    sx={{ width: 120 }}
                  />
                </TableCell>

                <TableCell>
                  <TextField
                    value={noct.ingreso || ''}
                    onChange={(e) => onTimeChange(key, 'nocturno', 'ingreso', e.target.value)}
                    size="small"
                    placeholder="HH:mm"
                    inputProps={{ inputMode: 'numeric', pattern: '([01]\\d|2[0-3]):[0-5]\\d' }}
                    error={Boolean(noctIngresoError)}
                    sx={{ width: 120 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={noct.salida || ''}
                    onChange={(e) => onTimeChange(key, 'nocturno', 'salida', e.target.value)}
                    size="small"
                    placeholder="HH:mm"
                    inputProps={{ inputMode: 'numeric', pattern: '([01]\\d|2[0-3]):[0-5]\\d' }}
                    error={Boolean(noctSalidaError)}
                    sx={{ width: 120 }}
                  />
                </TableCell>

                <TableCell align="right">
                  <Stack spacing={0.25} alignItems="flex-end">
                    <TextField
                      value={dayCfg?.fraccion?.minutos ?? 20}
                      onChange={(e) => onFraccionChange(key, 'minutos', e.target.value)}
                      size="small"
                      type="number"
                      InputProps={{ inputProps: { min: 0, step: 1 } }}
                      sx={{ width: 140 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Decimal: {dec}
                    </Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default HorariosConfigTable;
