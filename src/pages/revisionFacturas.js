import { useEffect, useState, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box, Container, Typography, Table, TableBody, TableCell, TableHead, TableRow,
  CircularProgress, Button, Stack, Select, MenuItem, FormControl, InputLabel,
  Chip, TextField, Autocomplete, Snackbar, Alert
} from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { getEmpresaById } from 'src/services/empresaService';
import ticketService from 'src/services/ticketService';
import movimientosService from 'src/services/movimientosService';
import { formatCurrency, formatTimestamp } from 'src/utils/formatters';
import { useAuthContext } from 'src/contexts/auth-context';
import { getProyectosByEmpresa } from 'src/services/proyectosService';

const RevisionFacturasPage = () => {
  const router = useRouter();
  const { user } = useAuthContext();
  const { empresaId } = router.query;

  const [empresa, setEmpresa] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMap, setLoadingMap] = useState({});
  const [filtroCuenta, setFiltroCuenta] = useState('Cuenta A');
  const [filtroProveedor, setFiltroProveedor] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const hoy = new Date();
  const hace30Dias = new Date();
  hace30Dias.setDate(hoy.getDate() - 30);

  const [filtroFechaDesde, setFiltroFechaDesde] = useState(hace30Dias.toISOString().split('T')[0]);
  const [filtroFechaHasta, setFiltroFechaHasta] = useState(hoy.toISOString().split('T')[0]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const empresa = await getEmpresaById(empresaId);
      setEmpresa(empresa);
      if (empresa.cuentas){
        setFiltroCuenta(empresa.cuentas[0]);
      }
      
      const proyectosData = await getProyectosByEmpresa(empresa);

      const movimientosPendientes = [];
      for (const proyecto of proyectosData) {
        const movs = await ticketService.getMovimientosEnRango(proyecto.id, filtroFechaDesde, filtroFechaHasta);
        const filtrados = movs
          .filter((m) => !m.url_imagen)
          .map((m) => ({ ...m, proyectoNombre: proyecto.nombre }));
        movimientosPendientes.push(...filtrados);
      }

      setMovimientos(movimientosPendientes);
      setIsLoading(false);
    };
    fetchData();
  }, [user, filtroFechaDesde, filtroFechaHasta, empresaId]);

  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter((m) => {
      const coincideCuenta = filtroCuenta === 'Todas' || m.cuenta_interna === filtroCuenta;
      const coincideProveedor = !filtroProveedor || m.nombre_proveedor?.toLowerCase().includes(filtroProveedor.toLowerCase());
      return coincideCuenta && coincideProveedor;
    });
  }, [movimientos, filtroCuenta, filtroProveedor]);

  const movimientosPorProyecto = useMemo(() => {
    const agrupados = {};
    for (const m of movimientosFiltrados) {
      if (!agrupados[m.proyectoNombre]) {
        agrupados[m.proyectoNombre] = [];
      }
      agrupados[m.proyectoNombre].push(m);
    }
    return agrupados;
  }, [movimientosFiltrados]);

  const handleArchivoChange = async (event, movimiento) => {
    const file = event.target.files[0];
    if (!file) return;
    setLoadingMap((prev) => ({ ...prev, [movimiento.id]: true }));
    try {
      await movimientosService.reemplazarImagen(movimiento.id, file);
      setMovimientos((prev) => prev.filter((m) => m.id !== movimiento.id));
      setSnackbar({ open: true, message: 'Comprobante subido correctamente.', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Error al subir el comprobante.', severity: 'error' });
    } finally {
      setLoadingMap((prev) => ({ ...prev, [movimiento.id]: false }));
    }
  };

  return (
    <>
      <Head>
        <title>Revisión de Facturas</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Typography variant="h4">Movimientos sin Comprobante</Typography>

            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <FormControl>
                <InputLabel>Cuenta</InputLabel>
                <Select
                  value={filtroCuenta}
                  onChange={(e) => setFiltroCuenta(e.target.value)}
                  label="Cuenta"
                >
                  {(empresa?.cuentas || ["Cuenta A", "Cuenta B", "Cuenta C"]).map((cuenta) => (
                    <MenuItem key={cuenta} value={cuenta}>{cuenta}</MenuItem>
                  ))}
                  <MenuItem value="Todas">Todas</MenuItem>
                </Select>
              </FormControl>
              <Autocomplete
                freeSolo
                options={empresa?.proveedores_data?.map(p => p.nombre) || []}
                getOptionLabel={(option) => option || ''}
                value={filtroProveedor}
                onInputChange={(event, newInputValue) => setFiltroProveedor(newInputValue)}
                renderInput={(params) => <TextField {...params} label="Proveedor" />}
                sx={{ minWidth: 200 }}
              />
              <TextField
                type="date"
                label="Desde"
                InputLabelProps={{ shrink: true }}
                value={filtroFechaDesde}
                onChange={(e) => setFiltroFechaDesde(e.target.value)}
              />
              <TextField
                type="date"
                label="Hasta"
                InputLabelProps={{ shrink: true }}
                value={filtroFechaHasta}
                onChange={(e) => setFiltroFechaHasta(e.target.value)}
              />
              <Typography>
                Total: {movimientosFiltrados.length} movimientos
              </Typography>
            </Stack>

            {isLoading ? (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
                <CircularProgress />
              </Box>
            ) : (
              Object.entries(movimientosPorProyecto).map(([proyectoNombre, movimientos]) => (
                <Box key={proyectoNombre} sx={{ mt: 4 }}>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    {proyectoNombre} ({movimientos.length})
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Proveedor</TableCell>
                        <TableCell>Cuenta</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Monto</TableCell>
                        <TableCell>Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {movimientos.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell>{formatTimestamp(m.fecha_factura)}</TableCell>
                          <TableCell>{m.nombre_proveedor}</TableCell>
                          <TableCell>
                            <Chip
                              label={m.cuenta_interna}
                              color={m.cuenta_interna === 'Cuenta A' ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{m.type === 'ingreso' ? 'Ingreso' : 'Egreso'}</TableCell>
                          <TableCell>{formatCurrency(m.total)}</TableCell>
                          <TableCell>
                            <Stack spacing={1} direction="column">
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() =>
                                  router.push(`/movementForm?movimientoId=${m.id}&lastPageName=RevisionFacturas&lastPageUrl=/revisionFacturas`)
                                }
                              >
                                Ver Detalles
                              </Button>
                              <Button
                                component="label"
                                size="small"
                                variant="contained"
                                disabled={loadingMap[m.id]}
                              >
                                {loadingMap[m.id] ? <CircularProgress size={20} /> : 'Subir Comprobante'}
                                <input
                                  type="file"
                                  hidden
                                  accept="image/*,application/pdf"
                                  onChange={(e) => handleArchivoChange(e, m)}
                                />
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              ))
            )}
          </Stack>
        </Container>
      </Box>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

RevisionFacturasPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default RevisionFacturasPage;