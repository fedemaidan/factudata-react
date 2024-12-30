import React from 'react';
import { Table, TableHead, TableBody, TableCell, TableRow, Card, CardContent, Typography, Button, Stack } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const GenericTable = ({ data, columns, onEdit, onDelete, isMobile }) => {
  if (isMobile) {
    return (
      <Stack spacing={2}>
        {data.map((row, index) => (
          <Card key={index}>
            <CardContent>
              {columns.map((col) => (
                <Typography key={col.key} variant="body2">
                  <strong>{col.label}: </strong>
                  {col.format ? col.format(row[col.key]) : row[col.key]}
                </Typography>
              ))}
              <Stack direction="row" spacing={1} mt={2}>
                <Button color="primary" startIcon={<EditIcon />} onClick={() => onEdit(row)}>
                  Editar
                </Button>
                <Button color="error" startIcon={<DeleteIcon />} onClick={() => onDelete(row)}>
                  Eliminar
                </Button>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    );
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          {columns.map((col) => (
            <TableCell key={col.key}>{col.label}</TableCell>
          ))}
          <TableCell>Acciones</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {data.map((row, index) => (
          <TableRow key={index}>
            {columns.map((col) => (
              <TableCell key={col.key}>
                {col.format ? col.format(row[col.key]) : row[col.key]}
              </TableCell>
            ))}
            <TableCell>
              <Button color="primary" startIcon={<EditIcon />} onClick={() => onEdit(row)}>
                Editar
              </Button>
              <Button color="error" startIcon={<DeleteIcon />} onClick={() => onDelete(row)}>
                Eliminar
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default GenericTable;
