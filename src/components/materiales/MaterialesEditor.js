import { useMemo } from 'react';
import { Box, Stack, TextField, IconButton, Typography, Button, Checkbox, FormControlLabel } from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import DoneAllIcon from '@mui/icons-material/DoneAll';

export default function MaterialesEditor({
  items = [],
  onChange,
  readOnly = false,
  title = 'Materiales',
  proyecto_id = null
}) {
  const handleField = (idx, key, val) => {
    const next = items.map((it, i) =>
      i === idx ? { ...it, [key]: key === 'cantidad' || key === 'valorUnitario' ? Number(val) : val } : it
    );
    onChange?.(next);
  };

  const addRow = () =>
    onChange?.([
      ...(items || []),
      { descripcion: '', cantidad: 0, valorUnitario: 0, validado: false, proyecto_id }
    ]);

  const removeRow = (idx) => onChange?.(items.filter((_, i) => i !== idx));

  const total = useMemo(
    () => (items || []).reduce((acc, it) => acc + (Number(it.cantidad) || 0) * (Number(it.valorUnitario) || 0), 0),
    [items]
  );

  const validarTodos = (value = true) => {
    const next = (items || []).map((it) => ({ ...it, validado: value }));
    onChange?.(next);
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="h6">{title}</Typography>
        {!readOnly && (
          <Stack direction="row" spacing={1}>
            <Button startIcon={<AddCircleIcon />} onClick={addRow}>
              Agregar ítem
            </Button>
            <Button
              startIcon={<DoneAllIcon />}
              onClick={() => validarTodos(true)}
              variant="outlined"
            >
              Validar todos
            </Button>
          </Stack>
        )}
      </Stack>

      <Stack spacing={1}>
        {(items || []).map((it, idx) => (
          <Stack key={idx} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
            <TextField
              label="Descripción"
              value={it.descripcion || ''}
              onChange={(e) => handleField(idx, 'descripcion', e.target.value)}
              fullWidth
              disabled={readOnly}
            />
            <TextField
              label="Cantidad"
              type="number"
              value={it.cantidad ?? 0}
              onChange={(e) => handleField(idx, 'cantidad', e.target.value)}
              sx={{ minWidth: 130 }}
              disabled={readOnly}
            />
            <TextField
              label="Valor Unit."
              type="number"
              value={it.valorUnitario ?? 0}
              onChange={(e) => handleField(idx, 'valorUnitario', e.target.value)}
              sx={{ minWidth: 150 }}
              disabled={readOnly}
            />

            {/* ✅ Check de validado */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!it.validado}
                  onChange={(e) => handleField(idx, 'validado', e.target.checked)}
                  disabled={readOnly}
                />
              }
              label="Validado"
              sx={{ ml: 1 }}
            />

            {!readOnly && (
              <IconButton color="error" onClick={() => removeRow(idx)}>
                <DeleteIcon />
              </IconButton>
            )}
          </Stack>
        ))}
      </Stack>

      <Typography sx={{ mt: 2, fontWeight: 700 }}>
        Total materiales: {total.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
      </Typography>
    </Box>
  );
}
