import React, { useState, useEffect } from 'react';
import profileService from 'src/services/profileService';
import {
  Typography, Button, Card, CardContent, CardActions, CardHeader, Divider, IconButton, LinearProgress, TextField, Select, MenuItem, InputLabel, FormControl,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Dialog, DialogActions, DialogContent, DialogTitle
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { getProyectosByEmpresa, getProyectosFromUser } from 'src/services/proyectosService';
import { doc } from 'firebase/firestore';
import { db } from 'src/config/firebase';

export const UsuariosDetails = ({ empresa }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [editingUsuario, setEditingUsuario] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const fetchProfiles = async () => {
      setIsLoading(true);
      const profiles = await profileService.getProfileByEmpresa(empresa.id);

      const profilesWithProjects = await Promise.all(profiles.map(async (prof) => {
        prof.proyectosData = await getProyectosFromUser(prof);
        return prof;
      }));

      console.log(profilesWithProjects);
      setUsuarios(profilesWithProjects);
      setIsLoading(false);
    };

    const fetchProyectos = async () => {
      const proyectos = await getProyectosByEmpresa(empresa);
      setProyectos(proyectos);
    };

    fetchProfiles();
    fetchProyectos();
  }, [empresa]);

  const formik = useFormik({
    initialValues: {
      email: editingUsuario ? editingUsuario.email : '',
      phone: editingUsuario ? editingUsuario.phone : '',
      firstName: editingUsuario ? editingUsuario.firstName : '',
      lastName: editingUsuario ? editingUsuario.lastName : '',
      proyectos: editingUsuario ? editingUsuario.proyectosData.map(proj => proj.id) : [],
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      email: Yup.string().email('El email no es válido').required('El email es requerido'),
      phone: Yup.string().required('El whatsapp es requerido'),
      firstName: Yup.string().required('El nombre es requerido'),
      lastName: Yup.string().required('El apellido es requerido'),
    }),
    onSubmit: async (values, { resetForm }) => {
      setIsLoading(true);
      const selectedProyectosRefs = values.proyectos.map(projId => doc(db, 'proyectos', projId));
      if (editingUsuario) {
        const updatedUsuario = { ...values, proyectos: selectedProyectosRefs };
        const updatedUsuarios = usuarios.map((user) =>
          user.id === editingUsuario.id ? { ...user, ...updatedUsuario, proyectosData: values.proyectos.map(projId => proyectos.find(p => p.id === projId)) } : user
        );
        setUsuarios(updatedUsuarios);
        setEditingUsuario(null);
        await profileService.updateProfile(editingUsuario.id, updatedUsuario);
      } else {
        const newUsuario = {
          email: values.email,
          phone: values.phone,
          firstName: values.firstName,
          lastName: values.lastName,
          proyectos: selectedProyectosRefs,
          proyectosData: values.proyectos.map(projId => proyectos.find(p => p.id === projId)),
        };
        const createdUsuario = await profileService.createProfile(newUsuario, empresa);
        setUsuarios([...usuarios, createdUsuario]);
      }
      resetForm();
      setIsDialogOpen(false);
      setIsLoading(false);
    },
  });

  const handleOpenDialog = () => {
    setEditingUsuario(null);
    formik.resetForm();
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setEditingUsuario(null);
    formik.resetForm();
    setIsDialogOpen(false);
  };

  const startEditUsuario = (usuario) => {
    setEditingUsuario(usuario);
    formik.setFieldValue('email', usuario.email, false);
    formik.setFieldValue('phone', usuario.phone, false);
    formik.setFieldValue('firstName', usuario.firstName, false);
    formik.setFieldValue('lastName', usuario.lastName, false);
    formik.setFieldValue('proyectos', usuario.proyectosData.map(proj => proj.id), false);
    setIsDialogOpen(true);
  };

  const eliminarUsuario = async (id) => {
    setIsLoading(true);
    const updatedUsuarios = usuarios.filter((user) => user.id !== id);
    setUsuarios(updatedUsuarios);
    await profileService.deleteProfile(id);
    setIsLoading(false);
  };

  return (
    <div>
      <Card>
        <CardHeader title="Gestionar Usuarios" />
        <Divider />
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>WhatsApp</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Apellido</TableCell>
                  <TableCell>Código de Confirmación</TableCell>
                  <TableCell>Confirmado</TableCell>
                  <TableCell>Proyectos</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {usuarios.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell>{usuario.email}</TableCell>
                    <TableCell>{usuario.phone}</TableCell>
                    <TableCell>{usuario.firstName}</TableCell>
                    <TableCell>{usuario.lastName}</TableCell>
                    <TableCell>{usuario.confirmationCode}</TableCell>
                    <TableCell>{usuario.confirmed ? "Sí" : "No"}</TableCell>
                    <TableCell>
                      {usuario.proyectosData.map(project => (
                        <Typography key={project.id}>{project.nombre}</Typography>
                      ))}
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => startEditUsuario(usuario)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => eliminarUsuario(usuario.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Button startIcon={<AddCircleIcon />} color="primary" variant="contained" onClick={handleOpenDialog}>
            Agregar Usuario
          </Button>
        </CardContent>
        {isLoading && <LinearProgress />}
      </Card>

      <Dialog open={isDialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>{editingUsuario ? "Editar Usuario" : "Agregar Usuario"}</DialogTitle>
        <form onSubmit={formik.handleSubmit}>
          <DialogContent>
            <TextField
              fullWidth
              margin="dense"
              name="email"
              label="Email"
              value={formik.values.email}
              onChange={formik.handleChange}
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && formik.errors.email}
            />
            <TextField
              fullWidth
              margin="dense"
              name="phone"
              label="WhatsApp"
              value={formik.values.phone}
              onChange={formik.handleChange}
              error={formik.touched.phone && Boolean(formik.errors.phone)}
              helperText={formik.touched.phone && formik.errors.phone}
            />
            <TextField
              fullWidth
              margin="dense"
              name="firstName"
              label="Nombre"
              value={formik.values.firstName}
              onChange={formik.handleChange}
              error={formik.touched.firstName && Boolean(formik.errors.firstName)}
              helperText={formik.touched.firstName && formik.errors.firstName}
            />
            <TextField
              fullWidth
              margin="dense"
              name="lastName"
              label="Apellido"
              value={formik.values.lastName}
              onChange={formik.handleChange}
              error={formik.touched.lastName && Boolean(formik.errors.lastName)}
              helperText={formik.touched.lastName && formik.errors.lastName}
            />
            <FormControl fullWidth margin="dense">
              <InputLabel>Proyectos</InputLabel>
              <Select
                multiple
                value={formik.values.proyectos}
                onChange={formik.handleChange}
                name="proyectos"
                renderValue={(selected) => selected.map((projId) => {
                  const project = proyectos.find(p => p.id === projId);
                  return project ? project.nombre : '';
                }).join(', ')}
              >
                {proyectos.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} color="secondary">
              Cancelar
            </Button>
            <Button type="submit" color="primary">
              {editingUsuario ? "Guardar Cambios" : "Agregar"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  );
};
