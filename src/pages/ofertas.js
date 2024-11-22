import { useState, useEffect } from 'react';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import Head from 'next/head';
import { Box, Container, Stack, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, Button, Snackbar, Alert, Fab, TextField, Pagination, Accordion, AccordionSummary, AccordionDetails, MenuItem } from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useRouter } from 'next/router';
import ofertasService from 'src/services/ofertasService';
import { useAuthContext } from 'src/contexts/auth-context';
import { Chip } from '@mui/material';


const OfertasPage = () => {
  const { user } = useAuthContext();
  const [ofertas, setOfertas] = useState([]);
  const [sortConfig, setSortConfig] = useState({ field: '', direction: 'asc' });
  const [filteredOfertas, setFilteredOfertas] = useState([]);
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'info',
  });
  const [filtroActivo, setFiltroActivo] = useState('');
const [filtroEstado, setFiltroEstado] = useState(''); // Inicializar con estado vacío
const [filtroFecha, setFiltroFecha] = useState(''); // Inicializar con rango de fecha vacío
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const router = useRouter();

  const getChipColor = (estado) => {
    switch (estado) {
      case 'pendiente':
        return 'warning';
      case 'aceptada':
        return 'success';
      case 'rechazada':
        return 'error';
      default:
        return 'default';
    }
  };

  
  const handleCloseAlert = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setAlert({ ...alert, open: false });
  };

  const fetchOfertas = async () => {
    const ofertas = await ofertasService.getAllOfertas();
    setOfertas(ofertas);
    setFilteredOfertas(ofertas);
  };
  

  useEffect(() => {
    handleFiltroChange();
  }, [filtroActivo, filtroEstado, filtroFecha]);
  
  useEffect(() => {
    if (sortConfig.field) {
      handleSort(sortConfig.field);
    }
  }, [sortConfig]);
  

  // Aplicar los filtros en `handleFiltroChange`
const handleFiltroChange = () => {
  const now = new Date();
  const ofertasFiltradas = ofertas.filter((oferta) => {
    const createdAtDate = new Date(oferta.createdAt);
    const matchesActivo = filtroActivo === '' || oferta.productos_ofrecidos.some(producto => producto.principio_activo?.toLowerCase().includes(filtroActivo.toLowerCase()));
    const matchesEstado = filtroEstado === '' || oferta.estado === filtroEstado;
    const matchesFecha =
      filtroFecha === '' ||
      (now - createdAtDate <= filtroFecha * 24 * 60 * 60 * 1000);
    return matchesActivo && matchesEstado && matchesFecha;
  });
  setFilteredOfertas(ofertasFiltradas);
  setPage(1);
};

