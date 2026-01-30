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
  Autocomplete,
  Checkbox,
  FormControlLabel,
  FormGroup
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { getProyectosByEmpresa, getProyectosFromUser, hasPermission, updateProyecto, crearProyecto, subirCSVProyecto, otorgarPermisosDriveProyecto  } from 'src/services/proyectosService';
import { getEmpresaById } from 'src/services/empresaService';
import { useRouter } from 'next/router';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import profileService from 'src/services/profileService';

export const ProyectosDetails = ({ empresa, refreshEmpresa }) => {
  const router = useRouter();
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
  const [restableciendoId, setRestableciendoId] = useState(null);
  const [usuariosEmpresa, setUsuariosEmpresa] = useState([]);

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
      await refreshEmpresa?.();
      const proyectosData = await getProyectosByEmpresa(empresa);
      setProyectos(proyectosData);
      console.error('Error al eliminar el proyecto:', error);
      setSnackbarMessage('Error al eliminar el proyecto');
      setSnackbarSeverity('error');
    } finally {
      setSnackbarOpen(true);
      setProyectoAEliminar(null);
      await refreshEmpresa?.();
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

  const handleImportarCSV = () => {
    router.push(`/importMovimientos?empresaId=${empresa.id}`);
  };
  

  useEffect(() => {
    const fetchEmpresaData = async () => {
      const proyectosData = await getProyectosByEmpresa(empresa);
      setProyectos(proyectosData);
    };

    const fetchUsuarios = async () => {
      const usuarios = await profileService.getProfileByEmpresa(empresa.id);
      // Resolver proyectosData para cada usuario (como en usuariosDetails.js)
      const usuariosConProyectos = await Promise.all(usuarios.map(async (prof) => {
        prof.proyectosData = await getProyectosFromUser(prof);
        return prof;
      }));
      setUsuariosEmpresa(usuariosConProyectos);
    };

    fetchEmpresaData();
    fetchUsuarios();
  }, [empresa]);

  const formik = useFormik({
    initialValues: {
      nombre: '',
      carpetaRef: '',
      proyecto_default_id: '',
      sheetWithClient: '',
      extraSheets: [],
      subproyectos: [],
      usuariosAsignados: []
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
        let proyectoId = editingProyecto?.id;
        let proyectoCreado = null;
        
        if (editingProyecto) {
          await updateProyecto(editingProyecto.id, proyectoData);
          
          // Sincronizar usuarios: agregar a los seleccionados, quitar a los no seleccionados
          const usuariosSeleccionados = values.usuariosAsignados || [];
          
          console.log('=== DEBUG SINCRONIZACIÓN USUARIOS ===');
          console.log('proyectoId:', proyectoId);
          console.log('usuariosSeleccionados:', usuariosSeleccionados);
          
          const updatePromises = usuariosEmpresa.map(async (usuario) => {
            const currentProjects = usuario.proyectosData?.map(p => p?.id).filter(Boolean) || [];
            const tieneProyecto = currentProjects.includes(proyectoId);
            const deberíaTener = usuariosSeleccionados.includes(usuario.id);
            
            console.log(`Usuario ${usuario.id} (${usuario.firstName}): tiene=${tieneProyecto}, debería=${deberíaTener}`);
            
            if (deberíaTener && !tieneProyecto) {
              // Agregar proyecto al usuario
              console.log(`  -> AGREGANDO proyecto a ${usuario.firstName}`);
              return profileService.updateProfile(usuario.id, {
                proyectos: [...currentProjects, proyectoId]
              });
            } else if (!deberíaTener && tieneProyecto) {
              // Quitar proyecto del usuario
              console.log(`  -> QUITANDO proyecto de ${usuario.firstName}`);
              return profileService.updateProfile(usuario.id, {
                proyectos: currentProjects.filter(id => id !== proyectoId)
              });
            }
            return null;
          });
          await Promise.all(updatePromises);
          
          setSnackbarMessage('Proyecto actualizado con éxito');
          setSnackbarSeverity('success');
          setOpenModal(false);
          resetForm();
          setEditingProyecto(null);
          
          // Refrescar datos
          const proyectosData = await getProyectosByEmpresa(empresa);
          setProyectos(proyectosData);
          const usuarios = await profileService.getProfileByEmpresa(empresa.id);
          const usuariosConProyectos = await Promise.all(usuarios.map(async (prof) => {
            prof.proyectosData = await getProyectosFromUser(prof);
            return prof;
          }));
          setUsuariosEmpresa(usuariosConProyectos);
          
        } else {
          // Crear proyecto nuevo
          console.log('=== CREANDO PROYECTO NUEVO ===');
          console.log('proyectoData:', proyectoData);
          
          await crearProyecto(proyectoData, empresa.id);
          console.log('Proyecto creado en backend');
          
          await refreshEmpresa?.();
          console.log('Empresa refrescada');
          
          // Obtener empresa FRESCA del servidor (el prop empresa tiene datos viejos)
          console.log('Obteniendo empresa fresca...');
          const empresaFresca = await getEmpresaById(empresa.id);
          console.log('Empresa fresca:', empresaFresca);
          
          // Refrescar proyectos y usuarios ANTES de abrir el step 2
          console.log('Refrescando proyectos...');
          const proyectosActualizados = await getProyectosByEmpresa(empresaFresca);
          console.log('Proyectos actualizados:', proyectosActualizados);
          setProyectos(proyectosActualizados);
          
          console.log('Refrescando usuarios...');
          const usuariosActualizados = await profileService.getProfileByEmpresa(empresa.id);
          const usuariosConProyectos = await Promise.all(usuariosActualizados.map(async (prof) => {
            prof.proyectosData = await getProyectosFromUser(prof);
            return prof;
          }));
          setUsuariosEmpresa(usuariosConProyectos);
          console.log('Usuarios actualizados:', usuariosConProyectos);
          
          // Buscar el proyecto recién creado por nombre
          console.log('Buscando proyecto por nombre:', values.nombre);
          const proyectoCreado = proyectosActualizados.find(p => p.nombre === values.nombre);
          console.log('Proyecto encontrado:', proyectoCreado);
          
          if (proyectoCreado) {
            console.log('=== ABRIENDO STEP 2 ===');
            
            // Encontrar usuarios que ya tienen este proyecto asignado
            const usuariosConEsteProyecto = usuariosConProyectos.filter(usuario => {
              const proyectosUsuario = usuario.proyectosData?.map(p => p?.id).filter(Boolean) || [];
              return proyectosUsuario.includes(proyectoCreado.id);
            }).map(u => u.id);
            console.log('Usuarios con este proyecto:', usuariosConEsteProyecto);
            
            // Primero resetear y cerrar
            resetForm();
            setOpenModal(false);
            
            // Mostrar snackbar
            setSnackbarMessage('Proyecto creado. Ahora asigná los usuarios.');
            setSnackbarSeverity('info');
            setSnackbarOpen(true);
            setIsLoading(false);
            
            // Usar setTimeout para dar tiempo al React de procesar los cambios
            setTimeout(() => {
              console.log('Abriendo modal de edición...');
              setEditingProyecto(proyectoCreado);
              formik.setValues({
                ...proyectoCreado,
                usuariosAsignados: usuariosConEsteProyecto
              });
              setOpenModal(true);
            }, 300);
            
            return; // Salir aquí, no ejecutar el código de abajo
          } else {
            console.log('No se encontró el proyecto creado');
            setSnackbarMessage('Proyecto creado con éxito.');
            setSnackbarSeverity('success');
            setOpenModal(false);
            resetForm();
            setEditingProyecto(null);
          }
        }
        
      } catch (error) {
        console.error('Error al crear/actualizar el proyecto:', error);
        setSnackbarMessage('Error al crear/actualizar el proyecto');
        setSnackbarSeverity('error');
        setOpenModal(false);
        resetForm();
        setEditingProyecto(null);
      }
      
      setSnackbarOpen(true);
      setIsLoading(false);
    }
  });
 

  const iniciarEdicionProyecto = (proyecto) => {
    setEditingProyecto(proyecto);
    
    // Encontrar usuarios que ya tienen este proyecto asignado (usando proyectosData)
    const usuariosConProyecto = usuariosEmpresa.filter(usuario => {
      const proyectosUsuario = usuario.proyectosData?.map(p => p?.id).filter(Boolean) || [];
      return proyectosUsuario.includes(proyecto.id);
    }).map(u => u.id);
    
    formik.setValues({
      ...proyecto,
      usuariosAsignados: usuariosConProyecto
    });
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
  
  const handleRestablecerPermisos = async (proyectoId) => {
  try {
    setRestableciendoId(proyectoId);
    const ok = await otorgarPermisosDriveProyecto(proyectoId);
    setSnackbarMessage(ok ? 'todo ok' : 'Hubo un problema al restablecer los permisos');
    setSnackbarSeverity(ok ? 'success' : 'error');
  } catch (e) {
    console.error(e);
    setSnackbarMessage('Error al restablecer los permisos');
    setSnackbarSeverity('error');
  } finally {
    setRestableciendoId(null);
    setSnackbarOpen(true);
  }
};

  return (
    <>
      <Card>
        <CardHeader title="Gestionar Proyectos" />
        <Divider />
        <CardContent>
          <List>
            {proyectos.map((proyecto) => (
              <ListItem
                key={proyecto.id}
                divider
                alignItems="flex-start"
                sx={{
                  py: 2,
                  alignItems: 'stretch'
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: { xs: 1.5, sm: 2 },
                    width: '100%'
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <ListItemText
                      primary={
                        <a href={`/cajaProyecto/?proyectoId=${proyecto.id}`} target="_blank" rel="noopener noreferrer">
                          {proyecto.nombre}
                        </a>
                      }
                      secondary={
                        <Box component="span" sx={{ display: 'block' }}>
                          <Typography component="span" variant="body2" display="block">
                            Caja central: {findProyectoNombreById(proyecto.proyecto_default_id)}
                          </Typography>
                          <Typography component="span" variant="body2" display="block">
                            {proyecto.carpetaRef ? (
                              <a
                                href={`https://drive.google.com/drive/folders/${proyecto.carpetaRef}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  marginLeft: '5px',
                                  textDecoration: 'none',
                                  color: '#1a73e8',
                                  fontWeight: 'bold'
                                }}
                              >
                                Link Carpeta
                              </a>
                            ) : (
                              'Carpeta: No asignada'
                            )}
                          </Typography>

                          <Typography component="span" variant="body2" display="block">
                            {proyecto.sheetWithClient ? (
                              <a
                                href={`https://docs.google.com/spreadsheets/d/${proyecto.sheetWithClient}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  marginLeft: '5px',
                                  textDecoration: 'none',
                                  color: '#1a73e8',
                                  fontWeight: 'bold'
                                }}
                              >
                                Link Google Sheet
                              </a>
                            ) : (
                              'Google Sheet No asignado'
                            )}
                          </Typography>

                          <Typography component="span" variant="body2" display="block">
                            Estado: {proyecto.activo ? 'Activo' : 'Inactivo'}
                          </Typography>

                          <Typography component="span" variant="body2" display="block">
                            Sheets Adicionales:
                            {proyecto.extraSheets && proyecto.extraSheets?.length > 0
                              ? proyecto.extraSheets?.map((sheetId, index) => (
                                  <a
                                    key={index}
                                    href={`https://docs.google.com/spreadsheets/d/${sheetId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      marginLeft: '5px',
                                      textDecoration: 'none',
                                      color: '#1a73e8',
                                      fontWeight: 'bold'
                                    }}
                                  >
                                    {` Sheet ${index + 1} `}
                                  </a>
                                ))
                              : ' No asignados'}
                          </Typography>
                        </Box>
                      }
                    />
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: { xs: 'stretch', sm: 'flex-end' },
                      gap: 1,
                      minWidth: { xs: 'auto', sm: 360 }
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: { xs: 'flex-start', sm: 'flex-end' }
                      }}
                    >
                      <Switch
                        checked={proyecto.activo}
                        onChange={() => toggleProyectoActivo(proyecto)}
                        color="primary"
                      />
                      <IconButton edge="end" onClick={() => iniciarEdicionProyecto(proyecto)}>
                        <EditIcon />
                      </IconButton>
                    </Box>

                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 1,
                        justifyContent: { xs: 'flex-start', sm: 'flex-end' }
                      }}
                    >
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
                        >
                          Subir CSV
                        </Button>
                      </label>

                      {selectedFile && uploadProjectId === proyecto.id && (
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          onClick={handleUploadCSV}
                          disabled={uploading}
                        >
                          {uploading ? 'Subiendo...' : 'Cargar'}
                        </Button>
                      )}

                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => setProyectoAEliminar(proyecto)}
                      >
                        Eliminar
                      </Button>

                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleRestablecerPermisos(proyecto.id)}
                        disabled={restableciendoId === proyecto.id}
                      >
                        {restableciendoId === proyecto.id ? 'Procesando…' : 'Restablecer permisos'}
                      </Button>
                    </Box>
                  </Box>
                </Box>

              </ListItem>
            ))}
          </List>
        </CardContent>
        <Divider />
        <CardActions
          sx={{
            justifyContent: 'space-between',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: { xs: 1, sm: 0 }
          }}
        >
          <Button
            color="secondary"
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            onClick={handleImportarCSV}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            Importar CSV
          </Button>
          <Button
            color="primary"
            variant="contained"
            startIcon={<AddCircleIcon />}
            onClick={iniciarCreacionProyecto}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
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

  {/* Solo mostrar sección de usuarios al EDITAR, no al crear */}
  {editingProyecto && (
  <Box sx={{ mt: 3 }}>
    <Typography variant="subtitle1" gutterBottom>
      <PersonAddIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
      Asignar Usuarios al Proyecto
    </Typography>
    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
      <Button
        size="small"
        variant="outlined"
        onClick={() => formik.setFieldValue('usuariosAsignados', usuariosEmpresa.map(u => u.id))}
      >
        Marcar todos
      </Button>
      <Button
        size="small"
        variant="outlined"
        color="secondary"
        onClick={() => formik.setFieldValue('usuariosAsignados', [])}
      >
        Desmarcar todos
      </Button>
    </Box>
    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
      {formik.values.usuariosAsignados?.length || 0} de {usuariosEmpresa.length} usuarios seleccionados
    </Typography>
    <Box 
      sx={{ 
        maxHeight: 200, 
        overflowY: 'auto', 
        border: '1px solid #ccc', 
        borderRadius: 1, 
        p: 1,
        backgroundColor: '#fafafa'
      }}
    >
      <FormGroup>
        {usuariosEmpresa.map((usuario) => {
          const nombre = usuario.firstName || usuario.nombre || '';
          const apellido = usuario.lastName || usuario.apellido || '';
          const email = usuario.email || '';
          const label = `${nombre} ${apellido}`.trim() || email;
          const isChecked = formik.values.usuariosAsignados?.includes(usuario.id) || false;
          
          return (
            <FormControlLabel
              key={usuario.id}
              control={
                <Checkbox
                  checked={isChecked}
                  onChange={(e) => {
                    const currentSelected = formik.values.usuariosAsignados || [];
                    if (e.target.checked) {
                      formik.setFieldValue('usuariosAsignados', [...currentSelected, usuario.id]);
                    } else {
                      formik.setFieldValue('usuariosAsignados', currentSelected.filter(id => id !== usuario.id));
                    }
                  }}
                  size="small"
                />
              }
              label={
                <Box>
                  <Typography variant="body2">{label}</Typography>
                  {email && nombre && <Typography variant="caption" color="text.secondary">{email}</Typography>}
                </Box>
              }
              sx={{ 
                width: '100%', 
                m: 0, 
                py: 0.5,
                '&:hover': { backgroundColor: '#f0f0f0' },
                borderRadius: 1
              }}
            />
          );
        })}
      </FormGroup>
    </Box>
  </Box>
  )}
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
              {editingProyecto ? 'Guardar Cambios' : 'Crear Proyecto'}
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
