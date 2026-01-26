import React from 'react';
import { Box, Typography, Paper, Stack } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { METODO_CARGA } from 'src/constant/importarSteps';

export default function StepMetodoCarga({ metodoCarga, onSelect, tipoLista }) {
  const opciones = [
    {
      value: METODO_CARGA.ARCHIVO,
      icon: <UploadFileIcon sx={{ fontSize: 40 }} />,
      titulo: 'Subir archivo',
      descripcion: 'Excel, PDF o imagen de lista de precios',
      disponible: true
    },
    {
      value: METODO_CARGA.MANUAL,
      icon: <EditIcon sx={{ fontSize: 40 }} />,
      titulo: 'Cargar manualmente',
      descripcion: 'Escribir materiales uno por uno',
      disponible: true
    },
    {
      value: METODO_CARGA.COPIAR_ACOPIO,
      icon: <ContentCopyIcon sx={{ fontSize: 40 }} />,
      titulo: 'Copiar de otro acopio',
      descripcion: 'Duplicar lista de un acopio existente',
      disponible: true
    },
    {
      value: METODO_CARGA.DESDE_FACTURA,
      icon: <ReceiptIcon sx={{ fontSize: 40 }} />,
      titulo: 'Desde factura de caja',
      descripcion: 'Importar desde una compra ya registrada en caja',
      disponible: true // Disponible para ambos tipos
    }
  ];

  const handleSelect = (value) => {
    if (onSelect) onSelect(value);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        ¿Cómo querés cargar los materiales?
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Elegí el método que te resulte más cómodo
      </Typography>

      <Stack spacing={2}>
        {opciones.filter(op => op.disponible).map((op) => (
          <Paper
            key={op.value}
            onClick={() => handleSelect(op.value)}
            sx={{
              p: 2.5,
              cursor: 'pointer',
              border: metodoCarga === op.value ? '2px solid' : '1px solid',
              borderColor: metodoCarga === op.value ? 'primary.main' : 'divider',
              bgcolor: metodoCarga === op.value ? 'primary.lighter' : 'background.paper',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.hover'
              }
            }}
          >
            <Stack direction="row" spacing={2.5} alignItems="center">
              <Box sx={{ 
                color: metodoCarga === op.value ? 'primary.main' : 'text.secondary',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 56,
                height: 56,
                borderRadius: 2,
                bgcolor: metodoCarga === op.value ? 'primary.light' : 'action.hover'
              }}>
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
