import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Chip, Stack, TextField, Box, Divider
} from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

/**
 * Diálogo de "preflight" que aparece antes de iniciar la extracción.
 * Permite al usuario dar contexto adicional para mejorar la precisión.
 *
 * Props:
 *   open           {boolean}
 *   onClose        {Function}               - cerrar sin procesar
 *   onConfirmar    {Function(string)}        - continuar con instrucciones (puede ser '')
 */
const OPCIONES_PRESET = [
  { id: 'iva_incluido',    label: 'Precios incluyen IVA' },
  { id: 'iva_excluido',    label: 'Precios NO incluyen IVA' },
  { id: 'decimales_coma',  label: 'Los decimales usan coma (1.234,56)' },
  { id: 'dificil_leer',    label: 'Documento difícil de leer / baja calidad' },
  { id: 'columnas_poco_claras', label: 'Tabla con encabezados poco claros' },
  { id: 'presupuesto',     label: 'Es un presupuesto (no factura)' },
  { id: 'codigos_propios', label: 'Los códigos son del proveedor (no del sistema)' },
  { id: 'sin_cantidades',  label: 'No hay cantidades (solo precios unitarios)' },
];

export default function PreflightChatDialog({ open, onClose, onConfirmar }) {
  const [seleccionados, setSeleccionados] = useState([]);
  const [textoLibre, setTextoLibre] = useState('');

  const toggleOpcion = (id) => {
    setSeleccionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleConfirmar = () => {
    const partes = [];
    const opcLabel = seleccionados.map(id => OPCIONES_PRESET.find(o => o.id === id)?.label).filter(Boolean);
    if (opcLabel.length > 0) partes.push(opcLabel.join('. ') + '.');
    if (textoLibre.trim()) partes.push(textoLibre.trim());
    onConfirmar(partes.join(' '));

    // Reset para la próxima apertura
    setSeleccionados([]);
    setTextoLibre('');
  };

  const handleSinInstrucciones = () => {
    setSeleccionados([]);
    setTextoLibre('');
    onConfirmar('');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TuneIcon color="primary" fontSize="small" />
        Contexto para la extracción
      </DialogTitle>

      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          ¿Hay algo especial en este documento que ayude a leerlo mejor?
          Estas instrucciones se combinan con el historial del proveedor.
        </Typography>

        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 3 }}>
          {OPCIONES_PRESET.map(op => (
            <Chip
              key={op.id}
              label={op.label}
              variant={seleccionados.includes(op.id) ? 'filled' : 'outlined'}
              color={seleccionados.includes(op.id) ? 'primary' : 'default'}
              onClick={() => toggleOpcion(op.id)}
              icon={seleccionados.includes(op.id) ? <CheckCircleOutlineIcon /> : undefined}
              size="small"
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <TextField
          label="Instrucción personalizada (opcional)"
          placeholder="Ej: La columna 'Cant.' en realidad es el precio, ignorar la primer fila de totales…"
          fullWidth
          multiline
          minRows={2}
          maxRows={5}
          value={textoLibre}
          onChange={e => setTextoLibre(e.target.value)}
          variant="outlined"
          size="small"
        />

        {(seleccionados.length > 0 || textoLibre.trim()) && (
          <Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Instrucción que se enviará:
            </Typography>
            <Typography variant="caption" display="block" sx={{ mt: 0.5, color: 'text.primary' }}>
              {[
                seleccionados.map(id => OPCIONES_PRESET.find(o => o.id === id)?.label).join('. '),
                textoLibre.trim()
              ].filter(Boolean).join(' ')}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2, pb: 2 }}>
        <Button onClick={handleSinInstrucciones} color="inherit" size="small">
          Continuar sin instrucciones
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} color="inherit" size="small">Cancelar</Button>
        <Button
          onClick={handleConfirmar}
          variant="contained"
          size="small"
          disabled={seleccionados.length === 0 && !textoLibre.trim()}
        >
          Aplicar y procesar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
