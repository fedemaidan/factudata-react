import React, { useState } from 'react';
import { Box, Typography, Paper, Tabs, Tab } from '@mui/material';
import { grey } from '@mui/material/colors';

const TicketInfo = ({ estimatedPrice, selectedTags, selectedFiles, fileType, status }) => {
  const [currentTab, setCurrentTab] = useState(0);

  const chunkedFiles = [];
  for (let i = 0; i < selectedFiles.length; i += 5) {
    chunkedFiles.push(selectedFiles.slice(i, i + 5));
  }

  const handleChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const labelArchivos = `Archivos (${selectedFiles.length})`;

  return (
    <Box sx={{ backgroundColor: grey[100], padding: '16px' }}>
      <Paper elevation={2} sx={{ backgroundColor: '#fff', borderRadius: '12px', marginBottom: '16px' }}>
        <Tabs 
          value={currentTab} 
          onChange={handleChange} 
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab label="Información general" />
          <Tab label={labelArchivos} />
        </Tabs>
      </Paper>

      {currentTab === 0 && (
        <Paper elevation={2} sx={{ padding: '24px', backgroundColor: '#fff', borderRadius: '12px' }}>
        <Typography variant="body1" gutterBottom>
          <strong>Tipo de trabajo:</strong> <span style={{ fontWeight: 300 }}>{fileType}</span>
        </Typography>
        <Typography variant="body1" gutterBottom>
          <strong>Datos de cada factura:</strong> <span style={{ fontWeight: 300 }}>{selectedTags.join(', ')}</span>
        </Typography>
        <Typography variant="body1" gutterBottom>
          <strong>Créditos necesarios:</strong> <span style={{ fontWeight: 300 }}>{selectedFiles.length} créditos</span>
        </Typography>
        <Typography variant="body1">
          <strong>Estado:</strong> <span style={{ fontWeight: 300 }}>{status}</span>
        </Typography>
      </Paper>
      
      )}

      {currentTab === 1 && (
        <Paper elevation={2} sx={{ padding: '24px', backgroundColor: '#fff', borderRadius: '12px' }}>
          {chunkedFiles.map((fileChunk, chunkIndex) => (
            <Box 
              key={chunkIndex} 
              display="flex" 
              justifyContent="flex-start" 
              alignItems="center"
              mb={2}
            >
              {fileChunk.map((file, fileIndex) => (
                <Box key={fileIndex} mx={1}>
                  <img src={file.name} alt={file.name} style={{ maxWidth: '100px', borderRadius: '8px' }} />
                </Box>
              ))}
            </Box>
          ))}
        </Paper>
      )}
    </Box>
  );
};

export default TicketInfo;
