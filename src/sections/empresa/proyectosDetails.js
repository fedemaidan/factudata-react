import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Chip,
  Box,
  Button,
  Card,
  CardHeader,
  Divider,
  TextField,
  IconButton,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Drawer,
  InputAdornment,
  Tooltip,
  Checkbox,
  FormControlLabel,
  Avatar,
  Stack,
  Select,
  MenuItem,
  Menu,
  ListItemIcon,
  FormControl,
  InputLabel,
  Switch,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
  Typography,
  Snackbar,
  Alert
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import LinkIcon from '@mui/icons-material/Link';
import TuneIcon from '@mui/icons-material/Tune';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import SearchIcon from '@mui/icons-material/Search';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import LockResetIcon from '@mui/icons-material/LockReset';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SquareFootOutlinedIcon from '@mui/icons-material/SquareFootOutlined';
import { MONEDAS } from 'src/components/presupuestosProfesionales/constants';
import { getProyectosByEmpresa, getProyectosFromUser, hasPermission, updateProyecto, crearProyecto, subirCSVProyecto, otorgarPermisosDriveProyecto, softDeleteMovimientosByProyectoId } from 'src/services/proyectosService';
import { getEmpresaById } from 'src/services/empresaService';
import { FIREBASE_CLIENT_EMAIL } from 'src/config/env';
import { useRouter } from 'next/router';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import profileService from 'src/services/profileService';

// ── Permisos por acción por usuario × obra (TAR-393) ──
// NOTA: por ahora esto es SOLO visual (frontend). El backend todavía guarda la
// membresía como antes (array de ids en profile.proyectos); las acciones
// quitadas por obra no se persisten hasta implementar la capa de backend
// (profile.permisosOcultosPorProyecto). Modelo = blacklist: por default el
// usuario hereda TODAS las acciones en la obra; se guarda lo que se le QUITÓ.
// Cada ítem del checklist puede agrupar varias acciones reales del backend,
// para simplificarle la decisión al admin (ej. "Cargar egreso" cubre egreso
// simple, prorrateado y en lote). Lo que se persiste sigue siendo la lista de
// acciones reales quitadas por obra.
// Catálogo MAESTRO de todo lo configurable por obra. En el drawer se filtra por
// las acciones que la empresa realmente activó (empresa.acciones): un ítem solo
// aparece si la empresa tiene al menos una de sus acciones reales.
const ACCIONES_OBRA_CATALOGO = [
  { key: 'cargar_egreso',  label: 'Cargar egreso',  grupo: 'Cargar',      acciones: ['CREAR_EGRESO', 'CREAR_EGRESO_SIMPLIFICADO', 'CREAR_EGRESO_PRORATEADO', 'CREAR_EGRESOS_MASIVO'] },
  { key: 'cargar_ingreso', label: 'Cargar ingreso',                                          grupo: 'Cargar',      acciones: ['CREAR_INGRESO', 'CREAR_INGRESO_IMAGEN'] },
  { key: 'ver_obra',       label: 'Ver la obra',    hint: 'saldos y todos los movimientos',  grupo: 'Ver',         acciones: ['VER_CAJAS', 'LISTAR_MOVIMIENTOS'] },
  { key: 'ver_propios',    label: 'Ver solo lo suyo', hint: 'solo los movimientos que cargó él', grupo: 'Ver',     acciones: ['VER_MIS_MOVIMIENTOS'] },
  { key: 'gestionar',      label: 'Editar o eliminar movimientos',                           grupo: 'Operaciones', acciones: ['GESTIONAR_MOVIMIENTO'] },
  { key: 'ajustar',        label: 'Ajustar cajas',                                           grupo: 'Operaciones', acciones: ['AJUSTAR_CAJAS'] },
  { key: 'dolares',        label: 'Comprar y vender dólares',                                grupo: 'Operaciones', acciones: ['COMPRAR_DOLARES', 'VENDER_DOLARES'] },
];
const ORDEN_GRUPOS = ['Cargar', 'Ver', 'Operaciones'];

// Filtra el catálogo maestro a lo que la empresa tiene activado. Cada ítem
// conserva solo sus acciones reales presentes en empresaAcciones, y se descarta
// si no le queda ninguna.
const construirAccionesObra = (empresaAcciones = []) => {
  const activas = new Set(empresaAcciones);
  return ACCIONES_OBRA_CATALOGO
    .map((item) => ({ ...item, acciones: item.acciones.filter((k) => activas.has(k)) }))
    .filter((item) => item.acciones.length > 0);
};

// Colores de marca para los accesos directos (mismo azul que ya se usa en la lista de proyectos).
const DRIVE_BLUE = '#1a73e8';
const SHEET_GREEN = '#0f9d58';

// Link compacto y secundario para abrir una carpeta de Drive o un Google Sheet
// en una pestaña nueva. Más chico que el input y alineado a la derecha.
const AbrirLink = ({ href, icon: LinkIco, label, accent }) => (
  <Button
    component="a"
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    size="small"
    variant="text"
    startIcon={<LinkIco sx={{ fontSize: 15 }} />}
    endIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
    sx={{
      alignSelf: 'flex-end',
      textTransform: 'none',
      fontWeight: 600,
      fontSize: 12.5,
      lineHeight: 1.4,
      py: 0.25,
      px: 1,
      minWidth: 0,
      color: accent,
      '&:hover': { bgcolor: alpha(accent, 0.1) },
    }}
  >
    {label}
  </Button>
);

// Encabezado de sección reutilizable dentro del Drawer.
const Seccion = ({ icon: SeccionIcon, title, hint, action, children }) => (
  <Box>
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: hint ? 0.5 : 1.5 }}>
      <SeccionIcon sx={{ fontSize: 20, color: 'primary.main' }} />
      <Typography variant="subtitle2" sx={{ fontWeight: 700, flexGrow: 1 }}>{title}</Typography>
      {action}
    </Stack>
    {hint && (
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, lineHeight: 1.5 }}>
        {hint}
      </Typography>
    )}
    {children}
  </Box>
);

