import { useState, useEffect } from 'react';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import Head from 'next/head';
import { Box, Container, Stack, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, Button, Snackbar, Alert, Fab, TextField, Menu, MenuItem as MenuOption, Pagination } from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useRouter } from 'next/router';
import productsService from 'src/services/productService';
import { useAuthContext } from 'src/contexts/auth-context';

const ProductosPage = () => {
  const { user } = useAuthContext();
  const [productos, setProductos] = useState([]);
  const [filteredProductos, setFilteredProductos] = useState([]);
  const [filtroMarca, setFiltroMarca] = useState('');
  const [filtroStock, setFiltroStock] = useState(false); 
  const [filtroActive, setFiltroActive] = useState(false); 
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'info',
  });
  const [anchorEl, setAnchorEl] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [productoAEliminar, setProductoAEliminar] = useState(null);
  const [filtroRegistro, setFiltroRegistro] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10); // Número de filas por página
  const router = useRouter();

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

  const fetchProductos = async () => {
    const productos = await productsService.getAllProducts();
    setProductos(productos);
    setFilteredProductos(productos); // Inicializar productos filtrados
  };

  const handleEliminarProducto = async (productoAEliminar) => {
    const result = await productsService.deleteProductById(productoAEliminar);
    if (result) {
      setProductos(productos.filter((prod) => prod.id !== productoAEliminar));
      setFilteredProductos(filteredProductos.filter((prod) => prod.id !== productoAEliminar));
      setAlert({
        open: true,
        message: 'Producto eliminado con éxito',
        severity: 'success',
      });
    } else {
      setAlert({
        open: true,
        message: 'Error al eliminar el producto',
        severity: 'error',
      });
    }
    setOpenDialog(false);
  };

  const handleEliminarClick = (productoId) => {
    handleEliminarProducto(productoId);
    setOpenDialog(true);
  };

  const handleFiltroChange = () => {
    const productosFiltrados = productos.filter((producto) =>
      (filtroRegistro === '' || producto.registro.toLowerCase().includes(filtroRegistro.toLowerCase())) &&
      (filtroActivo === '' || producto.activos.toLowerCase().includes(filtroActivo.toLowerCase())) &&
      (filtroMarca === '' || producto.marca.toLowerCase().includes(filtroMarca.toLowerCase())) &&
      (!filtroStock || producto.stock > 0) &&
      (!filtroActive || producto.activo == true)
    );
    setFilteredProductos(productosFiltrados);
    setPage(1); // Reiniciar a la primera página al aplicar filtros
  };
  
  

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  useEffect(() => {
    handleFiltroChange();
  }, [filtroRegistro, filtroActivo, filtroMarca, filtroStock,filtroActive,  productos]);

  // Calcular los productos a mostrar en la página actual
  const productosPaginados = filteredProductos.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  return (
    <>
      <Head>
        <title>Listado de Productos</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Typography variant="h4">Listado de Productos</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                label="Filtro por Registro"
                variant="outlined"
                value={filtroRegistro}
                onChange={(e) => setFiltroRegistro(e.target.value)}
              />
              <TextField
                label="Filtro por Principio Activo"
                variant="outlined"
                value={filtroActivo}
                onChange={(e) => setFiltroActivo(e.target.value)}
              />
              <TextField
                label="Filtro por Marca"
                variant="outlined"
                value={filtroMarca}
                onChange={(e) => setFiltroMarca(e.target.value)}
              />
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={filtroStock}
                  onChange={(e) => setFiltroStock(e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                <Typography>Con Stock</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={filtroActive}
                  onChange={(e) => setFiltroActive(e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                <Typography>Productos activos</Typography>
              </Box>
              <Button variant="contained" onClick={fetchProductos} startIcon={<RefreshIcon />}>
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
                    <TableCell>Registro</TableCell>
                    <TableCell>Activos</TableCell>
                    <TableCell>Empresa</TableCell>
                    <TableCell>Marca</TableCell>
                    <TableCell>Precio</TableCell>
                    <TableCell>Producto Propio</TableCell>
                    <TableCell>Stock</TableCell>
                    <TableCell>Activo</TableCell>
                    <TableCell>Rentabilidad (%)</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {productosPaginados.map((producto, index) => (
                    <TableRow key={index}>
                      <TableCell>{producto.registro}</TableCell>
                      <TableCell>{producto.activos}</TableCell>
                      <TableCell>{producto.empresa}</TableCell>
                      <TableCell>{producto.marca}</TableCell>
                      <TableCell>${producto.precio}</TableCell>
                      <TableCell>{producto.producto_propio ? 'Sí' : 'No'}</TableCell>
                      <TableCell>{producto.stock}</TableCell>
                      <TableCell>{producto.activo ? 'Sí' : 'No'}</TableCell>
                      <TableCell>{producto.rentabilidad}%</TableCell>
                      <TableCell>
                        <Button
                          color="primary"
                          startIcon={<EditIcon />}
                          onClick={() => router.push('/producto?productoId=' + producto.id)}
                        >
                          Ver / Editar
                        </Button>
                        <Button
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleEliminarClick(producto.id)}
                        >
                          Eliminar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Pagination
                  count={Math.ceil(filteredProductos.length / rowsPerPage)}
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
          onClick={() => router.push('/producto')}
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
        >
          <AddCircleIcon />
        </Fab>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleCloseMenu}
          keepMounted
        >
          <MenuOption onClick={() => router.push('/producto')}>
            <AddCircleIcon sx={{ mr: 1 }} />
            Añadir Producto
          </MenuOption>
          <MenuOption onClick={fetchProductos}>
            <RefreshIcon sx={{ mr: 1 }} />
            Refrescar Productos
          </MenuOption>
        </Menu>
      </Box>
    </>
  );
};

ProductosPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default ProductosPage;
