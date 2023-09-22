import PropTypes from 'prop-types';
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { Scrollbar } from 'src/components/scrollbar';

export const CreditTable = (props) => {
  const { items = [] } = props;

  const formatTimestamp = (timestamp) => {
    if (!timestamp) {
      return '';
    }

    const date = new Date(timestamp.seconds * 1000); // Convert seconds to milliseconds
    return date.toLocaleString(); // Format the date as a string
  };

  return (
    <Card>
      <Scrollbar>
        <Box sx={{ minWidth: 800 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Fecha de Compra</TableCell>
                <TableCell>Cantidad</TableCell>
                <TableCell>ID de Transacción</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((credit) => (
                <TableRow key={credit.id}>
                  <TableCell>{formatTimestamp(credit.date)}</TableCell>
                  <TableCell>{credit.amount}</TableCell>
                  <TableCell>{credit.transactionId}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Scrollbar>
    </Card>
  );
};

CreditTable.propTypes = {
  items: PropTypes.array.isRequired,
};
