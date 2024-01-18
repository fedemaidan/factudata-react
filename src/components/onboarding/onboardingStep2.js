import React, { useState, useRef } from 'react';
import { Box, Button, Stack, TextField, Typography, Radio, RadioGroup, FormControlLabel } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';

const OnboardingStep2 = ({ reason, selectedTagsData, onPreviousStep, onNextStep }) => {
  const [reasonData, setReasonData] = useState(reason);
  const [customTag, setCustomTag] = useState('');
  const [tags, setTags] = useState(selectedTagsData);
  const [selectedTags, setSelectedTags] = useState(selectedTagsData);
  const [extractionMethod, setExtractionMethod] = useState('manual'); // 'manual' o 'excel'
  const [excelFileModel, setExcelFileModel] = useState(null);
  const fileInputRef = useRef(null);


  const handleNextStep = () => {
    onNextStep({
      tags: [...selectedTags, customTag],
      reason: reasonData,
      excelFileModel: excelFileModel,
      extractionMethod: extractionMethod
    });
  };

  const handleReasonData = (value) => {
    setReasonData(value);
  };

  const handleTagInputChange = (event, newValue) => {
    setCustomTag(newValue);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      if (customTag.trim() !== '' && !selectedTags.includes(customTag)) {
        setTags((prevTags) => [...prevTags, customTag]);
        setSelectedTags((prevSelectedTags) => [...prevSelectedTags, customTag]);
      }
      setCustomTag('');
    }
  };

  const handleExcelFileChange = (event) => {
    const file = event.target.files[0];
    setExcelFileModel(file);
  };


  return (
    <Box>
      <Typography variant="h5">Paso 2: ¿Qué datos queres que tomemos de cada archivo?</Typography>
      <RadioGroup
        row
        value={extractionMethod}
        onChange={(event) => setExtractionMethod(event.target.value)}
        sx={{ mt: 2 }}
      >
        <FormControlLabel value="manual" control={<Radio />} label="Elegir columnas manualmente" />
        <FormControlLabel value="excel" control={<Radio />} label="Usar modelo de Excel" />
      </RadioGroup>
      <Stack spacing={2} sx={{ mt: 2 }}>
      {extractionMethod === 'manual' && (
        <>
        <Typography>1. ¿Qué datos deseas extraer cada documento?</Typography>
        <Autocomplete
          multiple
          id="tags"
          options={tags}
          value={selectedTags}
          onChange={(event, newValue) => {
            setSelectedTags(newValue);
          }}
          sx={{ mt: 2 }}
          inputValue={customTag}
          onInputChange={handleTagInputChange}
          onKeyDown={handleKeyDown}
          renderInput={(params) => <TextField {...params} label="Campos a extraer.." variant="outlined" />}
        />
        </>
      )}
      {extractionMethod === 'excel' && (
        <>
        <Typography>O sube un modelo de Excel con las columnas necesarias:</Typography>
          <Button
            variant="outlined"
            onClick={() => fileInputRef.current.click()}
            sx={{ mt: 1 }}
          >
            Subir modelo de Excel
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleExcelFileChange}
            style={{ display: 'none' }}
            accept=".xlsx, .xls"
          />
          {excelFileModel && (
            <Typography variant="body1" sx={{ mt: 1 }}>
              Archivo seleccionado: {excelFileModel.name}
            </Typography>
          )}
        </>
      )}
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
