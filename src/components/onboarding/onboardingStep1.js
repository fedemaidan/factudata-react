import React, { useRef, useState } from 'react';
import { Box, Button, FormControl, InputLabel, MenuItem, Select, SvgIcon, Typography, TextField } from '@mui/material';
import ArrowDownOnSquareIcon from '@heroicons/react/24/solid/ArrowDownOnSquareIcon';

const OnboardingStep1 = ({ onNextStep }) => {
  const fileInputRef = useRef(null);
  const [fileType, setFileType] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [otherFileType, setOtherFileType] = useState('');

  const handleFileTypeChange = (event) => {
    setFileType(event.target.value);
    setOtherFileType('');
  };

  const handleFileInputChange = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
  };

  const handleNextStep = () => {
    if (fileType && selectedFiles.length > 0) {
      onNextStep({ fileType, selectedFiles });
    } else {
      alert('Seleccione el tipo de archivo y al menos un archivo antes de continuar.');
    }
  };

  const isFileTypeSelected = !!fileType;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h5">Paso 1: Subir archivos y seleccionar el tipo</Typography>
      <Box sx={{ mt: 5 }}>
        <FormControl variant="outlined" fullWidth>
          <InputLabel>Tipo de archivos</InputLabel>
          <Select
            label="Tipo de archivos"
            value={fileType}
            onChange={handleFileTypeChange}
          >
            <MenuItem value="">Seleccione...</MenuItem>
            <MenuItem value="Facturas">Facturas</MenuItem>
            <MenuItem value="Legajos">Legajos</MenuItem>
            <MenuItem value="Listados de precio">Listados de precio</MenuItem>
            <MenuItem value="Otros">Otros</MenuItem>
          </Select>
        </FormControl>
      </Box>
      {fileType === 'Otros' && (
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
          disabled={!isFileTypeSelected}
        >
          {isFileTypeSelected ? 'Seleccionar archivos' : 'Seleccione el tipo primero'}
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
