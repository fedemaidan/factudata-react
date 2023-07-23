import React, { useState } from 'react';
import { Box, Button, Stack, TextField, Typography, Select, MenuItem } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';

const OnboardingStep2 = ({ selectedTagsData, reason, rowAmountType, rowAmount, onPreviousStep, onNextStep }) => {
  const [reasonData, setReasonData] = useState(reason);
  const [selectedTags, setSelectedTags] = useState(selectedTagsData);
  const [customTag, setCustomTag] = useState('');
  const [tags, setTags] = useState([
    "Emisor",
    "Número de factura",
    "Condición IVA",
    "Fecha",
    "Neto",
    "IVA 21%",
    "IVA 10.5%",
    "Total",
  ]);
  const [rowOption, setRowOption] = useState(rowAmountType);
  const [rowValue, setRowValue] = useState(rowAmount);

  const handleNextStep = () => {
    onNextStep({
      tags: [...selectedTags, customTag],
      reason: reasonData,
      rowOption: rowOption,
      rowValue: rowValue,
    });
  };

  const handleReasonData = (value) => {
    setReasonData(value);
  };

  const handleTagInputChange = (event, newValue) => {
    setCustomTag(newValue);
  };

  const handleKeyDown = (event) => {
    // Verificamos si se presionó la tecla Enter
    const optionsTags = tags;
    if (event.key === 'Enter') {
      // Agregamos el custom tag a la lista de tags seleccionados
      if (customTag.trim() !== '' && !selectedTags.includes(customTag)) {
        optionsTags.push(customTag); // Agregamos el custom tag a la lista de opciones predeterminadas
        setTags(optionsTags)
        setSelectedTags((prevSelectedTags) => [...prevSelectedTags, customTag]);
      }
      // Limpiamos el valor del campo
      setCustomTag('');
    }
  };

  const handleRowOptionChange = (event) => {
    setRowOption(event.target.value);
    // Limpiamos el valor de rowValue si el usuario cambia la opción
    setRowValue('');
  };

  const handleRowValueChange = (event) => {
    const value = event.target.value;
    setRowValue(value);
  };

  const questionOneCompleted = () => {
        if (rowOption == "unknown")
            return true;
        if (rowValue > 0)
            return true;
        return false;
  }

  const questionTwoCompleted = () => {
    return selectedTags.length > 0;
  }

  return (
    <Box>
      <Typography variant="h5">Paso 2: ¿Qué necesitas extraer de cada archivo?</Typography>
      <Stack spacing={2} sx={{ mt: 2 }}>
        <Typography>1. ¿Cuantas filas vamos a extraer por cada archivo?</Typography>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Select
            value={rowOption}
            onChange={handleRowOptionChange}
            variant="outlined"
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="exact">Cantidad exacta</MenuItem>
            {/* <MenuItem value="range">Rango</MenuItem> */}
            <MenuItem value="unknown">No sabe</MenuItem>
          </Select>
          {rowOption !== 'unknown' && (
            <TextField
              label={rowOption === 'range' ? 'Rango de filas' : 'Cantidad de filas'}
              type="number"
              variant="outlined"
              value={rowValue}
              onChange={handleRowValueChange}
            />
          )}
        </Stack>
        {
            questionOneCompleted() && <Stack>
            <Typography>2. ¿Qué campos vamos a extraer por cada fila?</Typography>
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
                /></Stack>
        }
        {
            questionOneCompleted() && questionTwoCompleted() && <Stack>
                <Typography>3. Dejanos comentarios extra sobre la carga para ayudarnos a hacerlo lo mejor posible</Typography>
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
        }
      </Stack>
      {
            questionOneCompleted()&& questionTwoCompleted() &&
                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                    <Button onClick={onPreviousStep}>Volver</Button>
                    <Button onClick={handleNextStep} disabled={selectedTags.length === 0}>Siguiente</Button>
                </Stack>
    }
    </Box>
  );
};

export default OnboardingStep2;
