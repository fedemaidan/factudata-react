import { useState, useMemo, useEffect } from 'react';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import Head from 'next/head';
import { Box, Container, Stack, Chip, Typography, TextField, InputAdornment, Paper, Card, CardContent, Button, Select, MenuItem, FormControl, InputLabel, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, useMediaQuery, IconButton, Fab, Menu, Table, TableBody, TableCell, TableHead, TableRow, MenuItem as MenuOption, Divider } from '@mui/material';
import { useTheme } from '@mui/material/styles';
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
import { getEmpresaDetailsFromUser, updateEmpresaDetails } from 'src/services/empresaService'; 
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import { formatTimestamp } from 'src/utils/formatters';
import { useMovimientosFilters } from 'src/hooks/useMovimientosFilters';
import { FilterBarCajaProyecto } from 'src/components/FilterBarCajaProyecto';


const TotalesFiltrados = ({ t, fmt, moneda }) => {
  const up = moneda.toUpperCase();
  const ingreso = t[up]?.ingreso ?? 0;
  const egreso  = t[up]?.egreso  ?? 0;
  const neto    = ingreso - egreso;

  return (
    <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1, mb: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Totales filtrados ({up})
      </Typography>

      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Typography sx={{ color: 'success.main', fontWeight: 600 }}>
          + {fmt(up, ingreso)}
        </Typography>
        <Typography sx={{ color: 'error.main', fontWeight: 600 }}>
          - {fmt(up, egreso)}
        </Typography>
        <Typography
          sx={{ color: neto >= 0 ? 'success.main' : 'error.main', fontWeight: 700 }}
        >
          Neto: {fmt(up, neto)}
        </Typography>
      </Stack>
    </Box>
  );
};



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
  const [cajasVirtuales, setCajasVirtuales] = useState([
    { nombre: 'Caja en Pesos', moneda: 'ARS', medio_pago: "" },
    { nombre: 'Caja en Dólares', moneda: 'USD', medio_pago: "" }
  ]);  
  const [showCrearCaja, setShowCrearCaja] = useState(false);
  const [nombreCaja, setNombreCaja] = useState('');
  const [monedaCaja, setMonedaCaja] = useState('ARS');
  const [estadoCaja, setEstadoCaja] = useState('');
  const [medioPagoCaja, setMedioPagoCaja] = useState('Efectivo');
  const [editandoCaja, setEditandoCaja] = useState(null); // null o index de la caja
  const [cajaSeleccionada, setCajaSeleccionada] = useState(null);

  const [anchorCajaEl, setAnchorCajaEl] = useState(null);
  const [cajaMenuIndex, setCajaMenuIndex] = useState(null);
  
  const {
    filters,
    setFilters,
    options,
    movimientosFiltrados,
    totales
  } = useMovimientosFilters({
    empresaId: empresa?.id,
    proyectoId,
    movimientos,
    movimientosUSD,
    cajaSeleccionada,
    userId: user?.user_id,
  });

  const handleOpenCajaMenu = (event, index) => {
    setAnchorCajaEl(event.currentTarget);
    setCajaMenuIndex(index);
  };
  
  const handleCloseCajaMenu = () => {
    setAnchorCajaEl(null);
    setCajaMenuIndex(null);
  };
  
  const handleEditarCaja = (index) => {
    const caja = cajasVirtuales[index];
    setEditandoCaja(index);
    setNombreCaja(caja.nombre);
    setMonedaCaja(caja.moneda);
    setMedioPagoCaja(caja.medio_pago || '');
    setShowCrearCaja(true);
    handleCloseCajaMenu();
  };
  
  const handleEliminarCaja = (index) => {
    const nuevas = cajasVirtuales.filter((_, i) => i !== index);
    setCajasVirtuales(nuevas);
    updateEmpresaDetails(empresa.id, { cajas_virtuales: nuevas });
    if (cajaSeleccionada === cajasVirtuales[index]) setCajaSeleccionada(null);
    handleCloseCajaMenu();
  };
  
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
      const cajasIniciales = empresa.cajas_virtuales?.length > 0 ? empresa.cajas_virtuales : [
        { nombre: 'Caja en Pesos', moneda: 'ARS', medio_pago: "" },
        { nombre: 'Caja en Dólares', moneda: 'USD', medio_pago: "" }
      ];
      if (!empresa.cajas_virtuales || empresa.cajas_virtuales.length === 0) {
        await updateEmpresaDetails(empresa.id, { cajas_virtuales: cajasIniciales });
      }
      setEmpresa({ ...empresa, cajas_virtuales: cajasIniciales });
      setCajasVirtuales(cajasIniciales);

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

  const onSelectCaja = (caja) => {
    setCajaSeleccionada(caja);
    setFilters((f) => ({ ...f, caja }));
  };
  
  const totalesDetallados = useMemo(() => {
    const base = {
      ARS: { ingreso: 0, egreso: 0 },
      USD: { ingreso: 0, egreso: 0 },
    };
  
    movimientosFiltrados.forEach((m) => {
      const moneda = (m.moneda || 'ARS').toUpperCase();
      const tipo = m.type === 'ingreso' ? 'ingreso' : 'egreso';
      if (!base[moneda]) base[moneda] = { ingreso: 0, egreso: 0 };
      base[moneda][tipo] += m.total || 0;
    });
  
    return base;
  }, [movimientosFiltrados]);

  const formatByCurrency = (currency, amount) => {
    const cur = currency === 'USD' ? 'USD' : 'ARS';
    return amount?.toLocaleString('es-AR', {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 2
    }) ?? (cur === 'USD' ? 'US$ 0,00' : '$ 0,00');
  };

  const columnsCount = 11 // Código, Fecha, Tipo, Total, Categoria, Proveedor, Observación, TC, USD BLUE, (Estado opc.), Acciones
  + (empresa?.comprobante_info?.subcategoria ? 1 : 0)
  + (empresa?.comprobante_info?.medio_pago ? 1 : 0)
  + (empresa?.con_estados ? 1 : 0);


  const calcularTotalParaCaja = (caja) => {
    const baseMovimientos = caja.moneda === 'USD' ? movimientosUSD : movimientos;
  
    return baseMovimientos.reduce((acc, mov) => {
      const matchMedioPago = caja.medio_pago
        ? mov.medio_pago === caja.medio_pago
        : true;
  
      if (!matchMedioPago) return acc;
  
      if (mov.type === 'ingreso') return acc + mov.total;
      return acc - mov.total;
    }, 0);
  };
  
  


  const handleGuardarCaja = async () => {
    const nuevaCaja = {
      nombre: nombreCaja,
      moneda: monedaCaja,
      medio_pago: medioPagoCaja,
      estado: estadoCaja 
    };
    
  
    const nuevasCajas = [...cajasVirtuales];
  
    if (editandoCaja !== null) {
      nuevasCajas[editandoCaja] = nuevaCaja;
    } else {
      nuevasCajas.push(nuevaCaja);
    }
  
    setCajasVirtuales(nuevasCajas);
    setShowCrearCaja(false);
    setNombreCaja('');
    setMonedaCaja('ARS');
    setMedioPagoCaja('Efectivo');
    setEstadoCaja('');
    setEditandoCaja(null);
    await updateEmpresaDetails(empresa.id, { cajas_virtuales: nuevasCajas });
  };
  
  const handleRecalcularEquivalencias = async () => {
    if (!proyectoId) return;
    setAlert({
      open: true,
      message: 'Este proceso puede durar varios minutos, por favor espere...',
      severity: 'warning',
    });
    const res = await movimientosService.recalcularEquivalenciasPorProyecto(proyectoId);
    
    if (!res.error) {
      setAlert({
        open: true,
        message: 'Equivalencias recalculadas con éxito',
        severity: 'success',
      });
      await handleRefresh(); // refresca los movimientos actualizados
    } else {
      setAlert({
        open: true,
        message: 'Error al recalcular equivalencias',
        severity: 'error',
      });
    }
  };

  
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
      case 'recalcularEquivalencias':
        handleRecalcularEquivalencias();
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
       {cajasVirtuales.map((caja, index) => (
  <Box key={index} sx={{ position: 'relative', width: '100%', mb: 1 }}>
    <Button
      fullWidth
      variant={cajaSeleccionada?.nombre === caja.nombre ? "contained" : "outlined"}
      onClick={() => onSelectCaja(caja)}
      sx={{ justifyContent: 'space-between', pl: 2, pr: 5 }}
    >
      <Typography>{caja.nombre}</Typography>
      <Typography>{formatCurrency(calcularTotalParaCaja(caja))}</Typography>
    </Button>
    <IconButton
      size="small"
      onClick={(event) => handleOpenCajaMenu(event, index)}
      sx={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)' }}
    >
      <MoreVertIcon fontSize="small" />
    </IconButton>
  </Box>
))}