// Ícono de integración (Drive / Sheets): coloreado y clickeable si está
// conectado; gris y sin interacción si falta el ID.
const IntegracionIcon = ({ conectado, icon: Ico, label, color, href }) => {
  const ico = <Ico sx={{ fontSize: 20 }} />;
  if (!conectado) {
    return (
      <Tooltip title={`${label}: no configurado`} arrow>
        <Box component="span" sx={{ display: 'inline-flex', p: 0.5, color: 'text.disabled' }}>{ico}</Box>
      </Tooltip>
    );
  }
  return (
    <Tooltip title={`Abrir ${label}`} arrow>
      <IconButton size="small" component="a" href={href} target="_blank" rel="noopener noreferrer" sx={{ color }}>
        {ico}
      </IconButton>
    </Tooltip>
  );
};

// Íconos de Drive/Sheets + contador de sheets adicionales.
const Integraciones = ({ proyecto }) => {
  const extra = proyecto.extraSheets?.length || 0;
  return (
    <Stack direction="row" alignItems="center" spacing={0.25}>
      <IntegracionIcon
        conectado={Boolean(proyecto.carpetaRef)}
        icon={FolderOpenOutlinedIcon}
        label="carpeta de Drive"
        color={DRIVE_BLUE}
        href={`https://drive.google.com/drive/folders/${proyecto.carpetaRef}`}
      />
      <IntegracionIcon
        conectado={Boolean(proyecto.sheetWithClient)}
        icon={TableChartOutlinedIcon}
        label="Google Sheet"
        color={SHEET_GREEN}
        href={`https://docs.google.com/spreadsheets/d/${proyecto.sheetWithClient}`}
      />
      {extra > 0 && (
        <Tooltip title={`${extra} ${extra === 1 ? 'sheet adicional' : 'sheets adicionales'}`} arrow>
          <Chip label={`+${extra}`} size="small" variant="outlined" sx={{ height: 20, fontSize: 11, ml: 0.25 }} />
        </Tooltip>
      )}
    </Stack>
  );
};

const EstadoChip = ({ activo }) => (
  <Chip
    size="small"
    label={activo ? 'Activo' : 'Inactivo'}
    sx={{
      height: 20, fontSize: 11, fontWeight: 600, alignSelf: 'flex-start',
      color: activo ? 'success.main' : 'text.secondary',
      bgcolor: (t) => (activo ? alpha(t.palette.success.main, 0.12) : t.palette.action.selected),
    }}
  />
);

