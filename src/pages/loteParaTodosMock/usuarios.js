import Head from 'next/head';
import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  Avatar,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  SupervisorAccount as SupervisorIcon,
  AccountCircle as UserIcon
} from '@mui/icons-material';
import LoteParaTodosLayout from 'src/components/layouts/LoteParaTodosLayout';

const emprendimientosCatalogo = [
  { id: 'CR1', label: 'CR1 - Cerro Rico I' },
  { id: 'CR2', label: 'CR2 - Cerro Rico II' },
  { id: 'CR3', label: 'CR3 - Cerro Rico III' },
  { id: 'CR4', label: 'CR4 - Cerro Rico IV' },
  { id: 'CR5', label: 'CR5 - Cerro Rico V' },
  { id: 'PC', label: 'PC - Parque Central' },
  { id: 'EP', label: 'EP - El Portal' },
  { id: 'VM', label: 'VM - Vaca Muerta' }
];

const reportesCatalogo = {
  'reporte-mora': 'Reporte de Mora',
  'reporte-caja': 'Reporte de Caja y Tesorería',
  'reporte-ventas': 'Reporte Comercial / Ventas',
  'reporte-lotes': 'Reporte de Lotes y Masterplan'
};

const getReporteLabel = (id) => reportesCatalogo[id] || id;
const getEmprendimientoLabel = (id) => emprendimientosCatalogo.find((item) => item.id === id)?.label || id;

// Mock data para usuarios
const mockUsuarios = [
  {
    id: 1,
    nombre: 'Juan Pérez',
    email: 'juan.perez@example.com',
    rol: 'Administrador',
    emprendimientos: ['CR1', 'CR2'],
    gremios: ['UOM'],
    lotesEspeciales: ['CR1-045'],
    reportes: ['reporte-mora', 'reporte-caja', 'reporte-lotes'],
    avatar: null,
    estado: 'Activo',
    ultimoAcceso: '2024-11-13T10:30:00Z'
  },
  {
    id: 2,
    nombre: 'María González',
    email: 'maria.gonzalez@example.com',
    rol: 'Supervisor',
    emprendimientos: ['CR1'],
    gremios: ['Comercio', 'Docentes'],
    lotesEspeciales: ['CR2-120'],
    reportes: ['reporte-mora', 'reporte-ventas'],
    avatar: null,
    estado: 'Activo',
    ultimoAcceso: '2024-11-13T09:15:00Z'
  },
  {
    id: 3,
    nombre: 'Carlos Rodríguez',
    email: 'carlos.rodriguez@example.com',
    rol: 'Vendedor',
    emprendimientos: ['CR3', 'EP'],
    gremios: ['UOM', 'Comercio'],
    lotesEspeciales: [],
    reportes: ['reporte-ventas'],
    avatar: null,
    estado: 'Activo',
    ultimoAcceso: '2024-11-12T16:45:00Z'
  },
  {
    id: 4,
    nombre: 'Ana López',
    email: 'ana.lopez@example.com',
    rol: 'Vendedor',
    emprendimientos: ['CR1'],
    gremios: ['Docentes'],
    lotesEspeciales: [],
    reportes: [],
    avatar: null,
    estado: 'Inactivo',
    ultimoAcceso: '2024-11-10T14:20:00Z'
  },
  {
    id: 5,
    nombre: 'Diego Martínez',
    email: 'diego.martinez@example.com',
    rol: 'Supervisor',
    emprendimientos: ['CR4', 'VM'],
    gremios: ['Bancarios'],
    lotesEspeciales: ['VM-301'],
    reportes: ['reporte-caja', 'reporte-lotes'],
    avatar: null,
    estado: 'Activo',
    ultimoAcceso: '2024-11-13T08:00:00Z'
  }
];

const mockEmprendimientos = emprendimientosCatalogo;

const mockRoles = [
  'Administrador',
  'Supervisor',
  'Vendedor'
];

// Función para obtener el color del chip según el rol
const getColorForRol = (rol) => {
  switch (rol) {
    case 'Administrador':
      return 'error';
    case 'Supervisor':
      return 'warning';
    case 'Vendedor':
      return 'info';
    default:
      return 'default';
  }
};

