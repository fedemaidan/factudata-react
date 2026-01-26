import React from 'react';
import { Box, Typography, Paper, Stack } from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ConstructionIcon from '@mui/icons-material/Construction';

export default function StepTipoAcopio({ tipoLista, setTipoLista, onNext }) {
  const opciones = [
    {
      value: 'lista_precios',
      icon: <ReceiptLongIcon sx={{ fontSize: 48 }} />,
      titulo: 'Lista de precios',
      descripcion: 'Tengo una lista de un proveedor con productos y sus precios unitarios congelados'
    },
    {
      value: 'materiales',
      icon: <ConstructionIcon sx={{ fontSize: 48 }} />,
      titulo: 'Materiales comprados',
      descripcion: 'Compré materiales y quiero registrar cantidades y montos'
    }
  ];

  const handleSelect = (value) => {
    setTipoLista(value);
    if (onNext) onNext();
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        ¿Qué tipo de acopio querés crear?
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Elegí según el tipo de información que tenés disponible
      </Typography>

      <Stack spacing={2}>
        {opciones.map((op) => (
          <Paper
            key={op.value}
            onClick={() => handleSelect(op.value)}
            sx={{
              p: 3,
              cursor: 'pointer',
              border: tipoLista === op.value ? '2px solid' : '1px solid',
              borderColor: tipoLista === op.value ? 'primary.main' : 'divider',
              bgcolor: tipoLista === op.value ? 'primary.lighter' : 'background.paper',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.hover'
              }
            }}
          >
            <Stack direction="row" spacing={3} alignItems="center">
              <Box sx={{ color: tipoLista === op.value ? 'primary.main' : 'text.secondary' }}>
                {op.icon}
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  {op.titulo}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {op.descripcion}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}
