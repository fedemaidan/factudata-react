import PropTypes from 'prop-types';
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Typography
} from '@mui/material';
import { Scrollbar } from 'src/components/scrollbar';
import PencilIcon from '@heroicons/react/24/solid/PencilIcon';
import TrashIcon from '@heroicons/react/24/solid/TrashIcon';
import { SvgIcon } from '@mui/material';

const getEstadoColor = (estado) => {
  switch (estado?.toLowerCase()) {
    case 'pendiente':
      return 'warning';
    case 'enviado':
      return 'success';
    case 'cancelado':
      return 'error';
    case 'error':
      return 'error';
    default:
      return 'primary';
  }
};

export const MensajesProgramadosTable = (props) => {
  const {
    items = [],
    onEdit,
    onDelete,
    count = 0,
    page = 0,
    rowsPerPage = 10,
    onPageChange,
    onRowsPerPageChange
  } = props;

  const formatDate = (dateString) => {
    if (!dateString) return '-';
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
                  <TableCell sx={{ maxWidth: 300 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {mensaje.mensaje}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatDate(mensaje.fechaEnvioProgramada)}</TableCell>
                  <TableCell>{formatDate(mensaje.fechaEnvioReal)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={mensaje.estado} 
                      color={getEstadoColor(mensaje.estado)} 
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Editar">
                      <IconButton onClick={() => onEdit(mensaje)} size="small">
                        <SvgIcon fontSize="small">
                          <PencilIcon />
                        </SvgIcon>
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton onClick={() => onDelete(mensaje._id)} color="error" size="small">
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
                    <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                      No hay mensajes programados
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Scrollbar>
      <TablePagination
        component="div"
        count={count}
        page={page}
        onPageChange={onPageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={onRowsPerPageChange}
        rowsPerPageOptions={[5, 10, 25, 50]}
        labelRowsPerPage="Filas por página:"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
      />
    </Card>
  );
};

MensajesProgramadosTable.propTypes = {
  items: PropTypes.array,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  count: PropTypes.number,
  page: PropTypes.number,
  rowsPerPage: PropTypes.number,
  onPageChange: PropTypes.func,
  onRowsPerPageChange: PropTypes.func
};
