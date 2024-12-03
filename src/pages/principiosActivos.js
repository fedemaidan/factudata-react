import { useState, useEffect } from 'react';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import Head from 'next/head';
import { Box, Container, Stack, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, Button, Snackbar, Alert, Fab, TextField, Menu, MenuItem as MenuOption, Pagination } from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import { useRouter } from 'next/router';
import principioActivoService from 'src/services/principioActivoService';
import { useAuthContext } from 'src/contexts/auth-context';
import { Chip } from '@mui/material';

const PrincipiosActivosPage = () => {
  const { user } = useAuthContext();
  const [principiosActivos, setPrincipiosActivos] = useState([]);
  const [filteredPrincipios, setFilteredPrincipios] = useState([]);
  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroActivo, setFiltroActivo] = useState(false);
  const [filtroAlias, setFiltroAlias] = useState(''); 
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'info',
  });
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const router = useRouter();

  const handleCloseAlert = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setAlert({ ...alert, open: false });
  };

  const fetchPrincipiosActivos = async () => {
    const principios = await principioActivoService.getAllPrincipiosActivos();
    setPrincipiosActivos(principios);
    setFilteredPrincipios(principios); // Inicializar principios activos filtrados
  };

  const handleFiltroChange = () => {
    const principiosFiltrados = principiosActivos.filter((pa) =>
      (filtroNombre === '' || pa.nombre.toLowerCase().includes(filtroNombre.toLowerCase())) &&
      (filtroAlias === '' || (pa.alias && pa.alias.some((alias) => alias.toLowerCase().includes(filtroAlias.toLowerCase())))) &&
      (!filtroActivo || pa.activo) // Filtro de activos
    );
    setFilteredPrincipios(principiosFiltrados);
    setPage(1); // Reiniciar a la primera página al aplicar filtros
  };
  

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  useEffect(() => {
    fetchPrincipiosActivos();
  }, []);

  useEffect(() => {
    handleFiltroChange();
  }, [filtroNombre, filtroActivo, principiosActivos]);

  const principiosPaginados = filteredPrincipios.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  return (
    <>
      <Head>
        <title>Listado de Principios Activos</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Typography variant="h4">Listado de Principios Activos</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                label="Filtro por Nombre"
                variant="outlined"
                value={filtroNombre}
                onChange={(e) => setFiltroNombre(e.target.value)}
              />
              <TextField
                label="Filtro por Alias"
                variant="outlined"
                value={filtroAlias}
                onChange={(e) => setFiltroAlias(e.target.value)}
                margin="normal"
                />
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={filtroActivo}
                  onChange={(e) => setFiltroActivo(e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                <Typography>Mostrar Solo Activos</Typography>
              </Box>
              <Button variant="contained" onClick={fetchPrincipiosActivos} startIcon={<RefreshIcon />}>
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
                    <TableCell>Nombre</TableCell>
                    <TableCell>Precio</TableCell>
                    <TableCell>Precio Máximo</TableCell>
                    <TableCell>Alias</TableCell>
                    <TableCell>Activo</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {principiosPaginados.map((principio, index) => (
                    <TableRow key={index}>
                      <TableCell>{principio.nombre}</TableCell>
                      <TableCell>${principio.precio}</TableCell>
                      <TableCell>${principio.precio_maximo || 'No definido'}</TableCell>
                      <TableCell>
                        {principio.alias && principio.alias.length > 0 ? (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {principio.alias.map((alias, aliasIndex) => (
                                <Chip key={aliasIndex} label={alias} color="primary" />
                            ))}
                            </Box>
                        ) : (
                            'Sin alias'
                        )}
                        </TableCell>
                      <TableCell>{principio.activo ? 'Sí' : 'No'}</TableCell>
                      <TableCell>
                        <Button
                          color="primary"
                          startIcon={<EditIcon />}
                          onClick={() => router.push('/principioActivo?principioActivoId=' + principio.id)}
                        >
                          Ver / Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Pagination
                  count={Math.ceil(filteredPrincipios.length / rowsPerPage)}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                />
              </Box>
            </Paper>
          </Stack>
        </Container>
        <Fab
          color="primary"
          aria-label="add"
          onClick={() => router.push('/principio-activo')}
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
        >
          <AddCircleIcon />
        </Fab>
      </Box>
    </>
  );
};

PrincipiosActivosPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default PrincipiosActivosPage;