const NombreLink = ({ proyecto }) => (
  <Typography
    component="a"
    href={`/cajas?proyectoId=${proyecto.id}`}
    target="_blank"
    rel="noopener noreferrer"
    variant="body2"
    noWrap
    sx={{ fontWeight: 600, color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
  >
    {proyecto.nombre}
  </Typography>
);

// Fila de la tabla (desktop). Memoizada: al tipear en el buscador el padre
// re-renderiza, pero las filas cuyos props no cambian no se vuelven a pintar.
const ProyectoRow = React.memo(function ProyectoRow({ proyecto, cajaCentral, onToggleActivo, onMenuOpen }) {
  return (
    <TableRow hover sx={{ opacity: proyecto.activo ? 1 : 0.55 }}>
      <TableCell sx={{ maxWidth: 220 }}>
        <Stack spacing={0.4}>
          <NombreLink proyecto={proyecto} />
          <EstadoChip activo={proyecto.activo} />
        </Stack>
      </TableCell>
      <TableCell>
        <Typography variant="body2" color={cajaCentral === '—' ? 'text.disabled' : 'text.primary'}>
          {cajaCentral}
        </Typography>
      </TableCell>
      <TableCell><Integraciones proyecto={proyecto} /></TableCell>
      <TableCell align="center">
        <Switch checked={Boolean(proyecto.activo)} onChange={() => onToggleActivo(proyecto)} color="primary" />
      </TableCell>
      <TableCell align="right">
        <IconButton size="small" onClick={(e) => onMenuOpen(e, proyecto)} aria-label="Acciones del proyecto">
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
});

// Card equivalente para mobile (la tabla no entra en teléfono).
const ProyectoCardMobile = React.memo(function ProyectoCardMobile({ proyecto, cajaCentral, onToggleActivo, onMenuOpen }) {
  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5, p: 1.5, opacity: proyecto.activo ? 1 : 0.55 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Box sx={{ minWidth: 0 }}>
          <NombreLink proyecto={proyecto} />
          <Box sx={{ mt: 0.5 }}><EstadoChip activo={proyecto.activo} /></Box>
        </Box>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Switch size="small" checked={Boolean(proyecto.activo)} onChange={() => onToggleActivo(proyecto)} color="primary" />
          <IconButton size="small" onClick={(e) => onMenuOpen(e, proyecto)} aria-label="Acciones del proyecto">
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>
      <Divider sx={{ my: 1 }} />
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
        <Typography variant="caption" color="text.secondary" noWrap>
          Caja central: {cajaCentral}
        </Typography>
        <Integraciones proyecto={proyecto} />
      </Stack>
    </Box>
  );
});

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
  // Nivel de acceso por usuario (visual). Map { [userId]: 'sin_acceso'|'solo_cargar'|'ver_cargar' }
  // { [userId]: [accionKeys quitadas en esta obra] }. Vacío = hereda todo. (visual)
  const [ocultasPorUsuario, setOcultasPorUsuario] = useState({});
  const [userSearch, setUserSearch] = useState('');
  // Tab activo del drawer: 0 = Configuración de proyecto, 1 = Usuarios y permisos.
  const [activeTab, setActiveTab] = useState(0);
  // Toolbar / tabla de proyectos.
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('todos'); // 'todos' | 'activos' | 'inactivos'
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuProyecto, setMenuProyecto] = useState(null);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [csvProyecto, setCsvProyecto] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
          formik.setFieldError('sheetWithClient', 'El google sheet no está configurado para que podamos editarlo. Asegurate que el id esté bien escrito y de darle permisos de edición a ' + FIREBASE_CLIENT_EMAIL);
          formik.setTouched({ ...formik.touched, sheetWithClient: true });
      }
    } catch (error) {
        console.error('Error al verificar los permisos:', error);
        formik.setFieldError('sheetWithClient', 'Error al verificar los permisos');
    }
  };

  const confirmarEliminacionProyecto = async () => {
    try {
      await softDeleteMovimientosByProyectoId(proyectoAEliminar.id);
      const updatedProyecto = { ...proyectoAEliminar, activo: false, eliminado: true };
      await updateProyecto(proyectoAEliminar.id, updatedProyecto);
      setSnackbarMessage('Proyecto eliminado con éxito');
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
            formik.setFieldError('carpetaRef', 'La carpeta no está configurada para que podamos editarla. Asegurate que el id esté bien escrito y de darle permisos de edición a ' + FIREBASE_CLIENT_EMAIL);
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
  

  // Trae los perfiles de la empresa con su proyectosData resuelto. Reutilizado en el
  // mount y al abrir una obra (para refrescar recortes por-obra sin datos viejos).
  const fetchUsuariosConProyectos = async () => {
    const usuarios = await profileService.getProfileByEmpresa(empresa.id);
    return Promise.all(usuarios.map(async (prof) => {
      prof.proyectosData = await getProyectosFromUser(prof);
      return prof;
    }));
  };

  useEffect(() => {
    const fetchEmpresaData = async () => {
      const proyectosData = await getProyectosByEmpresa(empresa);
      setProyectos(proyectosData);
    };

    const fetchUsuarios = async () => {
      setUsuariosEmpresa(await fetchUsuariosConProyectos());
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
      usuariosAsignados: [],
      datos_facturacion_cliente: '',
      superficie_total_m2: '',
      costo_objetivo_m2: '',
      costo_maximo_m2: '',
      moneda_objetivo: 'ARS',
      fecha_actualizacion_costos: null
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      nombre: Yup.string().required('El nombre del proyecto es requerido'),
      proyecto_default_id: Yup.string(),
      sheetWithClient: Yup.string().nullable(),
      superficie_total_m2: Yup.number().transform((v, o) => (o === '' ? null : v)).min(0, 'No puede ser negativo').nullable(),
      costo_objetivo_m2: Yup.number().transform((v, o) => (o === '' ? null : v)).min(0, 'No puede ser negativo').nullable(),
      costo_maximo_m2: Yup.number().transform((v, o) => (o === '' ? null : v)).min(0, 'No puede ser negativo').nullable()
    }),
    onSubmit: async (values, { resetForm }) => {
      setIsLoading(true);

      // Costo por m² (TAR-439): normalizar '' → null y sellar la fecha solo si
      // cambió algún dato de costo respecto de lo guardado.
      const numOrNull = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
      const superficie = numOrNull(values.superficie_total_m2);
      const objetivoM2 = numOrNull(values.costo_objetivo_m2);
      const maximoM2 = numOrNull(values.costo_maximo_m2);
      const monedaObjetivo = values.moneda_objetivo || 'ARS';
      const prev = editingProyecto || {};
      const costosCambiaron =
        superficie !== (prev.superficie_total_m2 ?? null) ||
        objetivoM2 !== (prev.costo_objetivo_m2 ?? null) ||
        maximoM2 !== (prev.costo_maximo_m2 ?? null) ||
        monedaObjetivo !== (prev.moneda_objetivo ?? 'ARS');
      const fechaActualizacionCostos = costosCambiaron
        ? new Date().toISOString()
        : (prev.fecha_actualizacion_costos ?? null);

      const proyectoData = {
        nombre: values.nombre,
        carpetaRef: values.carpetaRef,
        proyecto_default_id: values.proyecto_default_id,
        sheetWithClient: values.sheetWithClient,
        extraSheets: values.extraSheets,
        subproyectos: values.subproyectos || [],
        datos_facturacion_cliente: values.datos_facturacion_cliente || '',
        superficie_total_m2: superficie,
        costo_objetivo_m2: objetivoM2,
        costo_maximo_m2: maximoM2,
        moneda_objetivo: monedaObjetivo,
        fecha_actualizacion_costos: fechaActualizacionCostos,
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

            // Membresía deseada
            let nuevosProyectos = currentProjects;
            if (deberíaTener && !tieneProyecto) nuevosProyectos = [...currentProjects, proyectoId];
            else if (!deberíaTener && tieneProyecto) nuevosProyectos = currentProjects.filter((id) => id !== proyectoId);

            // Checklist por-obra (TAR-393): blacklist de acciones quitadas SOLO en esta obra.
            // Se preservan las keys de otras obras; si el usuario deja de ser miembro, se borra la key.
            const mapaActual = usuario.permisosOcultosPorProyecto || {};
            const nuevoMapa = { ...mapaActual };
            const ocultas = getOcultasUsuario(usuario.id);
            if (deberíaTener && ocultas.length > 0) nuevoMapa[proyectoId] = ocultas;
            else delete nuevoMapa[proyectoId];

            const cambioMembership = nuevosProyectos !== currentProjects;
            const cambioOcultas =
              JSON.stringify(nuevoMapa[proyectoId] || []) !== JSON.stringify(mapaActual[proyectoId] || []);
            if (!cambioMembership && !cambioOcultas) return null;

            return profileService.updateProfile(usuario.id, {
              proyectos: nuevosProyectos,
              permisosOcultosPorProyecto: nuevoMapa,
            });
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
            
            // Acciones quitadas por usuario para esta obra (visual). Vacío = hereda todo.
            const ocultasIniciales = {};
            usuariosConProyectos.forEach((u) => {
              const raw = u.permisosOcultosPorProyecto?.[proyectoCreado.id];
              ocultasIniciales[u.id] = Array.isArray(raw) ? raw : [];
            });

            // Usar setTimeout para dar tiempo al React de procesar los cambios
            setTimeout(() => {
              console.log('Abriendo modal de edición...');
              setEditingProyecto(proyectoCreado);
              formik.setValues({
                ...proyectoCreado,
                usuariosAsignados: usuariosConEsteProyecto
              });
              setOcultasPorUsuario(ocultasIniciales);
              setUserSearch('');
              setActiveTab(0);
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
 

  // ── Helpers de permisos por acción por usuario × obra (visual) ──
  // Al abrir una obra, cada usuario arranca con las acciones que tenga guardadas
  // como quitadas para esa obra (o vacío = hereda todo).
  const buildOcultasDesdeUsuarios = (proyectoId, usuarios = usuariosEmpresa) => {
    const map = {};
    usuarios.forEach((u) => {
      const raw = u.permisosOcultosPorProyecto?.[proyectoId];
      map[u.id] = Array.isArray(raw) ? raw : [];
    });
    return map;
  };

  // Acceso a la obra = membresía (lo que hoy persiste el backend en profile.proyectos).
  const tieneAcceso = (userId) => (formik.values.usuariosAsignados || []).includes(userId);

  const setAcceso = (userId, on) => {
    const asignados = formik.values.usuariosAsignados || [];
    if (on) {
      if (!asignados.includes(userId)) formik.setFieldValue('usuariosAsignados', [...asignados, userId]);
    } else {
      formik.setFieldValue('usuariosAsignados', asignados.filter((id) => id !== userId));
    }
  };

  const setAccesoTodos = (on) => {
    formik.setFieldValue('usuariosAsignados', on ? usuariosEmpresa.map((u) => u.id) : []);
  };

  const getOcultasUsuario = (userId) => ocultasPorUsuario[userId] || [];

  // Checklist filtrado a lo que la empresa activó en configuración general
  // (empresa.acciones). Si la empresa no tiene "Cargar ingreso", ese ítem no
  // aparece; ídem el resto.
  const accionesObra = useMemo(() => construirAccionesObra(empresa?.acciones || []), [empresa]);
  const accionesObraKeys = useMemo(() => accionesObra.flatMap((a) => a.acciones), [accionesObra]);
  const gruposAcciones = useMemo(
    () =>
      ORDEN_GRUPOS.map((label) => ({ label, items: accionesObra.filter((a) => a.grupo === label) })).filter(
        (g) => g.items.length > 0
      ),
    [accionesObra]
  );

  // Un ítem agrupa varias acciones reales. Deshabilitado si TODAS sus acciones
  // ya están quitadas a nivel empresa (permisosOcultos global): no se pueden
  // re-otorgar por obra, la resta global gana.
  const itemGlobalOff = (usuario, item) =>
    item.acciones.every((k) => (usuario?.permisosOcultos || []).includes(k));

  // "Tildado" = alguna de sus acciones otorgables (no oculta global) sigue concedida.
  const itemChecked = (usuario, item) => {
    const globalOcultas = usuario?.permisosOcultos || [];
    const ocultas = getOcultasUsuario(usuario.id);
    return item.acciones.some((k) => !globalOcultas.includes(k) && !ocultas.includes(k));
  };

  // Al destildar, se quitan TODAS las acciones del ítem para esa obra; al tildar, se devuelven.
  const toggleItem = (userId, item) => {
    setOcultasPorUsuario((prev) => {
      const cur = prev[userId] || [];
      const encendido = item.acciones.some((k) => !cur.includes(k));
      const next = encendido
        ? Array.from(new Set([...cur, ...item.acciones]))
        : cur.filter((k) => !item.acciones.includes(k));
      return { ...prev, [userId]: next };
    });
  };

  const setTodasAcciones = (userId, marcar) => {
    setOcultasPorUsuario((prev) => ({ ...prev, [userId]: marcar ? [] : [...accionesObraKeys] }));
  };

  // Ítems recortados (apagados) de un usuario, sin contar los ya bloqueados por empresa.
  const itemsOffUsuario = (usuario) =>
    accionesObra.filter((item) => !itemGlobalOff(usuario, item) && !itemChecked(usuario, item)).length;

  const conAccesoCount = (formik.values.usuariosAsignados || []).length;
  const recortadosCount = usuariosEmpresa.filter(
    (u) => tieneAcceso(u.id) && itemsOffUsuario(u) > 0
  ).length;

  const usuariosFiltrados = usuariosEmpresa.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return `${u.firstName || ''} ${u.lastName || ''} ${u.email || ''}`.toLowerCase().includes(q);
  });

  const iniciarEdicionProyecto = async (proyecto) => {
    setEditingProyecto(proyecto);

    // Refetch de perfiles al abrir la obra (TAR-393): el drawer carga los perfiles una sola
    // vez al montar, así que sin esto el checklist mostraría recortes por-obra desactualizados
    // si la DB cambió después. Si el refetch falla, seguimos con lo que había en memoria.
    let usuarios = usuariosEmpresa;
    try {
      usuarios = await fetchUsuariosConProyectos();
      setUsuariosEmpresa(usuarios);
    } catch (e) {
      // fallback: usuariosEmpresa en memoria
    }

    // Encontrar usuarios que ya tienen este proyecto asignado (usando proyectosData)
    const usuariosConProyecto = usuarios.filter(usuario => {
      const proyectosUsuario = usuario.proyectosData?.map(p => p?.id).filter(Boolean) || [];
      return proyectosUsuario.includes(proyecto.id);
    }).map(u => u.id);

    formik.setValues({
      ...proyecto,
      usuariosAsignados: usuariosConProyecto
    });
    setOcultasPorUsuario(buildOcultasDesdeUsuarios(proyecto.id, usuarios));
    setUserSearch('');
    setActiveTab(0);
    setOpenModal(true);
  };

  const iniciarCreacionProyecto = () => {
    setEditingProyecto(null);
    formik.resetForm();
    setOcultasPorUsuario({});
    setUserSearch('');
    setActiveTab(0);
    setOpenModal(true);
  };

  const cancelarEdicion = () => {
    setEditingProyecto(null);
    formik.resetForm();
    setOcultasPorUsuario({});
    setUserSearch('');
    setActiveTab(0);
    setOpenModal(false);
  };

  const toggleProyectoActivo = useCallback(async (proyecto) => {
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
  }, [empresa]);

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

  // ── Derivados de la tabla ──
  const nombrePorId = useMemo(() => {
    const m = {};
    proyectos.forEach((p) => { m[p.id] = p.nombre; });
    return m;
  }, [proyectos]);

  const proyectosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return proyectos.filter((p) => {
      if (estadoFilter === 'activos' && !p.activo) return false;
      if (estadoFilter === 'inactivos' && p.activo) return false;
      if (q && !(p.nombre || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [proyectos, search, estadoFilter]);

  const activosCount = useMemo(() => proyectos.filter((p) => p.activo).length, [proyectos]);

  const cajaCentralDe = (proyecto) =>
    proyecto.proyecto_default_id ? (nombrePorId[proyecto.proyecto_default_id] || '—') : '—';

  const handleMenuOpen = useCallback((e, proyecto) => {
    setMenuAnchor(e.currentTarget);
    setMenuProyecto(proyecto);
  }, []);
  const handleMenuClose = useCallback(() => {
    setMenuAnchor(null);
    setMenuProyecto(null);
  }, []);

  const abrirCsvDialog = (proyecto) => {
    setCsvProyecto(proyecto);
    setSelectedFile(null);
    setCsvDialogOpen(true);
  };
  const cerrarCsvDialog = () => {
    setCsvDialogOpen(false);
    setCsvProyecto(null);
    setSelectedFile(null);
  };
  const handleUploadCSVDesdeDialog = async () => {
    await handleUploadCSV();
    cerrarCsvDialog();
  };

  return (
    <>
      <Card>
        <CardHeader
          title="Gestionar Proyectos"
          action={
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button
                color="inherit"
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                onClick={handleImportarCSV}
                sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}
              >
                Importar CSV
              </Button>
              <Button
                color="primary"
                variant="contained"
                startIcon={<AddCircleIcon />}
                onClick={iniciarCreacionProyecto}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Agregar Proyecto
              </Button>
            </Stack>
          }
        />
        <Divider />

        {/* Toolbar: búsqueda + contador + filtro de estado */}
        <Box
          sx={{
            px: { xs: 2, sm: 3 }, py: 1.5,
            display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
          }}
        >
          <TextField
            size="small"
            placeholder="Buscar proyecto…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 200, maxWidth: 320 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            {proyectos.length} {proyectos.length === 1 ? 'proyecto' : 'proyectos'} · {activosCount} {activosCount === 1 ? 'activo' : 'activos'}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <ToggleButtonGroup
            size="small"
            exclusive
            value={estadoFilter}
            onChange={(e, v) => v && setEstadoFilter(v)}
            aria-label="Filtrar por estado"
          >
            <ToggleButton value="todos" sx={{ textTransform: 'none', px: 1.5 }}>Todos</ToggleButton>
            <ToggleButton value="activos" sx={{ textTransform: 'none', px: 1.5 }}>Activos</ToggleButton>
            <ToggleButton value="inactivos" sx={{ textTransform: 'none', px: 1.5 }}>Inactivos</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Divider />

        {proyectosFiltrados.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {proyectos.length === 0 ? 'Todavía no hay proyectos.' : 'No hay proyectos que coincidan con el filtro.'}
            </Typography>
          </Box>
        ) : isMobile ? (
          <Stack spacing={1} sx={{ p: 2 }}>
            {proyectosFiltrados.map((proyecto) => (
              <ProyectoCardMobile
                key={proyecto.id}
                proyecto={proyecto}
                cajaCentral={cajaCentralDe(proyecto)}
                onToggleActivo={toggleProyectoActivo}
                onMenuOpen={handleMenuOpen}
              />
            ))}
          </Stack>
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 640 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12, letterSpacing: '.04em' }}>PROYECTO</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12, letterSpacing: '.04em' }}>CAJA CENTRAL</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12, letterSpacing: '.04em' }}>INTEGRACIONES</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12, letterSpacing: '.04em' }}>ESTADO</TableCell>
                  <TableCell align="right" sx={{ width: 56 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {proyectosFiltrados.map((proyecto) => (
                  <ProyectoRow
                    key={proyecto.id}
                    proyecto={proyecto}
                    cajaCentral={cajaCentralDe(proyecto)}
                    onToggleActivo={toggleProyectoActivo}
                    onMenuOpen={handleMenuOpen}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
      <Drawer
        anchor="right"
        open={openModal}
        onClose={cancelarEdicion}
        PaperProps={{ sx: { width: { xs: '100%', sm: 560 }, maxWidth: '100%' } }}
      >
        <Box
          component="form"
          autoComplete="off"
          noValidate
          onSubmit={formik.handleSubmit}
          sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}
        >
          {/* ── Header ── */}
          <Box
            sx={{
              px: 3,
              pt: 2.5,
              pb: 2,
              borderBottom: 1,
              borderColor: 'divider',
              background: (t) =>
                `linear-gradient(180deg, ${alpha(t.palette.primary.main, 0.06)}, ${t.palette.background.paper})`,
            }}
          >
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: '0.1em' }}>
                  {editingProyecto ? 'Editar proyecto' : 'Nuevo proyecto'}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, mt: 0.25 }} noWrap>
                  {formik.values.nombre || (editingProyecto ? 'Proyecto' : 'Sin nombre')}
                </Typography>
              </Box>
              <IconButton onClick={cancelarEdicion} size="small" sx={{ mt: -0.5 }} aria-label="Cerrar">
                <CloseIcon />
              </IconButton>
            </Stack>
          </Box>

          {isLoading && <LinearProgress />}

          {/* ── Tabs: separan la Configuración de la obra de Usuarios y permisos.
               Al crear todavía no hay usuarios que asignar, así que solo aparecen al editar. ── */}
          {editingProyecto && (
            <Tabs
              value={activeTab}
              onChange={(e, v) => setActiveTab(v)}
              variant="fullWidth"
              sx={{ px: 1, borderBottom: 1, borderColor: 'divider', minHeight: 48 }}
            >
              <Tab
                icon={<TuneIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="Configuración"
                sx={{ minHeight: 48, textTransform: 'none', fontWeight: 600 }}
              />
              <Tab
                icon={<GroupsOutlinedIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="Usuarios y permisos"
                sx={{ minHeight: 48, textTransform: 'none', fontWeight: 600 }}
              />
            </Tabs>
          )}

          {/* ── Body (scroll) ── */}
          <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
            {(!editingProyecto || activeTab === 0) && (
            <Stack spacing={3.5}>
              {/* Nombre del proyecto */}
              <Seccion icon={DriveFileRenameOutlineIcon} title="Nombre del proyecto">
                <TextField
                  fullWidth
                  name="nombre"
                  placeholder="Ej: Torre Palermo"
                  value={formik.values.nombre}
                  onChange={formik.handleChange}
                  error={formik.touched.nombre && Boolean(formik.errors.nombre)}
                  helperText={formik.touched.nombre && formik.errors.nombre}
                />
              </Seccion>

              {/* Integraciones */}
              <Seccion
                icon={LinkIcon}
                title="Integraciones"
                hint="Guardá los IDs para que el bot los use. Cuando el ID está cargado, tocá el botón para abrir la carpeta o el sheet en una pestaña nueva."
              >
                <Stack spacing={2.5}>
                  <Stack spacing={0.75}>
                    {formik.values.carpetaRef && (
                      <AbrirLink
                        href={`https://drive.google.com/drive/folders/${formik.values.carpetaRef}`}
                        icon={FolderOpenOutlinedIcon}
                        label="Abrir carpeta en Drive"
                        accent={DRIVE_BLUE}
                      />
                    )}
                    <TextField
                      fullWidth
                      name="carpetaRef"
                      label="Carpeta de Referencia (ID)"
                      value={formik.values.carpetaRef}
                      onChange={(event) => {
                        handleCarpetaRefChange(event);
                        formik.handleChange(event);
                      }}
                      error={formik.touched.carpetaRef && (Boolean(formik.errors.carpetaRef) || folderPermissionError)}
                      helperText={formik.touched.carpetaRef && (formik.errors.carpetaRef || (folderPermissionError && "La carpeta no está configurada para que podamos editarla. Asegúrate de que el id esté bien escrito y de darle permisos de edición a " + FIREBASE_CLIENT_EMAIL))}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <FolderOpenOutlinedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Stack>

                  <Stack spacing={0.75}>
                    {formik.values.sheetWithClient && (
                      <AbrirLink
                        href={`https://docs.google.com/spreadsheets/d/${formik.values.sheetWithClient}`}
                        icon={TableChartOutlinedIcon}
                        label="Abrir Google Sheet"
                        accent={SHEET_GREEN}
                      />
                    )}
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
                      helperText={formik.touched.sheetWithClient && (formik.errors.sheetWithClient || (sheetPermissionError && "El google sheet no está configurado para que podamos editarlo. Asegúrate de que el id esté bien escrito y de darle permisos de edición a " + FIREBASE_CLIENT_EMAIL))}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <TableChartOutlinedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Stack>

                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.75 }}>
                      Google Sheets adicionales
                    </Typography>
                    {formik.values.extraSheets?.length > 0 && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
                        {formik.values.extraSheets?.map((sheetId, index) => (
                          <Chip
                            key={index}
                            size="small"
                            icon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                            label={`Sheet ${index + 1}`}
                            onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${sheetId}`, '_blank', 'noopener,noreferrer')}
                            onDelete={() => handleRemoveExtraSheet(sheetId)}
                            color={sheetsPermissions[sheetId] === false ? 'error' : 'success'}
                            variant="outlined"
                            sx={{ cursor: 'pointer' }}
                          />
                        ))}
                      </Box>
                    )}
                    <TextField
                      fullWidth
                      label="Agregar ID de Google Sheet"
                      placeholder="Pegá el ID y presioná Enter"
                      variant="outlined"
                      size="small"
                      onKeyDown={handleAddExtraSheet}
                    />
                  </Box>
                </Stack>
              </Seccion>

              {/* Configuración */}
              <Seccion icon={TuneIcon} title="Configuración">
                <Stack spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel id="proyecto-default-label">Caja central</InputLabel>
                    <Select
                      labelId="proyecto-default-label"
                      label="Caja central"
                      name="proyecto_default_id"
                      value={formik.values.proyecto_default_id}
                      onChange={formik.handleChange}
                      error={formik.touched.proyecto_default_id && Boolean(formik.errors.proyecto_default_id)}
                    >
                      <MenuItem value="">Sin caja central</MenuItem>
                      {proyectos.map((proyecto) => (
                        <MenuItem key={proyecto.id} value={proyecto.id}>
                          {proyecto.nombre}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    fullWidth
                    name="datos_facturacion_cliente"
                    label="Datos de facturación del cliente"
                    value={formik.values.datos_facturacion_cliente}
                    onChange={formik.handleChange}
                    multiline
                    rows={3}
                    helperText="Razón social, CUIT u otros datos del cliente que ayuden al bot a identificar si una factura es del cliente de este proyecto."
                  />
                </Stack>
              </Seccion>

              {/* Costo por m² (TAR-439) */}
              <Seccion
                icon={SquareFootOutlinedIcon}
                title="Costo por m²"
                hint="Datos para seguir el gasto por metro cuadrado de la obra. Todos opcionales; la superficie es la que habilita el cálculo."
              >
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    type="number"
                    name="superficie_total_m2"
                    label="Superficie total"
                    value={formik.values.superficie_total_m2 ?? ''}
                    onChange={formik.handleChange}
                    error={formik.touched.superficie_total_m2 && Boolean(formik.errors.superficie_total_m2)}
                    helperText={formik.touched.superficie_total_m2 && formik.errors.superficie_total_m2}
                    InputProps={{ endAdornment: <InputAdornment position="end">m²</InputAdornment> }}
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      fullWidth
                      type="number"
                      name="costo_objetivo_m2"
                      label="Costo objetivo por m²"
                      value={formik.values.costo_objetivo_m2 ?? ''}
                      onChange={formik.handleChange}
                      error={formik.touched.costo_objetivo_m2 && Boolean(formik.errors.costo_objetivo_m2)}
                      helperText={formik.touched.costo_objetivo_m2 && formik.errors.costo_objetivo_m2}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">{formik.values.moneda_objetivo === 'USD' ? 'U$S' : '$'}</InputAdornment>,
                        endAdornment: <InputAdornment position="end">/m²</InputAdornment>,
                      }}
                    />
                    <TextField
                      fullWidth
                      type="number"
                      name="costo_maximo_m2"
                      label="Tope máximo por m²"
                      value={formik.values.costo_maximo_m2 ?? ''}
                      onChange={formik.handleChange}
                      error={formik.touched.costo_maximo_m2 && Boolean(formik.errors.costo_maximo_m2)}
                      helperText={
                        (formik.values.costo_maximo_m2 !== '' &&
                          formik.values.costo_objetivo_m2 !== '' &&
                          Number(formik.values.costo_maximo_m2) < Number(formik.values.costo_objetivo_m2))
                          ? 'El tope es menor que el objetivo'
                          : (formik.touched.costo_maximo_m2 && formik.errors.costo_maximo_m2)
                      }
                      InputProps={{
                        startAdornment: <InputAdornment position="start">{formik.values.moneda_objetivo === 'USD' ? 'U$S' : '$'}</InputAdornment>,
                        endAdornment: <InputAdornment position="end">/m²</InputAdornment>,
                      }}
                    />
                  </Stack>
                  <FormControl fullWidth>
                    <InputLabel id="moneda-objetivo-label">Moneda del valor objetivo</InputLabel>
                    <Select
                      labelId="moneda-objetivo-label"
                      label="Moneda del valor objetivo"
                      name="moneda_objetivo"
                      value={formik.values.moneda_objetivo || 'ARS'}
                      onChange={formik.handleChange}
                    >
                      {MONEDAS.map((m) => (
                        <MenuItem key={m} value={m}>{m}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Typography variant="caption" color="text.secondary">
                    Última actualización:{' '}
                    {formik.values.fecha_actualizacion_costos
                      ? new Date(formik.values.fecha_actualizacion_costos).toLocaleDateString('es-AR')
                      : '—'}
                  </Typography>
                </Stack>
              </Seccion>
            </Stack>
            )}

            {/* ── Tab: Usuarios y permisos ── */}
            {editingProyecto && activeTab === 1 && (
                <Seccion
                  icon={GroupsOutlinedIcon}
                  title="Usuarios y permisos"
                >
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                      <Chip
                        size="small"
                        label={`${conAccesoCount} con acceso`}
                        sx={{ fontWeight: 600, color: 'success.main', bgcolor: (t) => alpha(t.palette.success.main, 0.12) }}
                      />
                      <Chip
                        size="small"
                        label={`${usuariosEmpresa.length - conAccesoCount} sin acceso`}
                        sx={{ fontWeight: 600, color: 'text.secondary', bgcolor: 'action.selected' }}
                      />
                      {recortadosCount > 0 && (
                        <Chip
                          size="small"
                          label={`${recortadosCount} con permisos recortados`}
                          sx={{ fontWeight: 600, color: 'warning.main', bgcolor: (t) => alpha(t.palette.warning.main, 0.14) }}
                        />
                      )}
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="Buscar usuario…"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                            </InputAdornment>
                          ),
                        }}
                      />
                      <Tooltip title="Dar acceso a todos">
                        <Button size="small" variant="text" onClick={() => setAccesoTodos(true)} sx={{ whiteSpace: 'nowrap' }}>
                          Todos
                        </Button>
                      </Tooltip>
                      <Tooltip title="Quitar acceso a todos">
                        <Button size="small" variant="text" color="inherit" onClick={() => setAccesoTodos(false)} sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>
                          Ninguno
                        </Button>
                      </Tooltip>
                    </Stack>

                    <Box sx={{ maxHeight: 440, overflowY: 'auto', pr: 0.5, mx: -0.5 }}>
                      <Stack spacing={1} sx={{ px: 0.5 }}>
                        {usuariosFiltrados.length === 0 && (
                          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                            No hay usuarios que coincidan con la búsqueda.
                          </Typography>
                        )}
                        {usuariosFiltrados.map((usuario) => {
                          const nombre = usuario.firstName || usuario.nombre || '';
                          const apellido = usuario.lastName || usuario.apellido || '';
                          const email = usuario.email || '';
                          const label = `${nombre} ${apellido}`.trim() || email;
                          const initial = (nombre[0] || email[0] || '?').toUpperCase();
                          const acceso = tieneAcceso(usuario.id);
                          const nOff = itemsOffUsuario(usuario);
                          const recortado = acceso && nOff > 0;

                          return (
                            <Box
                              key={usuario.id}
                              sx={{
                                border: 1,
                                borderColor: recortado ? (t) => alpha(t.palette.warning.main, 0.4) : 'divider',
                                borderRadius: 1.5,
                                p: 1.25,
                                bgcolor: 'background.paper',
                              }}
                            >
                              <Stack direction="row" alignItems="center" spacing={1.25}>
                                <Avatar
                                  sx={{
                                    width: 34, height: 34, fontSize: 14, fontWeight: 700,
                                    bgcolor: acceso ? (t) => alpha(t.palette.success.main, 0.16) : 'action.selected',
                                    color: acceso ? 'success.main' : 'text.secondary',
                                  }}
                                >
                                  {initial}
                                </Avatar>
                                <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{label}</Typography>
                                  {email && (
                                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                                      {email}
                                    </Typography>
                                  )}
                                </Box>
                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                  <Typography variant="caption" sx={{ fontWeight: 600, color: acceso ? 'success.main' : 'text.secondary' }}>
                                    {acceso ? 'Con acceso' : 'Sin acceso'}
                                  </Typography>
                                  <Switch
                                    size="small"
                                    color="success"
                                    checked={acceso}
                                    onChange={(e) => setAcceso(usuario.id, e.target.checked)}
                                    inputProps={{ 'aria-label': `Acceso de ${label} a la obra` }}
                                  />
                                </Stack>
                              </Stack>

                              {acceso ? (
                                <Box sx={{ mt: 1 }}>
                                  <Divider sx={{ mb: 1 }} />
                                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'warning.main' }}>
                                      {recortado ? `${nOff} ${nOff === 1 ? 'acción quitada' : 'acciones quitadas'}` : ''}
                                    </Typography>
                                    <Box>
                                      <Button size="small" variant="text" onClick={() => setTodasAcciones(usuario.id, true)} sx={{ minWidth: 0, px: 0.75, fontSize: 11.5 }}>
                                        Todas
                                      </Button>
                                      <Button size="small" variant="text" color="inherit" onClick={() => setTodasAcciones(usuario.id, false)} sx={{ minWidth: 0, px: 0.75, fontSize: 11.5, color: 'text.secondary' }}>
                                        Ninguna
                                      </Button>
                                    </Box>
                                  </Stack>
                                  <Stack spacing={0.5}>
                                    {gruposAcciones.map((grupo) => (
                                      <Box key={grupo.label}>
                                        <Typography variant="overline" sx={{ color: 'text.disabled', fontWeight: 700, letterSpacing: '.06em', fontSize: 10, lineHeight: 2 }}>
                                          {grupo.label}
                                        </Typography>
                                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 1 }}>
                                          {grupo.items.map((item) => {
                                            const globalOff = itemGlobalOff(usuario, item);
                                            const checked = itemChecked(usuario, item);
                                            return (
                                              <Tooltip
                                                key={item.key}
                                                title={globalOff ? 'Quitada a nivel empresa' : ''}
                                                placement="top"
                                                arrow
                                                disableHoverListener={!globalOff}
                                                disableFocusListener={!globalOff}
                                                disableTouchListener={!globalOff}
                                              >
                                                <FormControlLabel
                                                  sx={{ m: 0, py: 0.1, alignItems: 'flex-start', '& .MuiFormControlLabel-label': { pt: 0.35 } }}
                                                  control={
                                                    <Checkbox
                                                      size="small"
                                                      checked={checked}
                                                      disabled={globalOff}
                                                      onChange={() => toggleItem(usuario.id, item)}
                                                      sx={{ py: 0.25, color: 'text.disabled', '&.Mui-checked': { color: 'success.main' } }}
                                                    />
                                                  }
                                                  label={
                                                    <Box>
                                                      <Stack direction="row" alignItems="center" spacing={0.5}>
                                                        <Typography component="span" sx={{ fontSize: 13, color: globalOff ? 'text.disabled' : 'text.primary' }}>
                                                          {item.label}
                                                        </Typography>
                                                        {globalOff && (
                                                          <Chip label="empresa" size="small" sx={{ height: 15, fontSize: 9, '& .MuiChip-label': { px: 0.5 } }} />
                                                        )}
                                                      </Stack>
                                                      {item.hint && (
                                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: 11, lineHeight: 1.2 }}>
                                                          {item.hint}
                                                        </Typography>
                                                      )}
                                                    </Box>
                                                  }
                                                />
                                              </Tooltip>
                                            );
                                          })}
                                        </Box>
                                      </Box>
                                    ))}
                                  </Stack>
                                </Box>
                              ) : (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75, pl: 0.25 }}>
                                  No aparece para esta persona en el bot ni en la web.
                                </Typography>
                              )}
                            </Box>
                          );
                        })}
                      </Stack>
                    </Box>
                  </Stack>
                </Seccion>
            )}
          </Box>

          {/* ── Footer ── */}
          <Box
            sx={{
              px: 3,
              py: 2,
              borderTop: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 1.5,
            }}
          >
            <Button onClick={cancelarEdicion} color="inherit" sx={{ color: 'text.secondary' }}>
              Cancelar
            </Button>
            <Button variant="contained" startIcon={<SaveIcon />} type="submit" disabled={isLoading}>
              {editingProyecto ? 'Guardar cambios' : 'Crear proyecto'}
            </Button>
          </Box>
        </Box>
      </Drawer>
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

      {/* Menú de acciones por proyecto (kebab de cada fila) */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => { const p = menuProyecto; handleMenuClose(); iniciarEdicionProyecto(p); }}
        >
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          Editar
        </MenuItem>
        <MenuItem
          onClick={() => { const p = menuProyecto; handleMenuClose(); abrirCsvDialog(p); }}
        >
          <ListItemIcon><UploadFileIcon fontSize="small" /></ListItemIcon>
          Subir CSV
        </MenuItem>
        <MenuItem
          onClick={() => { const p = menuProyecto; handleMenuClose(); handleRestablecerPermisos(p.id); }}
        >
          <ListItemIcon><LockResetIcon fontSize="small" /></ListItemIcon>
          Restablecer permisos
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => { const p = menuProyecto; handleMenuClose(); setProyectoAEliminar(p); }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon><DeleteOutlineIcon fontSize="small" sx={{ color: 'error.main' }} /></ListItemIcon>
          Eliminar
        </MenuItem>
      </Menu>

      {/* Subir CSV en un solo paso */}
      <Dialog open={csvDialogOpen} onClose={cerrarCsvDialog} fullWidth maxWidth="xs">
        <DialogTitle>Subir CSV{csvProyecto ? ` — ${csvProyecto.nombre}` : ''}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Cargá un archivo CSV con los movimientos de esta obra.
            </Typography>
            <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
              {selectedFile ? selectedFile.name : 'Elegir archivo CSV'}
              <input
                hidden
                accept=".csv"
                type="file"
                onChange={(event) => csvProyecto && handleFileChange(event, csvProyecto.id, csvProyecto.nombre)}
              />
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={cerrarCsvDialog} color="inherit" sx={{ color: 'text.secondary' }}>Cancelar</Button>
          <Button
            onClick={handleUploadCSVDesdeDialog}
            variant="contained"
            disabled={!selectedFile || uploading}
          >
            {uploading ? 'Subiendo…' : 'Cargar'}
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
