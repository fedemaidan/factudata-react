// Nueva página para listar movimientos de caja chica del usuario logueado
import { useState, useEffect, useMemo } from 'react';
import {
  Box, Container, Typography, Stack, Select, MenuItem, TextField, InputAdornment,
  Paper, Table, TableBody, TableCell, TableHead, TableRow, Chip, Snackbar, Alert,
  Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  CircularProgress, Card, CardContent, ToggleButton, ToggleButtonGroup, Autocomplete,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import Head from 'next/head';
import { useAuthContext } from 'src/contexts/auth-context';
import ticketService from 'src/services/ticketService';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import movimientosService from 'src/services/movimientosService';
import { useRouter } from 'next/router';
import profileService from 'src/services/profileService';
import cajaChicaService from 'src/services/cajaChica/cajaChicaService';
import TransferenciaModal from 'src/components/cajaChica/TransferenciaModal';
import MovimientoCajaChicaModal from 'src/components/cajaChica/MovimientoCajaChicaModal';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import proveedorService from 'src/services/proveedorService';
import { formatTimestamp } from 'src/utils/formatters';

const formatCurrency = (amount, moneda = 'ARS') => {
  if (!amount) return moneda === 'USD' ? 'US$ 0' : '$ 0';
  return amount.toLocaleString('es-AR', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 0,
  });
};

