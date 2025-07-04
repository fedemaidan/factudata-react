import React, { useState } from 'react';
import { Box, Typography, IconButton, Chip, Collapse, Tooltip } from '@mui/material';
import { ExpandMore, ExpandLess, Edit, ContentCopy } from '@mui/icons-material';
import { formatCurrency } from 'src/utils/formatters';

export default function TreeNode({ name, node, level = 0, onEditUnidad, onClonarGrupo }) {
  const [open, setOpen] = useState(true);
  const total = node.__items.reduce((acc, sp) => acc + (parseFloat(sp.valor) || 0), 0);
  const vendidos = node.__items
    .filter(sp => sp.estado?.toLowerCase() === 'vendido')
    .reduce((acc, sp) => acc + (parseFloat(sp.valor) || 0), 0);

  return (
    <Box ml={level * 2} mb={1}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
          <Typography variant="subtitle2">
            {name} – Estimado: {formatCurrency(total)} | Vendido: {formatCurrency(vendidos)}
          </Typography>
        </Box>
        <Tooltip title="Clonar grupo">
          <IconButton onClick={() => onClonarGrupo(name, node.__items)} size="small">
            <ContentCopy fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Collapse in={open}>
        {node.__items.map((sp, idx) => (
          <Box key={idx} ml={4} display="flex" alignItems="center" gap={1} my={0.5}>
            <Typography>{sp.nombre} - {formatCurrency(sp.valor)}</Typography>
            <Chip
              label={sp.estado}
              color={
                sp.estado?.toLowerCase() === 'vendido' ? 'success' :
                sp.estado?.toLowerCase() === 'disponible' ? 'info' :
                sp.estado?.toLowerCase() === 'alquilado' ? 'warning' : 'default'
              }
              size="small"
            />
            <IconButton onClick={() => onEditUnidad(sp)} size="small">
              <Edit fontSize="small" />
            </IconButton>
          </Box>
        ))}
        {Object.entries(node.__children).map(([childName, childNode]) => (
          <TreeNode
            key={childName}
            name={childName}
            node={childNode}
            level={level + 1}
            onEditUnidad={onEditUnidad}
            onClonarGrupo={onClonarGrupo}
          />
        ))}
      </Collapse>
    </Box>
  );
}
