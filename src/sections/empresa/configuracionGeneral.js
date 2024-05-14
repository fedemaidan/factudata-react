import React, { useState, useEffect } from 'react';

import { Button, Checkbox, CircularProgress, FormControl, InputLabel, ListItemText, MenuItem, Select, TextField, Snackbar, Alert } from '@mui/material';

export const ConfiguracionGeneral = ({ empresa, updateEmpresaData, hasPermission }) => {
  const [camposObligatorios, setCamposObligatorios] = useState(empresa.camposObligatorios || []);
  const [confFecha, setConfFecha] = useState(empresa.conf_fecha || "REAL");
  const [tipo, setTipo] = useState(empresa.tipo || "Constructora");
  const [sheetCentral, setSheetCentral] = useState(empresa.sheetCentral || "");
  const [acciones, setAcciones] = useState(empresa.acciones || []);
  const [isLoading, setIsLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarInfo, setSnackbarInfo] = useState({ message: '', severity: 'success' });
  const [hasPermissionError, setHasPermissionError] = useState(false);
  
  const opcionesAcciones = [
    "BIENVENIDA", "CREAR_EGRESO", "CREAR_INGRESO", "VER_CAJAS", 
    "AJUSTAR_CAJA", "TRANSFERIR_ENTRE_CAJAS", "CREAR_NUEVO_PROYECTO", 
    "COMPRAR_MONEDA", "VENDER_MONEDA", "COMPLETAR_OPERACION"
  ];
  
  const opcionesCampos = ["proyecto", "categoria", "total", "observacion", "nombre_proveedor", "fecha_factura"]; 

  const handleCampoChange = (event) => {
    setCamposObligatorios(event.target.value);
  };

  const handleAccionesChange = (event) => {
    setAcciones(event.target.value);
  };
  
  const handleSheetCentralChange = async (event) => {
    const newSheetId = event.target.value;
    setSheetCentral(newSheetId);

    try {
        const permissionResult = await hasPermission(newSheetId);
        if (!permissionResult) {
            setHasPermissionError(true);
            setSnackbarInfo({ message: 'No tienes permisos para editar esta hoja de Google Sheet.', severity: 'error' });
            setSnackbarOpen(true);
        } else {
            setHasPermissionError(false);
            setSnackbarInfo({ message: 'Permisos verificados con éxito.', severity: 'success' });
            setSnackbarOpen(true);
        }
    } catch (error) {
        console.error('Error al verificar los permisos:', error);
        setSnackbarInfo({ message: 'Error al verificar los permisos.', severity: 'error' });
        setSnackbarOpen(true);
    }
};



  const handleSaveConfig = async () => {
    setIsLoading(true);
    const updatedData = {
      camposObligatorios: camposObligatorios,
      conf_fecha: confFecha,
      tipo: tipo,
      sheetCentral: sheetCentral,
      acciones: acciones 
    };
    try {
      await updateEmpresaData(empresa.id, updatedData);
      setSnackbarInfo({ message: 'Configuración guardada con éxito.', severity: 'success' });
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error al guardar la configuración:', error);
      setSnackbarInfo({ message: 'Error al guardar la configuración.', severity: 'error' });
      setSnackbarOpen(true);
    }
    setIsLoading(false);
  };
  
  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };  
  

  return (
    <>
      <FormControl fullWidth sx={{ mt: 2 }}>
        <InputLabel id="acciones-label">Acciones Configuradas</InputLabel>
        <Select
          labelId="acciones-label"
          multiple
          value={acciones}
          onChange={handleAccionesChange}
          renderValue={(selected) => selected.join(', ')}
        >
          {opcionesAcciones.map((accion) => (
            <MenuItem key={accion} value={accion}>
              <Checkbox checked={acciones.indexOf(accion) > -1} />
              <ListItemText primary={accion} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
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
          onChange={handleSheetCentralChange}
          fullWidth
          error={hasPermissionError}
          helperText={hasPermissionError ? "El google sheet no está configurado para que podamos editarlo. Asegurate que el id esté bien escrito y de darle permisos de edición a firebase-adminsdk-xts1d@factudata-3afdf.iam.gserviceaccount.com." : ""}
      />
      <Button onClick={handleSaveConfig} variant="contained" color="primary" disabled={isLoading}>
        {isLoading ? <CircularProgress size={24} /> : "Guardar Configuración"}
      </Button>
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity={snackbarInfo.severity} sx={{ width: '100%' }}>
          {snackbarInfo.message}
        </Alert>
      </Snackbar>
    </>
  );
};
