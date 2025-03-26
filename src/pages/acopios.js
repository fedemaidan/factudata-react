import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Container,
  Stack,
  Typography,
  Card,
  CardContent,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  useMediaQuery,
  Fab,
  Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    InputLabel,
    Select,
    MenuItem,
    FormControl
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import { useAuthContext } from 'src/contexts/auth-context';
import { useRouter } from 'next/router';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import AcopioService from 'src/services/acopioService';
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import { getEmpresaById } from 'src/services/empresaService';


const AcopiosPage = () => {
  const { user } = useAuthContext();
  const router = useRouter();
  const { empresaId } = router.query; 
  const [acopios, setAcopios] = useState([]);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const [proveedor, setProveedor] = useState('');
  const [codigoAcopio, setCodigoAcopio] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [proyectoId, setProyectoId] = useState('');
const [proyectos, setProyectos] = useState([]);
const [totalAcopios, setTotalAcopios] = useState(0);

const formatCurrency = (amount) => {
    if (amount)
      return amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });
    else
      return "$ 0";
  };
  

  // Obtener la lista de acopios
  const fetchAcopios = useCallback(async () => {
    try {
      const acopiosData = await AcopioService.listarAcopios(empresaId);
      setAcopios(acopiosData);
  
      // 🔥 Calcular el total sumando los valores de cada acopio
      const total = acopiosData.reduce((sum, acopio) => sum + (acopio.totalValor || 0), 0);
      setTotalAcopios(total);
      
    } catch (error) {
      console.error('Error al obtener acopios:', error);
      setAlert({ open: true, message: 'Error al obtener los acopios', severity: 'error' });
    }
  }, [empresaId]);
  

  const handleCrearAcopio = async () => {
    if (!codigoAcopio || !proveedor) {
      setAlert({ open: true, message: 'Debe ingresar código y proveedor.', severity: 'warning' });
      return;
    }
  
    try {
      const success = await AcopioService.crearAcopio({
        empresaId: user.empresa.id,
        codigo: codigoAcopio,
        proveedor: proveedor,
      });
  
      if (success) {
        setAlert({ open: true, message: 'Acopio creado con éxito', severity: 'success' });
        fetchAcopios();
      } else {
        setAlert({ open: true, message: 'Error al crear el acopio', severity: 'error' });
      }
  
      setOpenDialog(false);
      setCodigoAcopio('');
      setProveedor('');
    } catch (error) {
      console.error('Error al crear acopio:', error);
      setAlert({ open: true, message: 'Error al crear el acopio', severity: 'error' });
    }
  };

  
  const fetchProyectos = useCallback(async () => {
    try {
        const empresa = await getEmpresaById(empresaId); // Debes agregar esta función al servicio
      const proyectosData = await getProyectosByEmpresa(empresa); // Debes agregar esta función al servicio
      setProyectos(proyectosData);
      console.log('Proyectos:', proyectosData);
    } catch (error) {
      console.error('Error al obtener proyectos:', error);
      setAlert({ open: true, message: 'Error al obtener los proyectos', severity: 'error' });
    }
  }, [empresaId]);
  
  useEffect(() => {
    if (user) fetchProyectos();
  }, [user, fetchProyectos, empresaId]);
  

  useEffect(() => {
    if (user) fetchAcopios();
  }, [user, fetchAcopios, empresaId]);

  
  const handleUploadClick = () => {
    setOpenDialog(true);
  };
  
  
  
  return (
    <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
      <Container maxWidth="xl">
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Total General de Acopios: {formatCurrency(totalAcopios)}</Typography>
          <Button variant="contained" startIcon={<RefreshIcon />} onClick={fetchAcopios}>
            Actualizar
          </Button>
          <Button
  variant="contained"
  color="secondary"
  startIcon={<AddIcon />}
  onClick={() => setOpenDialog(true)} // Abre el diálogo
>
  Crear Acopio
</Button>

        </Stack>
        
        {isMobile ? (
          <Stack spacing={2}>
            {acopios.map((acopio) => (
              <Card key={acopio.id}>
                <CardContent>
                  <Typography variant="h6">
                    Código: {acopio.codigo} - {acopio.proveedor}
                  </Typography>
                  <Typography variant="body2">Proyecto: {acopio.proyecto_nombre}</Typography>
                  <Typography variant="body2">Fecha: {new Date(acopio.fecha).toLocaleDateString()}</Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Código</TableCell>
                <TableCell>Proveedor</TableCell>
                <TableCell>Proyecto</TableCell>
                <TableCell>Total disponible</TableCell>
                <TableCell>Accion</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {acopios.map((acopio) => (
                <TableRow key={acopio.id}>
                  <TableCell>{new Date(acopio.fecha).toLocaleDateString()}</TableCell>
                  <TableCell>{acopio.codigo}</TableCell>
                  <TableCell>{acopio.proveedor}</TableCell>
                  <TableCell>{acopio.proyecto_nombre}</TableCell>
                  <TableCell>{formatCurrency(acopio.totalValor)}</TableCell>
                  <TableCell>
                    <Button
                    variant="contained"
                    onClick={() => router.push(`/movimientosAcopio?acopioId=${acopio.id}`)}
                    >
                    Ver Movimientos
                    </Button>
                </TableCell>
                </TableRow>
              ))}
            </TableBody>


          </Table>
        )}

        {isMobile && (
          <Fab
            color="primary"
            aria-label="add"
            onClick={() => setAlert({ open: true, message: 'Función en desarrollo', severity: 'info' })}
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
          >
            <AddIcon />
          </Fab>
        )}

        <Snackbar open={alert.open} autoHideDuration={6000} onClose={() => setAlert({ ...alert, open: false })}>
          <Alert onClose={() => setAlert({ ...alert, open: false })} severity={alert.severity}>
            {alert.message}
          </Alert>
        </Snackbar>
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
  <DialogTitle>Crear Acopio</DialogTitle>
  <DialogContent>
    <Stack spacing={2}>
      <TextField
        label="Proveedor"
        value={proveedor}
        onChange={(e) => setProveedor(e.target.value)}
        fullWidth
      />
      <TextField
        label="Código de Acopio"
        value={codigoAcopio}
        onChange={(e) => setCodigoAcopio(e.target.value)}
        fullWidth
      />
      <FormControl fullWidth>
        <InputLabel>Proyecto</InputLabel>
        <Select
          value={proyectoId}
          onChange={(e) => setProyectoId(e.target.value)}
        >
          {proyectos.map((proyecto) => (
            <MenuItem key={proyecto.id} value={proyecto.id}>
              {proyecto.nombre}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  </DialogContent>
  <DialogActions>
  <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>

  <Button
    variant="contained"
    color="primary"
    disabled={!proveedor || !codigoAcopio}
    onClick={handleCrearAcopio}
  >
    Confirmar y Crear Acopio
  </Button>
</DialogActions>


</Dialog>

      </Container>
    </Box>
  );
};

AcopiosPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default AcopiosPage;
