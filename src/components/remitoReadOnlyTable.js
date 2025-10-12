import React from 'react';
import {
  Table, TableHead, TableRow, TableCell, TableBody,
  Chip, IconButton, Tooltip, Box
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

function moneda(v) {
  const n = Number(v) || 0;
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);
}

export default function RemitoReadOnlyTable({ items, onEditItem, onDeleteItem }) {
  const showActions = typeof onEditItem === 'function' || typeof onDeleteItem === 'function';

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Código</TableCell>
            <TableCell>Descripción</TableCell>
            <TableCell align="right">Cantidad</TableCell>
            <TableCell align="right">V. Unitario</TableCell>
            <TableCell align="right">Total</TableCell>
            {showActions && <TableCell align="center">Acciones</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {(items || []).map((it, idx) => {
            const total = (Number(it.cantidad) || 0) * (Number(it.valorUnitario) || 0);
            return (
              <TableRow key={it.id || idx}>
                <TableCell>{it.codigo || <Chip size="small" label="sin código" />}</TableCell>
                <TableCell>{it.descripcion || <Chip size="small" label="sin descripción" />}</TableCell>
                <TableCell align="right">{it.cantidad ?? 0}</TableCell>
                <TableCell align="right">{moneda(it.valorUnitario)}</TableCell>
                <TableCell align="right">{moneda(total)}</TableCell>
                {showActions && (
                  <TableCell align="center" sx={{ width: 96 }}>
                    {onEditItem && (
                      <Tooltip title="Editar">
                        <IconButton onClick={() => onEditItem(idx)} size="small">
                          <EditIcon fontSize="inherit" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {onDeleteItem && (
                      <Tooltip title="Eliminar">
                        <IconButton onClick={() => onDeleteItem(idx)} size="small" color="error">
                          <DeleteOutlineIcon fontSize="inherit" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
}
