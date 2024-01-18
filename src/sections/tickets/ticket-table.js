import PropTypes from 'prop-types';
import { useState } from 'react';
import {
  Box,
  Card,
  Checkbox,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Button,
} from '@mui/material';
import { Scrollbar } from 'src/components/scrollbar';
import { useRouter } from 'next/router';
import ticketService from 'src/services/ticketService';
import workTypeService from 'src/services/workTypeService'
export const TicketTable = (props) => {
  const {
    items = [],
    onDeselectAll,
    onDeselectOne,
    onSelectAll,
    onSelectOne,
    selected = [],
    soy_privado
  } = props;
  const router = useRouter();

  const selectedSome = selected.length > 0 && selected.length < items.length;
  const selectedAll = items.length > 0 && selected.length === items.length;
  const [updatedItems, setItems] = useState(items);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) {
      return '';
    }

    const date = new Date(timestamp.seconds * 1000); // Convert seconds to milliseconds
    return date.toLocaleString(); // Format the date as a string
  };

  const handleTicketClone = async (ticketId)  => {
    let ticketCreationResult = await ticketService.cloneTicket(ticketId)
    router.push('/ticketDetails?ticketId='+ticketCreationResult.id)
  } 


  return (
    <Card>
      <Scrollbar>
        <Box sx={{ minWidth: 800 }}>
          <Table>
            <TableHead>
              <TableRow>
                {soy_privado && <TableCell>UserId</TableCell>}
                <TableCell>Creación</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Campos</TableCell>
                <TableCell>Cantidad de Archivos</TableCell>
                <TableCell>Tiempo de entrega estimado</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((ticket) => {
                const isSelected = selected.includes(ticket.id);

                return (
                  <TableRow hover key={ticket.id} selected={isSelected}>
                    {soy_privado && 
                    (<TableCell>{ticket.userId}</TableCell>)
                    }
                    <TableCell>{formatTimestamp(ticket.created_at)}</TableCell>
                    <TableCell>{workTypeService.getNameWorkType(ticket.tipo,ticket.compatible_con)}</TableCell>
                    <TableCell>{ticket.estado}</TableCell>
                    <TableCell>{ticket.tags.join(', ')}</TableCell>
                    <TableCell>{ticket.archivos.length}</TableCell>
                    <TableCell>{ticket.eta ? ticket.eta: "No definido"}</TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        sx={{ m:1 }} 
                        onClick={() => router.push('/ticketDetails?ticketId='+ticket.id)}
                      >
                        Ver solicitud
                      </Button>
                      <Button
                        variant="outlined"
                        color="secondary"
                        sx={{ m:1 }} 
                        onClick={() => {handleTicketClone(ticket.id)}}
                        >
                        Clonar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      </Scrollbar>
    </Card>
  );
};

TicketTable.propTypes = {
  items: PropTypes.array,
  onDeselectAll: PropTypes.func,
  onDeselectOne: PropTypes.func,
  onSelectAll: PropTypes.func,
  onSelectOne: PropTypes.func,
  selected: PropTypes.array,
};
