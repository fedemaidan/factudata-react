import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Link,
  Snackbar,
  Alert,
  LinearProgress,
  useMediaQuery,
  useTheme,
  IconButton,
  Chip,
  Stack,
  Checkbox,
  ListItemText
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import BusinessIcon from '@mui/icons-material/Business';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { green } from '@mui/material/colors';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import profileService from 'src/services/profileService';
import { getProyectosByEmpresa, getProyectosFromUser } from 'src/services/proyectosService';
import { getEmpresaDetailsFromUser, getEmpresaById } from 'src/services/empresaService';
import { useAuthContext } from 'src/contexts/auth-context';
import Tooltip from '@mui/material/Tooltip';

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

/**
 * Componente de diálogo para editar/crear usuario
 * Reutilizable desde conversaciones y desde la vista de empresa
 * 
 * @param {boolean} open - Si el diálogo está abierto
 * @param {function} onClose - Función para cerrar el diálogo
 * @param {object} usuario - Usuario a editar (null para crear nuevo)
 * @param {object} empresa - Empresa asociada (requerida para crear)
 * @param {string} phone - Teléfono para buscar usuario (solo si usuario es null)
 * @param {array} proyectos - Lista de proyectos (opcional, se carga si no se pasa)
 * @param {function} onSuccess - Callback cuando se guarda exitosamente
 * @param {boolean} showPermisos - Mostrar selector de permisos (para adminBasico)
 */
