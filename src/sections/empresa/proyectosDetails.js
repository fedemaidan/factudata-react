import React, { useState, useEffect } from 'react';
import {
  Chip,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Divider,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  Typography,
  Snackbar,
  Alert,
  Autocomplete
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { getProyectosByEmpresa, hasPermission, updateProyecto, crearProyecto, subirCSVProyecto } from 'src/services/proyectosService';

export const ProyectosDetails = ({ empresa }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [proyectos, setProyectos] = useState([]);
  const [editingProyecto, setEditingProyecto] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [sheetPermissionError, setSheetPermissionError] = useState(false);
  const [folderPermissionError, setFolderPermissionError] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProjectId, setUploadProjectId] = useState(null);
  const [uploadProjectName, setUploadProjectName] = useState('');
  const [sheetsPermissions, setSheetsPermissions] = useState({});
  const [proyectoAEliminar, setProyectoAEliminar] = useState(null);

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const handleSheetWithClientChange = async (event) => {
    const newSheetId = event.target.value;
    formik.setFieldValue('sheetWithClient', newSheetId, false); 
    try {
        const permissionResult = await hasPermission(newSheetId);
        setSheetPermissionError(!permissionResult);
        if (!permissionResult) {
          formik.setFieldError('sheetWithClient', 'El google sheet no está configurado para que podamos editarlo. Asegurate que el id esté bien escrito y de darle permisos de edición a firebase-adminsdk-xts1d@factudata-3afdf.iam.gserviceaccount.com.');
          formik.setTouched({ ...formik.touched, sheetWithClient: true });
      }
    } catch (error) {
        console.error('Error al verificar los permisos:', error);
        formik.setFieldError('sheetWithClient', 'Error al verificar los permisos');
    }
  };

  const confirmarEliminacionProyecto = async () => {
    try {
      const updatedProyecto = { ...proyectoAEliminar, activo: false, eliminado: true };
      await updateProyecto(proyectoAEliminar.id, updatedProyecto);
      setSnackbarMessage('Proyecto eliminado (lógicamente) con éxito');
      setSnackbarSeverity('success');
    } catch (error) {
      console.error('Error al eliminar el proyecto:', error);
      setSnackbarMessage('Error al eliminar el proyecto');
      setSnackbarSeverity('error');
    } finally {
      setSnackbarOpen(true);
      setProyectoAEliminar(null);
      const proyectosData = await getProyectosByEmpresa(empresa);
      setProyectos(proyectosData);
    }
  };

  
  const handleCarpetaRefChange = async (event) => {
    const newFolderId = event.target.value;
    formik.setFieldValue('carpetaRef', newFolderId, false);

    try {
        const permissionResult = await hasPermission(newFolderId);
        setFolderPermissionError(!permissionResult);
        if (!permissionResult) {
            formik.setFieldError('carpetaRef', 'La carpeta no está configurada para que podamos editarla. Asegurate que el id esté bien escrito y de darle permisos de edición a firebase-adminsdk-xts1d@factudata-3afdf.iam.gserviceaccount.com.');
            formik.setTouched({ ...formik.touched, carpetaRef: true });
        }
    } catch (error) {
        console.error('Error al verificar los permisos:', error);
        formik.setFieldError('carpetaRef', 'Error al verificar los permisos');
    }
  };

  const handleFileChange = (event, proyectoId, proyectoNombre) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      setUploadProjectId(proyectoId);
      setUploadProjectName(proyectoNombre);
    } else {
      setSnackbarMessage('Por favor, selecciona un archivo CSV válido.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };
  
  const handleUploadCSV = async () => {
    if (!selectedFile || !uploadProjectId) {
      setSnackbarMessage('Selecciona un archivo CSV antes de subirlo.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
  
    setUploading(true);
  
    try {
      await subirCSVProyecto(uploadProjectId, selectedFile, uploadProjectName);
      setSnackbarMessage('Movimientos cargados con éxito.');
      setSnackbarSeverity('success');
      setSelectedFile(null);
    } catch (error) {
      console.log(error)
      setSnackbarMessage('Error al subir el archivo CSV.');
      setSnackbarSeverity('error');
    } finally {
      setUploading(false);
      setSnackbarOpen(true);
    }
  };
  

  useEffect(() => {
    const fetchEmpresaData = async () => {
      const proyectosData = await getProyectosByEmpresa(empresa);
      setProyectos(proyectosData);
    };

    fetchEmpresaData();
  }, [empresa]);

  const formik = useFormik({
    initialValues: {
      nombre: '',
      carpetaRef: '',
      proyecto_default_id: '',
      sheetWithClient: '',
      extraSheets: [],
      subproyectos: []
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      nombre: Yup.string().required('El nombre del proyecto es requerido'),
      proyecto_default_id: Yup.string(),
      sheetWithClient: Yup.string().nullable()
    }),
    onSubmit: async (values, { resetForm }) => {
      setIsLoading(true);
      const proyectoData = {
        nombre: values.nombre,
        carpetaRef: values.carpetaRef,
        proyecto_default_id: values.proyecto_default_id,
        sheetWithClient: values.sheetWithClient,
        extraSheets: values.extraSheets,
        subproyectos: values.subproyectos || [],
      };

      try {
        if (editingProyecto) {
          await updateProyecto(editingProyecto.id, proyectoData);
          setSnackbarMessage('Proyecto actualizado con éxito');
        } else {
          await crearProyecto(proyectoData, empresa.id);
          setSnackbarMessage('Proyecto creado con éxito');
        }
        setSnackbarSeverity('success');
      } catch (error) {
        console.error('Error al crear/actualizar el proyecto:', error);
        setSnackbarMessage('Error al crear/actualizar el proyecto');
        setSnackbarSeverity('error');
      } finally {
        setSnackbarOpen(true);
        const proyectosData = await getProyectosByEmpresa(empresa);
        setProyectos(proyectosData);
        setOpenModal(false);
        resetForm();
        setEditingProyecto(null);
        setIsLoading(false);
      }
    }
  });
 

  const iniciarEdicionProyecto = (proyecto) => {
    setEditingProyecto(proyecto);
    formik.setValues(proyecto);
    setOpenModal(true);
  };

  const iniciarCreacionProyecto = () => {
    setEditingProyecto(null);
    formik.resetForm();
    setOpenModal(true);
  };

  const cancelarEdicion = () => {
    setEditingProyecto(null);
    formik.resetForm();
    setOpenModal(false);
  };

  const toggleProyectoActivo = async (proyecto) => {
    try {
      const updatedProyecto = { ...proyecto, activo: !proyecto.activo };
      await updateProyecto(proyecto.id, updatedProyecto);
      setSnackbarMessage(`Proyecto ${updatedProyecto.activo ? 'activado' : 'desactivado'} con éxito`);
      setSnackbarSeverity('success');
    } catch (error) {
      console.error('Error al cambiar el estado del proyecto:', error);
      setSnackbarMessage('Error al cambiar el estado del proyecto');
      setSnackbarSeverity('error');
    } finally {
      setSnackbarOpen(true);
      const proyectosData = await getProyectosByEmpresa(empresa);
      setProyectos(proyectosData);
    }
  };

  const findProyectoNombreById = id => {
    const proyecto = proyectos.find(proj => proj.id === id);
    return proyecto ? proyecto.nombre : "Sin caja central";
  };

  const handleAddExtraSheet = async (event) => {
    if (event.key === 'Enter' && event.target.value.trim() !== '') {
      event.preventDefault(); // 🔥 Evita que el formulario se envíe al presionar Enter
  
      const newSheetId = event.target.value.trim();
      const extraSheetsArray = formik.values.extraSheets || []; // Asegurar que es un array
  
      // Evitar duplicados
      if (extraSheetsArray.includes(newSheetId)) {
        setSnackbarMessage('El Google Sheet ya fue agregado.');
        setSnackbarSeverity('warning');
        setSnackbarOpen(true);
        event.target.value = ''; // Limpiar input
        return;
      }
  
      try {
        const permissionResult = await hasPermission(newSheetId);
        
        // Actualizar el estado de permisos
        setSheetsPermissions(prev => ({
          ...prev,
          [newSheetId]: permissionResult
        }));
  
        // Agregar el Sheet a extraSheets
        formik.setFieldValue('extraSheets', [...extraSheetsArray, newSheetId]);
  
      } catch (error) {
        console.error('Error al verificar permisos:', error);
        setSnackbarMessage('Error al verificar permisos del Google Sheet.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
  
      event.target.value = ''; // Limpiar input
    }
  };
  
  
  
  const handleRemoveExtraSheet = (sheetId) => {
    formik.setFieldValue(
      'extraSheets',
      formik.values.extraSheets?.filter((id) => id !== sheetId)
    );
  };
  

  return (
    <>
      <Card>
        <CardHeader title="Gestionar Proyectos" />
        <Divider />
        <CardContent>
          <List>
            {proyectos.map((proyecto) => (
              <ListItem key={proyecto.id} divider>
                <ListItemText
                  primary={
                    <a href={`/cajaProyecto/?proyectoId=${proyecto.id}`} target="_blank" rel="noopener noreferrer">
                      {proyecto.nombre}
                    </a>
                  }
                  secondary={
                    <>
                      <Typography variant="body2">Caja central: {findProyectoNombreById(proyecto.proyecto_default_id)}</Typography>
                      <Typography variant="body2">
                         
                        {proyecto.carpetaRef ? (
                          <a 
                            href={`https://drive.google.com/drive/folders/${proyecto.carpetaRef}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ marginLeft: '5px', textDecoration: 'none', color: '#1a73e8', fontWeight: 'bold' }}
                          >
                            Link Carpeta
                          </a>
                        ) : "Carpeta: No asignada"}
                      </Typography>

                      <Typography variant="body2">
                        
                        {proyecto.sheetWithClient ? (
                          <a 
                            href={`https://docs.google.com/spreadsheets/d/${proyecto.sheetWithClient}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ marginLeft: '5px', textDecoration: 'none', color: '#1a73e8', fontWeight: 'bold' }}
                          >
                            Link Google Sheet
                          </a>
                        ) : "Google Sheet No asignado"}
                      </Typography>

                      <Typography variant="body2">Estado: {proyecto.activo ? 'Activo' : 'Inactivo'}</Typography>
                      <Typography variant="body2">
                          Sheets Adicionales:
                          {proyecto.extraSheets && proyecto.extraSheets?.length > 0
                            ? proyecto.extraSheets?.map((sheetId, index) => (
                                <a
                                  key={index}
                                  href={`https://docs.google.com/spreadsheets/d/${sheetId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ marginLeft: '5px', textDecoration: 'none', color: '#1a73e8', fontWeight: 'bold' }}
                                >
                                  {` Sheet ${index + 1} `}
                                </a>
                              ))
                            : ' No asignados'}
                        </Typography>

                    </>
                  }
                />
                <ListItemSecondaryAction>
  <Switch
    checked={proyecto.activo}
    onChange={() => toggleProyectoActivo(proyecto)}
    color="primary"
  />
  <IconButton edge="end" onClick={() => iniciarEdicionProyecto(proyecto)}>
    <EditIcon />
  </IconButton>
  <input
    accept=".csv"
    style={{ display: 'none' }}
    id={`upload-csv-${proyecto.id}`}
    type="file"
    onChange={(event) => handleFileChange(event, proyecto.id, proyecto.nombre)}
  />
  <label htmlFor={`upload-csv-${proyecto.id}`}>
    <Button
      variant="contained"
      component="span"
      color="secondary"
      size="small"
      disabled={uploading}
      sx={{ ml: 2 }}
    >
      Subir CSV
    </Button>
    <Button
      variant="outlined"
      color="error"
      size="small"
      sx={{ ml: 2 }}
      onClick={() => setProyectoAEliminar(proyecto)}
    >
      Eliminar
    </Button>
  </label>
  {selectedFile && uploadProjectId === proyecto.id && (
    <Button
      variant="contained"
      color="primary"
      size="small"
      onClick={handleUploadCSV}
      disabled={uploading}
      sx={{ ml: 2 }}
    >
      {uploading ? 'Subiendo...' : 'Cargar'}
    </Button>
  )}
</ListItemSecondaryAction>

              </ListItem>
            ))}
          </List>
        </CardContent>
        <Divider />
        <CardActions sx={{ justifyContent: 'flex-end' }}>
          <Button
            color="primary"
            variant="contained"
            startIcon={<AddCircleIcon />}
            onClick={iniciarCreacionProyecto}
          >
            Agregar Proyecto
          </Button>
        </CardActions>
      </Card>
      <Dialog open={openModal} onClose={cancelarEdicion} aria-labelledby="form-dialog-title">
        <form autoComplete="off" noValidate onSubmit={formik.handleSubmit}>
          <DialogTitle id="form-dialog-title">{editingProyecto ? 'Editar Proyecto' : 'Agregar Proyecto'}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              name="nombre"
              label="Nombre del Proyecto"
              value={formik.values.nombre}
              onChange={formik.handleChange}
              error={formik.touched.nombre && Boolean(formik.errors.nombre)}
              helperText={formik.touched.nombre && formik.errors.nombre}
            />
            <TextField
              fullWidth
              name="carpetaRef"
              label="Carpeta de Referencia"
              value={formik.values.carpetaRef}
              onChange={event => {
                handleCarpetaRefChange(event);
                formik.handleChange(event);
              }}
              error={formik.touched.carpetaRef && (Boolean(formik.errors.carpetaRef) || folderPermissionError)}
              helperText={formik.touched.carpetaRef && (formik.errors.carpetaRef || (folderPermissionError && "La carpeta no está configurada para que podamos editarla. Asegúrate de que el id esté bien escrito y de darle permisos de edición a firebase-adminsdk-xts1d@factudata-3afdf.iam.gserviceaccount.com."))}
              style={{ marginTop: '1rem' }}
            />
            <FormControl fullWidth style={{ marginTop: '1rem' }}>
              <InputLabel id="proyecto-default-label">Caja central</InputLabel>
              <Select
                labelId="proyecto-default-label"
                name="proyecto_default_id"
                value={formik.values.proyecto_default_id}
                onChange={formik.handleChange}
                error={formik.touched.proyecto_default_id && Boolean(formik.errors.proyecto_default_id)}
              >
                <MenuItem value="">
                  Sin caja central
                </MenuItem>
                {proyectos.map((proyecto) => (
                  <MenuItem key={proyecto.id} value={proyecto.id}>
                    {proyecto.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              name="sheetWithClient"
              label="ID de Google Sheet"
              value={formik.values.sheetWithClient}
              onChange={async (event) => {
                await handleSheetWithClientChange(event);
                formik.handleChange(event);
              }}
              error={formik.touched.sheetWithClient && (Boolean(formik.errors.sheetWithClient) || sheetPermissionError)}
              helperText={formik.touched.sheetWithClient && (formik.errors.sheetWithClient || (sheetPermissionError && "El google sheet no está configurado para que podamos editarlo. Asegúrate de que el id esté bien escrito y de darle permisos de edición a firebase-adminsdk-xts1d@factudata-3afdf.iam.gserviceaccount.com."))}
              style={{ marginTop: '1rem' }}
            />
            <Box sx={{ mt: 2 }}>
  <Typography variant="subtitle1">Google Sheets Adicionales</Typography>
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
    {formik.values.extraSheets?.map((sheetId, index) => (
      <Chip
        key={index}
        label={`Sheet ${index + 1}`}
        onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${sheetId}`, '_blank')}
        onDelete={() => handleRemoveExtraSheet(sheetId)}
        sx={{
          cursor: 'pointer',
          backgroundColor: sheetsPermissions[sheetId] ? 'green' : 'red',
          color: 'white'
        }}
      />
    ))}
  </Box>
  <Box sx={{ mt: 3 }}>
  <Typography variant="subtitle1" gutterBottom>
    Subproyectos
  </Typography>
  {formik.values.subproyectos?.map((sp, idx) => (
    <Box
      key={idx}
      sx={{
        border: '1px solid #ccc',
        borderRadius: 2,
        p: 2,
        mb: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        backgroundColor: '#fafafa'
      }}
    >
      <Autocomplete
  multiple
  freeSolo
  options={[]} // no hay opciones predefinidas
  value={sp.path || []}
  onChange={(_, newValue) => {
    const updated = [...formik.values.subproyectos];
    updated[idx].path = newValue;
    formik.setFieldValue('subproyectos', updated);
  }}
  renderTags={(value, getTagProps) =>
    value.map((option, index) => (
      <Chip
        variant="outlined"
        label={option}
        {...getTagProps({ index })}
        key={index}
      />
    ))
  }
  renderInput={(params) => (
    <TextField
      {...params}
      variant="outlined"
      label="Path (jerarquía)"
      placeholder="Ej: Edificio 1, Unidad 2"
    />
  )}
/>

      <TextField
        label="Nombre"
        value={sp.nombre}
        onChange={(e) => {
          const updated = [...formik.values.subproyectos];
          updated[idx].nombre = e.target.value;
          formik.setFieldValue('subproyectos', updated);
        }}
        fullWidth
      />
      <FormControl fullWidth>
        <InputLabel>Estado</InputLabel>
        <Select
          value={sp.estado}
          label="Estado"
          onChange={(e) => {
            const updated = [...formik.values.subproyectos];
            updated[idx].estado = e.target.value;
            // Limpiar meses si ya no es alquilado
            if (e.target.value !== 'alquilado') updated[idx].meses = '';
            formik.setFieldValue('subproyectos', updated);
          }}
        >
          <MenuItem value="Disponible">Disponible</MenuItem>
          <MenuItem value="Vendido">Vendido</MenuItem>
          <MenuItem value="alquilado">Alquilado</MenuItem>
        </Select>
      </FormControl>
      <TextField
        label="Valor"
        type="number"
        value={sp.valor}
        onChange={(e) => {
          const updated = [...formik.values.subproyectos];
          updated[idx].valor = e.target.value;
          formik.setFieldValue('subproyectos', updated);
        }}
        fullWidth
      />
      {sp.estado === 'alquilado' && (
        <TextField
          label="Meses de alquiler"
          type="number"
          value={sp.meses || ''}
          onChange={(e) => {
            const updated = [...formik.values.subproyectos];
            updated[idx].meses = e.target.value;
            formik.setFieldValue('subproyectos', updated);
          }}
          fullWidth
        />
      )}
      <Button
        variant="outlined"
        color="error"
        onClick={() => {
          const updated = formik.values.subproyectos.filter((_, i) => i !== idx);
          formik.setFieldValue('subproyectos', updated);
        }}
      >
        Eliminar
      </Button>
    </Box>
  ))}



  <Button
    variant="outlined"
    onClick={() =>
      formik.setFieldValue('subproyectos', [
        ...formik.values.subproyectos,
        { nombre: '', estado: 'Disponible', valor: '', meses: '' }
      ])
    }
  >
    Agregar Subproyecto
  </Button>
</Box>


  <TextField
    fullWidth
    label="Agregar ID de Google Sheet"
    variant="outlined"
    size="small"
    onKeyDown={handleAddExtraSheet}
    sx={{ mt: 1 }}
  />
</Box>

          </DialogContent>
          <DialogActions>
            <Button onClick={cancelarEdicion} color="primary">
              Cancelar
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              type="submit"
              sx={{ ml: 2 }}
            >
              {editingProyecto ? 'Guardar Cambios' : 'Agregar Proyecto'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      <Dialog
  open={!!proyectoAEliminar}
  onClose={() => setProyectoAEliminar(null)}
>
  <DialogTitle>¿Eliminar proyecto?</DialogTitle>
  <DialogContent>
    <Typography>
      ¿Estás seguro de que querés eliminar el proyecto <strong>{proyectoAEliminar?.nombre}</strong>? Esta acción desactivará el proyecto pero no lo eliminará permanentemente.
    </Typography>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setProyectoAEliminar(null)}>Cancelar</Button>
    <Button
      onClick={confirmarEliminacionProyecto}
      variant="contained"
      color="error"
    >
      Confirmar Eliminación
    </Button>
  </DialogActions>
</Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
      {isLoading && <LinearProgress />}
    </>
  );
};
