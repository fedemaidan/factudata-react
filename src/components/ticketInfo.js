import React, { useState, useRef } from 'react';
import { Box, Typography, Paper, Tabs, Tab, Button, IconButton, SvgIcon } from '@mui/material';
import { grey } from '@mui/material/colors';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import TrashIcon from '@heroicons/react/24/solid/TrashIcon';
import CircularProgress from '@mui/material/CircularProgress';
import { useAuthContext } from 'src/contexts/auth-context';


const TicketInfo = ({ selectedTags, selectedFiles, resultFiles = [], comentarios, fileType, status, eta, onConfirmNewFiles, onRemoveFile, onRemoveResultFile, onAddResult, isLoading }) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [newFiles, setNewFiles] = useState([]);
  const fileInputRef = useRef(null);
  const [newResultFiles, setNewResultFiles] = useState([]);
  const resultFileInputRef = useRef(null);
  const { user } = useAuthContext();

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    setNewFiles(prevFiles => [...prevFiles, ...files]);
    event.target.value = ''; 
  };

  const handleConfirmNewFiles = (newFiles) => {
    onConfirmNewFiles(newFiles)
    setNewFiles([])
  }

  const handleResultFileUpload = (event) => {
    const files = Array.from(event.target.files);
    setNewResultFiles(prevFiles => [...prevFiles, ...files]);
    event.target.value = ''; 
  };

  const removePendingFile = (index) => {
    setNewFiles(prevFiles => prevFiles.filter((file, i) => i !== index));
  };

  const handleConfirmNewResultFiles = () => {
    onAddResult(newResultFiles);
    setNewResultFiles([]);
  }

  const removePendingResultFile = (index) => {
    setNewResultFiles(prevFiles => prevFiles.filter((file, i) => i !== index));
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

  const labelArchivos = `Bandeja de entrada (${selectedFiles.length})`;
  const labelBandejaSalida = `Bandeja de salida (${resultFiles.length})`;

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
          {(status == "Confirmado" ||   status == "Completado") && <Tab label={labelBandejaSalida} />}
        </Tabs>
      </Paper>

      {currentTab === 0 && (
        <Paper elevation={2} sx={{ padding: '24px', backgroundColor: '#fff', borderRadius: '12px' }}>
        <Typography variant="body1" gutterBottom>
          <strong>Tipo de trabajo:</strong> <span style={{ fontWeight: 300 }}>{fileType}</span>
        </Typography>
        <Typography variant="body1" gutterBottom>
          <strong>Fecha de entrega estimado:</strong> <span style={{ fontWeight: 300 }}>{eta}</span>
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
        {comentarios && <Typography variant="body1">
          <strong>Comentarios:</strong> <span style={{ fontWeight: 300 }}>{comentarios[0].data}</span>
        </Typography>}
        
      </Paper>
      
      )}

      {currentTab === 1 && (
        <Paper elevation={2} sx={{ padding: '24px', backgroundColor: '#fff', borderRadius: '12px' }}>
          {/* { <Button variant="outlined" onClick={downloadAllFiles} style={{ marginBottom: '16px' }}>
            Descargar todas
          </Button> } */}
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
              {file.originalName?
                <a href={file.name} target="_blank" rel="noopener noreferrer">
                  {file.originalName}
                </a> :
                file.name
              }
              <Button size="small" onClick={() => onRemoveFile(file)}><SvgIcon fontSize="small"><TrashIcon /></SvgIcon></Button>
            </li>
          ))}
        </Paper>
      )}
      {(currentTab === 2 && (status == "Confirmado" ||   status == "Completado")) && (
        <Paper elevation={2}>
        {resultFiles.length == 0 && <Typography variant="body1">Estamos procesando tu pedido.</Typography>}
        {(user.admin) && (
          
          <>
            <input
              type="file"
              ref={resultFileInputRef}
              style={{ display: 'none' }}
              onChange={handleResultFileUpload}
              multiple
            />
            {isLoading ? (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                  <CircularProgress />
                </Box>) : ( <Button 
              variant="outlined"
              color="primary"
              onClick={() => resultFileInputRef.current.click()}
              sx={{ marginRight: '8px' }}
            >
              Agregar Archivos de Resultado
            </Button>)}
            {newResultFiles.length > 0 && 
              <Button 
                variant="contained"
                color="secondary"
                onClick={handleConfirmNewResultFiles}
              >
                Confirmar Archivos de Resultado {newResultFiles.length}
              </Button>
            }
          </>
        )}
        {newResultFiles.length > 0 && newResultFiles.map((file, index) => (
              <Box 
                key={index} 
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <Typography variant="body2" sx={{ marginRight: '8px' }}>{file.name}</Typography>
                <IconButton size="small" onClick={() => removePendingResultFile(index)} color="error">
                    <SvgIcon fontSize="small"><TrashIcon /></SvgIcon>
                </IconButton>
              </Box>
            ))}
            {resultFiles.map((file, index) => (
            <li key={index}>
              {file.originalName?
                <a href={file.name} target="_blank" rel="noopener noreferrer">
                  {file.originalName}
                </a> :
                file.name
              }
              {(user.admin) && (
                <Button size="small" onClick={() => onRemoveResultFile(file)}><SvgIcon fontSize="small"><TrashIcon /></SvgIcon></Button>
              )}
            </li>
          ))}
      </Paper>
      )}
    </Box>
  );
};

export default TicketInfo;
