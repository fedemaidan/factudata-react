import React from 'react';
import { Box, TextField, Button, Select, MenuItem, InputLabel, FormControl } from '@mui/material';
import { useState, useEffect } from 'react';
import AdjustmentsVerticalIcon from '@heroicons/react/24/solid/AdjustmentsVerticalIcon';
import ChevronUpIcon from '@heroicons/react/24/solid/ChevronUpIcon';
import ChevronDownIcon from '@heroicons/react/24/solid/ChevronDownIcon';
import { SvgIcon } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';

const ImageDataEntry = ({ url, formFields, originalName, handleSendData }) => {
  // const initialState = formFields.reduce((acc, field) => ({ ...acc, [field.name]: '' }), {});

  const initialState = {
    "filename": '/assets/facturas/ejemplo_corralon.png',
    "nombre_proveedor": "Corralon Catan",
    "fecha_factura":"2024-03-15",
    "total": 81862.12,
    "cuit": "30-71622440-9",
    "numero_factura": "00001-00006244",
    "categoria": "Materiales",
    "proyecto": "La Martona 92",
    "items": [
      "Disco VERDE ALIAFOR Diamantado Turbo FINO 4.5\""
    ],
    "extra": {
      "vendedor": "Ramiro",
      "fecha_entrega": "7/3/2024",
      "moneda": "Peso",
      "cotizacion": "1.00",
      "ubicacion": "Mariano Castex 5453, CANNING - Buenos Aires",
      "email": "ferreteriamodulo4@gmail.com",
      "telefono": "21533425",
      "cantidad_items": [
        {
          "codigo": "7981",
          "cantidad": 2.00,
          "precio_unitario_con_dcto": "33814.93",
          "importe": "67629.85"
        }
      ],
      "comentarios": "Presupuesto la martona 196",
      "subtotal": "81862.12",
      "bonificacion": ".00",
      "importe_total": "81862.12"
    }
  }
  



  const [formData, setFormData] = useState(initialState);
    
  const [iframeHeight, setIframeHeight] = useState(1200);
  const [customFile, setCustomFile] = useState(false);
  
  const handleCustomFile = () => {
    setCustomFile(!customFile);
  }

  const resetFormFields = () => {
    setFormData(initialState);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleHeightChange = (event) => {
    setIframeHeight(Number(event.target.value));
  };

  const incrementHeight = () => {
    setIframeHeight((prevHeight) => prevHeight + 10);
  };

  const decrementHeight = () => {
    setIframeHeight((prevHeight) => Math.max(prevHeight - 10, 100)); // Assumes 100 is the minimum height
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    handleSendData(formData);
    // resetFormFields(); 
  };

  const renderInputField = (field) => {
    switch (field.type) {
      case 'date':
        return (
          <TextField
            margin="normal"
            fullWidth
            id={field.name}
            label={field.label}
            name={field.name}
            type="date"
            InputLabelProps={{ shrink: true }}
            value={formData[field.name]}
            onChange={handleInputChange}
          />
        );
      case 'select':
        return (
          <FormControl fullWidth margin="normal">
            <InputLabel id={`label-${field.name}`}>{field.label}</InputLabel>
            <Select
              labelId={`label-${field.name}`}
              id={field.name}
              name={field.name}
              label={field.label}
              value={formData[field.name]}
              onChange={handleInputChange}
            >
              {field.elements.map((element, index) => (
                <MenuItem key={index} value={element}>
                  {element}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      case 'array':
        return (
          <Autocomplete
            multiple
            id={field.name}
            options={formData[field.name]}
            value={formData[field.name]}
            sx={{ mt: 2 }}
            // onChange={(event, newValue) => {
            //   formData[field.name].push(newValue)
            // }}
            // inputValue={formData[field.name]}
            // onInputChange={handleTagInputChange}
            // onKeyDown={handleKeyDown}
            renderInput={(params) => <TextField {...params} label="Items" variant="outlined" />}
          />
        )
      case 'text':
      case 'number':
      default:
        return (
          <TextField
            margin="normal"
            fullWidth
            id={field.name}
            label={field.label}
            name={field.name}
            type={field.type}
            value={formData[field.name]}
            onChange={handleInputChange}
          />
        );
    }
  };


  return (
    <Box display="flex" p={2}>
      {/* División de la imagen */}
      <Box width="70%" p={1}>
      <SvgIcon onClick={handleCustomFile} fontSize="small">
        <AdjustmentsVerticalIcon />
      </SvgIcon>
        {
          customFile && (<Box display="flex" alignItems="center" mt={2}>
          <Button onClick={decrementHeight} aria-label="disminuir altura">
            <ChevronDownIcon />
          </Button>
          <TextField
            type="number"
            inputProps={{ step: 10, min: 100, max: 2000 }} // Max height as you prefer
            value={iframeHeight}
            onChange={handleHeightChange}
            sx={{ mx: 1, width: '80px' }}
          />
          <Button onClick={incrementHeight} aria-label="aumentar altura">
            <ChevronUpIcon />
          </Button>
        </Box>)
        }
        {originalName?.endsWith('.pdf')  &&
          <iframe
            src={url}
            style={{
              width: '100%',
              height: `${iframeHeight}px`,
              resize: 'both',
              overflow: 'auto',
            }}
            title="PDF Preview"
          />
        }
        {!originalName?.endsWith('.pdf') && 
          <img src={url} alt="Preview" style={{ width: '100%', height: 'auto' }} />
        }
        
      </Box>
      
      {/* División del formulario */}
      <Box width="30%" p={1} component="form" onSubmit={handleSubmit}>
        {formFields.map((field, index) => (
          <React.Fragment key={index}>
            {renderInputField(field)}
          </React.Fragment>
        ))}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
        >
          Guardar
        </Button>
      </Box>
    </Box>
  );
};

export default ImageDataEntry;
