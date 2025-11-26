import Head from 'next/head';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import {
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Badge as BadgeIcon,
  Business as BusinessIcon,
  AccountBalance as CajaIcon,
  Group as GroupIcon,
  Home as LoteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Security as SecurityIcon,
  Add as AddIcon
} from '@mui/icons-material';
import LoteParaTodosLayout from 'src/components/layouts/LoteParaTodosLayout';

const emprendimientosCatalogo = [
  { id: 'CR1', label: 'Cerro Rico 1' },
  { id: 'CR2', label: 'Cerro Rico 2' },
  { id: 'CR2E2', label: 'Cerro Rico 2 Etapa 2' },
  { id: 'MO', label: 'Moreno' },
  { id: 'LG1', label: 'La Glorieta 1' },
  { id: 'LG2', label: 'La Glorieta 2' },
  { id: 'CR3', label: 'Cerro Rico 3' },
  { id: 'NH', label: 'Nuevo Horizonte' },
  { id: 'PC', label: 'Parque Central' },
  { id: 'PI', label: 'Pinares del Casco' },
  { id: 'EP', label: 'El Portal' },
  { id: 'PB', label: 'Parque Bicentenario' },
  { id: 'LF', label: 'La Fraternidad' },
  { id: 'VM', label: 'Vaca Muerta' }
];

const gremiosCatalogo = [
  { id: 'UOM', label: 'UOM - Unión Obrera Metalúrgica' },
  { id: 'Comercio', label: 'Sindicato de Comercio' },
  { id: 'Docentes', label: 'Docentes' },
  { id: 'Bancarios', label: 'Bancarios' },
  { id: 'Petroleros', label: 'Petroleros' },
  { id: 'Municipales', label: 'Municipales' }
];

const catalogoEmprendimientosIds = emprendimientosCatalogo.map((item) => item.id);
const catalogoGremiosIds = gremiosCatalogo.map((item) => item.id);

const lotesEspecialesPorEmprendimiento = {
  CR1: ['CR1-101', 'CR1-203', 'CR1-307'],
  CR2: ['CR2-015', 'CR2-098'],
  CR2E2: ['CR2E2-004', 'CR2E2-019'],
  MO: ['MO-120', 'MO-350'],
  LG1: ['LG1-12A', 'LG1-14B'],
  LG2: ['LG2-08', 'LG2-19'],
  CR3: ['CR3-221', 'CR3-330'],
  NH: ['NH-045', 'NH-112'],
  PC: ['PC-501', 'PC-745'],
  PI: ['PI-066', 'PI-102'],
  EP: ['EP-210', 'EP-318'],
  PB: ['PB-020', 'PB-078'],
  LF: ['LF-032', 'LF-044'],
  VM: ['VM-901', 'VM-915']
};

const emprendimientoLabelMap = emprendimientosCatalogo.reduce((acc, item) => {
  acc[item.id] = item.label;
  return acc;
}, {});

const lotesEspecialesCatalogo = Object.entries(lotesEspecialesPorEmprendimiento).flatMap(
  ([emprendimientoId, lotes]) =>
    lotes.map((loteId) => ({
      id: loteId,
      descripcion: `${emprendimientoLabelMap[emprendimientoId] || emprendimientoId} • ${loteId}`,
      emprendimiento: emprendimientoId
    }))
);

const lotesPorId = lotesEspecialesCatalogo.reduce((acc, lote) => {
  acc[lote.id] = lote;
  return acc;
}, {});

const obtenerNumeroLote = (loteId) => {
  const coincidencias = loteId.match(/(\d+)/g);
  if (!coincidencias || coincidencias.length === 0) {
    return null;
  }
  const numero = parseInt(coincidencias[coincidencias.length - 1], 10);
  return Number.isNaN(numero) ? null : numero;
};

const esLotePar = (loteId) => {
  const numero = obtenerNumeroLote(loteId);
  return numero !== null ? numero % 2 === 0 : false;
};

const esLoteImpar = (loteId) => {
  const numero = obtenerNumeroLote(loteId);
  return numero !== null ? numero % 2 !== 0 : false;
};

const cajas = ['Caja Central', 'Caja Parque Central', 'Caja Obra A', 'Caja Cheques'];

