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
  LinearProgress
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import { getProyectosByEmpresa, updateProyecto } from 'src/services/proyectosService';

export const ProyectosDetails = ({ empresa }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [proyectos, setProyectos] = useState([]);
  const [editingProyecto, setEditingProyecto] = useState(null);
  
  useEffect(() => {
    const fetchEmpresaData = async () => {
      const proyectosData = await getProyectosByEmpresa(empresa)
      setProyectos(proyectosData)
    };

    fetchEmpresaData();
  }, [empresa]);

  const formik = useFormik({
    initialValues: {
      nombre: editingProyecto ? editingProyecto.nombre : '',
      carpetaRef: editingProyecto ? editingProyecto.carpetaRef : '',
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      nombre: Yup.string().required('El nombre del proyecto es requerido'),
    }),
    onSubmit: async (values, { resetForm }) => {
      setIsLoading(true);
      
      if (editingProyecto) {
        await updateProyecto(editingProyecto.id, {nombre: values.nombre, carpetaRef: values.carpetaRef})
        const proyectosData = await getProyectosByEmpresa(empresa)
        setProyectos(proyectosData)
      } 

      resetForm();
      setEditingProyecto(null);
      setIsLoading(false);
    },
  });

  const iniciarEdicionProyecto = (proyecto) => {
    setEditingProyecto(proyecto);
  };

  const cancelarEdicion = () => {
    setEditingProyecto(null);
    formik.resetForm();
  };


  return (
    <form autoComplete="off" noValidate onSubmit={formik.handleSubmit}>
      <Card>
        <CardHeader title="Gestionar Proyectos" />
        <Divider />
        <CardContent>
          <List>
            {proyectos.map((proyecto) => (
              <ListItem key={proyecto.id} divider>
                <ListItemText primary={proyecto.nombre} secondary={`Carpeta: ${proyecto.carpetaRef}`} />
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => iniciarEdicionProyecto(proyecto)}>
                    <EditIcon />
                  </IconButton>
                  {/* <IconButton edge="end" onClick={() => eliminarProyecto(proyecto.id)}>
                    <DeleteIcon />
                  </IconButton> */}
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
          <Box sx={{ display: 'flex', flexDirection: 'column', mb: 1 }}>
          {
              editingProyecto && 
            <TextField
              fullWidth
              name="nombre"
              label="Nombre del Proyecto"
              value={formik.values.nombre}
              onChange={formik.handleChange}
              error={formik.touched.nombre && Boolean(formik.errors.nombre)}
              helperText={formik.touched.nombre && formik.errors.nombre}
            />}  
            {
              editingProyecto &&
            <TextField
              fullWidth
              name="carpetaRef"
              label="Carpeta de Referencia"
              value={formik.values.carpetaRef}
              onChange={formik.handleChange}
              error={formik.touched.carpetaRef && Boolean(formik.errors.carpetaRef)}
              helperText={formik.touched.carpetaRef && formik.errors.carpetaRef}
              style={{ marginTop: '1rem' }}
            />
            }
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              {
              // editingProyecto ? (
                <Button onClick={cancelarEdicion} color="primary">
                  Cancelar
                </Button>
              // ) : (
              //   <IconButton type="submit" color="primary">
              //     <AddCircleIcon />
              //   </IconButton>
              // )
              }
              {editingProyecto && (
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  type="submit"
                  sx={{ ml: 2 }}
                >
                  Guardar Cambios
                </Button>
              )}
            </Box>
          </Box>
        </CardContent>
        <Divider />
        <CardActions sx={{ justifyContent: 'flex-end' }}>
        </CardActions>
      </Card>
      {isLoading && <LinearProgress />}
    </form>
  );
};
