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
  MenuItem,
  Autocomplete
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
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
  const [estadoExtraccion, setEstadoExtraccion] = useState('inicial'); 
  const [progreso, setProgreso] = useState(0); // entre 0 y 100
  const [maxIntentos, setMaxIntentos] = useState(60); // duración total
  
  
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
      setEstadoExtraccion('procesando');
      setProgreso(0);
      setMaxIntentos(60); // 60 intentos * 5s = 5 minutos
  
      const taskId = await AcopioService.extraerCompraInit(archivoCompra, null);
  
      let intentos = 0;
      const intervalo = 5000;
  
      const intervaloId = setInterval(async () => {
        try {
          intentos++;
          setProgreso(Math.min((intentos / maxIntentos) * 100, 100));
  
          const { status, materiales, error } = await AcopioService.consultarEstadoExtraccion(taskId);
  
          if (status === 'procesando') return;
  
          clearInterval(intervaloId);
  
          if (status === 'completado' && materiales?.length > 0) {
            const nuevosProductos = [...productos, ...materiales];
            setProductos(nuevosProductos);
            const nuevoTotal = nuevosProductos.reduce(
              (sum, p) => sum + (p.valorUnitario * p.cantidad), 0);
            setValorTotal(nuevoTotal);
            setEstadoExtraccion('completado');
            setAlert({ open: true, message: 'Materiales extraídos con éxito.', severity: 'success' });
          } else {
            setEstadoExtraccion('fallido');
            setAlert({ open: true, message: error || 'No se detectaron materiales.', severity: 'info' });
          }
          setCargandoArchivo(false);
        } catch (err) {
          clearInterval(intervaloId);
          console.error('Error al consultar estado:', err);
          setEstadoExtraccion('fallido');
          setAlert({ open: true, message: 'Fallo la extracción. Podés reintentar.', severity: 'error' });
          setCargandoArchivo(false);
        }
  
        if (intentos >= maxIntentos) {
          clearInterval(intervaloId);
          setEstadoExtraccion('fallido');
          setAlert({ open: true, message: 'Se superó el tiempo de espera', severity: 'error' });
          setCargandoArchivo(false);
        }
      }, intervalo);
  
    } catch (error) {
      console.error('Error al iniciar extracción:', error);
      setEstadoExtraccion('fallido');
      setAlert({ open: true, message: 'No se pudo iniciar la extracción.', severity: 'error' });
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
  
      // Si el proveedor no está en la lista, agregarlo
      if (proveedor && !proveedores.includes(proveedor)) {
        console.log("entre a agregar proveedor", proveedor, proveedores);
        const nuevosProveedores = [...proveedores, proveedor];
        await updateEmpresaDetails(empresaId, { proveedores: nuevosProveedores });
      }
  
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
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push(`/acopios?empresaId=${empresaId}`)}
        variant="text"
        sx={{ mb: 1 }}
      >
        Volver a la lista
      </Button>
      <Typography variant="h5" gutterBottom>
        {editando ? 'Editar Acopio' : 'Crear nuevo Acopio'}
      </Typography>
        <Stack spacing={3}>
          <TextField label="Código" value={codigo} onChange={(e) => setCodigo(e.target.value)} fullWidth />
          <Autocomplete
            freeSolo
            options={proveedores}
            value={proveedor}
            onInputChange={(event, newInputValue) => {
              setProveedor(newInputValue);
            }}
            renderInput={(params) => (
              <TextField {...params} label="Proveedor" fullWidth />
            )}
          />
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
            
            {estadoExtraccion === 'fallido' && (
              <Alert severity="error" sx={{ mt: 1 }}>
                No se pudo extraer los materiales. Verificá tu conexión o reintentá más tarde.
                <Button size="small" onClick={manejarExtraccionDeCompra} sx={{ ml: 1 }}>
                  Reintentar
                </Button>
              </Alert>
            )}
            
            {estadoExtraccion === 'completado' && (
              <Alert severity="success" sx={{ mt: 1 }}>
                Materiales extraídos correctamente.
              </Alert>
            )}

          {estadoExtraccion === 'procesando' && (
            <Alert severity="info" sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
              <Box sx={{ width: '100%' }}>
                <Typography variant="body2" gutterBottom>
                  Procesando archivo… esto puede tardar unos minutos.
                </Typography>
                <Box sx={{ width: '100%', mt: 1 }}>
                  <Box sx={{ height: 10, backgroundColor: '#f0f0f0', borderRadius: 5 }}>
                    <Box
                      sx={{
                        height: 10,
                        width: `${progreso}%`,
                        backgroundColor: '#1976d2',
                        borderRadius: 5,
                        transition: 'width 0.5s ease-in-out'
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="textSecondary">
                    {Math.floor(progreso)}% completado
                  </Typography>
                </Box>
              </Box>
            </Alert>
          )}

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
