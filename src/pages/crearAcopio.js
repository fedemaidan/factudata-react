import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Stack,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Snackbar,
  Alert,
  IconButton,
  MenuItem
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import AcopioService from 'src/services/acopioService';
import { updateEmpresaDetails, getEmpresaById } from 'src/services/empresaService'; 
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useRouter } from 'next/router';
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import ProductosForm from 'src/components/ProductosForm';

const CrearAcopioPage = () => {
  const router = useRouter();
  const { empresaId, acopioId } = router.query;

  const [codigo, setCodigo] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [proyecto, setProyecto] = useState('');
  const [valorTotal, setValorTotal] = useState(0);
  const [productos, setProductos] = useState([]);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [proveedores, setProveedores] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [editando, setEditando] = useState(false);
  const [archivoCompra, setArchivoCompra] = useState(null);
  const [cargandoArchivo, setCargandoArchivo] = useState(false);
  
  
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const empresa = await getEmpresaById(empresaId);
        setProveedores(empresa.proveedores || []);
        const proyectosEmpresa = await getProyectosByEmpresa(empresa);
        setProyectos(proyectosEmpresa);

        if (acopioId) {
          setEditando(true);
          const acopio = await AcopioService.obtenerAcopio(acopioId);
          setCodigo(acopio.codigo || '');
          setProveedor(acopio.proveedor || '');
          setProyecto(acopio.proyectoId || acopio.proyecto_id || '');
          const movimientos = await AcopioService.obtenerCompras(acopioId);
          setProductos(movimientos || []);
          const total = (movimientos || []).reduce((sum, p) => sum + (p.valorUnitario * p.cantidad), 0);
          setValorTotal(total);
        }
      } catch (err) {
        console.error('Error al cargar datos:', err);
        setAlert({ open: true, message: 'Error al cargar datos', severity: 'error' });
      }
    };

    if (empresaId) {
      cargarDatos();
    }
  }, [empresaId, acopioId]);
  const manejarExtraccionDeCompra = async () => {
    if (!archivoCompra) return;
    try {
      setCargandoArchivo(true);
      const nuevosMateriales = await AcopioService.extraerDatosCompraDesdeArchivo(acopioId, archivoCompra, null);
  
      if (nuevosMateriales && nuevosMateriales.length > 0) {
        const nuevosProductos = [...productos, ...nuevosMateriales];
        setProductos(nuevosProductos);
        const nuevoTotal = nuevosProductos.reduce(
          (sum, p) => sum + (p.valorUnitario * p.cantidad),
          0
        );
        setValorTotal(nuevoTotal);
        setAlert({ open: true, message: 'Materiales extraídos con éxito.', severity: 'success' });
      } else {
        setAlert({ open: true, message: 'No se detectaron materiales.', severity: 'info' });
      }
    } catch (error) {
      console.error('Error al extraer datos de compra:', error);
      setAlert({ open: true, message: 'Error al extraer materiales.', severity: 'error' });
    } finally {
      setCargandoArchivo(false);
    }
  };
  
  const guardarAcopio = async () => {
    try {
      const proyecto_nombre = proyectos.find(p => p.id === proyecto)?.nombre;
      const acopio = {
        codigo,
        proveedor,
        proyecto_id: proyecto,
        proyecto_nombre,
        valorTotal,
        productos,
        empresaId
      };

      if (editando) {
        await AcopioService.editarAcopio(acopioId, acopio);
        setAlert({ open: true, message: 'Acopio actualizado con éxito.', severity: 'success' });
      } else {
        await AcopioService.crearAcopio(acopio);
        setAlert({ open: true, message: 'Acopio creado con éxito', severity: 'success' });
      }

      router.push('/acopios?empresaId=' + empresaId);
    } catch (error) {
      console.error('Error al guardar acopio:', error);
      setAlert({ open: true, message: 'Error al guardar acopio', severity: 'error' });
    }
  };

  return (
    <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
      <Container maxWidth="md">
      <Typography variant="h5" gutterBottom>
        {editando ? 'Editar Acopio' : 'Crear nuevo Acopio'}
      </Typography>
        <Stack spacing={3}>
          <TextField label="Código" value={codigo} onChange={(e) => setCodigo(e.target.value)} fullWidth />
          <TextField select label="Proveedor" value={proveedor} onChange={(e) => setProveedor(e.target.value)} fullWidth>
            {proveedores.map((prov) => (
              <MenuItem key={prov} value={prov}>{prov}</MenuItem>
            ))}
          </TextField>
          <TextField select label="Proyecto" value={proyecto} onChange={(e) => setProyecto(e.target.value)} fullWidth>
            {proyectos.map((proj) => (
              <MenuItem key={proj.id} value={proj.id}>{proj.nombre}</MenuItem>
            ))}
          </TextField>
          <Stack spacing={2}>
            <Typography variant="subtitle1">📄 Extraer materiales desde un archivo</Typography>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setArchivoCompra(e.target.files[0])}
            />
            <Button
              variant="outlined"
              disabled={!archivoCompra || cargandoArchivo}
              onClick={manejarExtraccionDeCompra}
            >
              {cargandoArchivo ? 'Procesando...' : 'Extraer materiales'}
            </Button>
          </Stack>


          <ProductosForm productos={productos} setProductos={setProductos} valorTotal={valorTotal} setValorTotal={setValorTotal} />
              
          <Typography variant="subtitle1">Valor total: ${valorTotal.toLocaleString()}</Typography>
          <Button variant="contained" onClick={guardarAcopio}>
            {editando ? 'Guardar Cambios' : 'Guardar Acopio'}
          </Button>

        </Stack>

        <Snackbar open={alert.open} autoHideDuration={6000} onClose={() => setAlert({ ...alert, open: false })}>
          <Alert onClose={() => setAlert({ ...alert, open: false })} severity={alert.severity}>{alert.message}</Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

CrearAcopioPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default CrearAcopioPage;
