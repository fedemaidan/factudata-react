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
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Chip
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useAuthContext } from 'src/contexts/auth-context';
import { useRouter } from 'next/router';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import AcopioService from 'src/services/acopioService';
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import { getEmpresaById } from 'src/services/empresaService';
import { CircularProgress } from '@mui/material';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

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
  const [filtroTexto, setFiltroTexto] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedAcopio, setSelectedAcopio] = useState(null);
  const openMenu = Boolean(anchorEl);

  const handleMenuClick = (event, acopio) => {
    setAnchorEl(event.currentTarget);
    setSelectedAcopio(acopio);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedAcopio(null);
  };

  const exportarExcel = () => {
    const data = acopios.map(a => ({
      Fecha: new Date(a.fecha).toLocaleDateString(),
      Código: a.codigo,
      Proveedor: a.proveedor,
      Proyecto: a.proyecto_nombre,
      Total: a.totalValor || 0
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Acopios');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'acopios.xlsx');
  };

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
      let acopiosData = await AcopioService.listarAcopios(empresaId);
      // hace qeu si no tiene estado le ponga activo
      acopiosData.map(acopio => {
        if (!acopio.estado) {
          acopio.estado = 'activo';
        }
      });
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

  const acopiosFiltrados = acopios.filter(a =>
    a.codigo?.toLowerCase().includes(filtroTexto.toLowerCase()) ||
    a.proveedor?.toLowerCase().includes(filtroTexto.toLowerCase()) ||
    a.proyecto_nombre?.toLowerCase().includes(filtroTexto.toLowerCase())
  );

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
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} mb={2}>
          <Typography variant="h6">Total General de Acopios: {formatCurrency(totalAcopios)}</Typography>
          <Stack direction="row" spacing={2}>
            <Button variant="outlined" onClick={exportarExcel}>Exportar Excel</Button>
            <Button variant="contained" startIcon={<RefreshIcon />} onClick={fetchAcopios}>Actualizar</Button>
            {!isMobile && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => router.push(`/crearAcopio?empresaId=${empresaId}`)}>
                Crear Acopio
              </Button>
            )}
          </Stack>
        </Stack>

        <TextField
          placeholder="Buscar por código, proveedor o proyecto"
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
          sx={{ mb: 3 }}
        />

        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Código</TableCell>
              <TableCell>Proveedor</TableCell>
              <TableCell>Proyecto</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Total disponible</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {acopiosFiltrados.map((acopio) => (
              <TableRow key={acopio.id}>
                <TableCell>{new Date(acopio.fecha).toLocaleDateString()}</TableCell>
                <TableCell>{acopio.codigo}</TableCell>
                <TableCell>{acopio.proveedor}</TableCell>
                <TableCell>{acopio.proyecto_nombre}</TableCell>
                <TableCell>
                <Chip label={acopio.estado} color={acopio.estado == 'inactivo' ? 'error': 'success' } size="small" />
                  </TableCell>
                <TableCell>{formatCurrency(acopio.totalValor)}</TableCell>
                <TableCell align="center">
                  <Tooltip title="Más opciones">
                    <IconButton onClick={(e) => handleMenuClick(e, acopio)}>
                      <MoreVertIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Menu anchorEl={anchorEl} open={openMenu} onClose={handleCloseMenu}>
          <MenuItem onClick={() => {
            router.push(`/movimientosAcopio?acopioId=${selectedAcopio?.id}`);
            handleCloseMenu();
          }}>Ver Movimientos</MenuItem>
          <MenuItem onClick={() => {
            router.push(`/crearAcopio/?empresaId=${empresaId}&acopioId=${selectedAcopio?.id}`);
            handleCloseMenu();
          }}>Editar</MenuItem>
          <MenuItem onClick={() => {
            setAcopioAEliminar(selectedAcopio);
            setConfirmDialogOpen(true);
            handleCloseMenu();
          }}>Eliminar</MenuItem>
        </Menu>

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

        <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
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