const gruposComision = ['Call Center', 'Terreno', 'Portal', 'Externo'];

const roles = [
  'Vendedor',
  'Atención al Cliente',
  'Administración',
  'Tesorería / Caja',
  'Legales',
  'Supervisor / Dirección',
  'Configuración / Setup',
  'Portal Cliente'
];

const rolesConfig = {
  'Vendedor': {
    emprendimientosDisponibles: ['CR1', 'CR2', 'CR2E2', 'CR3', 'LG1', 'LG2', 'NH', 'PC', 'EP', 'PB'],
    gremiosDisponibles: ['UOM', 'Comercio', 'Docentes'],
    permiteLotesEspeciales: true
  },
  'Atención al Cliente': {
    emprendimientosDisponibles: ['CR1', 'CR2', 'CR2E2', 'MO', 'LG1', 'LG2', 'CR3', 'NH', 'PC', 'EP', 'PB', 'LF'],
    gremiosDisponibles: ['UOM', 'Comercio', 'Docentes', 'Bancarios'],
    permiteLotesEspeciales: false
  },
  'Administración': {
    emprendimientosDisponibles: catalogoEmprendimientosIds,
    gremiosDisponibles: catalogoGremiosIds,
    permiteLotesEspeciales: true
  },
  'Tesorería / Caja': {
    emprendimientosDisponibles: catalogoEmprendimientosIds,
    gremiosDisponibles: ['UOM', 'Comercio', 'Bancarios', 'Petroleros'],
    permiteLotesEspeciales: false
  },
  'Legales': {
    emprendimientosDisponibles: catalogoEmprendimientosIds,
    gremiosDisponibles: catalogoGremiosIds,
    permiteLotesEspeciales: false
  },
  'Supervisor / Dirección': {
    emprendimientosDisponibles: catalogoEmprendimientosIds,
    gremiosDisponibles: catalogoGremiosIds,
    permiteLotesEspeciales: true
  },
  'Configuración / Setup': {
    emprendimientosDisponibles: catalogoEmprendimientosIds,
    gremiosDisponibles: catalogoGremiosIds,
    permiteLotesEspeciales: true
  },
  'Portal Cliente': {
    emprendimientosDisponibles: [],
    gremiosDisponibles: [],
    permiteLotesEspeciales: false
  }
};

const defaultRolConfig = {
  emprendimientosDisponibles: catalogoEmprendimientosIds,
  gremiosDisponibles: catalogoGremiosIds,
  permiteLotesEspeciales: false
};

// Lista de permisos adicionales disponibles
const permisosDisponibles = [
  'Ver Clientes',
  'Ver Contratos',
  'Registrar Pagos',
  'Cargar Servicios',
  'Cargar Préstamos',
  'Generar Documentos',
  'Ver Cajas y Bancos',
  'Conciliar',
  'Iniciar Venta',
  'Editar Emprendimientos',
  'Editar Lotes'
];

// Permisos por rol (simulado)
const permisosPorRol = {
  'Vendedor': ['Ver Clientes', 'Ver Contratos', 'Registrar Pagos', 'Iniciar Venta', 'Ver Cajas y Bancos'],
  'Atención al Cliente': ['Ver Clientes', 'Ver Contratos', 'Cargar Servicios', 'Generar Documentos'],
  'Administración': ['Ver Clientes', 'Ver Contratos', 'Registrar Pagos', 'Cargar Servicios', 'Cargar Préstamos', 'Generar Documentos', 'Ver Cajas y Bancos', 'Editar Emprendimientos', 'Editar Lotes'],
  'Tesorería / Caja': ['Ver Clientes', 'Ver Contratos', 'Registrar Pagos', 'Cargar Préstamos', 'Ver Cajas y Bancos', 'Conciliar'],
  'Legales': ['Ver Clientes', 'Ver Contratos', 'Generar Documentos'],
  'Supervisor / Dirección': ['Ver Clientes', 'Ver Contratos', 'Registrar Pagos', 'Cargar Servicios', 'Cargar Préstamos', 'Generar Documentos', 'Ver Cajas y Bancos', 'Conciliar', 'Iniciar Venta', 'Editar Emprendimientos', 'Editar Lotes'],
  'Configuración / Setup': ['Editar Emprendimientos', 'Editar Lotes'],
  'Portal Cliente': ['Ver Contratos']
};

const CrearEditarUsuarioPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const isEditing = Boolean(id && id !== 'nuevo');

  // Estados del formulario
  const [formData, setFormData] = useState({
    usuario: '',
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    rol: '',
    emprendimientos: [],
    gremios: [],
    lotesEspeciales: [],
    cajas: [],
    grupoComision: '',
    permisosAdicionales: []
  });
  
  const [showPassword, setShowPassword] = useState(false);

  // Simular carga de datos para edición
  useEffect(() => {
    if (isEditing && id) {
      // Mock data para usuario existente basado en el ID
      const mockDataByUser = {
        '1': {
          usuario: 'juan.perez',
          nombre: 'Juan',
          apellido: 'Pérez',
          email: 'juan.perez@example.com',
          password: '••••••••',
          rol: 'Administración',
          emprendimientos: ['CR1', 'CR2'],
          gremios: ['UOM'],
          lotesEspeciales: ['CR1-101'],
          cajas: [],
          grupoComision: '',
          permisosAdicionales: []
        },
        '2': {
          usuario: 'maria.gonzalez',
          nombre: 'María',
          apellido: 'González',
          email: 'maria.gonzalez@example.com',
          password: '••••••••',
          rol: 'Supervisor / Dirección',
          emprendimientos: ['CR1'],
          gremios: ['Comercio', 'Docentes'],
          lotesEspeciales: ['CR2-015'],
          cajas: [],
          grupoComision: '',
          permisosAdicionales: []
        },
        '3': {
          usuario: 'carlos.rodriguez',
          nombre: 'Carlos',
          apellido: 'Rodríguez',
          email: 'carlos.rodriguez@example.com',
          password: '••••••••',
          rol: 'Vendedor',
          emprendimientos: ['CR3', 'EP'],
          gremios: ['UOM', 'Comercio'],
          lotesEspeciales: [],
          cajas: [],
          grupoComision: 'Terreno',
          permisosAdicionales: ['Cargar Servicios', 'Generar Documentos']
        },
        '4': {
          usuario: 'ana.lopez',
          nombre: 'Ana',
          apellido: 'López',
          email: 'ana.lopez@example.com',
          password: '••••••••',
          rol: 'Vendedor',
          emprendimientos: ['CR1'],
          gremios: ['Docentes'],
          lotesEspeciales: [],
          cajas: [],
          grupoComision: 'Call Center',
          permisosAdicionales: []
        },
        '5': {
          usuario: 'diego.martinez',
          nombre: 'Diego',
          apellido: 'Martínez',
          email: 'diego.martinez@example.com',
          password: '••••••••',
          rol: 'Tesorería / Caja',
          emprendimientos: ['CR2E2', 'VM'],
          gremios: ['Bancarios'],
          lotesEspeciales: [],
          cajas: ['Caja Central', 'Caja Obra A'],
          grupoComision: '',
          permisosAdicionales: ['Generar Documentos', 'Editar Lotes']
        }
      };

      const userData = mockDataByUser[id] || mockDataByUser['1'];
      setFormData(userData);
    }
  }, [isEditing, id]);

  const handleInputChange = (field) => (event) => {
    const value = event.target.value;
    setFormData((prev) => {
      if (field === 'rol') {
        const config = rolesConfig[value] || defaultRolConfig;
        const emprendimientosPermitidos = config.emprendimientosDisponibles.length
          ? config.emprendimientosDisponibles
          : catalogoEmprendimientosIds;
        const gremiosPermitidos = config.gremiosDisponibles.length
          ? config.gremiosDisponibles
          : catalogoGremiosIds;
        return {
          ...prev,
          rol: value,
          emprendimientos: prev.emprendimientos.filter((item) => emprendimientosPermitidos.includes(item)),
          gremios: (prev.gremios || []).filter((item) => gremiosPermitidos.includes(item)),
          lotesEspeciales: config.permiteLotesEspeciales ? prev.lotesEspeciales : []
        };
      }
      return {
        ...prev,
        [field]: value
      };
    });
  };

  const handleCheckboxChange = (field, value) => (event) => {
    const currentValues = formData[field];
    if (event.target.checked) {
      setFormData({
        ...formData,
        [field]: [...currentValues, value]
      });
    } else {
      setFormData({
        ...formData,
        [field]: currentValues.filter(item => item !== value)
      });
    }
  };

  const handleLotesEspecialesChange = (event, values) => {
    setFormData((prev) => ({
      ...prev,
      lotesEspeciales: values.map((option) => option.id)
    }));
  };

  const handleQuickLoteSelection = (emprendimientoId, mode) => {
    const lotesDelEmprendimiento = lotesEspecialesCatalogo.filter(
      (lote) => lote.emprendimiento === emprendimientoId
    );

    let lotesSeleccionados = lotesDelEmprendimiento;

    if (mode === 'even') {
      lotesSeleccionados = lotesDelEmprendimiento.filter((lote) => esLotePar(lote.id));
    }

    if (mode === 'odd') {
      lotesSeleccionados = lotesDelEmprendimiento.filter((lote) => esLoteImpar(lote.id));
    }

    const nuevosIds = lotesSeleccionados.map((lote) => lote.id);

    setFormData((prev) => {
      const lotesSinEmprendimiento = prev.lotesEspeciales.filter((loteId) => {
        const lote = lotesPorId[loteId];
        return lote?.emprendimiento !== emprendimientoId;
      });

      return {
        ...prev,
        lotesEspeciales: [...lotesSinEmprendimiento, ...nuevosIds]
      };
    });
  };

  const handleSubmit = () => {
    console.log('Datos del formulario:', formData);
    // Aquí iría la lógica de guardado
    router.push('/loteParaTodosMock/usuarios');
  };

  const handleCancel = () => {
    router.push('/loteParaTodosMock/usuarios');
  };

  const pageTitle = isEditing ? 'Editar Usuario' : 'Crear Usuario';
  const buttonText = isEditing ? 'Guardar cambios' : 'Crear usuario';

  // Verificar si debe mostrar secciones específicas
  const showCajas = formData.rol === 'Tesorería / Caja';
  const showGrupoComision = formData.rol === 'Vendedor';
  const rolConfig = rolesConfig[formData.rol] || defaultRolConfig;
  const emprendimientosDisponibles = (rolConfig.emprendimientosDisponibles.length
    ? emprendimientosCatalogo.filter((item) => rolConfig.emprendimientosDisponibles.includes(item.id))
    : emprendimientosCatalogo);
  const gremiosDisponibles = (rolConfig.gremiosDisponibles.length
    ? gremiosCatalogo.filter((item) => rolConfig.gremiosDisponibles.includes(item.id))
    : gremiosCatalogo);
  const lotesDisponibles = formData.emprendimientos.length > 0
    ? lotesEspecialesCatalogo.filter((lote) => formData.emprendimientos.includes(lote.emprendimiento))
    : lotesEspecialesCatalogo;

  return (
    <>
      <Head>
        <title>{pageTitle} - Lote Para Todos</title>
      </Head>
      
      <LoteParaTodosLayout currentModule="usuarios" pageTitle={pageTitle}>
        <Container maxWidth="md" sx={{ py: 3 }}>
          {/* Header */}
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
            <IconButton 
              onClick={handleCancel}
              sx={{ 
                color: 'text.secondary',
                '&:hover': { backgroundColor: 'action.hover' }
              }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {pageTitle}
            </Typography>
          </Stack>

          <Grid container spacing={4}>
            <Grid item xs={12}>
              {/* Sección: Datos personales */}
              <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', mb: 3 }}>
                <CardContent sx={{ p: 4 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                    <PersonIcon color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Datos personales
                    </Typography>
                  </Stack>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Usuario"
                        value={formData.usuario}
                        onChange={handleInputChange('usuario')}
                        placeholder="Ej: juan.perez"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          },
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange('email')}
                        placeholder="ejemplo@empresa.com"
                        InputProps={{
                          startAdornment: <EmailIcon color="action" sx={{ mr: 1 }} />
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          },
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Nombre"
                        value={formData.nombre}
                        onChange={handleInputChange('nombre')}
                        placeholder="Juan"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          },
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Apellido"
                        value={formData.apellido}
                        onChange={handleInputChange('apellido')}
                        placeholder="Pérez"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          },
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Contraseña"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={handleInputChange('password')}
                        placeholder={isEditing ? '••••••••' : 'Ingrese una contraseña segura'}
                        InputProps={{
                          startAdornment: <LockIcon color="action" sx={{ mr: 1 }} />,
                          endAdornment: (
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                              size="small"
                            >
                              {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          )
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          },
                          '& input[type="password"]': {
                            color: isEditing ? 'text.disabled' : 'text.primary',
                          }
                        }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Sección: Gremios asignados */}
              <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', mb: 3 }}>
                <CardContent sx={{ p: 4 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                    <GroupIcon color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Gremios asignados
                    </Typography>
                  </Stack>

                  {gremiosDisponibles.length === 0 ? (
                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                      Este rol no tiene gremios disponibles. El usuario no podrá asociarse a gremios.
                    </Alert>
                  ) : (
                    <FormGroup>
                      <Grid container spacing={2}>
                        {gremiosDisponibles.map((gremio) => (
                          <Grid item xs={12} sm={6} md={4} key={gremio.id}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={formData.gremios.includes(gremio.id)}
                                  onChange={handleCheckboxChange('gremios', gremio.id)}
                                  sx={{ '&.Mui-checked': { color: 'secondary.main' } }}
                                />
                              }
                              label={gremio.label}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    </FormGroup>
                  )}
                </CardContent>
              </Card>

              {/* Sección: Lotes especiales */}
              {(rolConfig.permiteLotesEspeciales || formData.lotesEspeciales.length > 0) && (
                <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', mb: 3 }}>
                  <CardContent sx={{ p: 4 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                      <LoteIcon color="primary" />
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        Lotes especiales asignados
                      </Typography>
                    </Stack>

                    <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                      Solo disponible para roles con permiso de edición de lotes. El listado se filtra según los emprendimientos seleccionados.
                    </Alert>

                    {formData.emprendimientos.length > 0 && (
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                          Configuraciones rápidas por emprendimiento
                        </Typography>
                        <Grid container spacing={2}>
                          {formData.emprendimientos
                            .filter(
                              (emprendimientoId) =>
                                (lotesEspecialesPorEmprendimiento[emprendimientoId] || []).length > 0
                            )
                            .map((emprendimientoId) => {
                              const lotesDisponiblesEmp =
                                lotesEspecialesPorEmprendimiento[emprendimientoId] || [];
                              return (
                                <Grid item xs={12} sm={6} key={emprendimientoId}>
                                  <Paper
                                    variant="outlined"
                                    sx={{
                                      p: 2,
                                      borderRadius: 2,
                                      borderStyle: 'dashed'
                                    }}
                                  >
                                    <Stack
                                      direction="row"
                                      alignItems="center"
                                      justifyContent="space-between"
                                      spacing={1}
                                    >
                                      <Box>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                          {emprendimientoLabelMap[emprendimientoId] || emprendimientoId}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          Aplicá atajos sobre los lotes especiales
                                        </Typography>
                                      </Box>
                                      <Chip
                                        label={`${lotesDisponiblesEmp.length} lotes`}
                                        size="small"
                                        color="primary"
                                      />
                                    </Stack>
                                    <Stack
                                      direction={{ xs: 'column', sm: 'row' }}
                                      spacing={1}
                                      sx={{ mt: 2 }}
                                    >
                                      <Button
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                        onClick={() => handleQuickLoteSelection(emprendimientoId, 'all')}
                                      >
                                        Todos
                                      </Button>
                                      <Button
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                        onClick={() => handleQuickLoteSelection(emprendimientoId, 'even')}
                                      >
                                        Solo pares
                                      </Button>
                                      <Button
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                        onClick={() => handleQuickLoteSelection(emprendimientoId, 'odd')}
                                      >
                                        Solo impares
                                      </Button>
                                    </Stack>
                                  </Paper>
                                </Grid>
                              );
                            })}
                        </Grid>
                      </Box>
                    )}

                    {lotesDisponibles.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Selecciona al menos un emprendimiento para visualizar los lotes especiales.
                      </Typography>
                    ) : (
                      <Autocomplete
                        multiple
                        options={lotesDisponibles}
                        value={lotesDisponibles.filter((lote) => formData.lotesEspeciales.includes(lote.id))}
                        onChange={handleLotesEspecialesChange}
                        getOptionLabel={(option) => `${option.id} • ${option.descripcion}`}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Lotes especiales"
                            placeholder="Buscar por código"
                          />
                        )}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          }
                        }}
                      />
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Sección: Rol del usuario */}
              <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', mb: 3 }}>
                <CardContent sx={{ p: 4 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                    <BadgeIcon color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Rol del usuario
                    </Typography>
                  </Stack>
                  
                  <FormControl fullWidth>
                    <InputLabel>Seleccionar rol</InputLabel>
                    <Select
                      value={formData.rol}
                      label="Seleccionar rol"
                      onChange={handleInputChange('rol')}
                      sx={{
                        borderRadius: 2,
                        '& .MuiSelect-select': {
                          py: 2,
                        }
                      }}
                    >
                      {roles.map((rol) => (
                        <MenuItem key={rol} value={rol} sx={{ py: 1.5 }}>
                          <Typography variant="body1">{rol}</Typography>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </CardContent>
              </Card>

              {/* Sección: Emprendimientos asignados */}
              <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', mb: 3 }}>
                <CardContent sx={{ p: 4 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                    <BusinessIcon color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Emprendimientos asignados
                    </Typography>
                  </Stack>

                  {emprendimientosDisponibles.length === 0 ? (
                    <Alert severity="warning" sx={{ borderRadius: 2 }}>
                      Este rol no tiene emprendimientos habilitados. No podrás asociar proyectos a este usuario.
                    </Alert>
                  ) : (
                    <FormGroup>
                      <Grid container spacing={2}>
                        {emprendimientosDisponibles.map((emprendimiento) => (
                          <Grid item xs={12} sm={6} md={4} key={emprendimiento.id}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={formData.emprendimientos.includes(emprendimiento.id)}
                                  onChange={handleCheckboxChange('emprendimientos', emprendimiento.id)}
                                  sx={{
                                    '&.Mui-checked': {
                                      color: 'primary.main',
                                    },
                                  }}
                                />
                              }
                              label={
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {emprendimiento.label}
                                </Typography>
                              }
                              sx={{ 
                                m: 0,
                                '& .MuiFormControlLabel-label': {
                                  pl: 1,
                                }
                              }}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    </FormGroup>
                  )}
                </CardContent>
              </Card>

              {/* Sección: Cajas visibles (solo para Tesorería) */}
              {showCajas && (
                <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', mb: 3 }}>
                  <CardContent sx={{ p: 4 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                      <CajaIcon color="primary" />
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        Cajas visibles
                      </Typography>
                    </Stack>
                    
                    <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                      Esta sección solo se utiliza si el usuario tiene el rol Tesorería.
                    </Alert>
                    
                    <FormGroup>
                      <Grid container spacing={2}>
                        {cajas.map((caja) => (
                          <Grid item xs={12} sm={6} key={caja}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={formData.cajas.includes(caja)}
                                  onChange={handleCheckboxChange('cajas', caja)}
                                  sx={{
                                    '&.Mui-checked': {
                                      color: 'primary.main',
                                    },
                                  }}
                                />
                              }
                              label={
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {caja}
                                </Typography>
                              }
                              sx={{ 
                                m: 0,
                                '& .MuiFormControlLabel-label': {
                                  pl: 1,
                                }
                              }}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    </FormGroup>
                  </CardContent>
                </Card>
              )}

              {/* Sección: Grupo de comisiones (solo para Vendedores) */}
              {showGrupoComision && (
                <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', mb: 3 }}>
                  <CardContent sx={{ p: 4 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                      <GroupIcon color="primary" />
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        Grupo de comisiones
                      </Typography>
                    </Stack>
                    
                    <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                      Visible solo si el rol seleccionado es Vendedor.
                    </Alert>
                    
                    <FormControl fullWidth>
                      <InputLabel>Seleccionar grupo</InputLabel>
                      <Select
                        value={formData.grupoComision}
                        label="Seleccionar grupo"
                        onChange={handleInputChange('grupoComision')}
                        sx={{
                          borderRadius: 2,
                          '& .MuiSelect-select': {
                            py: 2,
                          }
                        }}
                      >
                        {gruposComision.map((grupo) => (
                          <MenuItem key={grupo} value={grupo} sx={{ py: 1.5 }}>
                            <Typography variant="body1">{grupo}</Typography>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </CardContent>
                </Card>
              )}

              {/* Sección: Permisos adicionales */}
              <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', mb: 3 }}>
                <CardContent sx={{ p: 4 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <SecurityIcon color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Permisos adicionales
                    </Typography>
                  </Stack>
                  
                  <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                    <Typography variant="body2">
                      Usá esta sección solo para excepciones aprobadas. El usuario ya recibe permisos base según su rol.
                    </Typography>
                  </Alert>

                  {/* Mostrar permisos del rol actual */}
                  {formData.rol && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
                        Permisos incluidos en el rol “{formData.rol}”:
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
                        {(permisosPorRol[formData.rol] || []).map((permiso, index) => (
                          <Chip
                            key={index}
                            label={permiso}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{
                              mb: 1,
                              borderRadius: 1.5,
                              fontSize: '0.75rem'
                            }}
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}

                  <Divider sx={{ mb: 3 }} />

                  {/* Permisos adicionales seleccionables */}
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
                    Permisos adicionales para este usuario:
                  </Typography>
                  
                  <FormGroup>
                    <Grid container spacing={2}>
                      {permisosDisponibles
                        .filter(permiso => !((permisosPorRol[formData.rol] || []).includes(permiso)))
                        .map((permiso) => (
                          <Grid item xs={12} sm={6} md={4} key={permiso}>
                            <Paper
                              sx={{
                                p: 2,
                                borderRadius: 2,
                                backgroundColor: formData.permisosAdicionales.includes(permiso) 
                                  ? 'success.50' 
                                  : 'grey.50',
                                border: '1px solid',
                                borderColor: formData.permisosAdicionales.includes(permiso)
                                  ? 'success.200'
                                  : 'grey.200',
                                transition: 'all 0.2s ease-in-out',
                                '&:hover': {
                                  borderColor: 'success.main',
                                  boxShadow: 1,
                                },
                              }}
                            >
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={formData.permisosAdicionales.includes(permiso)}
                                    onChange={handleCheckboxChange('permisosAdicionales', permiso)}
                                    sx={{
                                      '&.Mui-checked': {
                                        color: 'success.main',
                                      },
                                    }}
                                  />
                                }
                                label={
                                  <Stack direction="row" alignItems="center" spacing={1}>
                                    <AddIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        fontWeight: formData.permisosAdicionales.includes(permiso) ? 600 : 400,
                                        color: 'text.primary'
                                      }}
                                    >
                                      {permiso}
                                    </Typography>
                                  </Stack>
                                }
                                sx={{ 
                                  m: 0,
                                  '& .MuiFormControlLabel-label': {
                                    pl: 1,
                                  }
                                }}
                              />
                            </Paper>
                          </Grid>
                        ))}
                    </Grid>
                  </FormGroup>

                  {formData.permisosAdicionales.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                      Este usuario no tiene permisos adicionales asignados.
                    </Typography>
                  )}

                  {formData.permisosAdicionales.length > 0 && (
                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                      <Chip
                        label={`${formData.permisosAdicionales.length} permisos adicionales`}
                        color="success"
                        variant="outlined"
                      />
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Botones de acción */}
              <Paper 
                sx={{ 
                  p: 3, 
                  borderRadius: 3, 
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                  backgroundColor: 'grey.50'
                }}
              >
                <Stack direction="row" justifyContent="flex-end" spacing={2}>
                  <Button
                    variant="outlined"
                    onClick={handleCancel}
                    size="large"
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 500,
                      px: 4,
                      py: 1.5,
                      borderColor: 'grey.300',
                      color: 'text.secondary',
                      '&:hover': {
                        borderColor: 'grey.400',
                        backgroundColor: 'grey.100',
                      },
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleSubmit}
                    size="large"
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      px: 4,
                      py: 1.5,
                      boxShadow: 'none',
                      '&:hover': {
                        boxShadow: 2,
                      },
                    }}
                  >
                    {buttonText}
                  </Button>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </LoteParaTodosLayout>
    </>
  );
};

export default CrearEditarUsuarioPage;