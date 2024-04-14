import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Divider,
  TextField,
  Typography,
  Checkbox,
  FormControlLabel,
  IconButton,
  Alert,
  LinearProgress
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import SaveIcon from '@mui/icons-material/Save';

export const ProyectosDetails = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [proyectos, setProyectos] = useState([
    {
      id: 1,
      nombre: 'Lares',
      usuarios: [
        { id: 1, nombre: 'Usuario 1', puedeEditar: false },
        { id: 2, nombre: 'Usuario 2', puedeEditar: true },
        // ... más usuarios
      ]
    },{
        id: 2,
        nombre: 'Martona',
        usuarios: [
          { id: 1, nombre: 'Usuario 1', puedeEditar: false },
          { id: 2, nombre: 'Usuario 2', puedeEditar: true },
          // ... más usuarios
        ]
      },
    // ... más proyectos
  ]);

  // Funciones para manejar los proyectos y los permisos de los usuarios
  const toggleUserPermission = (proyectoId, usuarioId) => {
    setProyectos(proyectos.map(proyecto => {
      if (proyecto.id === proyectoId) {
        return {
          ...proyecto,
          usuarios: proyecto.usuarios.map(usuario => {
            if (usuario.id === usuarioId) {
              return { ...usuario, puedeEditar: !usuario.puedeEditar };
            }
            return usuario;
          })
        };
      }
      return proyecto;
    }));
  };

  // useFormik para manejar el formulario (como ejemplo, solo se muestra para agregar proyectos)
  const formik = useFormik({
    initialValues: {
      nuevoProyecto: '',
    },
    validationSchema: Yup.object({
      nuevoProyecto: Yup.string().required('El nombre del proyecto es requerido'),
    }),
    onSubmit: (values, { resetForm }) => {
      // Lógica para agregar un nuevo proyecto
      resetForm();
    },
  });

  return (
    <form autoComplete="off" noValidate onSubmit={formik.handleSubmit}>
      <Card>
        <CardHeader title="Gestionar Proyectos" />
        <Divider />
        <CardContent>
          {/* UI para Proyectos */}
          <Typography variant="h6">Proyectos</Typography>
          {proyectos.map((proyecto) => (
            <Box key={proyecto.id} sx={{ mb: 2 }}>
              <Typography variant="subtitle1">{proyecto.nombre}</Typography>
              {proyecto.usuarios.map((usuario) => (
                <FormControlLabel
                  key={usuario.id}
                  control={
                    <Checkbox
                      checked={usuario.puedeEditar}
                      onChange={() => toggleUserPermission(proyecto.id, usuario.id)}
                    />
                  }
                  label={usuario.nombre}
                />
              ))}
            </Box>
          ))}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <TextField
              fullWidth
              name="nuevoProyecto"
              label="Agregar Proyecto"
              value={formik.values.nuevoProyecto}
              onChange={formik.handleChange}
              error={formik.touched.nuevoProyecto && Boolean(formik.errors.nuevoProyecto)}
              helperText={formik.touched.nuevoProyecto && formik.errors.nuevoProyecto}
            />
            <IconButton type="submit" color="primary">
              <AddCircleIcon />
            </IconButton>
          </Box>
        </CardContent>
        <Divider />
        <CardActions sx={{ justifyContent: 'flex-end' }}>
          <Button variant="contained" startIcon={<SaveIcon />} type="submit">Guardar Cambios</Button>
        </CardActions>
      </Card>
      {isLoading && <LinearProgress />}
    </form>
  );
};
