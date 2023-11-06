import React from 'react';
import { Box, TextField, Button } from '@mui/material';
import { useState, useEffect } from 'react';
import AdjustmentsVerticalIcon from '@heroicons/react/24/solid/AdjustmentsVerticalIcon';
import ChevronUpIcon from '@heroicons/react/24/solid/ChevronUpIcon';
import ChevronDownIcon from '@heroicons/react/24/solid/ChevronDownIcon';
import { SvgIcon } from '@mui/material';

const ImageDataEntry = ({ url, formFields, originalName, handleSendData }) => {
  const [formData, setFormData] = React.useState(
    formFields.reduce((acc, field) => ({ ...acc, [field.name]: '' }), {})
  );
  const [iframeHeight, setIframeHeight] = useState(1200);
  const [customFile, setCustomFile] = useState(false);
  
  const handleCustomFile = () => {
    setCustomFile(!customFile);
  }

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
    handleSendData(formData)
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
          <TextField
            key={index}
            margin="normal"
            fullWidth
            id={field.name}
            label={field.label}
            name={field.name}
            autoComplete={field.name}
            autoFocus={index === 0}
            value={formData[field.name]}
            onChange={handleInputChange}
          />
        ))}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
        >
          Enviar Datos
        </Button>
      </Box>
    </Box>
  );
};

export default ImageDataEntry;
