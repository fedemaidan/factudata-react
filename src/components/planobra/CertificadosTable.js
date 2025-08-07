import React, { useState } from 'react';
import {
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  LinearProgress,
  TextField,
  IconButton,
  Box
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

const CertificadosTable = ({ certificados, onActualizarCertificado }) => {
  const [editandoIndex, setEditandoIndex] = useState(null);
  const [valorTemp, setValorTemp] = useState(0);

  const comenzarEdicion = (index, valorActual) => {
    setEditandoIndex(index);
    setValorTemp(valorActual ?? 0);
  };

  const cancelarEdicion = () => {
    setEditandoIndex(null);
    setValorTemp(0);
  };

  const confirmarEdicion = () => {
    const nuevoValor = Math.min(Math.max(Number(valorTemp), 0), 100);
    onActualizarCertificado(editandoIndex, nuevoValor);
    cancelarEdicion();
  };

  return (
    <>
      <Typography variant="subtitle2" sx={{ mt: 2 }}>
        📄 Certificados
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Descripción</TableCell>
            <TableCell>Contratista</TableCell>
            <TableCell>Inicio</TableCell>
            <TableCell>Fin</TableCell>
            <TableCell>% Certificado</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {certificados.map((c, i) => (
            <TableRow key={i}>
              <TableCell>{c.descripcion}</TableCell>
              <TableCell>{c.contratista}</TableCell>
              <TableCell>{c.fecha_inicio}</TableCell>
              <TableCell>{c.fecha_fin}</TableCell>
              <TableCell>
                {editandoIndex === i ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextField
                      size="small"
                      type="number"
                      value={valorTemp}
                      onChange={(e) => setValorTemp(e.target.value)}
                      inputProps={{ min: 0, max: 100 }}
                      sx={{ width: 70 }}
                    />
                    <IconButton size="small" onClick={confirmarEdicion}>
                      <CheckIcon />
                    </IconButton>
                    <IconButton size="small" onClick={cancelarEdicion}>
                      <CloseIcon />
                    </IconButton>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <Typography>{c.porcentaje_certificado ?? 0}%</Typography>
                    <IconButton size="small" onClick={() => comenzarEdicion(i, c.porcentaje_certificado)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
                <LinearProgress
                  variant="determinate"
                  value={c.porcentaje_certificado ?? 0}
                  sx={{ mt: 1 }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
};

export default CertificadosTable;
