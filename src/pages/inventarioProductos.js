import { useEffect, useState, useMemo } from 'react';
import Head from 'next/head';
import {
  Box, Button, Container, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Typography, Tabs, Tab, Select, MenuItem, FormControl, InputLabel,
  Card, CardContent, Grid, Chip, Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import HistoryIcon from '@mui/icons-material/History';
import PostAddIcon from '@mui/icons-material/PostAdd';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import InventarioService from '../services/stock/inventarioService';
import { useAuthContext } from 'src/contexts/auth-context';
import { getProyectosFromUser, getProyectosByEmpresa } from 'src/services/proyectosService';
import { getEmpresaById } from 'src/services/empresaService';

const InventarioProductos = () => {
  const { user } = useAuthContext();
  const [currentTab, setCurrentTab] = useState('productos');
  const [productos, setProductos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [stockMap, setStockMap] = useState({});
  const [proyectos, setProyectos] = useState([]);
  const [filterProductoId, setFilterProductoId] = useState('');
  
  // Dialogs
  const [openProductDialog, setOpenProductDialog] = useState(false);
  const [openMovDialog, setOpenMovDialog] = useState(false);
  
  // Forms
  const [productForm, setProductForm] = useState({ nombre: '', descripcion: '', sku: '', categoria: '' });
  const [movForm, setMovForm] = useState({ 
    producto_id: '', cantidad: '', tipo: 'ALTA', 
    origen_proyecto_id: '', destino_proyecto_id: '', razon: '' 
  });
  
  const [editingProduct, setEditingProduct] = useState(null);

  const empresaId = user?.empresaId || user?.empresa?.id;

  useEffect(() => {
    if (user) {
      loadData();
      loadProyectos();
    }
  }, [user, currentTab, filterProductoId]);

  const loadData = async () => {
    if (!empresaId) return;
    try {
      if (currentTab === 'productos') {
        const prods = await InventarioService.getProductos(empresaId);
        setProductos(prods);
        const stock = await InventarioService.getStock(empresaId);
        setStockMap(stock);
      } else {
        const params = { empresa_id: empresaId };
        if (filterProductoId) params.producto_id = filterProductoId;
        const movs = await InventarioService.getMovimientos(params);
        setMovimientos(movs);
      }
    } catch (error) {
      console.error("Error loading data", error);
    }
  };

  const loadProyectos = async () => {
      try {
          if (!empresaId) return;
          const empresaFull = await getEmpresaById(empresaId);
          if (empresaFull) {
              const proys = await getProyectosByEmpresa(empresaFull);
              setProyectos(proys || []);
          }
      } catch (e) {
          console.error(e);
      }
  }

  // --- Product Handlers ---
  const handleOpenProduct = (prod = null) => {
    if (prod) {
      setEditingProduct(prod);
      setProductForm({ ...prod });
    } else {
      setEditingProduct(null);
      setProductForm({ nombre: '', descripcion: '', sku: '', categoria: '' });
    }
    setOpenProductDialog(true);
  };

  const handleSaveProduct = async () => {
    try {
      if (editingProduct) {
        await InventarioService.updateProducto(editingProduct._id, productForm);
      } else {
        await InventarioService.createProducto({ ...productForm, empresa_id: empresaId });
      }
      setOpenProductDialog(false);
      loadData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (confirm('¿Eliminar producto?')) {
      await InventarioService.deleteProducto(id);
      loadData();
    }
  };

  const handleViewHistory = (prodId) => {
      setFilterProductoId(prodId);
      setCurrentTab('movimientos');
  };

  // --- Movement Handlers ---
  const handleOpenMov = (prodId = null, tipo = 'ALTA') => {
    setMovForm({
      producto_id: prodId || '',
      cantidad: '',
      tipo: tipo,
      origen_proyecto_id: '',
      destino_proyecto_id: '',
      razon: ''
    });
    setOpenMovDialog(true);
  };

  const handleSaveMov = async () => {
    try {
      const payload = {
        ...movForm,
        empresa_id: empresaId,
        usuario_id: user.uid,
        cantidad: Number(movForm.cantidad)
      };
      
      // Validaciones simples
      if (payload.tipo === 'TRANSFERENCIA' && (!payload.origen_proyecto_id || !payload.destino_proyecto_id)) {
          alert('Origen y Destino requeridos para transferencia');
          return;
      }

      // Validar stock en origen para Transferencia o Baja
      if (['TRANSFERENCIA', 'BAJA'].includes(payload.tipo)) {
          const origenKey = payload.origen_proyecto_id || 'DEPOSITO';
          const stockData = stockMap[payload.producto_id] || {};
          const stockEnOrigen = (stockData.proyectos && stockData.proyectos[origenKey]) || 0;
          
          if (payload.cantidad > stockEnOrigen) {
              alert(`Stock insuficiente en origen. Disponible: ${stockEnOrigen}`);
              return;
          }
      }
      
      await InventarioService.createMovimiento(payload);
      setOpenMovDialog(false);
      loadData(); // Reload stock/movements
    } catch (error) {
      console.error(error);
      alert('Error al guardar movimiento');
    }
  };

  // --- Render ---
  return (
    <>
      <Head><title>Inventario | Factudata</title></Head>
      <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
        <Container maxWidth="xl">
          <Stack direction="row" justifyContent="space-between" spacing={4} mb={3}>
            <Typography variant="h4">Inventario de Productos</Typography>
            <Button startIcon={<AddIcon />} variant="contained" onClick={() => handleOpenProduct()}>
              Nuevo Producto
            </Button>
          </Stack>

          <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)} sx={{ mb: 3 }}>
            <Tab label="Productos" value="productos" />
            <Tab label="Movimientos" value="movimientos" />
          </Tabs>

          {currentTab === 'productos' && (
            <Paper>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nombre</TableCell>
                    <TableCell>SKU</TableCell>
                    <TableCell>Categoría</TableCell>
                    <TableCell>Stock Total</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {productos.map((prod) => {
                      const stockInfo = stockMap[prod._id] || { total: 0 };
                      return (
                    <TableRow key={prod._id}>
                      <TableCell>{prod.nombre}</TableCell>
                      <TableCell>{prod.sku}</TableCell>
                      <TableCell>{prod.categoria}</TableCell>
                      <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                              <Chip label={`Total: ${stockInfo.total}`} color={stockInfo.total > 0 ? "success" : "default"} />
                              {Object.entries(stockInfo.proyectos || {}).map(([pid, qty]) => {
                                  if (qty <= 0) return null;
                                  const pName = proyectos.find(p => p.id === pid)?.nombre || (pid === 'DEPOSITO' ? 'Depósito' : 'Otro');
                                  return <Chip key={pid} label={`${pName}: ${qty}`} size="small" variant="outlined" />;
                              })}
                          </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Mover entre proyectos">
                            <IconButton onClick={() => handleOpenMov(prod._id, 'TRANSFERENCIA')}>
                                <SwapHorizIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Ajuste Stock">
                            <IconButton onClick={() => handleOpenMov(prod._id, 'ALTA')}>
                                <PostAddIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Ver Historial">
                            <IconButton onClick={() => handleViewHistory(prod._id)}>
                                <HistoryIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar">
                            <IconButton onClick={() => handleOpenProduct(prod)}>
                            <EditIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                            <IconButton onClick={() => handleDeleteProduct(prod._id)} color="error">
                            <DeleteIcon />
                            </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  )})}
                  {productos.length === 0 && (
                      <TableRow><TableCell colSpan={5} align="center">No hay productos</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          )}

          {currentTab === 'movimientos' && (
            <Paper>
                <Box p={2} display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                        {filterProductoId && (
                            <Chip 
                                label={`Filtrado por: ${productos.find(p => p._id === filterProductoId)?.nombre || 'Producto'}`} 
                                onDelete={() => setFilterProductoId('')}
                                color="primary"
                            />
                        )}
                    </Box>
                    <Button variant="outlined" onClick={() => handleOpenMov()}>Registrar Movimiento</Button>
                </Box>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Producto</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Cantidad</TableCell>
                    <TableCell>Origen</TableCell>
                    <TableCell>Destino</TableCell>
                    <TableCell>Razón</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {movimientos.map((mov) => {
                      const origen = proyectos.find(p => p.id === mov.origen_proyecto_id)?.nombre || (mov.origen_proyecto_id ? 'Otro' : '-');
                      const destino = proyectos.find(p => p.id === mov.destino_proyecto_id)?.nombre || (mov.destino_proyecto_id ? 'Otro' : '-');
                      return (
                    <TableRow key={mov._id}>
                      <TableCell>{new Date(mov.fecha).toLocaleDateString()}</TableCell>
                      <TableCell>{mov.producto_id?.nombre || '?'}</TableCell>
                      <TableCell>{mov.tipo}</TableCell>
                      <TableCell>{mov.cantidad}</TableCell>
                      <TableCell>{origen}</TableCell>
                      <TableCell>{destino}</TableCell>
                      <TableCell>{mov.razon}</TableCell>
                    </TableRow>
                  )})}
                </TableBody>
              </Table>
            </Paper>
          )}
        </Container>
      </Box>

      {/* Dialog Producto */}
      <Dialog open={openProductDialog} onClose={() => setOpenProductDialog(false)}>
        <DialogTitle>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 300 }}>
            <TextField label="Nombre" fullWidth value={productForm.nombre} onChange={e => setProductForm({...productForm, nombre: e.target.value})} />
            <TextField label="SKU" fullWidth value={productForm.sku} onChange={e => setProductForm({...productForm, sku: e.target.value})} />
            <TextField label="Categoría" fullWidth value={productForm.categoria} onChange={e => setProductForm({...productForm, categoria: e.target.value})} />
            <TextField label="Descripción" fullWidth multiline rows={2} value={productForm.descripcion} onChange={e => setProductForm({...productForm, descripcion: e.target.value})} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenProductDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveProduct}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Movimiento */}
      <Dialog open={openMovDialog} onClose={() => setOpenMovDialog(false)}>
        <DialogTitle>Registrar Movimiento</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 350 }}>
            <FormControl fullWidth>
                <InputLabel>Producto</InputLabel>
                <Select 
                    value={movForm.producto_id} 
                    label="Producto"
                    onChange={e => setMovForm({...movForm, producto_id: e.target.value})}
                >
                    {productos.map(p => <MenuItem key={p._id} value={p._id}>{p.nombre}</MenuItem>)}
                </Select>
            </FormControl>
            
            <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select 
                    value={movForm.tipo} 
                    label="Tipo"
                    onChange={e => setMovForm({...movForm, tipo: e.target.value})}
                >
                    <MenuItem value="ALTA">Ingreso (Compra/Alta)</MenuItem>
                    <MenuItem value="BAJA">Egreso (Consumo/Baja)</MenuItem>
                    <MenuItem value="TRANSFERENCIA">Transferencia entre Proyectos</MenuItem>
                    <MenuItem value="AJUSTE">Ajuste Inventario</MenuItem>
                </Select>
            </FormControl>

            <TextField 
                label="Cantidad" 
                type="number" 
                fullWidth 
                value={movForm.cantidad} 
                onChange={e => setMovForm({...movForm, cantidad: e.target.value})} 
            />

            {(movForm.tipo === 'TRANSFERENCIA' || movForm.tipo === 'BAJA') && (
                <FormControl fullWidth>
                    <InputLabel>Origen (Proyecto)</InputLabel>
                    <Select 
                        value={movForm.origen_proyecto_id} 
                        label="Origen (Proyecto)"
                        onChange={e => setMovForm({...movForm, origen_proyecto_id: e.target.value})}
                    >
                        {/* Depósito */}
                        {((stockMap[movForm.producto_id]?.proyectos?.['DEPOSITO'] || 0) > 0) && (
                            <MenuItem value="">
                                <em>Depósito Central / Externo ({stockMap[movForm.producto_id]?.proyectos?.['DEPOSITO']})</em>
                            </MenuItem>
                        )}
                        
                        {/* Proyectos con stock */}
                        {proyectos
                            .filter(p => (stockMap[movForm.producto_id]?.proyectos?.[p.id] || 0) > 0)
                            .map(p => (
                                <MenuItem key={p.id} value={p.id}>
                                    {p.nombre} ({stockMap[movForm.producto_id]?.proyectos?.[p.id]})
                                </MenuItem>
                            ))
                        }
                        
                        {/* Mensaje si no hay stock */}
                        {(!((stockMap[movForm.producto_id]?.proyectos?.['DEPOSITO'] || 0) > 0) && 
                          proyectos.filter(p => (stockMap[movForm.producto_id]?.proyectos?.[p.id] || 0) > 0).length === 0) && (
                            <MenuItem disabled value="">
                                <em>No hay stock disponible en ningún origen</em>
                            </MenuItem>
                        )}
                    </Select>
                </FormControl>
            )}

            {(movForm.tipo === 'TRANSFERENCIA' || movForm.tipo === 'ALTA') && (
                <FormControl fullWidth>
                    <InputLabel>Destino (Proyecto)</InputLabel>
                    <Select 
                        value={movForm.destino_proyecto_id} 
                        label="Destino (Proyecto)"
                        onChange={e => setMovForm({...movForm, destino_proyecto_id: e.target.value})}
                    >
                        <MenuItem value=""><em>Depósito Central / Externo</em></MenuItem>
                        {proyectos.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
                    </Select>
                </FormControl>
            )}

            <TextField 
                label="Razón / Observación" 
                fullWidth 
                multiline 
                rows={2} 
                value={movForm.razon} 
                onChange={e => setMovForm({...movForm, razon: e.target.value})} 
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMovDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveMov}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

InventarioProductos.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default InventarioProductos;
