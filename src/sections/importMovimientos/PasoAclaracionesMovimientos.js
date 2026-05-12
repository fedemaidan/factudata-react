import React, { useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  Chip,
  Stack,
  Divider,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import InfoIcon from '@mui/icons-material/Info';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';

/**
 * Paso para agregar aclaraciones/instrucciones que se inyectarán en el prompt de análisis
 * Estas instrucciones tienen prioridad sobre las reglas del sistema
 */
const PasoAclaracionesMovimientos = forwardRef(({
  wizardData,
  updateWizardData,
  perfiles = [],
  onNext,
  onBack,
  hideNavigation = false,
}, ref) => {
  const [aclaraciones, setAclaraciones] = useState(wizardData.aclaracionesUsuario || '');
  const [creadorPhone, setCreadorPhone] = useState(wizardData.creadorDefaultPhone || '');

  const handleContinuar = useCallback(({ skipOnNext = false } = {}) => {
    updateWizardData({
      aclaracionesUsuario: aclaraciones.trim(),
      creadorDefaultPhone: creadorPhone || '',
    });
    if (!skipOnNext) {
      onNext();
    }
  }, [aclaraciones, creadorPhone, updateWizardData, onNext]);

  const handleCreadorChange = (e) => {
    const phone = e.target.value;
    setCreadorPhone(phone);
    updateWizardData({ creadorDefaultPhone: phone });
  };

  useImperativeHandle(ref, () => ({
    submitStep: () => handleContinuar({ skipOnNext: true }),
  }), [handleContinuar]);

  const ejemplosAclaraciones = [
    'La última columna ignorala, es el mismo total pero con el 20% de descuento.',
    'Si el proveedor dice "Varios" asignarlo a la categoría "Gastos Generales".',
    'Los montos negativos son ingresos, no egresos.',
    'El campo "Observaciones" contiene el nombre del proyecto real.',
    'Ignorar las filas donde el monto sea 0 o esté vacío.',
    'Si la categoría dice "Personal" usar "Mano de Obra".',
  ];

  const handleAgregarEjemplo = (ejemplo) => {
    const nuevoTexto = aclaraciones.trim() 
      ? `${aclaraciones}\n${ejemplo}` 
      : ejemplo;
    setAclaraciones(nuevoTexto);
  };

  return (
    <Box>
      {/* Alert informativo */}
      <Alert
        severity="info"
        icon={<WarningAmberIcon />}
        sx={{ mb: 3 }}
      >
        <Typography variant="body2">
          <strong>¿Para qué sirve esto?</strong> Si sabes que tu archivo tiene particularidades
          (columnas que confunden, categorías con nombres diferentes, etc.), aquí puedes
          indicárselo al sistema para que interprete correctamente los datos.
        </Typography>
      </Alert>

      {perfiles.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <PersonOutlineIcon color="primary" />
              <Typography variant="h6">Crear movimientos en nombre de…</Typography>
            </Box>
            <FormControl fullWidth size="small">
              <InputLabel>Creador del lote</InputLabel>
              <Select
                label="Creador del lote"
                value={creadorPhone}
                onChange={handleCreadorChange}
              >
                {perfiles.map((p) => (
                  <MenuItem key={p.id || p.phone} value={p.phone}>
                    {`${p.firstName || ''} ${p.lastName || ''}`.trim() || p.phone}
                    {p.phone ? ` (${p.phone})` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Todos los movimientos se atribuyen a este usuario por defecto. Podés cambiarlo
              fila por fila en el paso siguiente.
            </Typography>
          </CardContent>
        </Card>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <LightbulbIcon color="primary" />
            <Typography variant="h6">
              Instrucciones Personalizadas
            </Typography>
          </Box>

          <TextField
            fullWidth
            multiline
            rows={6}
            variant="outlined"
            placeholder="Escribe aquí las aclaraciones que necesites...

Ejemplo:
- La última columna es el total con descuento, ignorarla y usar la anterior.
- Si el proveedor aparece vacío, usar 'Sin Proveedor'.
- Los gastos de 'Empleados' deben ir a categoría 'Mano de Obra'."
            value={aclaraciones}
            onChange={(e) => setAclaraciones(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#fafafa'
              }
            }}
          />

          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {aclaraciones.length} caracteres
          </Typography>
        </CardContent>
      </Card>

      {/* Ejemplos de aclaraciones */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <InfoIcon color="action" />
            <Typography variant="subtitle1" color="text.secondary">
              Ejemplos de aclaraciones (click para agregar)
            </Typography>
          </Box>

          <Stack direction="row" flexWrap="wrap" gap={1}>
            {ejemplosAclaraciones.map((ejemplo, index) => (
              <Chip
                key={index}
                label={ejemplo.length > 50 ? ejemplo.substring(0, 50) + '...' : ejemplo}
                variant="outlined"
                size="small"
                onClick={() => handleAgregarEjemplo(ejemplo)}
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { 
                    backgroundColor: 'primary.light',
                    color: 'primary.contrastText'
                  }
                }}
              />
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* Preview de lo que se enviará */}
      {aclaraciones.trim() && (
        <Paper 
          elevation={0} 
          sx={{ 
            p: 2, 
            mb: 3, 
            backgroundColor: '#fff3e0',
            border: '1px solid #ffb74d'
          }}
        >
          <Typography variant="subtitle2" color="warning.dark" gutterBottom>
            📋 Se enviará al sistema:
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              fontSize: '0.85rem'
            }}
          >
            {aclaraciones}
          </Typography>
        </Paper>
      )}

      <Divider sx={{ my: 3 }} />

      {!hideNavigation && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button variant="outlined" onClick={onBack} size="large">
            Volver
          </Button>
          <Stack direction="row" spacing={2}>
            <Button
              variant="text"
              onClick={() => {
                setAclaraciones('');
                updateWizardData({ aclaracionesUsuario: '' });
                onNext();
              }}
              size="large"
            >
              Omitir este paso
            </Button>
            <Button variant="contained" color="primary" onClick={() => handleContinuar({ skipOnNext: false })} size="large">
              {aclaraciones.trim() ? 'Continuar con aclaraciones' : 'Continuar'}
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
});

PasoAclaracionesMovimientos.displayName = 'PasoAclaracionesMovimientos';

export default PasoAclaracionesMovimientos;