<Menu
  anchorEl={anchorCajaEl}
  open={Boolean(anchorCajaEl)}
  onClose={handleCloseCajaMenu}
>
  <MenuItem onClick={() => handleEditarCaja(cajaMenuIndex)}>Editar</MenuItem>
  <MenuItem onClick={() => handleEliminarCaja(cajaMenuIndex)}>Eliminar</MenuItem>
</Menu>

            </Stack>
            <Dialog open={showCrearCaja} onClose={() => setShowCrearCaja(false)}>
  <DialogTitle>Crear vista de caja personalizada</DialogTitle>
  <DialogContent>
    <TextField label="Nombre de la caja" fullWidth value={nombreCaja} onChange={(e) => setNombreCaja(e.target.value)} />
    <FormControl fullWidth sx={{ mt: 2 }}>
      <InputLabel>Moneda</InputLabel>
      <Select value={monedaCaja} onChange={(e) => setMonedaCaja(e.target.value)}>
        <MenuItem value="ARS">Pesos</MenuItem>
        <MenuItem value="USD">Dólares</MenuItem>
      </Select>
    </FormControl>
    <FormControl fullWidth sx={{ mt: 2 }}>
      <InputLabel>Medio de pago</InputLabel>
      <Select value={medioPagoCaja} onChange={(e) => setMedioPagoCaja(e.target.value)}>
      <MenuItem key="" value="">
            Todos
          </MenuItem>
        {empresa?.medios_pago.map((medio) => (
          <MenuItem key={medio} value={medio}>
            {medio}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
    {empresa?.con_estados && (
      <FormControl fullWidth sx={{ mt: 2 }}>
        <InputLabel>Estado</InputLabel>
        <Select value={estadoCaja} onChange={(e) => setEstadoCaja(e.target.value)}>
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="Pendiente">Pendiente</MenuItem>
          <MenuItem value="Pagado">Pagado</MenuItem>
        </Select>
      </FormControl>
    )}
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setShowCrearCaja(false)}>Cancelar</Button>
    <Button onClick={handleGuardarCaja}>Crear</Button>
  </DialogActions>
</Dialog>

{filtrosActivos && (
  <FilterBarCajaProyecto
    filters={filters}
    setFilters={setFilters}
    options={options}
    onRefresh={handleRefresh}
    empresa={empresa}
  />
)}
            <Paper>
              <Snackbar open={alert.open} autoHideDuration={6000} onClose={handleCloseAlert}>
                <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: '100%' }}>
                  {alert.message}
                </Alert>
              </Snackbar>
              <Stack spacing={1}>
              <TotalesFiltrados
                    t={totalesDetallados}
                    fmt={formatByCurrency}
                    moneda={cajaSeleccionada?.moneda || 'ARS'}
                  />
              </Stack>
                {isMobile ? (
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
                        <TableCell>Fecha factura</TableCell>
                        <TableCell>Fecha creación</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Total</TableCell>
                        <TableCell>Categoria</TableCell>
                        {empresa?.comprobante_info?.subcategoria && <TableCell>Subcategoría</TableCell>}
                        {empresa?.comprobante_info?.medio_pago && <TableCell>Medio de pago</TableCell>}
                        <TableCell>Proveedor</TableCell>
                        <TableCell>Observación</TableCell>
                        <TableCell>Tipo de cambio ejecutado</TableCell>
                        <TableCell>Valor en USD BLUE del dia</TableCell>
                        {empresa?.con_estados && <TableCell>Estado</TableCell>}
                        <TableCell>Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {movimientosFiltrados.map((mov, index) => (
                        <TableRow key={index}>
                          <TableCell>{mov.codigo_operacion}</TableCell>
                          <TableCell>{formatTimestamp(mov.fecha_factura)}</TableCell>
                          <TableCell>{formatTimestamp(mov.fecha_creacion)}</TableCell>
                          <TableCell>
                            <Chip
                              label={mov.type === "ingreso" ? "Ingreso" : "Egreso"}
                              color={mov.type === "ingreso" ? "success" : "error"}
                            />
                          </TableCell>
                          <TableCell>{formatCurrency(mov.total)}</TableCell>
                          <TableCell>{mov.categoria}</TableCell>
                          {empresa?.comprobante_info?.subcategoria && <TableCell>{mov.subcategoria}</TableCell>}
                          {empresa?.comprobante_info?.medio_pago && <TableCell>{mov.medio_pago}</TableCell>}
                          <TableCell>{mov.nombre_proveedor}</TableCell>
                          <TableCell>{mov.observacion}</TableCell>
                          <TableCell>{mov.tc ? `$ ${mov.tc}` : "-"}</TableCell>
                          <TableCell>{mov.equivalencias ? "USD" + formatCurrency(mov.equivalencias.total.usd_blue) : "-"}</TableCell>
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

  <Divider sx={{ my: 1 }} />

  <MenuOption onClick={() => {
    setShowCrearCaja(true);
    handleCloseMenu();
  }}>
    <AddCircleIcon sx={{ mr: 1 }} />
    Agregar nueva caja
  </MenuOption>
  <MenuOption onClick={() => {
    handleRefresh();
    handleCloseMenu();
  }}>
    <RefreshIcon sx={{ mr: 1 }} />
    Actualizar saldos
  </MenuOption>

  <MenuOption onClick={() => handleMenuOptionClick('recalcularEquivalencias')}>
    <RefreshIcon sx={{ mr: 1 }} />
    Recalcular valor dolar estimado
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
