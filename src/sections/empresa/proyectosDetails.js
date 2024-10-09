import React, { useState, useEffect } from 'react';
import {
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
  Alert
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { getProyectosByEmpresa, hasPermission, updateProyecto, crearProyecto } from 'src/services/proyectosService';

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
                      <Typography variant="body2">Carpeta: {proyecto.carpetaRef}</Typography>
                      <Typography variant="body2">Caja central: {findProyectoNombreById(proyecto.proyecto_default_id)}</Typography>
                      <Typography variant="body2">Google Sheet ID: {proyecto.sheetWithClient || 'No asignado'}</Typography>
                      <Typography variant="body2">Estado: {proyecto.activo ? 'Activo' : 'Inactivo'}</Typography>
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
