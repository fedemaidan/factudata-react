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
  InputLabel
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import { getProyectosByEmpresa, hasPermission, updateProyecto } from 'src/services/proyectosService';

export const ProyectosDetails = ({ empresa }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [proyectos, setProyectos] = useState([]);
  const [editingProyecto, setEditingProyecto] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [sheetPermissionError, setSheetPermissionError] = useState(false);
  const [folderPermissionError, setFolderPermissionError] = useState(false);
  
  const handleSheetWithClientChange = async (event) => {
    const newSheetId = event.target.value;
    formik.setFieldValue('sheetWithClient', newSheetId, false); 
    console.log("Estoy acá")
    try {
        const permissionResult = await hasPermission(newSheetId);
        setSheetPermissionError(!permissionResult);
        if (!permissionResult) {
          formik.setFieldError('sheetWithClient', 'No tienes permisos para editar esta hoja de Google Sheet');
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
            formik.setFieldError('carpetaRef', 'No tienes permisos para editar esta carpeta');
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
      sheetWithClient: ''
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      nombre: Yup.string().required('El nombre del proyecto es requerido'),
      proyecto_default_id: Yup.string(),
      sheetWithClient: Yup.string().nullable()
    }),
    onSubmit: async (values, { resetForm }) => {
      setIsLoading(true);
      if (editingProyecto) {
        await updateProyecto(editingProyecto.id, values);
        const proyectosData = await getProyectosByEmpresa(empresa);
        setProyectos(proyectosData);
        setOpenModal(false);
      }
      resetForm();
      setEditingProyecto(null);
      setIsLoading(false);
    }
  });

  const iniciarEdicionProyecto = (proyecto) => {
    setEditingProyecto(proyecto);
    formik.setValues(proyecto);
    setOpenModal(true);
  };

  const cancelarEdicion = () => {
    setEditingProyecto(null);
    formik.resetForm();
    setOpenModal(false);
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
                <ListItemText primary={proyecto.nombre} secondary={`Carpeta: ${proyecto.carpetaRef} Caja central: ${findProyectoNombreById(proyecto.proyecto_default_id)} Google Sheet ID: ${proyecto.sheetWithClient || 'No asignado'}`} />
                <ListItemSecondaryAction>
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
        </CardActions>
      </Card>
      <Dialog open={openModal} onClose={cancelarEdicion} aria-labelledby="form-dialog-title">
        <form autoComplete="off" noValidate onSubmit={formik.handleSubmit}>
          <DialogTitle id="form-dialog-title">Editar Proyecto</DialogTitle>
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
                helperText={formik.touched.carpetaRef && (formik.errors.carpetaRef || (folderPermissionError && "No tienes permisos para editar esta carpeta"))}
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
                onChange={ async (event) => {
                  await handleSheetWithClientChange(event);
                  formik.handleChange(event);
              }}              
                error={formik.touched.sheetWithClient && (Boolean(formik.errors.sheetWithClient) || sheetPermissionError)}
                helperText={formik.touched.sheetWithClient && (formik.errors.sheetWithClient || (sheetPermissionError && "No tienes permisos para editar esta hoja de Google Sheet"))}
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
              Guardar Cambios
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      {isLoading && <LinearProgress />}
    </>
  );
};
