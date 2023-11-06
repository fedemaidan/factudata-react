import React, { useState, useEffect } from 'react';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';

const OnboardingStep2 = ({ reason, onPreviousStep, onNextStep }) => {
  const [reasonData, setReasonData] = useState(reason);
  const [customTag, setCustomTag] = useState('');
  const initialTags = [
    "Emisor",
    "Número de factura",
    "Condición IVA",
    "Fecha",
    "Neto",
    "IVA 21%",
    "IVA 10.5%",
    "Total",
  ];
  const [tags, setTags] = useState(initialTags);

  // Initialize all tags as selected
  const [selectedTags, setSelectedTags] = useState(tags);

  const handleNextStep = () => {
    onNextStep({
      tags: selectedTags,
      reason: reasonData,
    });
  };

  const handleReasonData = (value) => {
    setReasonData(value);
  };

  const handleAddCustomTag = () => {
    if (customTag.trim() !== '' && !selectedTags.includes(customTag)) {
      const newTags = [...selectedTags, customTag];
      setTags((prevTags) => [...prevTags, customTag]);
      setSelectedTags(newTags);
      localStorage.setItem('selectedTags', JSON.stringify(newTags)); // Guarda los tags en localStorage
      setCustomTag('');
    }
  };
  
  useEffect(() => {
    const savedTags = JSON.parse(localStorage.getItem('selectedTags'));
    if (savedTags) {
      setTags((prevTags) => [...new Set([...prevTags, ...savedTags])]); // Asegúrate de que no haya duplicados
      setSelectedTags(savedTags);
    }
  }, []);
  

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleAddCustomTag();
    }
  };

  return (
    <Box>
      <Typography variant="h5">Paso 2: ¿Qué datos queres que tomemos de cada archivo?</Typography>
      <Stack spacing={2} sx={{ mt: 2 }}>
        <Typography>1. ¿Qué campos vamos a extraer por cada fila?</Typography>
        <Autocomplete
          multiple
          id="tags"
          options={tags}
          value={selectedTags}
          onChange={(event, newValue) => {
            setSelectedTags(newValue);
          }}
          sx={{ mt: 2 }}
          renderInput={(params) => <TextField {...params} label="Campos a extraer.." variant="outlined" />}
        />
        <Typography sx={{ mt: 2 }}>
          ¿Quieres agregar otros campos? Escribe el que quieras y presiona {'"Agregar"'}
        </Typography>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            mt: 1 }}
        >
          <TextField 
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            label="Campo personalizado"
            variant="outlined"
            onKeyDown={handleKeyDown}
          />
          <Button onClick={handleAddCustomTag} sx={{ ml: 2 }}>Agregar</Button>
        </Box>
        <Typography>2. Dejanos comentarios extra sobre la carga para ayudarnos a hacerlo lo mejor posible</Typography>
        <TextField
          label="Opcional: ¿Para qué los vas a usar? ¿Algo que quieras aclarar?"
          variant="outlined"
          multiline
          rows={4}
          sx={{ mt: 2 }}
          value={reasonData}
          onChange={(event) => handleReasonData(event.target.value)}
          fullWidth
        />
      </Stack>
      <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
        <Button onClick={onPreviousStep}>Volver</Button>
        <Button onClick={handleNextStep} disabled={selectedTags.length === 0}>Siguiente</Button>
      </Stack>
    </Box>
  );
};

export default OnboardingStep2;