export default function UserConfigDialog({ 
  open, 
  onClose, 
  usuario = null,
  empresa = null,
  phone = '',
  proyectos: proyectosProp = null,
  onSuccess,
  showPermisos = false
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuthContext();
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [proyectos, setProyectos] = useState(proyectosProp || []);
  const [empresaData, setEmpresaData] = useState(empresa);
  const [editingUsuario, setEditingUsuario] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [dupEmpresaLink, setDupEmpresaLink] = useState(null);
  const [dupEmpresaName, setDupEmpresaName] = useState('');

  // Permisos de la empresa (para adminBasico)
  const permisosEmpresa = empresaData?.acciones || [];

  // Cargar datos cuando se abre el diálogo - usando misma lógica que usuariosDetails.js
  useEffect(() => {
    if (!open) return;
    
    const fetchEmpresa = async () => {
      // Obtener el ID de la empresa (puede venir como id o _id)
      const empresaId = empresa?.id || empresa?._id;
      if (!empresaId) return null;
      
      const empresaCompleta = await getEmpresaById(empresaId);
      setEmpresaData(empresaCompleta);
      return empresaCompleta;
    };
    
    const fetchProyectos = async (emp) => {
      if (!emp) return;
      // Exactamente igual que en usuariosDetails.js
      const proyectosList = await getProyectosByEmpresa(emp);
      setProyectos(proyectosList || []);
    };
    
    const fetchUsuario = async () => {
      if (usuario) {
        // Si ya tenemos el usuario, cargar sus proyectosData
        const proyectosData = await getProyectosFromUser(usuario).catch(() => []);
        setEditingUsuario({ ...usuario, proyectosData });
        return;
      }
      
      if (phone) {
        // Buscar usuario por teléfono
        const normalizedPhone = normalizePhone(phone);
        const foundProfile = await profileService.getProfileByPhone(normalizedPhone);
        if (foundProfile) {
          const proyectosData = await getProyectosFromUser(foundProfile).catch(() => []);
          setEditingUsuario({ ...foundProfile, proyectosData });
        } else {
          setEditingUsuario(null);
        }
      }
    };
    
    const loadAll = async () => {
      setLoadingData(true);
      try {
        // Cargar empresa completa primero
        const empresaCompleta = await fetchEmpresa();
        // Cargar proyectos y usuario en paralelo
        await Promise.all([
          fetchProyectos(empresaCompleta),
          fetchUsuario()
        ]);
      } catch (error) {
        console.error('Error al cargar datos:', error);
        setSnackbarMessage('Error al cargar datos');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      } finally {
        setLoadingData(false);
      }
    };
    
    loadAll();
  }, [open, empresa?.id, empresa?._id, usuario, phone]);

  // Extraer IDs de proyectos del usuario
  const getProyectosIds = (usr) => {
    if (!usr) return [];
    
    // Si tiene proyectosData ya resueltos
    if (usr.proyectosData?.length) {
      return usr.proyectosData.map(proj => proj?.id).filter(Boolean);
    }
    
    // Si tiene proyectos
    if (usr.proyectos?.length) {
      return usr.proyectos.map(p => {
        // Si es un string directo (ID)
        if (typeof p === 'string') return p;
        // Si es un objeto con id
        if (p?.id) return p.id;
        // Si es una referencia de Firestore con _key
        if (p?._key?.path?.segments) {
          const segments = p._key.path.segments;
          const offset = p._key.path.offset || 0;
          const len = p._key.path.len || segments.length;
          // El ID está en la última posición del path
          return segments[offset + len - 1];
        }
        return null;
      }).filter(Boolean);
    }
    
    return [];
  };

  const formik = useFormik({
    initialValues: {
      email: editingUsuario?.email || '',
      phone: editingUsuario?.phone || phone || '',
      firstName: editingUsuario?.firstName || '',
      lastName: editingUsuario?.lastName || '',
      proyectos: getProyectosIds(editingUsuario),
      tipo_validacion_remito: editingUsuario?.tipo_validacion_remito ?? '',
      default_caja_chica: editingUsuario?.default_caja_chica ?? null,
      notificacion_nota_pedido: editingUsuario?.notificacion_nota_pedido ?? false,
      // Para permisos (adminBasico)
      permisosAsignados: editingUsuario?.acciones || permisosEmpresa,
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      email: Yup.string().email('El email no es válido').required('El email es requerido'),
      phone: Yup.string().required('El WhatsApp es requerido'),
      firstName: Yup.string().required('El nombre es requerido'),
      lastName: Yup.string().required('El apellido es requerido'),
    }),
    onSubmit: async (values, { resetForm }) => {
      setIsLoading(true);
      const cleanValues = reemplazarUndefined(values);
      let existeDuplicado = false;
      
      try {
        const phoneTrim = (cleanValues.phone || '').trim();
        const phoneNorm = normalizePhone(phoneTrim);

        // Verificar duplicados solo si es usuario nuevo o cambió el teléfono
        if (!editingUsuario || phoneNorm !== normalizePhone(editingUsuario.phone || '')) {
          const otherProfile = await profileService.getProfileByPhone(phoneNorm);
          existeDuplicado = otherProfile && (
            (editingUsuario && otherProfile.id !== editingUsuario.id) || !editingUsuario
          );

          if (existeDuplicado) {
            setSnackbarMessage('Ya existe un usuario con ese WhatsApp.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            
            if (user?.admin) {
              const dupEmpresa = await getEmpresaDetailsFromUser(otherProfile);
              if (dupEmpresa?.id) {
                setDupEmpresaLink(`https://admin.sorbydata.com/empresa/?empresaId=${dupEmpresa.id}`);
                setDupEmpresaName(dupEmpresa?.nombre || '');
              }
            }
            setIsLoading(false);
            return;
          }
        }

        // Preparar datos para guardar
        const dataToSave = {
          email: cleanValues.email.trim(),
          phone: phoneTrim,
          firstName: cleanValues.firstName,
          lastName: cleanValues.lastName,
          proyectos: cleanValues.proyectos,
          tipo_validacion_remito: cleanValues.tipo_validacion_remito ?? '',
          default_caja_chica: cleanValues.default_caja_chica,
          notificacion_nota_pedido: cleanValues.notificacion_nota_pedido ?? false,
        };

        // Agregar permisos si es necesario
        if (showPermisos) {
          const permisosOcultos = permisosEmpresa.filter(p => !cleanValues.permisosAsignados?.includes(p));
          dataToSave.permisosOcultos = permisosOcultos;
          dataToSave.acciones = cleanValues.permisosAsignados;
        }

        if (editingUsuario) {
          // Actualizar perfil existente
          const result = await profileService.updateProfile(editingUsuario.id, dataToSave);
          if (result) {
            setSnackbarMessage('Usuario actualizado con éxito');
            setSnackbarSeverity('success');
          } else {
            throw new Error('No se pudo actualizar el perfil');
          }
        } else if (empresaData) {
          // Crear nuevo perfil
          const createdUsuario = await profileService.createProfile(dataToSave, empresaData);
          if (createdUsuario) {
            setSnackbarMessage('Usuario creado con éxito');
            setSnackbarSeverity('success');
          } else {
            throw new Error('No se pudo crear el perfil');
          }
        } else {
          throw new Error('No hay empresa asociada para crear el usuario');
        }
        
        setSnackbarOpen(true);
        
        if (!existeDuplicado) {
          resetForm();
          onSuccess?.();
          onClose();
        }
      } catch (error) {
        console.error('Error al guardar usuario:', error);
        setSnackbarMessage(error.message || 'Error al guardar usuario');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      } finally {
        setIsLoading(false);
      }
    },
  });

  const handleClose = () => {
    formik.resetForm();
    setEditingUsuario(null);
    setDupEmpresaLink(null);
    setDupEmpresaName('');
    onClose();
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
    setDupEmpresaLink(null);
    setDupEmpresaName('');
  };

  const handleCopyInvitation = async () => {
    if (!editingUsuario?.confirmationCode) return;
    
    const url = `https://admin.sorbydata.com/auth/register/?code=${editingUsuario.confirmationCode}`;
    const mensaje =
      `Hola ${editingUsuario.firstName || ''} ${editingUsuario.lastName || ''}, con email ${editingUsuario.email || ''}, ` +
      `te comparto el link para que puedas registrarte en Sorbydata. ` +
      `El email podés modificarlo ahí mismo.\n\n` +
      `Importante: Recordá que cada link es único.\n\n${url}`;

    try {
      await navigator.clipboard.writeText(mensaje);
      setSnackbarMessage('Mensaje de invitación copiado al portapapeles');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (e) {
      setSnackbarMessage('No se pudo copiar el mensaje');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  return (
    <>
      <Dialog 
        open={open} 
        onClose={handleClose} 
        fullScreen={isMobile}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <Typography variant="h6">
                {editingUsuario ? 'Editar Usuario' : 'Crear Usuario'}
              </Typography>
              {empresaData && (
                <Chip
                  icon={<BusinessIcon />}
                  label={empresaData.nombre}
                  size="small"
                  color="primary"
                  variant="outlined"
                  component="a"
                  href={`/empresa?empresaId=${empresaData.id}`}
                  target="_blank"
                  clickable
                  sx={{ maxWidth: 200 }}
                />
              )}
            </Box>
            <IconButton onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        {(loadingData || isLoading) && <LinearProgress />}
        
        <form onSubmit={formik.handleSubmit}>
          <DialogContent>
            {loadingData ? (
              <Box py={4} textAlign="center">
                <Typography color="text.secondary">Cargando datos...</Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {/* Estado de validación de email */}
                {editingUsuario && (
                  <Box display="flex" alignItems="center" gap={1} p={1} bgcolor="action.hover" borderRadius={1}>
                    {editingUsuario.confirmed ? (
                      <>
                        <CheckCircleIcon sx={{ color: green[500] }} />
                        <Typography variant="body2" color="success.main">
                          Email validado
                        </Typography>
                      </>
                    ) : (
                      <>
                        <Typography variant="body2" color="text.secondary">
                          Email no validado
                        </Typography>
                        {editingUsuario.confirmationCode && (
                          <>
                            <Link
                              href={`https://admin.sorbydata.com/auth/register/?code=${editingUsuario.confirmationCode}`}
                              target="_blank"
                              underline="hover"
                              variant="body2"
                            >
                              Link de registro
                            </Link>
                            <Tooltip title="Copiar mensaje de invitación">
                              <IconButton size="small" onClick={handleCopyInvitation}>
                                <ContentCopyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </>
                    )}
                  </Box>
                )}

                <TextField
                  fullWidth
                  name="phone"
                  label="WhatsApp"
                  value={formik.values.phone}
                  onChange={formik.handleChange}
                  error={formik.touched.phone && Boolean(formik.errors.phone)}
                  helperText={formik.touched.phone && formik.errors.phone}
                />
                
                <TextField
                  fullWidth
                  name="email"
                  label="Email"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  error={formik.touched.email && Boolean(formik.errors.email)}
                  helperText={formik.touched.email && formik.errors.email}
                />
                
                <Box display="flex" gap={2}>
                  <TextField
                    fullWidth
                    name="firstName"
                    label="Nombre"
                    value={formik.values.firstName}
                    onChange={formik.handleChange}
                    error={formik.touched.firstName && Boolean(formik.errors.firstName)}
                    helperText={formik.touched.firstName && formik.errors.firstName}
                  />
                  <TextField
                    fullWidth
                    name="lastName"
                    label="Apellido"
                    value={formik.values.lastName}
                    onChange={formik.handleChange}
                    error={formik.touched.lastName && Boolean(formik.errors.lastName)}
                    helperText={formik.touched.lastName && formik.errors.lastName}
                  />
                </Box>
                
                {proyectos.length > 0 ? (
                  <FormControl fullWidth>
                    <InputLabel>Proyectos</InputLabel>
                    <Select
                      multiple
                      value={formik.values.proyectos}
                      onChange={formik.handleChange}
                      name="proyectos"
                      label="Proyectos"
                      renderValue={(selected) => selected.map((projId) => {
                        const project = proyectos.find(p => p.id === projId);
                        return project?.nombre || '';
                      }).filter(Boolean).join(', ')}
                    >
                      {proyectos.map((project) => (
                        <MenuItem key={project?.id} value={project?.id}>
                          <Checkbox checked={formik.values.proyectos.includes(project?.id)} />
                          <ListItemText primary={project?.nombre} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  !loadingData && <Typography variant="body2" color="text.secondary">No hay proyectos disponibles</Typography>
                )}
                
                <FormControl fullWidth>
                  <InputLabel>Validación de remito</InputLabel>
                  <Select
                    name="tipo_validacion_remito"
                    value={formik.values.tipo_validacion_remito}
                    onChange={formik.handleChange}
                    label="Validación de remito"
                  >
                    <MenuItem value="web">Web</MenuItem>
                    <MenuItem value="whatsapp">WhatsApp</MenuItem>
                    <MenuItem value="">No Definido</MenuItem>
                  </Select>
                </FormControl>
                
                <Box display="flex" gap={2}>
                  <FormControl fullWidth>
                    <InputLabel>Caja chica por defecto</InputLabel>
                    <Select
                      name="default_caja_chica"
                      value={formik.values.default_caja_chica}
                      onChange={formik.handleChange}
                      label="Caja chica por defecto"
                    >
                      <MenuItem value={true}>Sí</MenuItem>
                      <MenuItem value={false}>No</MenuItem>
                      <MenuItem value={null}>Ninguno</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControl fullWidth>
                    <InputLabel>Notificación NP</InputLabel>
                    <Select
                      name="notificacion_nota_pedido"
                      value={formik.values.notificacion_nota_pedido}
                      onChange={formik.handleChange}
                      label="Notificación NP"
                    >
                      <MenuItem value={true}>Sí</MenuItem>
                      <MenuItem value={false}>No</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {/* Selector de permisos para adminBasico */}
                {showPermisos && permisosEmpresa.length > 0 && (
                  <FormControl fullWidth>
                    <InputLabel>Permisos</InputLabel>
                    <Select
                      multiple
                      name="permisosAsignados"
                      value={formik.values.permisosAsignados}
                      onChange={formik.handleChange}
                      label="Permisos"
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
                )}
              </Stack>
            )}
          </DialogContent>
          
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleClose} color="inherit">
              Cancelar
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={isLoading || loadingData}
            >
              {isLoading ? 'Guardando...' : (editingUsuario ? 'Guardar Cambios' : 'Crear Usuario')}
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
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbarSeverity}
          action={
            dupEmpresaLink && (
              <Button 
                color="inherit" 
                size="small" 
                href={dupEmpresaLink}
                target="_blank"
              >
                Ver en {dupEmpresaName}
              </Button>
            )
          }
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
}
