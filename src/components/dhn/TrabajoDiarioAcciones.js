import React from 'react';
import { Stack, Tooltip, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';

export const AccionesTrabajoDiario = ({ item, onEdit, onOpenLogs }) => (
  <Stack direction="row" spacing={0.5} alignItems="center">
    {typeof onEdit === 'function' && (
      <Tooltip title="Editar">
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(item);
          }}
          color="primary"
          aria-label="Editar trabajo diario"
        >
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    )}

    <Tooltip title="Ver historial">
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          onOpenLogs?.(item);
        }}
        color="inherit"
        aria-label="Ver historial de cambios"
      >
        <HistoryIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  </Stack>
);

export default AccionesTrabajoDiario;

