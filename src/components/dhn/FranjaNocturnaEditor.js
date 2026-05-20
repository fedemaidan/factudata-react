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
import { TIPO_META } from 'src/utils/dhn/tiposHora';
import { TIPOS_PLUS_NOCTURNO } from 'src/utils/dhn/configHorarios';

const inputProps = { step: 60 };

const FranjaNocturnaEditor = ({ franjas, onChange }) => {
  const arr = Array.isArray(franjas) ? franjas : [];

  const setFranja = useCallback(
    (idx, patch) => {
      const next = arr.map((f, i) => (i === idx ? { ...f, ...patch } : f));
      onChange(next);
    },
    [arr, onChange],
  );

  const remove = useCallback(
    (idx) => {
      const next = arr.filter((_, i) => i !== idx);
      onChange(next);
    },
    [arr, onChange],
  );

  const add = useCallback(() => {
    onChange([...arr, { desde: '21:00', hasta: '24:00' }]);
  }, [arr, onChange]);

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        Franja nocturna
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Las horas trabajadas dentro de estos rangos suman un plus nocturno adicional. Por defecto se calcula automáticamente según el tipo del tramo.
      </Typography>
      <Stack spacing={1}>
        {arr.length === 0 ? (
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Sin franjas nocturnas.
          </Typography>
        ) : (
          arr.map((f, idx) => (
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
                value={f.desde || ''}
                onChange={(e) => setFranja(idx, { desde: e.target.value })}
                inputProps={inputProps}
                sx={{ width: 112 }}
                InputLabelProps={{ shrink: true }}
              />
              <Box sx={{ color: 'text.disabled' }}>→</Box>
              <TextField
                type="time"
                size="small"
                value={f.hasta === '24:00' ? '23:59' : f.hasta || ''}
                onChange={(e) => {
                  const v = e.target.value === '23:59' ? '24:00' : e.target.value;
                  setFranja(idx, { hasta: v });
                }}
                inputProps={inputProps}
                sx={{ width: 112 }}
                InputLabelProps={{ shrink: true }}
              />
              <Select
                size="small"
                value={f.tipoPlus || ''}
                displayEmpty
                onChange={(e) => setFranja(idx, { tipoPlus: e.target.value || undefined })}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="">
                  <em>Automático</em>
                </MenuItem>
                {TIPOS_PLUS_NOCTURNO.map((tipo) => (
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
              <Tooltip title="Eliminar franja">
                <IconButton size="small" onClick={() => remove(idx)} aria-label="Eliminar franja">
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          ))
        )}
        <Box>
          <Button size="small" variant="text" startIcon={<AddIcon />} onClick={add}>
            Agregar franja nocturna
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};

export default FranjaNocturnaEditor;
