import React, { useState, useEffect } from 'react';

import { Button, Checkbox, FormControl, InputLabel, ListItemText, MenuItem, Select, TextField } from '@mui/material';

export const ConfiguracionGeneral = ({ empresa, updateEmpresaData }) => {
  const [camposObligatorios, setCamposObligatorios] = useState(empresa.camposObligatorios || []);
  const [confFecha, setConfFecha] = useState(empresa.conf_fecha || "REAL");
  const [tipo, setTipo] = useState(empresa.tipo || "Constructora");
  const [sheetCentral, setSheetCentral] = useState(empresa.sheetCentral || "");

  const opcionesCampos = ["proyecto", "categoria", "total", "observacion", "nombre_proveedor", "fecha_factura"]; 

  const handleCampoChange = (event) => {
    setCamposObligatorios(event.target.value);
  };

  const handleSaveConfig = async () => {
    const updatedData = { camposObligatorios: camposObligatorios, conf_fecha: confFecha, tipo: tipo, sheetCentral: sheetCentral };
    await updateEmpresaData(empresa.id, updatedData);
  };

  return (
    <>
      <FormControl fullWidth>
        <InputLabel id="campos-obligatorios-label">Campos Obligatorios</InputLabel>
        <Select
          labelId="campos-obligatorios-label"
          multiple
          value={camposObligatorios}
          onChange={handleCampoChange}
          renderValue={(selected) => selected.join(', ')}
        >
          {opcionesCampos.map((campo) => (
            <MenuItem key={campo} value={campo}>
              <Checkbox checked={camposObligatorios.indexOf(campo) > -1} />
              <ListItemText primary={campo} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        select
        label="Configuración de Fecha"
        value={confFecha}
        onChange={(e) => setConfFecha(e.target.value)}
        fullWidth
      >
        <MenuItem value="HOY">Hoy</MenuItem>
        <MenuItem value="REAL">Real</MenuItem>
      </TextField>
      <TextField
        select
        label="Tipo de Empresa"
        value={tipo}
        onChange={(e) => setTipo(e.target.value)}
        fullWidth
      >
        <MenuItem value="Constructora">Constructora</MenuItem>
        <MenuItem value="Financiera">Financiera</MenuItem>
        <MenuItem value="Rinde gastos">Rinde Gastos</MenuItem>
      </TextField>
      <TextField
        label="ID de Google Sheet Central"
        value={sheetCentral}
        onChange={(e) => setSheetCentral(e.target.value)}
        fullWidth
      />
      <Button onClick={handleSaveConfig} variant="contained" color="primary">
        Guardar Configuración
      </Button>
    </>
  );
};
