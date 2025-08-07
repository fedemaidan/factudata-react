import React from 'react';
import { Typography, Table, TableHead, TableRow, TableCell, TableBody, LinearProgress, Box } from '@mui/material';

const MaterialesTable = ({ materiales }) => {
  return (
    <>
      <Typography variant="subtitle2" sx={{ mt: 2 }}>
        📦 Materiales
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Nombre</TableCell>
            <TableCell>Utilizado / Total</TableCell>
            <TableCell>Progreso</TableCell>
            <TableCell>Precio unitario</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {materiales.map((m, i) => {
            const utilizado = Number(m.cantidad_utilizada ?? 0);
            const total = Number(m.cantidad ?? 0);
            const porcentaje = total > 0 ? Math.min(100, Math.round((utilizado / total) * 100)) : 0;

            return (
              <TableRow key={i}>
                <TableCell>{m.nombre || m.descripcion}</TableCell>
                <TableCell>{utilizado} / {total}</TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <LinearProgress
                      variant="determinate"
                      value={porcentaje}
                      sx={{ width: '100px', height: 8, borderRadius: 5 }}
                    />
                    <Typography variant="body2">{porcentaje}%</Typography>
                  </Box>
                </TableCell>
                <TableCell>{m.precio_unitario || '-'}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
};

export default MaterialesTable;