// Función para obtener el ícono según el rol
const getIconForRol = (rol) => {
  switch (rol) {
    case 'Administrador':
      return <AdminIcon fontSize="small" />;
    case 'Supervisor':
      return <SupervisorIcon fontSize="small" />;
    case 'Vendedor':
      return <UserIcon fontSize="small" />;
    default:
      return <PersonIcon fontSize="small" />;
  }
};

// Función para obtener las iniciales del nombre
const getInitials = (nombre) => {
  return nombre
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const UsuariosPage = () => {
  const router = useRouter();
  const [usuarios] = useState(mockUsuarios);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [filtroEmprendimiento, setFiltroEmprendimiento] = useState('');

  // Filtrar usuarios
  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter(usuario => {
      const matchSearchTerm = !searchTerm || 
        usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        usuario.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchRol = !filtroRol || usuario.rol === filtroRol;
      
      const matchEmprendimiento = !filtroEmprendimiento || 
        usuario.emprendimientos.includes(filtroEmprendimiento);

      return matchSearchTerm && matchRol && matchEmprendimiento;
    });
  }, [usuarios, searchTerm, filtroRol, filtroEmprendimiento]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const limpiarFiltros = () => {
    setSearchTerm('');
    setFiltroRol('');
    setFiltroEmprendimiento('');
    setPage(0);
  };

  return (
    <>
      <Head>
        <title>Usuarios - Lote Para Todos</title>
      </Head>
      
      <LoteParaTodosLayout currentModule="usuarios" pageTitle="Gestión de Usuarios">
        <Container maxWidth="xl" sx={{ py: 3 }}>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                Usuarios
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                size="large"
                onClick={() => router.push('/loteParaTodosMock/usuario-form?id=nuevo')}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  py: 1.5,
                  boxShadow: 'none',
                  '&:hover': {
                    boxShadow: 2
                  }
                }}
              >
                Crear Usuario
              </Button>
            </Stack>

            {/* Filtros */}
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
              <CardContent sx={{ p: 3 }}>
                <Grid container spacing={3} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      variant="outlined"
                      placeholder="Buscar por nombre o email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon color="action" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          '&:hover fieldset': {
                            borderColor: 'primary.main',
                          },
                        },
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Rol</InputLabel>
                      <Select
                        value={filtroRol}
                        label="Rol"
                        onChange={(e) => setFiltroRol(e.target.value)}
                        sx={{
                          borderRadius: 2,
                        }}
                      >
                        <MenuItem value="">Todos los roles</MenuItem>
                        {mockRoles.map((rol) => (
                          <MenuItem key={rol} value={rol}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              {getIconForRol(rol)}
                              <span>{rol}</span>
                            </Stack>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Emprendimiento</InputLabel>
                      <Select
                        value={filtroEmprendimiento}
                        label="Emprendimiento"
                        onChange={(e) => setFiltroEmprendimiento(e.target.value)}
                        sx={{
                          borderRadius: 2,
                        }}
                      >
                        <MenuItem value="">Todos los emprendimientos</MenuItem>
                        {mockEmprendimientos.map((emprendimiento) => (
                          <MenuItem key={emprendimiento.id} value={emprendimiento.id}>
                            {emprendimiento.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={2}>
                    <Button
                      variant="outlined"
                      onClick={limpiarFiltros}
                      startIcon={<FilterIcon />}
                      fullWidth
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        py: 1.5,
                        borderColor: 'grey.300',
                        color: 'text.secondary',
                        '&:hover': {
                          borderColor: 'primary.main',
                          backgroundColor: 'primary.50',
                        },
                      }}
                    >
                      Limpiar
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>

          {/* Tabla de usuarios */}
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>
                      Usuario
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Nombre
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Email
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Rol
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Emprendimientos asignados
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Gremios asignados
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Reportes habilitados
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.primary', textAlign: 'center' }}>
                      Acciones
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {usuariosFiltrados
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((usuario) => (
                      <TableRow
                        key={usuario.id}
                        sx={{
                          '&:hover': {
                            backgroundColor: 'action.hover',
                          },
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <TableCell sx={{ py: 2 }}>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Avatar
                              sx={{
                                width: 40,
                                height: 40,
                                backgroundColor: 'primary.main',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                              }}
                            >
                              {getInitials(usuario.nombre)}
                            </Avatar>
                            <Box>
                              <Chip
                                label={usuario.estado}
                                size="small"
                                color={usuario.estado === 'Activo' ? 'success' : 'default'}
                                sx={{
                                  fontSize: '0.75rem',
                                  height: 20,
                                  borderRadius: 1,
                                }}
                              />
                            </Box>
                          </Stack>
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2" fontWeight={500} color="text.primary">
                            {usuario.nombre}
                          </Typography>
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {usuario.email}
                          </Typography>
                        </TableCell>
                        
                        <TableCell>
                          <Chip
                            icon={getIconForRol(usuario.rol)}
                            label={usuario.rol}
                            color={getColorForRol(usuario.rol)}
                            size="small"
                            sx={{
                              borderRadius: 2,
                              fontWeight: 500,
                            }}
                          />
                        </TableCell>
                        
                        <TableCell>
                          <Stack direction="row" spacing={0.5} flexWrap="wrap">
                            {usuario.emprendimientos.map((emprendimiento, index) => (
                              <Chip
                                key={index}
                                label={getEmprendimientoLabel(emprendimiento)}
                                size="small"
                                variant="outlined"
                                sx={{
                                  fontSize: '0.75rem',
                                  height: 24,
                                  borderRadius: 1.5,
                                  mb: 0.5,
                                  borderColor: 'grey.300',
                                  color: 'text.secondary',
                                }}
                              />
                            ))}
                          </Stack>
                          {usuario.lotesEspeciales?.length > 0 && (
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 1 }}>
                              {usuario.lotesEspeciales.map((lote) => (
                                <Chip
                                  key={lote}
                                  label={`Lote ${lote}`}
                                  size="small"
                                  color="secondary"
                                  variant="outlined"
                                  sx={{
                                    fontSize: '0.7rem',
                                    height: 22,
                                    borderRadius: 1.5,
                                  }}
                                />
                              ))}
                            </Stack>
                          )}
                        </TableCell>

                        <TableCell>
                          {usuario.gremios?.length ? (
                            <Stack direction="row" spacing={0.5} flexWrap="wrap">
                              {usuario.gremios.map((gremio) => (
                                <Chip
                                  key={gremio}
                                  label={gremio}
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    fontSize: '0.75rem',
                                    height: 24,
                                    borderRadius: 1.5,
                                    mb: 0.5
                                  }}
                                />
                              ))}
                            </Stack>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Sin gremios
                            </Typography>
                          )}
                        </TableCell>

                        <TableCell>
                          {usuario.reportes?.length ? (
                            <Stack direction="row" spacing={0.5} flexWrap="wrap">
                              {usuario.reportes.map((reporte) => (
                                <Chip
                                  key={reporte}
                                  label={getReporteLabel(reporte)}
                                  size="small"
                                  color="secondary"
                                  variant="outlined"
                                  sx={{
                                    fontSize: '0.7rem',
                                    height: 22,
                                    borderRadius: 1.5,
                                    mb: 0.5
                                  }}
                                />
                              ))}
                            </Stack>
                          ) : (
                            <Chip
                              label="Sin reportes"
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', height: 22 }}
                            />
                          )}
                        </TableCell>
                        
                        <TableCell align="center">
                          <Stack direction="row" justifyContent="center" spacing={1}>
                            <Tooltip title="Editar usuario">
                              <IconButton
                                size="small"
                                onClick={() => router.push(`/loteParaTodosMock/usuario-form?id=${usuario.id}`)}
                                sx={{
                                  color: 'primary.main',
                                  '&:hover': {
                                    backgroundColor: 'primary.50',
                                  },
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar usuario">
                              <IconButton
                                size="small"
                                sx={{
                                  color: 'error.main',
                                  '&:hover': {
                                    backgroundColor: 'error.50',
                                  },
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            <TablePagination
              component="div"
              count={usuariosFiltrados.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
              labelRowsPerPage="Filas por página:"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
              }
              sx={{
                borderTop: '1px solid',
                borderColor: 'divider',
                '& .MuiTablePagination-toolbar': {
                  px: 3,
                  py: 2,
                },
                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                  color: 'text.secondary',
                  fontSize: '0.875rem',
                },
              }}
            />
          </Card>

          {/* Información adicional */}
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Mostrando {usuariosFiltrados.length} de {usuarios.length} usuarios
            </Typography>
          </Box>
        </Container>
      </LoteParaTodosLayout>
    </>
  );
};

export default UsuariosPage;