const CajaChicaPage = () => {
  const router = useRouter();
  const { user } = useAuthContext();
  const { userId } = router.query;
  const [movimientos, setMovimientos] = useState([]);
  const [isLoadingMovimientos, setIsLoadingMovimientos] = useState(true);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [filtroDias, setFiltroDias] = useState('730');
  const [filtroObs, setFiltroObs] = useState('');
  const [filtroProveedor, setFiltroProveedor] = useState('');
  const [filtroProyecto, setFiltroProyecto] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [moneda, setMoneda] = useState('ARS');
  const [userById, setUserById] = useState(null);
  
  // Estados para transferencias
  const [profiles, setProfiles] = useState([]);
  const [saldosMap, setSaldosMap] = useState({});
  const [isTransferLoading, setIsTransferLoading] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  // Estados para modal de movimiento caja chica
  const [movModalOpen, setMovModalOpen] = useState(false);
  const [movModalTipo, setMovModalTipo] = useState('egreso');
  const [isMovLoading, setIsMovLoading] = useState(false);
  const [proyectosEmpresa, setProyectosEmpresa] = useState([]);
  const [categoriasEmpresa, setCategoriasEmpresa] = useState([]);
  const [proveedoresEmpresa, setProveedoresEmpresa] = useState([]);


  const [deletingElement, setDeletingElement] = useState(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [movimientoAEliminar, setMovimientoAEliminar] = useState(null);

    const handleEliminarClick = (movimientoId) => {
        setMovimientoAEliminar(movimientoId);
        setOpenDialog(true);
      };
    const eliminarMovimiento = async () => {
        setDeletingElement(movimientoAEliminar);
        try {
            const result = await movimientosService.deleteMovimientoById(movimientoAEliminar);
            if (result) {
            setMovimientos((prev) => prev.filter((mov) => mov.id !== movimientoAEliminar));
            setAlert({ open: true, message: 'Movimiento eliminado con éxito', severity: 'success' });
            } else {
            setAlert({ open: true, message: 'Error al eliminar el movimiento', severity: 'error' });
            }
        } catch (err) {
            console.error(err);
            setAlert({ open: true, message: 'Error inesperado', severity: 'error' });
        } finally {
            setDeletingElement(null);
            setOpenDialog(false);
        }
    };

  const handleOpenTransferModal = () => {
    setTransferModalOpen(true);
  };

  const handleCloseTransferModal = () => {
    setTransferModalOpen(false);
  };

  const fetchMovimientos = async () => {
    if (!user) return;
    setIsLoadingMovimientos(true);
    try {
    let userU = user;
    
    if (userId) {
      userU = await profileService.getProfileById(userId);
      setUserById(userU);
    }
    
    // Pass empresa context for proper filtering
    const userWithEmpresa = { ...userU, empresa: userU.empresa || user.empresa, empresaId: userU.empresaId || user.empresa?.id };
    const movs = await ticketService.getCajaChicaDelUsuario(userWithEmpresa, moneda);
    setMovimientos(movs);
    
    // Cargar perfiles y saldos para transferencias
    if (user?.empresa) {
      try {
        const [perfiles, saldos] = await Promise.all([
          profileService.getProfileByEmpresa(user.empresa.id),
          cajaChicaService.getSaldosPorEmpresa(user.empresa.id),
        ]);
        setProfiles(perfiles);
        const map = {};
        saldos.forEach(s => { map[s.user_phone] = s; });
        setSaldosMap(map);
      } catch (err) {
        console.error('Error cargando perfiles/saldos:', err);
      }
    }

    // Cargar proyectos, categorías y proveedores para el modal de movimiento
    try {
      const empresa = await getEmpresaDetailsFromUser(user);
      if (empresa) {
        const [pys, provNombres] = await Promise.all([
          getProyectosByEmpresa(empresa),
          proveedorService.getNombres(empresa.id),
        ]);
        setProyectosEmpresa(pys);
        setCategoriasEmpresa(empresa.categorias || []);
        setProveedoresEmpresa(provNombres);
      }
    } catch (err) {
      console.error('Error cargando proyectos/categorías:', err);
    }
    } finally {
      setIsLoadingMovimientos(false);
    }
  };

  const handleOpenMovModal = (tipo) => {
    setMovModalTipo(tipo);
    setMovModalOpen(true);
  };

  const handleCloseMovModal = () => {
    setMovModalOpen(false);
  };

  const handleCreateMovimiento = async (movimientoData) => {
    setIsMovLoading(true);
    try {
      const targetUser = userById || user;
      const dataToSend = {
        ...movimientoData,
        user_phone: targetUser.phone || targetUser.telefono,
        empresa_id: user.empresa?.id,
      };
      const result = await movimientosService.addMovimiento(dataToSend);
      if (result.error) {
        setAlert({ open: true, message: 'Error al crear el movimiento', severity: 'error' });
      } else {
        setAlert({ open: true, message: `${movimientoData.type === 'ingreso' ? 'Ingreso' : 'Egreso'} creado exitosamente`, severity: 'success' });
        setMovModalOpen(false);
        await fetchMovimientos();
      }
    } catch (error) {
      console.error('Error al crear movimiento:', error);
      setAlert({ open: true, message: error.message || 'Error al crear el movimiento', severity: 'error' });
    } finally {
      setIsMovLoading(false);
    }
  };

  const handleCreateTransfer = async (transferData) => {
    setIsTransferLoading(true);
    try {
      console.log('Creando transferencia desde caja chica:', transferData);
      const response = await cajaChicaService.crearTransferencia(transferData);
      console.log('Transferencia creada:', response);
      
      setAlert({ 
        open: true, 
        message: 'Transferencia creada exitosamente', 
        severity: 'success' 
      });
      setTransferModalOpen(false);
      
      // Actualizar el listado de movimientos
      await fetchMovimientos();
      
    } catch (error) {
      console.error('Error al crear transferencia:', error);
      setAlert({ 
        open: true, 
        message: error.message || 'Error al crear la transferencia', 
        severity: 'error' 
      });
    } finally {
      setIsTransferLoading(false);
    }
  };
            
  useEffect(() => {
    if (!router.isReady) return;
    fetchMovimientos();
  }, [user, userId, router.isReady, moneda]);

  const handleCloseAlert = () => setAlert({ ...alert, open: false });

  const saldoTotalCaja = useMemo(() => {
    return movimientos.reduce((acc, mov) => {
      const total = Number(mov.total) || 0;
      return acc + (mov.type === 'ingreso' ? total : -total);
    }, 0);
  }, [movimientos]);

  const proyectosUnicos = useMemo(() => {
    const set = new Set();
    movimientos.forEach((m) => m.proyecto && set.add(m.proyecto));
    return Array.from(set);
  }, [movimientos]);

  const categoriasUnicas = useMemo(() => {
    const set = new Set();
    movimientos.forEach((m) => m.categoria && set.add(m.categoria));
    return Array.from(set).sort();
  }, [movimientos]);

  const movimientosFiltrados = useMemo(() => {
    const hoy = new Date();
    return movimientos.filter((mov) => {
      const fechaMovimiento = new Date(formatTimestamp(mov.fecha_factura));
      const diferenciaDias = (hoy - fechaMovimiento) / (1000 * 60 * 60 * 24);
      mov.observacion = mov.observacion || "";
      const coincideDias = diferenciaDias <= filtroDias;
      const coincideObs = mov.observacion.toLowerCase().includes(filtroObs.toLowerCase());
      const coincideProveedor = filtroProveedor ? mov.nombre_proveedor?.toLowerCase().includes(filtroProveedor.toLowerCase()) : true;
      const coincideProyecto = filtroProyecto ? mov.proyecto === filtroProyecto : true;
      const coincideCategoria = filtroCategoria ? mov.categoria === filtroCategoria : true;
      return coincideDias && coincideObs && coincideProveedor && coincideProyecto && coincideCategoria;
    }).sort((a, b) => new Date(formatTimestamp(b.fecha_factura)) - new Date(formatTimestamp(a.fecha_factura)));
  }, [movimientos, filtroDias, filtroObs, filtroProveedor, filtroProyecto, filtroCategoria]);
  
  const saldoFiltrado = useMemo(() => {
    return movimientosFiltrados.reduce((acc, mov) => {
      const total = Number(mov.total) || 0;
      return acc + (mov.type === 'ingreso' ? total : -total);
    }, 0);
  }, [movimientosFiltrados]);

  const totalIngresosFiltrado = useMemo(() => {
    return movimientosFiltrados.filter(m => m.type === 'ingreso').reduce((acc, m) => acc + (Number(m.total) || 0), 0);
  }, [movimientosFiltrados]);

  const totalEgresosFiltrado = useMemo(() => {
    return movimientosFiltrados.filter(m => m.type !== 'ingreso').reduce((acc, m) => acc + (Number(m.total) || 0), 0);
  }, [movimientosFiltrados]);

  // Acumulado: saldo corrido de más antiguo a más reciente
  const movimientosConAcumulado = useMemo(() => {
    // movimientosFiltrados está ordenado desc (más reciente primero), invertimos para calcular
    const ordenados = [...movimientosFiltrados].reverse();
    let acum = 0;
    const mapa = new Map();
    ordenados.forEach((mov, i) => {
      const total = Number(mov.total) || 0;
      acum += mov.type === 'ingreso' ? total : -total;
      mapa.set(mov.id || i, acum);
    });
    return mapa;
  }, [movimientosFiltrados]);
  
  return (
    <>
      <Head>
        <title>
          { userById ? "Caja chica de " + userById.firstName + " " + userById.lastName : "Mi Caja Chica"}
          </title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h4">
              { userById ? "Caja chica de " + userById.firstName + " " + userById.lastName : "Mi Caja Chica"}
              </Typography>
              <Box display="flex" gap={1} alignItems="center">
                <ToggleButtonGroup
                  value={moneda}
                  exclusive
                  onChange={(e, val) => val && setMoneda(val)}
                  size="small"
                >
                  <ToggleButton value="ARS">ARS</ToggleButton>
                  <ToggleButton value="USD">USD</ToggleButton>
                </ToggleButtonGroup>
                {userId && (
                  <Button variant="outlined" onClick={() => router.push('/perfilesEmpresa')}>
                    ← Volver a Cajas Chicas
                  </Button>
                )}
              </Box>
            </Box>

            {/* Cards resumen */}
            <Stack direction="row" spacing={2}>
              <Card sx={{ minWidth: 180 }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Saldo</Typography>
                  <Typography variant="h5" color={saldoTotalCaja >= 0 ? 'success.main' : 'error.main'}>
                    {formatCurrency(saldoTotalCaja, moneda)}
                  </Typography>
                </CardContent>
              </Card>
              <Card sx={{ minWidth: 180 }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Ingresos (filtrado)</Typography>
                  <Typography variant="h5" color="success.main">
                    {formatCurrency(totalIngresosFiltrado, moneda)}
                  </Typography>
                </CardContent>
              </Card>
              <Card sx={{ minWidth: 180 }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Egresos (filtrado)</Typography>
                  <Typography variant="h5" color="error.main">
                    {formatCurrency(totalEgresosFiltrado, moneda)}
                  </Typography>
                </CardContent>
              </Card>
              <Card sx={{ minWidth: 180 }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Saldo filtrado</Typography>
                  <Typography variant="h5">
                    {formatCurrency(saldoFiltrado, moneda)}
                  </Typography>
                </CardContent>
              </Card>
            </Stack>
            
            <Box display="flex" justifyContent="flex-end" gap={1}>
              <Button 
                variant="contained" 
                color="success"
                startIcon={<AddCircleOutlineIcon />}
                onClick={() => handleOpenMovModal('ingreso')}
              >
                Ingreso
              </Button>
              <Button 
                variant="contained" 
                color="error"
                startIcon={<RemoveCircleOutlineIcon />}
                onClick={() => handleOpenMovModal('egreso')}
              >
                Egreso
              </Button>
              <Button 
                variant="contained" 
                color="primary"
                onClick={handleOpenTransferModal}
                disabled={profiles.length < 2}
              >
                Nueva Transferencia
              </Button>
            </Box>

            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Select
                  value={filtroDias}
                  onChange={(e) => setFiltroDias(e.target.value)}
                  size="small"
                >
                  <MenuItem value="15">Últimos 15 días</MenuItem>
                  <MenuItem value="30">Últimos 30 días</MenuItem>
                  <MenuItem value="60">Últimos 60 días</MenuItem>
                  <MenuItem value="90">Últimos 90 días</MenuItem>
                  <MenuItem value="365">Último año</MenuItem>
                  <MenuItem value="730">Últimos 2 años</MenuItem>
                </Select>

                <TextField
                  label="Buscar por Observación"
                  variant="outlined"
                  size="small"
                  onChange={(e) => setFiltroObs(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />

                <Select
                  value={filtroProyecto}
                  onChange={(e) => setFiltroProyecto(e.target.value)}
                  displayEmpty
                  size="small"
                >
                  <MenuItem value="">Todos los proyectos</MenuItem>
                  {proyectosUnicos.map((proy, index) => (
                    <MenuItem key={index} value={proy}>{proy}</MenuItem>
                  ))}
                </Select>

                <Select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  displayEmpty
                  size="small"
                >
                  <MenuItem value="">Todas las categorías</MenuItem>
                  {categoriasUnicas.map((cat, index) => (
                    <MenuItem key={index} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>

                <Autocomplete
                  freeSolo
                  options={proveedoresEmpresa}
                  value={filtroProveedor}
                  onInputChange={(e, val) => setFiltroProveedor(val)}
                  renderInput={(params) => <TextField {...params} label="Proveedor" size="small" />}
                  sx={{ minWidth: 200 }}
                />
            </Stack>

            {isLoadingMovimientos ? (
              <Box display="flex" justifyContent="center" py={5}>
                <CircularProgress />
              </Box>
            ) : movimientosFiltrados.length === 0 ? (
              <Paper sx={{ p: 5, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {movimientos.length === 0
                    ? 'No hay movimientos en esta caja chica'
                    : 'No hay movimientos que coincidan con los filtros'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {movimientos.length === 0
                    ? 'Creá un ingreso o egreso para empezar'
                    : 'Probá ajustando los filtros'}
                </Typography>
              </Paper>
            ) : (
            <Paper>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Código</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Proyecto</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="right">Acumulado</TableCell>
                    <TableCell>Categoría</TableCell>
                    <TableCell>Proveedor</TableCell>
                    <TableCell>Observación</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {movimientosFiltrados.map((mov, index) => {
                    const acumulado = movimientosConAcumulado.get(mov.id || index) || 0;
                    return (
                    <TableRow key={mov.id || index}>
                        <TableCell>{mov.codigo_operacion}</TableCell>
                      <TableCell>{formatTimestamp(mov.fecha_factura)}</TableCell>
                      <TableCell>{mov.proyecto}</TableCell>
                      <TableCell>
                        <Chip
                          label={mov.type === "ingreso" ? "Ingreso" : "Egreso"}
                          color={mov.type === "ingreso" ? "success" : "error"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">{formatCurrency(mov.total, moneda)}</TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          color={acumulado >= 0 ? 'success.main' : 'error.main'}
                          fontWeight={500}
                        >
                          {formatCurrency(acumulado, moneda)}
                        </Typography>
                      </TableCell>
                      <TableCell>{mov.categoria}</TableCell>
                      <TableCell>{mov.nombre_proveedor}</TableCell>
                      <TableCell>{mov.observacion}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            <Button
                              size="small"
                              color="primary"
                              startIcon={<EditIcon />}
                              onClick={() => {
                                const backUrl = userId ? `/cajaChica?userId=${userId}` : '/cajaChica';
                                const backName = userById ? `Caja chica de ${userById.firstName} ${userById.lastName}` : 'Mi Caja Chica';
                                router.push(`/movementForm?movimientoId=${mov.id}&lastPageUrl=${encodeURIComponent(backUrl)}&lastPageName=${encodeURIComponent(backName)}`);
                              }}
                            >
                              Editar
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              startIcon={<DeleteIcon />}
                              onClick={() => handleEliminarClick(mov.id)}
                            >
                              {deletingElement !== mov.id ? "Eliminar" : "..."}
                            </Button>
                          </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Paper>
            )}
          </Stack>
        </Container>

        <TransferenciaModal
          open={transferModalOpen}
          onClose={handleCloseTransferModal}
          onSubmit={handleCreateTransfer}
          profiles={profiles}
          userActual={user}
          isLoading={isTransferLoading}
          usuarioFijo={userById || user}
          saldosMap={saldosMap}
        />

        <MovimientoCajaChicaModal
          open={movModalOpen}
          onClose={handleCloseMovModal}
          onSubmit={handleCreateMovimiento}
          proyectos={proyectosEmpresa}
          categorias={categoriasEmpresa}
          proveedores={proveedoresEmpresa}
          usuarioDestino={userById || user}
          isLoading={isMovLoading}
          tipoInicial={movModalTipo}
        />

        <Snackbar open={alert.open} autoHideDuration={6000} onClose={handleCloseAlert}>
          <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: '100%' }}>
            {alert.message}
          </Alert>
        </Snackbar>
      </Box>
      <Dialog
            open={openDialog}
            onClose={() => setOpenDialog(false)}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
            >
            <DialogTitle id="alert-dialog-title">Confirmar eliminación</DialogTitle>
            <DialogContent>
                <DialogContentText id="alert-dialog-description">
                ¿Estás seguro de que quieres eliminar este movimiento?
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
                <Button onClick={eliminarMovimiento} color="error" autoFocus>
                Eliminar
                </Button>
            </DialogActions>
            </Dialog>

    </>
  );
};

CajaChicaPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default CajaChicaPage;