// Agregar ordenamiento
const handleSort = (field) => {
  // Si el campo no cambia, usa la dirección actual
  const direction = sortConfig.field === field ? sortConfig.direction : 'asc';
  
  setSortConfig({ field, direction });

  const sortedData = [...filteredOfertas].sort((a, b) => {
    const aValue = field === 'createdAt' ? new Date(a[field]) : a[field];
    const bValue = field === 'createdAt' ? new Date(b[field]) : b[field];

    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  setFilteredOfertas(sortedData);
};




  const handlePageChange = (event, value) => {
    setPage(value);
  };

  useEffect(() => {
    fetchOfertas();
  }, []);

  const ofertasPaginadas = filteredOfertas.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  return (
    <>
      <Head>
        <title>Listado de Ofertas</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Typography variant="h4">Listado de Ofertas</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
  <TextField
    label="Filtro por Principio Activo"
    variant="outlined"
    value={filtroActivo}
    onChange={(e) => setFiltroActivo(e.target.value)}
  />
  <TextField
    label="Filtro por Estado"
    variant="outlined"
    select
    value={filtroEstado}
    onChange={(e) => setFiltroEstado(e.target.value)}
  >
    <MenuItem value="">Sin filtro</MenuItem>
    <MenuItem value="pendiente">Pendiente</MenuItem>
    <MenuItem value="aceptada">Aceptada</MenuItem>
    <MenuItem value="rechazada">Rechazada</MenuItem>
  </TextField>
  <TextField
    label="Filtro por Rango de Fechas"
    variant="outlined"
    select
    value={filtroFecha}
    onChange={(e) => setFiltroFecha(e.target.value)}
  >
    <MenuItem value="">Sin filtro</MenuItem>
    <MenuItem value="7">Última semana</MenuItem>
    <MenuItem value="14">Últimas 2 semanas</MenuItem>
    <MenuItem value="30">Últimos 30 días</MenuItem>
  </TextField>
  <TextField
  label="Ordenar por"
  variant="outlined"
  select
  value={sortConfig.field}
  onChange={(e) => handleSort(e.target.value)}
>
  <MenuItem value="">Sin orden</MenuItem>
  <MenuItem value="id">ID</MenuItem>
  <MenuItem value="valor_total_ofertado">Valor Total Ofertado</MenuItem>
  <MenuItem value="valor_total_recibido">Valor Total Recibido</MenuItem>
  <MenuItem value="ganancia_final">Ganancia Final</MenuItem>
  <MenuItem value="estado">Estado</MenuItem>
  <MenuItem value="createdAt">Fecha de Creación</MenuItem>
</TextField>
<TextField
  label="Dirección de Orden"
  variant="outlined"
  select
  value={sortConfig.direction}
  onChange={(e) =>
    setSortConfig((prev) => ({ ...prev, direction: e.target.value }))
  }
>
  <MenuItem value="asc">Ascendente</MenuItem>
  <MenuItem value="desc">Descendente</MenuItem>
</TextField>

  <Button variant="contained" onClick={fetchOfertas} startIcon={<RefreshIcon />}>
    Refrescar
  </Button>
</Box>
      <Paper>
              <Snackbar open={alert.open} autoHideDuration={6000} onClose={handleCloseAlert}>
                <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: '100%' }}>
                  {alert.message}
                </Alert>
              </Snackbar>
              <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Valor Total Ofertados</TableCell>
                  <TableCell>Valor Total Recibido</TableCell>
                  <TableCell>Ganancia Final</TableCell>
                  <TableCell>Principios Activos Ofertados</TableCell>
                  <TableCell>Principios Activos Recibidos</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Fecha de Creación</TableCell>
                  <TableCell>Ver Detalle</TableCell>
                </TableRow>
          </TableHead>
                <TableBody>
                  {ofertasPaginadas.map((oferta, index) => (
                    <TableRow key={index}>
                      <TableCell>{oferta.id}</TableCell>
                      <TableCell>${parseFloat(oferta.valor_total_ofertado).toFixed(2)}</TableCell>
                      <TableCell>${parseFloat(oferta.valor_total_recibido).toFixed(2)}</TableCell>
                      <TableCell>${parseFloat(oferta.ganancia_final).toFixed(2)}</TableCell>
                      <TableCell>{oferta.productos_ofrecidos.map(p => p.principio_activo).join(', ')}</TableCell>
                      <TableCell>{oferta.productos_recibidos.map(p => p.principio_activo).join(', ')}</TableCell>
                      <TableCell>
                        <Chip
                          label={oferta.estado.charAt(0).toUpperCase() + oferta.estado.slice(1)}
                          color={getChipColor(oferta.estado)}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{new Date(oferta.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Accordion>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography>Ver Detalles</Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Typography variant="h6">Productos Ofrecidos</Typography>
                            {oferta.productos_ofrecidos.map((producto, idx) => (
                              <Box key={idx} sx={{ mb: 2, p: 2, border: '1px solid #ddd', borderRadius: '4px' }}>
                                <Typography><strong>Registro:</strong> {producto.registro}</Typography>
                                <Typography><strong>Activo:</strong> {producto.principio_activo}</Typography>
                                <Typography><strong>Marca:</strong> {producto.marca || 'No especificada'}</Typography>
                                <Typography><strong>Empresa:</strong> {producto.empresa || 'No especificada'}</Typography>
                                <Typography><strong>Precio Venta:</strong> ${producto.precio_unitario.toFixed(2)}</Typography>
                                <Typography><strong>Cantidad:</strong> {producto.cantidad}</Typography>
                              </Box>
                            ))}
                            <Typography variant="h6">Productos Recibidos</Typography>
                            {oferta.productos_recibidos.map((producto, idx) => (
                              <Box key={idx} sx={{ mb: 2, p: 2, border: '1px solid #ddd', borderRadius: '4px' }}>
                                <Typography><strong>Registro:</strong> {producto.registro}</Typography>
                                <Typography><strong>Activo:</strong> {producto.principio_activo}</Typography>
                                <Typography><strong>Marca:</strong> {producto.marca || 'No especificada'}</Typography>
                                <Typography><strong>Empresa:</strong> {producto.empresa || 'No especificada'}</Typography>
                                <Typography><strong>Precio Compra:</strong> ${producto.precio_unitario.toFixed(2)}</Typography>
                                <Typography><strong>Cantidad:</strong> {producto.cantidad}</Typography>
                              </Box>
                            ))}
                          </AccordionDetails>
                        </Accordion>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Pagination
                  count={Math.ceil(filteredOfertas.length / rowsPerPage)}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                />
              </Box>
            </Paper>
          </Stack>
        </Container>
      </Box>
    </>
  );
};

OfertasPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default OfertasPage;
