import React, { useRef, useState } from 'react';
import { Box, Button, SvgIcon, Typography, TextField, MenuItem, Select } from '@mui/material';
import ArrowDownOnSquareIcon from '@heroicons/react/24/solid/ArrowDownOnSquareIcon';

const OnboardingStep1 = ({ onNextStep }) => {
  const fileInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [otherFileType, setOtherFileType] = useState('');
  const [compatibleType, setCompatibleType] = useState('');
  const [otherCompatibleType, setOtherCompatibleType] = useState('');

  const buttonOptions = [
    { label: 'Compatible con sistemas contables', type: 'comprobantes_compatibles_con' },
    { label: 'Libro de IVA', type: 'libro_iva' },
    { label: 'Análisis de gastos', type: 'analisis_gastos' },
    { label: 'Personalizado', type: 'custom' }
  ];

  const handleFileInputChange = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
  };

  const compatibleOptions = ['Xubio', 'Tango', 'SOS-Contador', 'Colppy', 'Colppy-Afip', 'Otros'];

  const handleNextStep = () => {
    if (selectedType !== '' && selectedFiles.length > 0) {
      const fileType = selectedType;
      
      const step_one_state = {
        fileType,
        otherFileType,
        compatibleType,
        otherCompatibleType,
        selectedFiles
      }
      onNextStep(step_one_state);
    } else {
      alert('Seleccione el tipo de archivo y al menos un archivo antes de continuar.');
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h5">Paso 1: Selecciona la opción que desea y suba los archivos</Typography>
      <Box sx={{ mt: 5 }}>
        {buttonOptions.map((option, index) => (
          <Button
            key={index}
            variant={selectedType === option.type ? 'contained' : 'outlined'}
            onClick={() => setSelectedType(option.type)}
            sx={{ mr: 2 }}
          >
            {option.label}
          </Button>
        ))}
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
      {selectedType === 'comprobantes_compatibles_con' && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body1">Seleccione el sistema contable compatible:</Typography>
          <Select
            label="Sistema contable compatible"
            value={compatibleType}
            onChange={(event) => setCompatibleType(event.target.value)}
            fullWidth
          >
            {compatibleOptions.map((option, index) => (
              <MenuItem key={index} value={option}>{option}</MenuItem>
            ))}
          </Select>
        </Box>
      )}
      {selectedType === 'comprobantes_compatibles_con' && compatibleType === 'Otros' && (
        <Box sx={{ mt: 2 }}>
          <TextField
            label="Contanos con cual.."
            variant="outlined"
            value={otherCompatibleType}
            onChange={(event) => setOtherCompatibleType(event.target.value)}
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
