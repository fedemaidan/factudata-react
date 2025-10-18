import React, { useEffect, useRef, useState } from 'react';
import {
  Card, CardHeader, Divider, CardContent, TextField, Button, Snackbar, Alert,
  FormControl, InputLabel, Select, MenuItem, Checkbox, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions, Typography, Table, TableHead,
  TableRow, TableCell, TableBody, IconButton, Collapse, FormHelperText, Box
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import profileService from 'src/services/profileService';
import { getProyectosByEmpresa, getProyectosFromUser } from 'src/services/proyectosService';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Link from '@mui/material/Link';
import Tooltip from '@mui/material/Tooltip';
import { green } from '@mui/material/colors';

export const AdminBasico = ({ empresa }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [editingUser, setEditingUser] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, user: null });
  const [showForm, setShowForm] = useState(false);
  const formRef = useRef();
  const permisosEmpresa = empresa.acciones || [];

  const fetchUsuarios = async () => {
    const data = await profileService.getProfileByEmpresa(empresa.id);

    const profilesWithProjects = await Promise.all(data.map(async (prof) => {
      prof.proyectosData = await getProyectosFromUser(prof);
      return prof;
    }));

    setUsuarios(profilesWithProjects);
  };

  const fetchProyectos = async () => {
    const data = await getProyectosByEmpresa(empresa);
    setProyectos(data);
  };

  useEffect(() => {
    fetchUsuarios();
    fetchProyectos();
  }, [empresa.id]);

  const formik = useFormik({
    initialValues: {
      email: '',
      nombre: '',
      apellido: '',
      telefono: '',
      permisosAsignados: permisosEmpresa,
      proyectos: [],
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      email: Yup.string().email('Email inválido').required('Requerido'),
      nombre: Yup.string().required('Requerido'),
      apellido: Yup.string().required('Requerido'),
      telefono: Yup.string().required('Requerido'),
    }),
    onSubmit: async (values, { resetForm }) => {
      const proyectosIds = values.proyectos; // ya son IDs

      const permisosOcultos = permisosEmpresa.filter(p => !values.permisosAsignados?.includes(p));

      const payload = {
        email: values.email,
        firstName: values.nombre,
        lastName: values.apellido,
        phone: values.telefono,
        permisosOcultos,
        proyectos: proyectosIds,
        acciones: values.permisosAsignados
      };

      try {
        if (editingUser) {
          await profileService.updateProfile(editingUser.id, payload);
          setSnackbar({ open: true, message: 'Usuario actualizado con éxito', severity: 'success' });
        } else {
          await profileService.createProfile(payload, empresa);
          setSnackbar({ open: true, message: 'Usuario creado con éxito', severity: 'success' });
        }
        resetForm();
        setEditingUser(null);
        setShowForm(false);
        fetchUsuarios();
      } catch (e) {
        console.error(e);
        setSnackbar({ open: true, message: 'Error al guardar el usuario', severity: 'error' });
      }
    }
  });

  const openEdit = (usuario) => {
    let permisosAsignados;
    console.log(usuario);
    if (usuario.permisosOcultos)
        permisosAsignados = permisosEmpresa.filter(p => !usuario.permisosOcultos.includes(p));
    else
        permisosAsignados = permisosEmpresa || [];

    formik.setValues({
      email: usuario.email || '',
      nombre: usuario.firstName || '',
      apellido: usuario.lastName || '',
      telefono: usuario.phone || '',
      permisosAsignados,
      proyectos: Array.isArray(usuario.proyectos) ? usuario.proyectos.map(p => p.id) : [],
    });
    setEditingUser(usuario);
    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const confirmDelete = (usuario) => {
    setConfirmDialog({ open: true, user: usuario });
  };

  const deleteUser = async () => {
    try {
      await profileService.deleteProfile(confirmDialog.user.id);
      setSnackbar({ open: true, message: 'Usuario eliminado con éxito', severity: 'success' });
      fetchUsuarios();
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: 'Error al eliminar usuario', severity: 'error' });
    } finally {
      setConfirmDialog({ open: false, user: null });
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    formik.resetForm();
    setShowForm(false);
  };

  return (
    <Card>
      <CardHeader title="Gestión de Usuarios" />
      <Divider />

      <CardContent>
        <Button variant="contained" startIcon={<AddCircleIcon />} onClick={() => {
          resetForm();
          setShowForm(true);
        }}>
          Agregar Usuario
        </Button>

        <Collapse in={showForm}>
          <form ref={formRef} onSubmit={formik.handleSubmit} style={{ marginTop: 16 }}>
            <TextField fullWidth label="Email" name="email" margin="dense"
              value={formik.values.email} onChange={formik.handleChange}
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && formik.errors.email}
            />
            <TextField fullWidth label="Nombre" name="nombre" margin="dense"
              value={formik.values.nombre} onChange={formik.handleChange}
              error={formik.touched.nombre && Boolean(formik.errors.nombre)}
              helperText={formik.touched.nombre && formik.errors.nombre}
            />
            <TextField fullWidth label="Apellido" name="apellido" margin="dense"
              value={formik.values.apellido} onChange={formik.handleChange}
              error={formik.touched.apellido && Boolean(formik.errors.apellido)}
              helperText={formik.touched.apellido && formik.errors.apellido}
            />
            <TextField fullWidth label="Teléfono" name="telefono" margin="dense"
              value={formik.values.telefono} onChange={formik.handleChange}
              error={formik.touched.telefono && Boolean(formik.errors.telefono)}
              helperText={formik.touched.telefono && formik.errors.telefono}
            />

            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Proyectos</InputLabel>
              <Select
                multiple
                name="proyectos"
                value={formik.values.proyectos}
                onChange={formik.handleChange}
                renderValue={(selected) => selected.map(id => {
                  const p = proyectos.find(pr => pr.id === id);
                  return p ? p.nombre : id;
                }).join(', ')}
              >
                {proyectos.map(proyecto => (
                  <MenuItem key={proyecto.id} value={proyecto.id}>
                    <Checkbox checked={formik.values.proyectos.includes(proyecto.id)} />
                    <ListItemText primary={proyecto.nombre} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Permisos</InputLabel>
              <Select
                multiple
                name="permisosAsignados"
                value={formik.values.permisosAsignados}
                onChange={formik.handleChange}
                renderValue={(selected) => selected.join(', ')}
              >
                {permisosEmpresa.map((permiso) => (
                  <MenuItem key={permiso} value={permiso}>
                    <Checkbox checked={formik.values.permisosAsignados.includes(permiso)} />
                    <ListItemText primary={permiso} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button type="submit" variant="contained" sx={{ mt: 2 }}>
              {editingUser ? "Guardar Cambios" : "Crear Usuario"}
            </Button>
            <Button variant="text" onClick={resetForm} sx={{ mt: 2, ml: 2 }}>Cancelar</Button>
          </form>
        </Collapse>
      </CardContent>

      <Divider />
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>Usuarios existentes</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Apellido</TableCell>
              <TableCell>Teléfono</TableCell>
              <TableCell>Proyectos</TableCell>
              <TableCell>Validó email</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {usuarios.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.firstName}</TableCell>
                <TableCell>{u.lastName}</TableCell>
                <TableCell>{u.phone}</TableCell>
                <TableCell>{u.proyectosData.map(project => (
                  <Typography key={project.id}>{project.nombre}</Typography>
                ))}</TableCell>
                <TableCell align="center">
                  {u.confirmed ? (
                    <CheckCircleIcon sx={{ color: green[500] }} />
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Link
                        href={`https://admin.sorbydata.com/auth/register/?code=${u.confirmationCode}`}
                        underline="hover"
                        color="primary"
                      >
                        Link de registro
                      </Link>
                      <Tooltip title="Copiar mensaje de invitación">
                        <IconButton
                          size="small"
                          onClick={async () => {
                            const url = `https://admin.sorbydata.com/auth/register/?code=${u.confirmationCode}`;
                            const mensaje =
                              `Hola ${u.firstName || ''} ${u.lastName || ''}, con email ${u.email || ''}, ` +
                              `te comparto el link para que puedas registrarte en Sorbydata. ` +
                              `El email podés modificarlo ahí mismo.\n\n` +
                              `Importante: Recordá que cada link es único.\n\n${url}`;
                
                            try {
                              await navigator.clipboard.writeText(mensaje);
                              setSnackbar({ open: true, message: 'Mensaje de invitación copiado al portapapeles', severity: 'success' });
                            } catch (e) {
                              setSnackbar({ open: true, message: 'No se pudo copiar el mensaje', severity: 'error' });
                            }
                          }}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => openEdit(u)}><EditIcon /></IconButton>
                  <IconButton onClick={() => confirmDelete(u)}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, user: null })}>
        <DialogTitle>¿Eliminar usuario?</DialogTitle>
        <DialogContent>
          <Typography>¿Estás seguro que querés eliminar a {confirmDialog.user?.email}?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, user: null })}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={deleteUser}>Eliminar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Card>
  );
};
