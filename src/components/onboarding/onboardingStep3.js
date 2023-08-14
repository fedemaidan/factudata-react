import React from 'react';
import { Box, Button, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

const OnboardingStep3 = ({ estimatedPrice, selectedTags, selectedFiles, onPreviousStep, onPay }) => {
  const blurredStyle = {
    color: 'transparent',
    textShadow: '0 0 5px rgba(0, 0, 0, 0.5)',
  };

  // Calculate the total number of rows based on the selected files
  const totalRows = selectedFiles.length;

  // Generate the table rows for the preview
  const tableRows = selectedFiles.map((file, index) => (
    <TableRow key={index}>
      <TableCell>{file.name}</TableCell>
      <TableCell>{totalRows}</TableCell>
      <TableCell>{selectedTags.join(', ')}</TableCell>
    </TableRow>
  ));

  return (
    <Box>
      <Typography variant="h5">Paso 3: Resumen del pedido</Typography>
      <Typography variant="body1">Cantidad de archivos: {totalRows}</Typography>
      <Typography variant="body1">Tags seleccionados: {selectedTags.join(', ')}</Typography>
      <Typography variant="body1">Presupuesto estimado: {estimatedPrice}</Typography>

      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Archivo</TableCell>
              {selectedTags.map((tag) => (
                <TableCell key={tag}>{tag}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {selectedFiles.map((file, fileIndex) => (
              <TableRow key={fileIndex}>
                <TableCell>{file.name}</TableCell>
                {selectedTags.map((tag, tagIndex) => (
                  <TableCell key={tagIndex} style={blurredStyle}>
                    123 {/* Cambia '123' por el valor real */}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Button onClick={onPreviousStep}>Volver</Button>
      <Button onClick={onPay}>Confirmar Pedido</Button>
    </Box>
  );
};

export default OnboardingStep3;

