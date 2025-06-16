import { useState, useMemo, useEffect } from 'react';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import Head from 'next/head';
import { Box, Container, Stack, Chip, Typography, TextField, InputAdornment, Paper, Card, CardContent, Button, Select, MenuItem, FormControl, InputLabel, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, useMediaQuery, IconButton, Fab, Menu, Table, TableBody, TableCell, TableHead, TableRow, MenuItem as MenuOption } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import AddCircle from '@mui/icons-material/AddCircle';
import GridOnIcon from '@mui/icons-material/GridOn';
import FilterListIcon from '@mui/icons-material/FilterList';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RefreshIcon from '@mui/icons-material/Refresh';

import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import { useRouter } from 'next/router';
import ticketService from 'src/services/ticketService';
import { getProyectoById, recargarProyecto } from 'src/services/proyectosService';
import movimientosService from 'src/services/movimientosService';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService'; 
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import { formatTimestamp } from 'src/utils/formatters';


const ProyectoMovimientosPage = () => {
  const { user } = useAuthContext();
  const [movimientos, setMovimientos] = useState([]);
  const [movimientosUSD, setMovimientosUSD] = useState([]);
  const [tablaActiva, setTablaActiva] = useState('ARS');
  const [empresa, setEmpresa] = useState(null);
  const [filtrosActivos, setFiltrosActivos] = useState(true);
  const [accionesActivas, setAccionesActivas] = useState(false);
  const [showDolar, setShowDolar] = useState(true);
  const [showPesos, setShowPesos] = useState(true);
  const [proyecto, setProyecto] = useState(null);
  const [deletingElement, setDeletingElement] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [movimientoAEliminar, setMovimientoAEliminar] = useState(null);
  const [filtroDias, setFiltroDias] = useState('730');
  const [filtroObs, setFiltroObs] = useState('');
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'info',
  });
  const router = useRouter();
  const { proyectoId } = router.query;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [anchorEl, setAnchorEl] = useState(null);
  

  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleCloseAlert = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setAlert({ ...alert, open: false });
  };

  const handleRecargarProyecto = async (proyecto_id) => {
    const resultado = await recargarProyecto(proyecto_id);
    if (resultado) {
      setAlert({
        open: true,
        message: 'Sheets recalculados con éxito',
        severity: 'success',
      });
    } else {
      setAlert({
        open: true,
        message: 'Error al recalcular sheets',
        severity: 'error',
      });
    }
  };

  const handleFiltrosActivos = () => {
    setFiltrosActivos(!filtrosActivos);
    handleCloseMenu();
  };

  const handleAccionesActivas = () => {
    setAccionesActivas(!accionesActivas);
    handleCloseMenu();
  };

  const eliminarMovimiento = async () => {
    setDeletingElement(movimientoAEliminar);
    const resultado = await movimientosService.deleteMovimientoById(movimientoAEliminar);
    if (resultado) {
      setMovimientos(movimientos.filter(mov => mov.id !== movimientoAEliminar));
      setMovimientosUSD(movimientosUSD.filter(mov => mov.id !== movimientoAEliminar));
      setAlert({
        open: true,
        message: 'Movimiento eliminado con éxito',
        severity: 'success',
      });
      setDeletingElement(null);
    } else {
      setAlert({
        open: true,
        message: 'Error al eliminar el elemento',
        severity: 'error',
      });
      setDeletingElement(null);
    }
    setOpenDialog(false);
  };

  const handleEliminarClick = (movimientoId) => {
    setMovimientoAEliminar(movimientoId);
    setOpenDialog(true);
  };

  const handleRefresh = async () => {
    if (!proyectoId) return;
  
    const movs = await ticketService.getMovimientosForProyecto(proyectoId, 'ARS');
    const movsUsd = await ticketService.getMovimientosForProyecto(proyectoId, 'USD');
  
    setMovimientos(movs);
    setMovimientosUSD(movsUsd);
  
    setAlert({
      open: true,
      message: 'Listado actualizado correctamente',
      severity: 'success',
    });
  };
  

  useEffect(() => {
    if (isMobile) {
      setShowDolar(false);
      setShowPesos(true);
    }
    const fetchMovimientosData = async (proyectoId) => {

      const empresa = await getEmpresaDetailsFromUser(user);
      setEmpresa(empresa)
      if (empresa.solo_dolar) {
        setTablaActiva("USD")
      }

      const proyecto = await getProyectoById(proyectoId);
      setProyecto(proyecto);
      const movs = await ticketService.getMovimientosForProyecto(proyectoId, 'ARS');
      const movsUsd = await ticketService.getMovimientosForProyecto(proyectoId, 'USD');
      setMovimientos(movs);
      setMovimientosUSD(movsUsd);
    };

    const fetchData = async () => {
      let pid = proyectoId;

      if (!proyectoId) {
        
        const proyectos = await getProyectosByEmpresa(empresa);
        if (proyectos.length === 1) {
          pid = proyectos[0].id;
        }
        

      }

      if (pid) {
        await fetchMovimientosData(pid);
      }
    };

    fetchData();
  }, [proyectoId, user]);

  const formatCurrency = (amount) => {
    if (amount)
      return amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });
    else
      return "$ 0";
  };

  const saldoTotalCaja = useMemo(() => {
    return movimientos.reduce((acc, mov) => {
      if (mov.type === 'ingreso') {
        return acc + mov.total;
      } else {
        return acc - mov.total;
      }
    }, 0);
  }, [movimientos]);

  const saldoTotalCajaUSD = useMemo(() => {
    return movimientosUSD.reduce((acc, mov) => {
      if (mov.type === 'ingreso') {
        return acc + mov.total;
      } else {
        return acc - mov.total;
      }
    }, 0);
  }, [movimientosUSD]);

  const movimientosFiltrados = useMemo(() => {
    const hoy = new Date();
    const filtrados = movimientos.filter((mov) => {
      const fechaMovimiento = new Date(formatTimestamp(mov.fecha_factura));
      const diferenciaDias = (hoy - fechaMovimiento) / (1000 * 60 * 60 * 24);
      mov.observacion = mov.observacion ? mov.observacion : "";
      return diferenciaDias <= filtroDias && (mov.observacion.toLowerCase().includes(filtroObs.toLowerCase()));
    });

    filtrados.sort((a, b) => {
      const fechaA = new Date(a.fecha);
      const fechaB = new Date(b.fecha);
      return fechaB - fechaA;
    });

    return filtrados;
  }, [movimientos, filtroDias, filtroObs]);

  const movimientosFiltradosUSD = useMemo(() => {
    const hoy = new Date();
    const filtrados = movimientosUSD.filter((mov) => {
      const fechaMovimiento = new Date(formatTimestamp(mov.fecha_factura));
      const diferenciaDias = (hoy - fechaMovimiento) / (1000 * 60 * 60 * 24);
      mov.observacion = mov.observacion ? mov.observacion : "";
      return diferenciaDias <= filtroDias && (mov.observacion.toLowerCase().includes(filtroObs.toLowerCase()));
    });

    filtrados.sort((a, b) => {
      const fechaA = new Date(a.fecha);
      const fechaB = new Date(b.fecha);
      return fechaB - fechaA;
    });

    return filtrados;
  }, [movimientosUSD, filtroDias, filtroObs]);

  const handleMenuOptionClick = (action) => {
    switch (action) {
      case 'filtrar':
        handleFiltrosActivos();
        break;
      case 'registrarMovimiento':
        router.push('/movementForm?proyectoName=' + proyecto.nombre + '&proyectoId=' + proyecto.id + '&lastPageUrl=' + router.asPath + "&lastPageName=" + proyecto.nombre);
        break;
      case 'recalcularSheets':
        handleRecargarProyecto(proyecto.id);
        break;
      default:
        break;
    }
    handleCloseMenu();
  };


    return (
    <>
      <Head>
        <title>{proyecto?.nombre}</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 8, paddingTop: 2 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Typography variant="h6">{proyecto?.nombre}</Typography>
            
            <Stack direction="row" spacing={2}>
            {!empresa?.solo_dolar &&  <Button
                variant={tablaActiva === 'ARS' ? "contained" : "outlined"}
                color="primary"
                onClick={() => setTablaActiva('ARS')}
                sx={{ flexGrow: 1, py: 2 }}
              >
                Caja en Pesos: {saldoTotalCaja > 0 ? formatCurrency(saldoTotalCaja) : "(" + formatCurrency(saldoTotalCaja) + ")"}
              </Button>}
              <Button
                variant={tablaActiva === 'USD' ? "contained" : "outlined"}
                color="primary"
                onClick={() => setTablaActiva('USD')}
                sx={{ flexGrow: 1, py: 2 }}
              >
                Caja en Dólares: US {saldoTotalCajaUSD > 0 ? formatCurrency(saldoTotalCajaUSD) : "(" + formatCurrency(saldoTotalCajaUSD) + ")"}{}
              </Button>
              <IconButton color="primary" onClick={handleRefresh}>
                  <RefreshIcon />
                </IconButton>

            </Stack>
            {filtrosActivos && (
              <Stack direction="row" spacing={2} alignItems="center">
                <FormControl>
                  <InputLabel>Filtrar por días</InputLabel>
                  <Select
                    value={filtroDias}
                    onChange={(e) => setFiltroDias(e.target.value)}
                    label="Filtrar por días"
                  >
                    <MenuItem value="15">Últimos 15 días</MenuItem>
                    <MenuItem value="30">Últimos 30 días</MenuItem>
                    <MenuItem value="60">Últimos 60 días</MenuItem>
                    <MenuItem value="90">Últimos 90 días</MenuItem>
                    <MenuItem value="365">Último año</MenuItem>
                    <MenuItem value="730">Últimos 2 años</MenuItem>
                    <MenuItem value="999999999999999">Sin filtro</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="Buscar por Observación"
                  variant="outlined"
                  onChange={(e) => setFiltroObs(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                
                {empresa?.solo_dolar &&  
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={showPesos}
                    onChange={(e) => setShowPesos(e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />
                  <Typography>Mostrar pesos</Typography>
                </Box> }
                {empresa?.solo_dolar &&  
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={showDolar}
                    onChange={(e) => setShowDolar(e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />
                  <Typography>Mostrar dólares</Typography>
                </Box> }
              </Stack>
            )}
            <Paper>
              <Snackbar open={alert.open} autoHideDuration={6000} onClose={handleCloseAlert}>
                <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: '100%' }}>
                  {alert.message}
                </Alert>
              </Snackbar>
              {tablaActiva === "ARS" && (
                isMobile ? (
                  <Stack spacing={2}>
                    {movimientosFiltrados.map((mov, index) => (
                      <Card key={index}>
                        <CardContent>
                          <Typography variant="h6" color={mov.type === "ingreso" ? "green" : "red"}>
                            {mov.type === "ingreso" ? `Ingreso: ${formatCurrency(mov.total)}` : `Egreso: ${formatCurrency(mov.total)}`}
                          </Typography>
                          <Typography variant="body2">{mov.observacion}</Typography>
                          {mov.tc && <Typography variant="body2">Tipo de cambio: ${mov.tc}</Typography>}
                          <Typography variant="caption" color="textSecondary">
                            {formatTimestamp(mov.fecha_factura)}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Código de operación: {mov.codigo_operacion || "Ninguno"}
                          </Typography>
                          <Stack direction="row" spacing={1} mt={2}>
                            <Button
                              color="primary"
                              startIcon={<EditIcon />}
                              onClick={() => router.push(`/movementForm?movimientoId=${mov.id}&lastPageName=${proyecto.nombre}&proyectoId=${proyecto.id}&proyectoName=${proyecto.nombre}&lastPageUrl=${router.asPath}`)}
                            >
                              Ver / Editar
                            </Button>
                            <Button
                              color="error"
                              startIcon={<DeleteIcon />}
                              onClick={() => handleEliminarClick(mov.id)}
                            >
                              {deletingElement !== mov.id ? "Eliminar" : "Eliminando..."}
                            </Button>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                ) : (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Código</TableCell>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Total</TableCell>
                        <TableCell>Categoria</TableCell>
                        {empresa?.comprobante_info.subcategoria && <TableCell>Subcategoría</TableCell>}
                        {empresa?.comprobante_info.medio_pago && <TableCell>Medio de pago</TableCell>}
                        <TableCell>Proveedor</TableCell>
                        <TableCell>Observación</TableCell>
                        <TableCell>Tipo de cambio</TableCell>
                        {empresa?.con_estados && <TableCell>Estado</TableCell>}
                        <TableCell>Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {movimientosFiltrados.map((mov, index) => (
                        <TableRow key={index}>
                          <TableCell>{mov.codigo_operacion}</TableCell>
                          <TableCell>{formatTimestamp(mov.fecha_factura)}</TableCell>
                          <TableCell>
                            <Chip
                              label={mov.type === "ingreso" ? "Ingreso" : "Egreso"}
                              color={mov.type === "ingreso" ? "success" : "error"}
                            />
                          </TableCell>
                          <TableCell>{formatCurrency(mov.total)}</TableCell>
                          <TableCell>{mov.categoria}</TableCell>
                          {empresa?.comprobante_info.subcategoria && <TableCell>{mov.subcategoria}</TableCell>}
                          {empresa?.comprobante_info.medio_pago && <TableCell>{mov.medio_pago}</TableCell>}
                          <TableCell>{mov.nombre_proveedor}</TableCell>
                          <TableCell>{mov.observacion}</TableCell>
                          <TableCell>{mov.tc ? `$ ${mov.tc}` : "-"}</TableCell>
                          {empresa?.con_estados && <TableCell>{mov.estado ? mov.estado : ""}</TableCell>} 
                          <TableCell>
                            <Button
                              color="primary"
                              startIcon={<EditIcon />}
                              onClick={() => router.push(`/movementForm?movimientoId=${mov.id}&lastPageName=${proyecto.nombre}&proyectoId=${proyecto.id}&proyectoName=${proyecto.nombre}&lastPageUrl=${router.asPath}`)}
                            >
                              Ver / Editar
                            </Button>
                            <Button
                              color="error"
                              startIcon={<DeleteIcon />}
                              onClick={() => handleEliminarClick(mov.id)}
                            >
                              {deletingElement !== mov.id ? "Eliminar" : "Eliminando..."}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )
              )}
              {tablaActiva === "USD" && (
                isMobile ? (
                  <Stack spacing={2}>
                    {movimientosFiltradosUSD.map((mov, index) => (
                      <Card key={index}>
                        <CardContent>
                          {
                            empresa?.solo_dolar && showDolar &&
                            <Typography variant="h6" color={mov.type === "ingreso" ? "green" : "red"}>
                              {mov.type === "ingreso" ? `Ingreso: ${formatCurrency(mov.total)} USD` : `Egreso: ${formatCurrency(mov.total)} USD`}
                            </Typography>
                          }
                          {
                            empresa?.solo_dolar && showPesos &&
                            <Typography variant="h6" color={mov.type === "ingreso" ? "green" : "red"}>
                              {mov.type === "ingreso" ? `Ingreso: ${formatCurrency(mov.total_original)} ARS` : `Egreso: ${formatCurrency(mov.total_original)} ARS`}
                            </Typography>
                          }
                          { !empresa?.solo_dolar &&
                            <Typography variant="h6" color={mov.type === "ingreso" ? "green" : "red"}>
                              {mov.type === "ingreso" ? `Ingreso: ${formatCurrency(mov.total)}` : `Egreso: ${formatCurrency(mov.total)}`}
                            </Typography>
                          }
                          <Typography variant="body2">{mov.observacion}</Typography>
                          {mov.categoria && <Typography variant="body2">Categoría: {mov.categoria} - {mov.subcategoria}</Typography>}
                          <Typography variant="caption" color="textSecondary">
                            {formatTimestamp(mov.fecha_factura)}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Código de operación: {mov.codigo_operacion}
                          </Typography>
                          <Stack direction="row" spacing={1} mt={2}>
                            <Button
                              color="primary"
                              startIcon={<EditIcon />}
                              onClick={() => router.push('/movementForm?movimientoId=' + mov.id + '&lastPageUrl=' + router.asPath + "&lastPageName=" + proyecto.nombre)}
                            >
                              Ver / Editar
                            </Button>
                            <Button
                              color="error"
                              startIcon={<DeleteIcon />}
                              onClick={() => handleEliminarClick(mov.id)}
                            >
                              {deletingElement !== mov.id ? "Eliminar" : "Eliminando..."}
                            </Button>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                ) : (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Código</TableCell>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Tipo</TableCell>
                        { showDolar &&<TableCell>Total USD</TableCell>}
                        {empresa?.solo_dolar && showPesos && <TableCell>Total Pesos</TableCell> }
                        <TableCell>Observación</TableCell>
                        <TableCell>Categoría</TableCell>
                        <TableCell>Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {movimientosFiltradosUSD.map((mov, index) => (
                        <TableRow key={index}>
                          <TableCell>{mov.codigo_operacion}</TableCell>
                          <TableCell>{formatTimestamp(mov.fecha_factura)}</TableCell>
                          <TableCell>
                            <Chip
                              label={mov.type === "ingreso" ? "Ingreso" : "Egreso"}
                              color={mov.type === "ingreso" ? "success" : "error"}
                            />
                          </TableCell>
                          { showDolar && <TableCell>{formatCurrency(mov.total)}</TableCell>}
                          {empresa?.solo_dolar && showPesos &&   <TableCell>{formatCurrency(mov.total_original)}</TableCell> }
                          <TableCell>{mov.observacion}</TableCell>
                          <TableCell>{mov.categoria +" - "+ mov.subcategoria}</TableCell>
                          <TableCell>
                            <Button
                              color="primary"
                              startIcon={<EditIcon />}
                              onClick={() => router.push(`/movementForm?movimientoId=${mov.id}&lastPageName=${proyecto.nombre}&proyectoId=${proyecto.id}&proyectoName=${proyecto.nombre}&lastPageUrl=${router.asPath}`)}
                            >
                              Ver / Editar
                            </Button>
                            <Button
                              color="error"
                              startIcon={<DeleteIcon />}
                              onClick={() => handleEliminarClick(mov.id)}
                            >
                              {deletingElement !== mov.id ? "Eliminar" : "Eliminando..."}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )
              )}
            </Paper>
          </Stack>
        </Container>
        {isMobile ? (
            <Fab
              color="primary"
              aria-label="more"
              onClick={handleOpenMenu}
              sx={{ position: 'fixed', bottom: 16, right: 16 }}
            >
              <MoreVertIcon />
            </Fab>
          ) : (
            <Button
              variant="contained"
              color="primary"
              onClick={handleOpenMenu}
              sx={{ position: 'fixed', bottom: 16, right: 16 }}
              startIcon={<MoreVertIcon />}
            >
              Menu de acciones y filtros
            </Button>
          )}

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleCloseMenu}
            keepMounted
          >
            <MenuOption onClick={() => handleMenuOptionClick('registrarMovimiento')}>
              <AddCircleIcon sx={{ mr: 1 }} />
              Registrar movimiento
            </MenuOption>
            <MenuOption onClick={() => handleMenuOptionClick('recalcularSheets')}>
              <RefreshIcon sx={{ mr: 1 }} />
              Recalcular sheets
            </MenuOption>
            <MenuOption onClick={() => handleMenuOptionClick('filtrar')}>
              <FilterListIcon sx={{ mr: 1 }} />
              {filtrosActivos ? "Ocultar filtro" : "Filtrar"}
            </MenuOption>
          </Menu>
      </Box>

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Confirmar eliminación"}
        </DialogTitle>
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

ProyectoMovimientosPage.getLayout = (page) => (
  <DashboardLayout>
    {page}
  </DashboardLayout>
);

export default ProyectoMovimientosPage;
