import React, { useState, useEffect } from 'react';
import profileService from 'src/services/profileService';
import {
  Typography, Button, Card, CardContent, CardActions, CardHeader, Divider, IconButton, LinearProgress, TextField, Select, MenuItem, InputLabel, FormControl,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Dialog, DialogActions, DialogContent, DialogTitle, Snackbar, Alert
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { getProyectosByEmpresa, getProyectosFromUser } from 'src/services/proyectosService';
import { doc } from 'firebase/firestore';
import { db } from 'src/config/firebase';

function reemplazarUndefined(obj) {
  if (Array.isArray(obj)) {
    return obj.map(item => reemplazarUndefined(item));
  }

  if (typeof obj === 'object' && obj !== null) {
    const nuevoObj = {};
    for (const key in obj) {
      if (obj[key] === undefined) {
        nuevoObj[key] = "";
      } else {
        nuevoObj[key] = reemplazarUndefined(obj[key]);
      }
    }
    return nuevoObj;
  }

  return obj;
}


export const UsuariosDetails = ({ empresa }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [editingUsuario, setEditingUsuario] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  useEffect(() => {
    const fetchProfiles = async () => {
      setIsLoading(true);
      const profiles = await profileService.getProfileByEmpresa(empresa.id);

      const profilesWithProjects = await Promise.all(profiles.map(async (prof) => {
        prof.proyectosData = await getProyectosFromUser(prof);
        return prof;
      }));
      console.log(profiles)
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
      tipo_validacion_remito: editingUsuario ? editingUsuario.tipo_validacion_remito : "",
      default_caja_chica: editingUsuario ? editingUsuario.default_caja_chica : null,
      notificacion_nota_pedido: editingUsuario ? editingUsuario.notificacion_nota_pedido : false,
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
      values = reemplazarUndefined(values);
      try {
        const selectedProyectosRefs = values.proyectos.map(projId => doc(db, 'proyectos', projId));
        if (editingUsuario) {
          const updatedUsuario = { ...values, proyectos: selectedProyectosRefs };
          console.log(updatedUsuario, "updatedUsuario")
          const updatedUsuarios = usuarios.map((user) =>
            user.id === editingUsuario.id ? { ...user, ...updatedUsuario, proyectosData: values.proyectos.map(projId => proyectos.find(p => p.id === projId)) } : user
          );
          setUsuarios(updatedUsuarios);
          const result = await profileService.updateProfile(editingUsuario.id, updatedUsuario);
          console.log(result, "result")
          setSnackbarMessage('Usuario actualizado con éxito');
        } else {
          const newUsuario = {
            email: values.email,
            phone: values.phone,
            firstName: values.firstName,
            lastName: values.lastName,
            proyectos: selectedProyectosRefs,
            proyectosData: values.proyectos.map(projId => proyectos.find(p => p.id === projId)),
            tipo_validacion_remito: values.tipo_validacion_remito ?? "",
            default_caja_chica: values.default_caja_chica,
            notificacion_nota_pedido: values.notificacion_nota_pedido || false,
          };
          const createdUsuario = await profileService.createProfile(newUsuario, empresa);
          setUsuarios([...usuarios, createdUsuario]);
          setSnackbarMessage('Usuario agregado con éxito');
        }
        setSnackbarSeverity('success');
      } catch (error) {
        console.error('Error al actualizar/agregar el usuario:', error);
        setSnackbarMessage('Error al actualizar/agregar el usuario');
        setSnackbarSeverity('error');
      } finally {
        setSnackbarOpen(true);
        resetForm();
        setIsDialogOpen(false);
        setIsLoading(false);
        setEditingUsuario(null);
      }
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
    formik.setValues({
      email: usuario.email,
      phone: usuario.phone,
      firstName: usuario.firstName,
      lastName: usuario.lastName,
      proyectos: usuario.proyectosData.map(proj => proj.id),
      tipo_validacion_remito: usuario.tipo_validacion_remito ?? "",
      notificacion_nota_pedido: usuario.notificacion_nota_pedido || false,
    });
    setIsDialogOpen(true);
  };

  const confirmarEliminacion = (message, action) => {
    setConfirmMessage(message);
    setConfirmAction(() => () => {
      action();
      setConfirmOpen(false);
    });
    setConfirmOpen(true);
  };

  const eliminarUsuario = async (id) => {
    confirmarEliminacion(`¿Estás seguro de que deseas eliminar este usuario?`, async () => {
      setIsLoading(true);
      try {
        const updatedUsuarios = usuarios.filter((user) => user.id !== id);
        setUsuarios(updatedUsuarios);
        await profileService.deleteProfile(id);
        setSnackbarMessage('Usuario eliminado con éxito');
        setSnackbarSeverity('success');
      } catch (error) {
        console.error('Error al eliminar usuario:', error);
        setSnackbarMessage('Error al eliminar usuario');
        setSnackbarSeverity('error');
      } finally {
        setSnackbarOpen(true);
        setIsLoading(false);
      }
    });
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
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
                  <TableCell>Validación Remito</TableCell>
                  <TableCell>Código de Confirmación</TableCell>
                  <TableCell>Confirmado</TableCell>
                  <TableCell>Proyectos</TableCell>
                  <TableCell>Caja chica</TableCell>
                  <TableCell>Notificación Nota Pedido</TableCell>
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
                    <TableCell>{usuario.tipo_validacion_remito}</TableCell>
                    <TableCell>{"https://admin.sorbydata.com/auth/register/?code=" + usuario.confirmationCode}</TableCell>
                    <TableCell>{usuario.confirmed ? "Sí" : "No"}</TableCell>
                    <TableCell>
                      {usuario.proyectosData.map(project => (
                        <Typography key={project.id}>{project.nombre}</Typography>
                      ))}
                    </TableCell>
                    <TableCell>{usuario.default_caja_chica ? "Si" : (usuario.default_caja_chica == false ? "No": "No definido")}</TableCell>
                    <TableCell>{usuario.notificacion_nota_pedido ? "Si" : (usuario.notificacion_nota_pedido == false ? "No": "No definido")}</TableCell>
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
            <FormControl fullWidth margin="dense">
              <InputLabel id="tipo-validacion-label">Validación de remito</InputLabel>
              <Select
                labelId="tipo-validacion-label"
                name="tipo_validacion_remito"
                value={formik.values.tipo_validacion_remito}
                onChange={formik.handleChange}
              >
                <MenuItem value="web">Web</MenuItem>
                <MenuItem value="whatsapp">WhatsApp</MenuItem>
                <MenuItem value="">No Definido</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="dense">
              <InputLabel id="default-caja-chica-label">Caja chica por defecto</InputLabel>
              <Select
                labelId="default-caja-chica-label"
                name="default_caja_chica"
                value={formik.values.default_caja_chica}
                onChange={formik.handleChange}
              >
                <MenuItem value={true}>Sí</MenuItem>
                <MenuItem value={false}>No</MenuItem>
                <MenuItem value={null}>Ninguno</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="dense">
              <InputLabel id="default-caja-chica-label">Notificación Nota Pedido</InputLabel>
              <Select
                labelId="default-caja-chica-label"
                name="notificacion_nota_pedido"
                value={formik.values.notificacion_nota_pedido}
                onChange={formik.handleChange}
              >
                <MenuItem value={true}>Sí</MenuItem>
                <MenuItem value={false}>No</MenuItem>
                <MenuItem value={null}>Ninguno</MenuItem>
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

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirmación</DialogTitle>
        <DialogContent>
          <Typography>{confirmMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} color="primary">
            Cancelar
          </Button>
          <Button
            onClick={confirmAction}
            color="primary"
            variant="contained"
          >
            Confirmar
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
    </div>
  );
};
