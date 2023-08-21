import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

const TicketInfo = ({ estimatedPrice, selectedTags, selectedFiles, fileType, status }) => {
  const blurredStyle = {
    color: 'transparent',
    textShadow: '0 0 5px rgba(0, 0, 0, 0.5)',
  };

  // Calculate the total number of rows based on the selected files
  const totalRows = selectedFiles.length;

  console.log(selectedFiles)

  return (
    <Box>
      <Typography variant="h5">{fileType}</Typography>
      <Typography variant="body1">Cantidad de archivos: {totalRows}</Typography>
      <Typography variant="body1">Tags seleccionados: {selectedTags.join(', ')}</Typography>
      <Typography variant="body1">Presupuesto estimado: {estimatedPrice}</Typography>
      <Typography variant="body1">Estado: {status}</Typography>
      

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
                <TableCell>
                  <img src={file.name} alt={file.name} style={{ maxWidth: '100px' }} />
                </TableCell>
                {selectedTags.map((tag, tagIndex) => (
                  <TableCell key={tagIndex} style={blurredStyle}>
                    123 
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default TicketInfo;

