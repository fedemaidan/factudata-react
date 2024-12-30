import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Chip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const NotasTable = ({ filteredNotas, onEdit, onDelete, onChangeEstado }) => {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Código</TableCell>
          <TableCell>Owner</TableCell>
          <TableCell>Creador</TableCell>
          <TableCell>Título</TableCell>
          <TableCell>Descripción</TableCell>
          <TableCell>Estado</TableCell>
          <TableCell>Fecha Creación</TableCell>
          <TableCell>Acciones</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {filteredNotas.map((nota) => (
          <TableRow key={nota.id}>
            <TableCell>{nota.codigo}</TableCell>
            <TableCell>{nota.owner_name}</TableCell>
            <TableCell>{nota.creador_name}</TableCell>
            <TableCell>{nota.titulo}</TableCell>
            <TableCell>{nota.descripcion}</TableCell>
            <TableCell>
              <Chip
                label={nota.estado}
                color={
                  nota.estado === 'Pendiente'
                    ? 'warning'
                    : nota.estado === 'Haciendo'
                    ? 'primary'
                    : 'success'
                }
              />
            </TableCell>
            <TableCell>{nota.fechaCreacion}</TableCell>
            <TableCell>
              {nota.estado !== 'Completa' && (
                <Button
                  variant="outlined"
                  color={nota.estado === 'Pendiente' ? 'primary' : 'success'}
                  onClick={() => onChangeEstado(nota)}
                >
                  {nota.estado === 'Pendiente' ? 'Marcar Haciendo' : 'Marcar Completa'}
                </Button>
              )}
              <Button
                startIcon={<EditIcon />}
                color="secondary"
                onClick={() => onEdit(nota)}
              >
                Editar
              </Button>
              <Button
                startIcon={<DeleteIcon />}
                color="error"
                onClick={() => onDelete(nota)}
              >
                Eliminar
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default NotasTable;
