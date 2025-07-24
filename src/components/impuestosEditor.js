// src/components/MovementFields.js
import React, { useCallback } from 'react';
import {
  TextField,
  Autocomplete,
  Box,
  Button,
  Paper
} from '@mui/material';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

const ImpuestosEditor = ({ formik, impuestosDisponibles, subtotal }) => {
    const impuestos = formik.values.impuestos || [];
  
    const handleAddFromTemplate = useCallback((tpl) => {
      if (!tpl) return;
      formik.setFieldValue('impuestos', [
        ...impuestos,
        { nombre: tpl.nombre, monto: tpl.valor * subtotal / 100 } // solo lo que guarda el movimiento
      ]);
    }, [formik, impuestos]);
  
    const handleAddEmpty = useCallback(() => {
      formik.setFieldValue('impuestos', [...impuestos, { nombre: '', monto: 0 }]);
    }, [formik, impuestos]);
  
    const handleChange = useCallback((idx, field, value) => {
      const next = [...impuestos];
      next[idx] = { ...next[idx], [field]: field === 'monto' ? Number(value) : value };
      formik.setFieldValue('impuestos', next);
    }, [formik, impuestos]);
  
    const handleDelete = useCallback((idx) => {
      formik.setFieldValue('impuestos', impuestos.filter((_, i) => i !== idx));
    }, [formik, impuestos]);
  
    return (
      <Paper sx={{ p: 2, mt: 3 }} variant="outlined">
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box fontWeight="bold">Impuestos</Box>
          <Box display="flex" gap={1}>
            <Autocomplete
              size="small"
              disableClearable
              options={impuestosDisponibles}
              getOptionLabel={(o) => o.nombre}
              onChange={(_, val) => handleAddFromTemplate(val)}
              renderInput={(params) => <TextField {...params} label="Agregar desde lista" />}
              sx={{ width: 220 }}
            />
            <Button size="small" startIcon={<AddIcon />} onClick={handleAddEmpty}>
              Manual
            </Button>
          </Box>
        </Box>
  
        {impuestos.length === 0 && (
          <Box color="text.secondary" fontSize={14}>No hay impuestos cargados.</Box>
        )}
  
        {impuestos.map((imp, idx) => (
          <Box
            key={idx}
            display="grid"
            gridTemplateColumns="1fr 120px 40px"
            gap={1}
            alignItems="center"
            mb={1}
          >
            <TextField
              label="Nombre"
              value={imp.nombre}
              onChange={(e) => handleChange(idx, 'nombre', e.target.value)}
              size="small"
            />
            <TextField
              label="Monto"
              type="number"
              value={imp.monto}
              onChange={(e) => handleChange(idx, 'monto', e.target.value)}
              size="small"
            />
            <IconButton onClick={() => handleDelete(idx)} size="small">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
      </Paper>
    );
  };
  

  export default ImpuestosEditor;