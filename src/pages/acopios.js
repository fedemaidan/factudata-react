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
  Dialog
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import { useAuthContext } from 'src/contexts/auth-context';
import { useRouter } from 'next/router';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import AcopioService from 'src/services/acopioService';
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import { getEmpresaById } from 'src/services/empresaService';
import { CircularProgress } from '@mui/material';


const AcopiosPage = () => {
  const { user } = useAuthContext();
  const router = useRouter();
  const { empresaId } = router.query; 
  const [acopios, setAcopios] = useState([]);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const [acopioAEliminar, setAcopioAEliminar] = useState(null);
const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
const [totalAcopios, setTotalAcopios] = useState(0);
const [loading, setLoading] = useState(true);


const handleEliminarAcopio = async () => {
  if (!acopioAEliminar) return;
  try {
    const exito = await AcopioService.eliminarAcopio(acopioAEliminar.id);
    if (exito) {
      setAlert({ open: true, message: 'Acopio eliminado con éxito', severity: 'success' });
      fetchAcopios();
    } else {
      setAlert({ open: true, message: 'Error al eliminar el acopio', severity: 'error' });
    }
  } catch (error) {
    setAlert({ open: true, message: 'Error al eliminar el acopio', severity: 'error' });
  } finally {
    setConfirmDialogOpen(false);
    setAcopioAEliminar(null);
  }
};


const formatCurrency = (amount) => {
    if (amount)
      return amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });
    else
      return "$ 0";
  };
  

  const fetchAcopios = useCallback(async () => {
  setLoading(true);
  try {
    const acopiosData = await AcopioService.listarAcopios(empresaId);
    setAcopios(acopiosData);
    const total = acopiosData.reduce((sum, acopio) => sum + (acopio.totalValor || 0), 0);
    setTotalAcopios(total);
  } catch (error) {
    console.error('Error al obtener acopios:', error);
    setAlert({ open: true, message: 'Error al obtener los acopios', severity: 'error' });
  } finally {
    setLoading(false);
  }
}, [empresaId]);


  useEffect(() => {
    fetchAcopios();
  }, [fetchAcopios]);
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
      <Container maxWidth="xl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
  <Typography variant="h6">Total General de Acopios: {formatCurrency(totalAcopios)}</Typography>
  <Stack direction="row" spacing={2}>
    <Button variant="contained" startIcon={<RefreshIcon />} onClick={fetchAcopios}>
      Actualizar
    </Button>
    {!isMobile && (
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => router.push(`/crearAcopio?empresaId=${empresaId}`)}
      >
        Crear Acopio
      </Button>
    )}
  </Stack>
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
            
                <Stack direction="row" spacing={1} mt={2}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => router.push(`/movimientosAcopio?acopioId=${acopio.id}`)}
                  >
                    Ver
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    onClick={() => {
                      setAcopioAEliminar(acopio);
                      setConfirmDialogOpen(true);
                    }}
                  >
                    Eliminar
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
                    <Button
                      variant="outlined"
                      color="error"
                      sx={{ mt: 1 }}
                      onClick={() => {
                        setAcopioAEliminar(acopio);
                        setConfirmDialogOpen(true);
                      }}
                    >
                      Eliminar
                    </Button>
                    <Button
                      variant="outlined"
                      sx={{ mt: 1 }}
                      onClick={() => router.push(`/crearAcopio/?empresaId=${empresaId}&acopioId=${acopio.id}`)}
                    >
                      Editar
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
            onClick={() => router.push(`/crearAcopio?empresaId=${empresaId}`)}
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
          >
            <AddIcon />
          </Fab>
        )}
        <Dialog
  open={confirmDialogOpen}
  onClose={() => setConfirmDialogOpen(false)}
>
  <Card sx={{ p: 3, maxWidth: 400 }}>
    <Typography variant="h6" gutterBottom>
      ¿Estás seguro que querés eliminar el acopio?
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      Esta acción eliminará todos los remitos, compras y movimientos asociados.
    </Typography>
    <Stack direction="row" spacing={2} justifyContent="flex-end">
      <Button onClick={() => setConfirmDialogOpen(false)} variant="outlined">
        Cancelar
      </Button>
      <Button onClick={handleEliminarAcopio} variant="contained" color="error">
        Eliminar
      </Button>
    </Stack>
  </Card>
</Dialog>


        <Snackbar open={alert.open} autoHideDuration={6000} onClose={() => setAlert({ ...alert, open: false })}>
          <Alert onClose={() => setAlert({ ...alert, open: false })} severity={alert.severity}>
            {alert.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

AcopiosPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default AcopiosPage;
