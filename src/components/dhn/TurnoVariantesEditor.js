import React, { useCallback } from 'react';
import {
  Box,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Button,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { parseHHmm24 } from 'src/utils/dhn/configHorarios';

const MAX_VARIANTES = 2;

const inputProps = { step: 60, inputMode: 'numeric' };

const TurnoVariantesEditor = ({ label, variantes, onChange, helper }) => {
  const arr = Array.isArray(variantes) ? variantes : [];

  const setVariante = useCallback(
    (idx, field, value) => {
      const next = arr.map((v, i) => (i === idx ? { ...v, [field]: value } : v));
      onChange(next);
    },
    [arr, onChange],
  );

  const remove = useCallback(
    (idx) => {
      const next = arr.filter((_, i) => i !== idx);
      onChange(next.length === 0 ? null : next);
    },
    [arr, onChange],
  );

  const add = useCallback(() => {
    const base = arr[0] || { entrada: '08:00', salida: '17:00' };
    const next = [...arr, { entrada: base.entrada, salida: base.salida }];
    onChange(next);
  }, [arr, onChange]);

  const enable = useCallback(() => {
    onChange([{ entrada: '08:00', salida: '17:00' }]);
  }, [onChange]);

  const duplicados =
    arr.length === 2 &&
    parseHHmm24(arr[0]?.entrada) === parseHHmm24(arr[1]?.entrada) &&
    parseHHmm24(arr[0]?.salida) === parseHHmm24(arr[1]?.salida);

  return (
    <Box>
      <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {label}
        </Typography>
        {helper ? (
          <Typography variant="caption" color="text.secondary">
            {helper}
          </Typography>
        ) : null}
      </Stack>

      {arr.length === 0 ? (
        <Button size="small" variant="text" startIcon={<AddIcon />} onClick={enable}>
          Agregar {label.toLowerCase()}
        </Button>
      ) : (
        <Stack spacing={1.5}>
          {arr.map((v, idx) => (
            <Stack
              key={idx}
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{
                p: 1.25,
                borderRadius: 1,
                bgcolor: idx === 1 ? 'action.hover' : 'background.paper',
                border: 1,
                borderColor: 'divider',
              }}
            >
              <Box sx={{ minWidth: 24 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  #{idx + 1}
                </Typography>
              </Box>
              <TextField
                label="Entrada"
                type="time"
                size="small"
                value={v?.entrada || ''}
                onChange={(e) => setVariante(idx, 'entrada', e.target.value)}
                inputProps={inputProps}
                sx={{ width: 130 }}
                InputLabelProps={{ shrink: true }}
              />
              <Box sx={{ color: 'text.disabled' }}>→</Box>
              <TextField
                label="Salida"
                type="time"
                size="small"
                value={v?.salida || ''}
                onChange={(e) => setVariante(idx, 'salida', e.target.value)}
                inputProps={inputProps}
                sx={{ width: 130 }}
                InputLabelProps={{ shrink: true }}
              />
              <Box sx={{ flex: 1 }} />
              <Tooltip title="Eliminar variante">
                <IconButton size="small" onClick={() => remove(idx)} aria-label="Eliminar variante">
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          ))}
          {arr.length < MAX_VARIANTES ? (
            <Box>
              <Button size="small" variant="text" startIcon={<AddIcon />} onClick={add}>
                Agregar segundo horario
              </Button>
            </Box>
          ) : null}
          {duplicados ? (
            <Typography variant="caption" color="error">
              Las dos variantes son idénticas. Modificá una o eliminá la duplicada.
            </Typography>
          ) : null}
        </Stack>
      )}
    </Box>
  );
};

export default TurnoVariantesEditor;
