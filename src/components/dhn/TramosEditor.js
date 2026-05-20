import React, { useCallback } from 'react';
import {
  Box,
  Button,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { TIPOS_HORA, TIPO_META } from 'src/utils/dhn/tiposHora';
import { parseHHmm24, formatHHmm24 } from 'src/utils/dhn/configHorarios';

const TIPOS_TRAMO = [
  TIPOS_HORA.NORMAL,
  TIPOS_HORA.EXTRA_50,
  TIPOS_HORA.EXTRA_100,
  TIPOS_HORA.NOCTURNA_NORMAL,
  TIPOS_HORA.NOCTURNA_50,
  TIPOS_HORA.NOCTURNA_100,
  TIPOS_HORA.NO_CUENTA,
];

const inputProps = { step: 60 };

const TramosEditor = ({ tramos, onChange }) => {
  const arr = Array.isArray(tramos) ? tramos : [];

  const setTramo = useCallback(
    (idx, patch) => {
      const next = arr.map((t, i) => (i === idx ? { ...t, ...patch } : t));
      onChange(next);
    },
    [arr, onChange],
  );

  const remove = useCallback(
    (idx) => {
      if (arr.length <= 1) return;
      const next = arr.filter((_, i) => i !== idx);
      // Re-coser: el primer tramo arranca en 00:00.
      if (next.length > 0) next[0] = { ...next[0], desde: '00:00' };
      // El último termina en 24:00.
      if (next.length > 0) next[next.length - 1] = { ...next[next.length - 1], hasta: '24:00' };
      onChange(next);
    },
    [arr, onChange],
  );

  const add = useCallback(() => {
    const last = arr[arr.length - 1];
    const lastDesde = parseHHmm24(last?.desde) ?? 0;
    const lastHasta = parseHHmm24(last?.hasta) ?? 1440;
    // Partir el último tramo a la mitad para garantizar continuidad.
    const mid = Math.floor((lastDesde + lastHasta) / 2 / 60) * 60;
    if (mid <= lastDesde || mid >= lastHasta) return;
    const next = [...arr];
    next[next.length - 1] = { ...last, hasta: formatHHmm24(mid) };
    next.push({
      desde: formatHHmm24(mid),
      hasta: formatHHmm24(lastHasta),
      tipo: last?.tipo || TIPOS_HORA.EXTRA_50,
    });
    onChange(next);
  }, [arr, onChange]);

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        Tramos por horario
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Los tramos deben cubrir todo el día (00:00 → 24:00) sin huecos. Sábado típico: extra50 hasta 13:00, extra100 después.
      </Typography>
      <Stack spacing={1}>
        {arr.map((t, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === arr.length - 1;
          return (
            <Stack
              key={idx}
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{
                p: 1,
                borderRadius: 1,
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
              }}
            >
              <TextField
                type="time"
                size="small"
                value={t.desde || ''}
                onChange={(e) => setTramo(idx, { desde: e.target.value })}
                disabled={isFirst}
                inputProps={inputProps}
                sx={{ width: 112 }}
                InputLabelProps={{ shrink: true }}
              />
              <Box sx={{ color: 'text.disabled' }}>→</Box>
              <TextField
                type="time"
                size="small"
                value={t.hasta === '24:00' ? '23:59' : t.hasta || ''}
                onChange={(e) => {
                  const v = e.target.value === '23:59' ? '24:00' : e.target.value;
                  setTramo(idx, { hasta: v });
                }}
                disabled={isLast}
                inputProps={inputProps}
                sx={{ width: 112 }}
                InputLabelProps={{ shrink: true }}
              />
              <Select
                size="small"
                value={t.tipo || TIPOS_HORA.NORMAL}
                onChange={(e) => setTramo(idx, { tipo: e.target.value })}
                sx={{ minWidth: 170 }}
              >
                {TIPOS_TRAMO.map((tipo) => (
                  <MenuItem key={tipo} value={tipo}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          bgcolor: TIPO_META[tipo]?.color,
                        }}
                      />
                      <span>{TIPO_META[tipo]?.label || tipo}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
              <Box sx={{ flex: 1 }} />
              <Tooltip title={arr.length <= 1 ? 'Debe haber al menos un tramo' : 'Eliminar'}>
                <span>
                  <IconButton
                    size="small"
                    onClick={() => remove(idx)}
                    disabled={arr.length <= 1}
                    aria-label="Eliminar tramo"
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          );
        })}
        <Box>
          <Button size="small" variant="text" startIcon={<AddIcon />} onClick={add}>
            Agregar tramo
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};

export default TramosEditor;
