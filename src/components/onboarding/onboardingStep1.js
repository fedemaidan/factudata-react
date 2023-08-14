import React, { useRef, useState } from 'react';
import { Box, Button, SvgIcon, Typography, TextField } from '@mui/material';
import ArrowDownOnSquareIcon from '@heroicons/react/24/solid/ArrowDownOnSquareIcon';

const OnboardingStep1 = ({ onNextStep }) => {
  const fileInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [otherFileType, setOtherFileType] = useState('');

  const handleFileInputChange = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
  };

  const handleNextStep = () => {
    if (selectedType !== '' && selectedFiles.length > 0) {
      const fileType = selectedType === 'custom' ? otherFileType : selectedType;
      onNextStep({ fileType, selectedFiles });
    } else {
      alert('Seleccione el tipo de archivo y al menos un archivo antes de continuar.');
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h5">Paso 1: Selecciona la opción que desea y suba los archivos</Typography>
      <Box sx={{ mt: 5 }}>
        <Button
          variant={selectedType === 'Libro de IVA' ? 'contained' : 'outlined'}
          onClick={() => setSelectedType('Libro de IVA')}
          sx={{ mr: 2 }}
        >
          Libro de IVA
        </Button>
        <Button
          variant={selectedType === 'Análisis de gastos' ? 'contained' : 'outlined'}
          onClick={() => setSelectedType('Análisis de gastos')}
          sx={{ mr: 2 }}
        >
          Análisis de gastos
        </Button>
        <Button
          variant={selectedType === 'custom' ? 'contained' : 'outlined'}
          onClick={() => setSelectedType('custom')}
        >
          Personalizar
        </Button>
      </Box>
      {selectedType === 'custom' && (
        <Box sx={{ mt: 2 }}>
          <TextField
            label="Especificar tipo de archivos"
            variant="outlined"
            value={otherFileType}
            onChange={(event) => setOtherFileType(event.target.value)}
            fullWidth
          />
        </Box>
      )}
      <Box sx={{ mt: 2 }}>
        <Button
          onClick={() => fileInputRef.current.click()}
          startIcon={<SvgIcon fontSize="small"><ArrowDownOnSquareIcon /></SvgIcon>}
          disabled={selectedType === ''}
        >
          {selectedType ? 'Seleccionar archivos' : 'Seleccione el tipo primero'}
        </Button>
        {selectedFiles.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1">Archivos seleccionados:</Typography>
            <ul>
              {selectedFiles.map((file, index) => (
                <li key={index}>{file.name}</li>
              ))}
            </ul>
          </Box>
        )}
      </Box>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
        multiple
      />
      {selectedFiles.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Button variant="contained" color="primary" onClick={handleNextStep}>Siguiente</Button>
        </Box>
      )}
    </Box>
  );
};

export default OnboardingStep1;
