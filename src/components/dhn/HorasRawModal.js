import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { formatDateToDDMMYYYY } from 'src/utils/handleDates';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
} from '@mui/material';

function HorasRawModal(props) {
  const {
    open,
    onClose,
    data,
    title,
    fileName,
    downloadUrl,
  } = props;

  const rows = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const hasRows = rows.length > 0;

  const displayTitle = title || 'Fichadas raw del Excel';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{displayTitle}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 2 }}>
          {fileName ? (
            <Typography variant="caption" color="text.secondary">
              Archivo: {fileName}
            </Typography>
          ) : null}
        </Box>
        {hasRows ? (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small" aria-label="Fichadas raw">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Hora</TableCell>
                  <TableCell>E/S</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, index) => {
                  const tipo = (row?.entradaSalida || '').toString();
                  const isEntrada = tipo === 'E';
                  return (
                    <TableRow key={`${row?.fecha || 'row'}-${index}`}>
                      <TableCell>{formatDateToDDMMYYYY(row?.fecha)}</TableCell>
                      <TableCell>{row?.hora || '-'}</TableCell>
                      <TableCell>
                        {tipo ? (
                          <Chip
                            size="small"
                            label={tipo}
                            color={isEntrada ? 'success' : 'error'}
                            variant="outlined"
                          />
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No hay fichadas raw para este día.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Box sx={{ flex: 1 }} />
        {downloadUrl ? (
          <Button
            component="a"
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="outlined"
          >
            Descargar archivo
          </Button>
        ) : null}
        <Button onClick={onClose} variant="contained">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

HorasRawModal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  data: PropTypes.arrayOf(PropTypes.object),
  title: PropTypes.string,
  fileName: PropTypes.string,
  downloadUrl: PropTypes.string,
};

HorasRawModal.defaultProps = {
  open: false,
  onClose: undefined,
  data: [],
  title: '',
  fileName: '',
  downloadUrl: '',
};

export default HorasRawModal;
