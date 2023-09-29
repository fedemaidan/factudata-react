import React, { useState, useRef } from 'react';
import { Box, Typography, Paper, Tabs, Tab, Button, IconButton, SvgIcon } from '@mui/material';
import { grey } from '@mui/material/colors';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import TrashIcon from '@heroicons/react/24/solid/TrashIcon';
import CircularProgress from '@mui/material/CircularProgress';


const TicketInfo = ({ selectedTags, selectedFiles, fileType, status, onConfirmNewFiles, onRemoveFile, isLoading }) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [newFiles, setNewFiles] = useState([]);
  const fileInputRef = useRef(null);
  
  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    setNewFiles(prevFiles => [...prevFiles, ...files]);
    event.target.value = ''; 
  };

  const handleConfirmNewFiles = (newFiles) => {
    onConfirmNewFiles(newFiles)
    setNewFiles([])
  }

  const removePendingFile = (index) => {
    setNewFiles(prevFiles => prevFiles.filter((file, i) => i !== index));
  };

  const downloadAllFiles = async () => {
    const zip = new JSZip();

    selectedFiles.forEach(file => {
      zip.file(file.originalName, fetch(file.name).then(response => response.blob()));
    });

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'archivos.zip');
  };

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
          {/* <Button variant="outlined" onClick={downloadAllFiles} style={{ marginBottom: '16px' }}>
            Descargar todas
          </Button> */}
          {status === 'Borrador' && (
            <Box sx={{ mb: 2 }}>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileUpload}
                multiple 
              />
              {isLoading ? (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                  <CircularProgress />
                </Box>) : (
              <Button 
                variant="outlined"
                color="primary"
                onClick={() => fileInputRef.current.click()}
                sx={{ marginRight: '8px' }}
              >
                Agregar Archivos
              </Button>)}
              {newFiles.length > 0 && 
                <Button 
                  variant="contained"
                  color="secondary"
                  onClick={() => handleConfirmNewFiles(newFiles)}
                >
                  Confirmar nuevos archivos {newFiles.length}
                </Button>
              }
            </Box>
          )}
          {newFiles.length > 0 && newFiles.map((file, index) => (
            <Box 
              key={index} 
              sx={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <Typography variant="body2" sx={{ marginRight: '8px' }}>{file.name}</Typography>
              <IconButton size="small" onClick={() => removePendingFile(index)} color="error">
                  <SvgIcon fontSize="small"><TrashIcon /></SvgIcon>
              </IconButton>
            </Box>
          ))}
          {selectedFiles.map((file, index) => (
            <li key={index}>
              {file.originalName? file.originalName: file.name}
              <Button size="small" onClick={() => onRemoveFile(file)}><SvgIcon fontSize="small"><TrashIcon /></SvgIcon></Button>
            </li>
          ))}
        </Paper>
      )}
    </Box>
  );
};

export default TicketInfo;
