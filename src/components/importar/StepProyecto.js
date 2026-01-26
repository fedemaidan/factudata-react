import React from 'react';
import { Box, Typography, Paper, Stack, Chip } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import PublicIcon from '@mui/icons-material/Public';

export default function StepProyecto({ proyecto, setProyecto, proyectosOptions = [], onNext }) {
  const handleSelect = (value) => {
    setProyecto(value);
    if (onNext) onNext();
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        ¿Para qué proyecto es?
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Si estos materiales son para una obra específica, elegila acá
      </Typography>

      <Stack spacing={1.5}>
        {/* Opción "Todos los proyectos" */}
        <Paper
          onClick={() => handleSelect('')}
          sx={{
            p: 2,
            cursor: 'pointer',
            border: proyecto === '' ? '2px solid' : '1px solid',
            borderColor: proyecto === '' ? 'primary.main' : 'divider',
            bgcolor: proyecto === '' ? 'primary.lighter' : 'background.paper',
            transition: 'all 0.2s',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: 'action.hover'
            }
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <PublicIcon color={proyecto === '' ? 'primary' : 'action'} />
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">
                Todos los proyectos
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Disponible para cualquier obra
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {/* Lista de proyectos */}
        {proyectosOptions.map((p) => (
          <Paper
            key={p.id}
            onClick={() => handleSelect(p.id)}
            sx={{
              p: 2,
              cursor: 'pointer',
              border: proyecto === p.id ? '2px solid' : '1px solid',
              borderColor: proyecto === p.id ? 'primary.main' : 'divider',
              bgcolor: proyecto === p.id ? 'primary.lighter' : 'background.paper',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.hover'
              }
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <FolderIcon color={proyecto === p.id ? 'primary' : 'action'} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {p.nombre}
                </Typography>
                {p.direccion && (
                  <Typography variant="caption" color="text.secondary">
                    {p.direccion}
                  </Typography>
                )}
              </Box>
              {p.estado && (
                <Chip 
                  label={p.estado} 
                  size="small" 
                  color={p.estado === 'activo' ? 'success' : 'default'}
                  variant="outlined"
                />
              )}
            </Stack>
          </Paper>
        ))}

        {proyectosOptions.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            No hay proyectos creados. El acopio quedará disponible para todos.
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
