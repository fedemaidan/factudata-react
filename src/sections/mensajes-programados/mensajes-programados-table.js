import PropTypes from 'prop-types';
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Tooltip
} from '@mui/material';
import { Scrollbar } from 'src/components/scrollbar';
import PencilIcon from '@heroicons/react/24/solid/PencilIcon';
import TrashIcon from '@heroicons/react/24/solid/TrashIcon';
import { SvgIcon } from '@mui/material';

export const MensajesProgramadosTable = (props) => {
  const {
    items = [],
    onEdit,
    onDelete
  } = props;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  };

  return (
    <Card>
      <Scrollbar>
        <Box sx={{ minWidth: 800 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Creado El</TableCell>
                <TableCell>Creado Por</TableCell>
                <TableCell>De</TableCell>
                <TableCell>Para</TableCell>
                <TableCell>Mensaje</TableCell>
                <TableCell>Programado Para</TableCell>
                <TableCell>Enviado El</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((mensaje) => (
                <TableRow hover key={mensaje._id}>
                  <TableCell>{formatDate(mensaje.createdAt)}</TableCell>
                  <TableCell>{mensaje.createdFor}</TableCell>
                  <TableCell>{mensaje.from}</TableCell>
                  <TableCell>{mensaje.to}</TableCell>
                  <TableCell sx={{ maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {mensaje.mensaje}
                  </TableCell>
                  <TableCell>{formatDate(mensaje.fechaEnvioProgramada)}</TableCell>
                  <TableCell>{formatDate(mensaje.fechaEnvioReal)}</TableCell>
                  <TableCell>{mensaje.estado}</TableCell>
                  <TableCell>
                    <Tooltip title="Editar">
                      <IconButton onClick={() => onEdit(mensaje)}>
                        <SvgIcon fontSize="small">
                          <PencilIcon />
                        </SvgIcon>
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton onClick={() => onDelete(mensaje._id)} color="error">
                        <SvgIcon fontSize="small">
                          <TrashIcon />
                        </SvgIcon>
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    No hay mensajes programados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Scrollbar>
    </Card>
  );
};

MensajesProgramadosTable.propTypes = {
  items: PropTypes.array,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func
};
