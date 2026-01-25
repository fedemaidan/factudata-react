import React, { useState, useEffect, useMemo } from 'react';
import profileService from 'src/services/profileService';
import {
  Typography, Button, Card, CardContent, CardActions, CardHeader, Divider, IconButton, LinearProgress, TextField, Select, MenuItem, InputLabel, FormControl,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Dialog, DialogActions, DialogContent, DialogTitle, Snackbar, Alert, Box, Autocomplete
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { getProyectosByEmpresa, getProyectosFromUser } from 'src/services/proyectosService';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Link from '@mui/material/Link';
import Tooltip from '@mui/material/Tooltip';
import { green } from '@mui/material/colors';
import templateService from 'src/services/templateService';

const normalizePhone = (phone) => (phone || '').toString().replace(/[^\d]/g, '');

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
  const [dupEmpresaLink, setDupEmpresaLink] = useState(null);
  const [dupEmpresaName, setDupEmpresaName] = useState('');

  // Estados para envío de templates
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateUsuario, setTemplateUsuario] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    nombre: '',
    proveedorEjemplo: '',
    proyectoEjemplo: '',
    fechaEnvio: '',
    horaEnvio: '',
    enviarAhora: true
  });

  // Opciones de proveedores desde la empresa
  const proveedoresOptions = useMemo(() => {
    if (empresa?.proveedores_data?.length > 0) {
      return empresa.proveedores_data.map(p => p?.nombre).filter(Boolean);
    }
    return (empresa?.proveedores || []).filter(Boolean);
  }, [empresa]);

  // Opciones de proyectos (nombres)
  const proyectosOptions = useMemo(() => {
    return proyectos.filter(p => p?.nombre).map(p => p.nombre).filter(Boolean);
  }, [proyectos]);

  const { user } = useAuthContext();
  useEffect(() => {
    const fetchProfiles = async () => {
      setIsLoading(true);
      const profiles = await profileService.getProfileByEmpresa(empresa.id);

      const profilesWithProjects = await Promise.all(profiles.map(async (prof) => {
        prof.proyectosData = await getProyectosFromUser(prof);
        return prof;
      }));
      
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
      proyectos: editingUsuario ? editingUsuario.proyectosData.map(proj => proj?.id) : [],
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
      let existeDuplicado;
      try {
        const phoneTrim = (values.phone || '').trim();
    const phoneNorm = normalizePhone(phoneTrim);

    const otherProfile = await profileService.getProfileByPhone(phoneNorm);
    existeDuplicado = otherProfile && (editingUsuario && otherProfile.id !== editingUsuario.id || !editingUsuario);

    if (existeDuplicado) {
      setSnackbarMessage('Ya existe un usuario con ese WhatsApp.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setIsLoading(false);
      if (user?.admin) {
        const empresa = await getEmpresaDetailsFromUser(otherProfile);
        if (empresa?.id) {
          setDupEmpresaLink(`https://admin.sorbydata.com/empresa/?empresaId=${empresa.id}`);
          setDupEmpresaName(empresa?.nombre || '');
        }
      }
      return;
    }
        if (editingUsuario) {
          const updatedUsuario = { ...values };
          const updatedUsuarios = usuarios.map((user) =>
            user.id === editingUsuario.id ? { ...user, ...updatedUsuario, proyectosData: values.proyectos.map(projId => proyectos.find(p => p.id === projId)) } : user
          );
          setUsuarios(updatedUsuarios);
          const result = await profileService.updateProfile(editingUsuario.id, updatedUsuario);
          console.log(result, "result")
          setSnackbarMessage('Usuario actualizado con éxito');
        } else {
          const newUsuario = {
            email: values.email.trim(),
            phone: phoneTrim,                 
            firstName: values.firstName,
            lastName: values.lastName,
            proyectos: values.proyectos,
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
        
        if (!existeDuplicado) {
          resetForm();
          setIsDialogOpen(false);
        }
          
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
      proyectos: usuario.proyectosData.map(proj => proj?.id),
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
    setDupEmpresaLink(null);
    setDupEmpresaName('');
  };

  // Funciones para envío de templates
  const openTemplateDialog = (usuario) => {
    // Pre-cargar datos del usuario y empresa
    const primerProyecto = usuario.proyectosData?.find(p => p?.nombre)?.nombre || '';
    setTemplateUsuario(usuario);
    setTemplateForm({
      nombre: usuario.firstName || '',
      proveedorEjemplo: empresa?.proveedores?.[0]?.nombre || 'Proveedor Ejemplo',
      proyectoEjemplo: primerProyecto || 'Proyecto Ejemplo',
      fechaEnvio: '',
      horaEnvio: '',
      enviarAhora: true
    });
    setTemplateDialogOpen(true);
  };

  const closeTemplateDialog = () => {
    setTemplateDialogOpen(false);
    setTemplateUsuario(null);
  };

  const handleTemplateFormChange = (field) => (e) => {
    const value = field === 'enviarAhora' ? e.target.value === 'true' : e.target.value;
    setTemplateForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSendTemplate = async () => {
    if (!templateUsuario) return;

    const { nombre, proveedorEjemplo, proyectoEjemplo, fechaEnvio, horaEnvio, enviarAhora } = templateForm;

    if (!nombre || !proveedorEjemplo || !proyectoEjemplo) {
      setSnackbarMessage('Todos los campos son requeridos');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        phone: normalizePhone(templateUsuario.phone),
        nombre,
        proveedorEjemplo,
        proyectoEjemplo
      };

      // Si no es envío inmediato, agregar fecha programada
      if (!enviarAhora && fechaEnvio && horaEnvio) {
        payload.fechaEnvio = new Date(`${fechaEnvio}T${horaEnvio}:00`).toISOString();
      }

      await templateService.sendBienvenidaPrimerEgreso(payload);

      setSnackbarMessage(enviarAhora 
        ? 'Template enviado correctamente' 
        : `Template programado para ${fechaEnvio} a las ${horaEnvio}`
      );
      setSnackbarSeverity('success');
      closeTemplateDialog();
    } catch (error) {
      console.error('Error enviando template:', error);
      setSnackbarMessage(error.response?.data?.error || 'Error al enviar el template');
      setSnackbarSeverity('error');
    } finally {
      setSnackbarOpen(true);
      setIsLoading(false);
    }
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
                  <TableCell>Validó email</TableCell>
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
                    <TableCell align="center">
  {usuario.confirmed ? (
    <CheckCircleIcon sx={{ color: green[500] }} />
  ) : (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
      <Link
        href={`https://admin.sorbydata.com/auth/register/?code=${usuario.confirmationCode}`}
        underline="hover"
        color="primary"
      >
        Link de registro
      </Link>
      <Tooltip title="Copiar mensaje">
        <IconButton
          size="small"
          onClick={() => {
            const mensaje = `Hola ${usuario.firstName || ''} ${usuario.lastName || ''}, con email ${usuario.email || ''}, te comparto el link para que puedas registrarte en Sorbydata. El email podés modificarlo ahí mismo.\n\nImportante: Recordá que cada link es único.\n\nhttps://admin.sorbydata.com/auth/register/?code=${usuario.confirmationCode}`;
            navigator.clipboard.writeText(mensaje);
          }}
        >
          <ContentCopyIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  )}
</TableCell>

                    <TableCell>
                      {usuario.proyectosData.filter(
                        project => project && project.nombre
                      ).map(project => (
                        <Typography key={project?.id}>{project?.nombre}</Typography>
                      ))}
                    </TableCell>
                    <TableCell>{usuario.default_caja_chica ? "Si" : (usuario.default_caja_chica == false ? "No": "No definido")}</TableCell>
                    <TableCell>{usuario.notificacion_nota_pedido ? "Si" : (usuario.notificacion_nota_pedido == false ? "No": "No definido")}</TableCell>
                    <TableCell>
                      <Tooltip title="Editar usuario">
                        <IconButton onClick={() => startEditUsuario(usuario)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Enviar template de bienvenida">
                        <IconButton onClick={() => openTemplateDialog(usuario)} color="primary">
                          <SendIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar usuario">
                        <IconButton onClick={() => eliminarUsuario(usuario.id)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
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
                  <MenuItem key={project?.id} value={project?.id}>
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

      {/* Dialog para enviar template de bienvenida */}
      <Dialog open={templateDialogOpen} onClose={closeTemplateDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Enviar Template de Bienvenida</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enviar a: <strong>{templateUsuario?.firstName} {templateUsuario?.lastName}</strong> ({templateUsuario?.phone})
            </Typography>

            <TextField
              fullWidth
              margin="dense"
              label="Nombre del usuario ({{1}})"
              value={templateForm.nombre}
              onChange={handleTemplateFormChange('nombre')}
              helperText="Cómo se va a saludar al usuario"
            />

            <Autocomplete
              freeSolo
              options={proveedoresOptions}
              value={templateForm.proveedorEjemplo}
              onChange={(_, newValue) => setTemplateForm(prev => ({ ...prev, proveedorEjemplo: newValue || '' }))}
              onInputChange={(_, newValue) => setTemplateForm(prev => ({ ...prev, proveedorEjemplo: newValue || '' }))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  margin="dense"
                  label="Proveedor de ejemplo ({{2}})"
                  helperText={proveedoresOptions.length > 0 
                    ? "Seleccioná uno existente o escribí uno nuevo" 
                    : "Ej: Ferretería López, Corralón Norte"}
                />
              )}
            />

            <Autocomplete
              freeSolo
              options={proyectosOptions}
              value={templateForm.proyectoEjemplo}
              onChange={(_, newValue) => setTemplateForm(prev => ({ ...prev, proyectoEjemplo: newValue || '' }))}
              onInputChange={(_, newValue) => setTemplateForm(prev => ({ ...prev, proyectoEjemplo: newValue || '' }))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  margin="dense"
                  label="Proyecto de ejemplo ({{3}})"
                  helperText={proyectosOptions.length > 0 
                    ? "Seleccioná uno existente o escribí uno nuevo" 
                    : "Ej: Obra Av. Corrientes, Edificio Centro"}
                />
              )}
            />

            <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
              <InputLabel>¿Cuándo enviar?</InputLabel>
              <Select
                value={templateForm.enviarAhora}
                onChange={handleTemplateFormChange('enviarAhora')}
                label="¿Cuándo enviar?"
              >
                <MenuItem value={true}>Enviar ahora</MenuItem>
                <MenuItem value={false}>Programar envío</MenuItem>
              </Select>
            </FormControl>

            {!templateForm.enviarAhora && (
              <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                <TextField
                  type="date"
                  label="Fecha"
                  value={templateForm.fechaEnvio}
                  onChange={handleTemplateFormChange('fechaEnvio')}
                  InputLabelProps={{ shrink: true }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  type="time"
                  label="Hora"
                  value={templateForm.horaEnvio}
                  onChange={handleTemplateFormChange('horaEnvio')}
                  InputLabelProps={{ shrink: true }}
                  sx={{ flex: 1 }}
                />
              </Box>
            )}

            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">Vista previa:</Typography>
              <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-line' }}>
                {`¡Hola ${templateForm.nombre || '{{1}}'}! Soy Sorby 👋

Voy a ser tu asistente para registrar gastos y egresos de forma simple.

¿Arrancamos con tu primer registro? Es muy fácil 🙌

Simplemente mandame:

📸 Una foto de un ticket, factura o comprobante
🎙️ Un audio contándome el gasto
✍️ O escribime algo como: "Pagué 15.000 a ${templateForm.proveedorEjemplo || '{{2}}'} para ${templateForm.proyectoEjemplo || '{{3}}'}"

Probá ahora, te espero acá 👇`}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeTemplateDialog} color="secondary">
            Cancelar
          </Button>
          <Button 
            onClick={handleSendTemplate} 
            color="primary" 
            variant="contained"
            startIcon={<SendIcon />}
            disabled={isLoading}
          >
            {templateForm.enviarAhora ? 'Enviar ahora' : 'Programar envío'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={dupEmpresaLink ? null : 6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
         <Alert
            onClose={handleSnackbarClose}
            severity={snackbarSeverity}
            sx={{ width: '100%' }}
            action={
              dupEmpresaLink ? (
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => window.open(dupEmpresaLink, '_blank')}
                >
                  Ver empresa{dupEmpresaName ? ` (${dupEmpresaName})` : ''}
                </Button>
              ) : null
            }
          >
            {snackbarMessage}
          </Alert>
      </Snackbar>
    </div>
  );
};
