// Nueva página para listar movimientos de caja chica del usuario logueado
import { useState, useEffect, useMemo } from 'react';
import { Box, Container, Typography, Stack, Select, MenuItem, TextField, InputAdornment, Paper, Table, TableBody, TableCell, TableHead, TableRow, Chip, Snackbar, Alert, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import Head from 'next/head';
import { useAuthContext } from 'src/contexts/auth-context';
import ticketService from 'src/services/ticketService';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import movimientosService from 'src/services/movimientosService';
import { useRouter } from 'next/router';
import profileService from 'src/services/profileService';
import { set } from 'nprogress';
import { formatTimestamp } from 'src/utils/formatters';

const formatCurrency = (amount) => {
  if (amount)
    return amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });
  else
    return "$ 0";
};

const CajaChicaPage = () => {
  const router = useRouter();
  const { user } = useAuthContext();
  const { userId } = router.query;
  const [movimientos, setMovimientos] = useState([]);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [filtroDias, setFiltroDias] = useState('730');
  const [filtroObs, setFiltroObs] = useState('');
  const [filtroProveedor, setFiltroProveedor] = useState('');
  const [filtroProyecto, setFiltroProyecto] = useState('');
  const [userById, setUserById] = useState(null);


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
            
  useEffect(() => {
    const fetchMovimientos = async () => {
      if (!user) return;
      let userU = user;
      
      if (userId) {
        userU = await profileService.getProfileById(userId);
        setUserById(userU);
      }
      
      const movs = await ticketService.getCajaChicaDelUsuario(userU);
      setMovimientos(movs.filter(m => m.moneda === 'ARS'));
    };
    fetchMovimientos();
  }, [user]);

  const handleCloseAlert = () => setAlert({ ...alert, open: false });

  const saldoTotalCaja = useMemo(() => {
    return movimientos.reduce((acc, mov) => {
      return acc + (mov.type === 'ingreso' ? mov.total : -mov.total);
    }, 0);
  }, [movimientos]);

  const proyectosUnicos = useMemo(() => {
    const set = new Set();
    movimientos.forEach((m) => m.proyecto && set.add(m.proyecto));
    return Array.from(set);
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
      return coincideDias && coincideObs && coincideProveedor && coincideProyecto;
    }).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [movimientos, filtroDias, filtroObs, filtroProveedor, filtroProyecto]);
  
  const saldoFiltrado = useMemo(() => {
    return movimientosFiltrados.reduce((acc, mov) => {
      return acc + (mov.type === 'ingreso' ? mov.total : -mov.total);
    }, 0);
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
            <Typography variant="h4">
            { userById ? "Caja chica de " + userById.firstName + " " + userById.lastName : "Mi Caja Chica"}
            </Typography>
            <Typography variant="h6">Saldo Disponible: {formatCurrency(saldoTotalCaja)}</Typography>
            <Typography variant="subtitle1">
              Saldo con filtros aplicados: {formatCurrency(saldoFiltrado)}
            </Typography>


            <Stack direction="row" spacing={2}>
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
                </Select>

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

                <Select
                  value={filtroProyecto}
                  onChange={(e) => setFiltroProyecto(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="">Todos los proyectos</MenuItem>
                  {proyectosUnicos.map((proy, index) => (
                    <MenuItem key={index} value={proy}>
                      {proy}
                    </MenuItem>
                  ))}
                </Select>

                <TextField
                  label="Proveedor"
                  value={filtroProveedor}
                  onChange={(e) => setFiltroProveedor(e.target.value)}
                />
            </Stack>

            <Paper>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Código</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Proyecto</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Categoría</TableCell>
                    <TableCell>Proveedor</TableCell>
                    <TableCell>Observación</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {movimientosFiltrados.map((mov, index) => (
                    <TableRow key={index}>
                        <TableCell>{mov.codigo_operacion}</TableCell>
                      <TableCell>{formatTimestamp(mov.fecha_factura)}</TableCell>
                      <TableCell>{mov.proyecto}</TableCell>
                      <TableCell>
                        <Chip
                          label={mov.type === "ingreso" ? "Ingreso" : "Egreso"}
                          color={mov.type === "ingreso" ? "success" : "error"}
                        />
                      </TableCell>
                      <TableCell>{formatCurrency(mov.total)}</TableCell>
                      <TableCell>{mov.categoria}</TableCell>
                      <TableCell>{mov.nombre_proveedor}</TableCell>
                      <TableCell>{mov.observacion}</TableCell>
                      <TableCell>
                            <Button
                              color="primary"
                              startIcon={<EditIcon />}
                              onClick={() => router.push('/movimiento?movimientoId=' + mov.id + '&lastPageUrl=/cajaChica&lastPageName=Caja Chica')}
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
            </Paper>
          </Stack>
        </Container>
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