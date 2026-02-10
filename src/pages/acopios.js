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
import EditIcon from '@mui/icons-material/Edit';
import { useAuthContext } from 'src/contexts/auth-context';
import { useBreadcrumbs } from 'src/contexts/breadcrumbs-context';
import { useRouter } from 'next/router';
import HomeIcon from '@mui/icons-material/Home';
import InventoryIcon from '@mui/icons-material/Inventory';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import AcopioService from 'src/services/acopioService';
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import { getEmpresaById } from 'src/services/empresaService';
import { CircularProgress } from '@mui/material';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import TooltipHelp from 'src/components/TooltipHelp';
import { TOOLTIP_ACOPIOS } from 'src/constant/tooltipTexts';

const AcopiosPage = () => {
  const { user } = useAuthContext();
  const { setBreadcrumbs } = useBreadcrumbs();
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
  const [descripcionDialogOpen, setDescripcionDialogOpen] = useState(false);
  const [descripcionEdit, setDescripcionEdit] = useState('');
  const [acopioEditando, setAcopioEditando] = useState(null);
  const [guardandoDescripcion, setGuardandoDescripcion] = useState(false);

  // Setear breadcrumbs
  useEffect(() => {
    setBreadcrumbs([
      { label: 'Inicio', href: '/', icon: <HomeIcon fontSize="small" /> },
      { label: 'Acopios', icon: <InventoryIcon fontSize="small" /> }
    ]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  const handleMenuClick = (event, acopio) => {
    setAnchorEl(event.currentTarget);
    setSelectedAcopio(acopio);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedAcopio(null);
  };

  const openDescripcionDialog = (acopio) => {
    setAcopioEditando(acopio);
    setDescripcionEdit(acopio?.descripcion || '');
    setDescripcionDialogOpen(true);
  };

  const closeDescripcionDialog = () => {
    setDescripcionDialogOpen(false);
    setAcopioEditando(null);
    setDescripcionEdit('');
  };

  const handleGuardarDescripcion = async () => {
    if (!acopioEditando) return;
    setGuardandoDescripcion(true);
    try {
      const ok = await AcopioService.editarAcopio(acopioEditando.id, {
        proveedor: acopioEditando.proveedor,
        proyecto_id: acopioEditando.proyecto_id || acopioEditando.proyectoId || '',
        codigo: acopioEditando.codigo,
        descripcion: descripcionEdit
      });
      if (ok) {
        setAcopios((prev) =>
          prev.map((a) => (a.id === acopioEditando.id ? { ...a, descripcion: descripcionEdit } : a))
        );
        setAlert({ open: true, message: 'Descripción actualizada', severity: 'success' });
        closeDescripcionDialog();
      } else {
        setAlert({ open: true, message: 'No se pudo actualizar la descripción', severity: 'error' });
      }
    } catch (error) {
      setAlert({ open: true, message: 'Error al actualizar la descripción', severity: 'error' });
    } finally {
      setGuardandoDescripcion(false);
    }
  };

  const exportarExcel = () => {
    const data = acopios.map(a => ({
      Fecha: new Date(a.fecha).toLocaleDateString(),
      Código: a.codigo,
      Descripción: a.descripcion || '',
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
    a.proyecto_nombre?.toLowerCase().includes(filtroTexto.toLowerCase()) ||
    a.descripcion?.toLowerCase().includes(filtroTexto.toLowerCase())
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
            <TooltipHelp {...TOOLTIP_ACOPIOS.exportarExcel}>
              <Button variant="outlined" onClick={exportarExcel}>Exportar Excel</Button>
            </TooltipHelp>
            <TooltipHelp {...TOOLTIP_ACOPIOS.actualizar}>
              <Button variant="contained" startIcon={<RefreshIcon />} onClick={fetchAcopios}>Actualizar</Button>
            </TooltipHelp>
            {!isMobile && (
              <TooltipHelp {...TOOLTIP_ACOPIOS.crearAcopio}>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => router.push(`/crearAcopio?empresaId=${empresaId}`)}>
                  Crear Acopio
                </Button>
              </TooltipHelp>
            )}
          </Stack>
        </Stack>

        <TextField
          placeholder="Buscar por código, proveedor, proyecto o descripción"
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
              <TableCell>Tipo</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Total disponible</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {acopiosFiltrados.map((acopio) => (
              <TableRow key={acopio.id}>
                <TableCell>{new Date(acopio.fecha).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">{acopio.codigo}</Typography>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {acopio.descripcion ? (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {acopio.descripcion}
                        </Typography>
                      ) : (
                        <Button
                          variant="text"
                          size="small"
                          onClick={() => openDescripcionDialog(acopio)}
                          startIcon={<EditIcon fontSize="inherit" />}
                          sx={{ px: 0, minWidth: 0, textTransform: 'none', color: 'text.secondary' }}
                        >
                          Agregar descripción
                        </Button>
                      )}
                      {acopio.descripcion && (
                        <Tooltip title="Editar descripción">
                          <IconButton size="small" onClick={() => openDescripcionDialog(acopio)}>
                            <EditIcon fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </Box>
                </TableCell>
                <TableCell>{acopio.proveedor}</TableCell>
                <TableCell>{acopio.proyecto_nombre}</TableCell>
                <TableCell>
                  <Chip label={acopio.tipo || 'materiales'} color={acopio.tipo == 'lista_precios' ? 'info': 'default' } size="small" />
                  </TableCell>
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
            router.push(`/editarAcopio/?empresaId=${empresaId}&acopioId=${selectedAcopio?.id}`);
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

        <Dialog open={descripcionDialogOpen} onClose={closeDescripcionDialog}>
          <Card sx={{ p: 3, maxWidth: 520 }}>
            <Typography variant="h6" gutterBottom>
              Descripción del acopio
            </Typography>
            <TextField
              value={descripcionEdit}
              onChange={(e) => setDescripcionEdit(e.target.value)}
              placeholder="Agregar una descripción breve"
              fullWidth
              multiline
              minRows={3}
              sx={{ mb: 2 }}
            />
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button onClick={closeDescripcionDialog} variant="outlined">
                Cancelar
              </Button>
              <Button onClick={handleGuardarDescripcion} variant="contained" disabled={guardandoDescripcion}>
                {guardandoDescripcion ? 'Guardando...' : 'Guardar'}
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
