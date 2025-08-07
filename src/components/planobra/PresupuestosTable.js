import React from 'react';
import { Typography, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';

const PresupuestosTable = ({ presupuestos }) => {
  return (
    <>
      <Typography variant="subtitle2" sx={{ mt: 2 }}>
        💰 Presupuestos
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Categoría</TableCell>
            <TableCell>Monto</TableCell>
            <TableCell>¿Completado?</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {presupuestos.map((p, i) => (
            <TableRow key={i}>
              <TableCell>{p.categoria}</TableCell>
              <TableCell>${p.monto}</TableCell>
              <TableCell>{p.completado ? '✅' : '❌'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
};

export default PresupuestosTable;
