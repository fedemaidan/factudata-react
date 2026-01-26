import React, { useEffect } from 'react';
import { Box, Typography, TextField, Stack, InputAdornment } from '@mui/material';
import TagIcon from '@mui/icons-material/Tag';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { formatCurrency } from 'src/utils/formatters';

export default function StepIdentificacion({ 
  codigo, 
  setCodigo, 
  valorTotal, 
  setValorTotal, 
  tipoLista,
  proveedor,
  onNext 
}) {
  // Sugerir código automático si está vacío
  useEffect(() => {
    if (!codigo && proveedor) {
      const prefijo = proveedor.substring(0, 3).toUpperCase();
      const timestamp = Date.now().toString().slice(-4);
      setCodigo(`${prefijo}-${timestamp}`);
    }
  }, [proveedor, codigo, setCodigo]);

  // Formatear el valor para mostrar
  const valorFormateado = valorTotal ? formatCurrency(Number(valorTotal) || 0) : null;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Identificación del acopio
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        El código te ayuda a identificar este acopio después
      </Typography>

      <Stack spacing={3}>
        <TextField
          label="Código del acopio"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          fullWidth
          placeholder="Ej: LN-001, FACTURA-2024-001"
          helperText="Podés usar el número de factura, orden de compra, o cualquier referencia"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <TagIcon color="action" />
              </InputAdornment>
            ),
          }}
        />

        <Box>
          <TextField
            type="number"
            label={tipoLista === 'materiales' ? 'Valor total de la compra' : 'Valor total de la lista'}
            value={valorTotal}
            onChange={(e) => setValorTotal(e.target.value)}
            fullWidth
            placeholder="0"
            helperText={
              tipoLista === 'materiales' 
                ? 'El monto total que pagaste o vas a pagar'
                : 'El valor total disponible en esta lista de precios'
            }
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <AttachMoneyIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
          {valorFormateado && (
            <Typography 
              variant="h5" 
              color="primary.main" 
              sx={{ mt: 1, fontWeight: 'bold' }}
            >
              {valorFormateado}
            </Typography>
          )}
        </Box>

        {tipoLista === 'lista_precios' && (
          <Box sx={{ p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
            <Typography variant="body2" color="info.dark">
              💡 <strong>Tip:</strong> Para listas de precios, el valor total representa el saldo disponible 
              que tenés con este proveedor. Se irá descontando cuando registres desacopios.
            </Typography>
          </Box>
        )}
      </Stack>
    </Box>
  );
}
